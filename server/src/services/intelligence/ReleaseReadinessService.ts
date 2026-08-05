import mongoose from 'mongoose';
import { Product } from '../../models/Product';
import { Issue } from '../../models/Issue';
import { Version } from '../../models/Version';
import { Activity } from '../../models/Activity';
import { WpOrgClient } from './wporg/WpOrgClient';
import { ReadmeAuditor } from './ReadmeAuditor';
import { MarketDataService } from './MarketDataService';
import { compareVersions, wpVersionLag } from './wporg/readme';
import { fmtInt } from './signals/types';

/**
 * The pre-release gate.
 *
 * Standing out in a marketplace is mostly the accumulation of releases that
 * didn't go wrong. This service answers one question — "is this version safe to
 * ship?" — with deterministic checks, no LLM anywhere. A release gate that
 * occasionally hallucinated a blocker, or occasionally missed one, would be worse
 * than no gate at all, because people would stop trusting it and ship anyway.
 *
 * Checks are graded: `blocker` means don't ship, `warning` means ship knowingly,
 * `info` is context. The verdict is the worst grade present.
 */

export type CheckGrade = 'blocker' | 'warning' | 'info' | 'pass';

export interface ReadinessCheck {
  id: string;
  label: string;
  grade: CheckGrade;
  /** What we found. */
  finding: string;
  /** The rule applied, so the verdict is arguable. */
  rule: string;
  /** What to do about it, when it isn't passing. */
  action?: string;
  /** Entity ids (issues, versions) the check refers to. */
  refs?: string[];
}

export interface ReleaseReadiness {
  productId: string;
  /** The version being assessed, when one was specified or inferred. */
  versionLabel: string | null;
  verdict: 'ready' | 'ready_with_warnings' | 'blocked';
  /** 0–100 summary, for display beside the verdict. */
  score: number;
  blockers: ReadinessCheck[];
  warnings: ReadinessCheck[];
  passed: ReadinessCheck[];
  info: ReadinessCheck[];
  generatedAt: Date;
}

export class ReleaseReadinessService {
  /**
   * Assesses readiness for a specific version, or for the next release when no
   * version is given.
   */
  static async assess(
    productId: string | mongoose.Types.ObjectId,
    versionLabel?: string,
  ): Promise<ReleaseReadiness | null> {
    const product = await Product.findById(productId);
    if (!product) return null;

    const now = new Date();

    const [issues, versions, currentWp, wpInfo, series] = await Promise.all([
      Issue.find({ productId: product._id }).lean(),
      Version.find({ productId: product._id }).lean(),
      WpOrgClient.getCurrentWpVersion(),
      product.wpOrgSlug ? WpOrgClient.getPlugin(product.wpOrgSlug) : Promise.resolve(null),
      MarketDataService.getProductSeries(product._id as mongoose.Types.ObjectId, 4),
    ]);

    // Prefer the named version, then the oldest unreleased one (the next to ship).
    const target =
      (versionLabel && versions.find((v) => v.label === versionLabel)) ||
      versions
        .filter((v) => v.status === 'unreleased')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0] ||
      null;

    const activities = target
      ? await Activity.find({ productId: product._id, versionId: target._id }).lean()
      : [];

    const checks: ReadinessCheck[] = [];

    // ---- Blocking checks -----------------------------------------------------

    const openCritical = issues.filter(
      (i) => (i.status === 'open' || i.status === 'in-progress') && i.severity === 'critical',
    );
    checks.push(
      openCritical.length > 0
        ? {
            id: 'criticalIssues',
            label: 'No open critical issues',
            grade: 'blocker',
            finding: `${openCritical.length} critical issue${openCritical.length === 1 ? '' : 's'} still open: ${openCritical
              .slice(0, 3)
              .map((i) => `"${i.title}"`)
              .join(', ')}${openCritical.length > 3 ? ', …' : ''}.`,
            rule: 'A release must not ship with known critical-severity defects.',
            action: 'Resolve or re-severity each critical issue before shipping.',
            refs: openCritical.map((i) => String(i._id)),
          }
        : {
            id: 'criticalIssues',
            label: 'No open critical issues',
            grade: 'pass',
            finding: 'No critical issues are open.',
            rule: 'A release must not ship with known critical-severity defects.',
          },
    );

    const vulns = series[0]?.vulnerabilitiesPresent ?? null;
    if (vulns !== null) {
      checks.push(
        vulns > 0
          ? {
              id: 'security',
              label: 'No unpatched security advisories',
              grade: 'blocker',
              finding: `${vulns} unpatched advisor${vulns === 1 ? 'y' : 'ies'} on public record.`,
              rule: 'A release must not ship while a public advisory remains unpatched.',
              action: 'Patch the advisories and request a re-scan before shipping.',
            }
          : {
              id: 'security',
              label: 'No unpatched security advisories',
              grade: 'pass',
              finding: 'No unpatched advisories on record.',
              rule: 'A release must not ship while a public advisory remains unpatched.',
            },
      );
    }

    // A version number that goes backwards means WP.org will reject or ignore the
    // release, so it is a hard blocker rather than a style question.
    if (target && wpInfo?.version) {
      const comparison = compareVersions(target.label, wpInfo.version);
      checks.push(
        comparison > 0
          ? {
              id: 'versionOrder',
              label: 'Version number increases',
              grade: 'pass',
              finding: `${target.label} is ahead of the published ${wpInfo.version}.`,
              rule: 'The new version must be numerically greater than what is published.',
            }
          : {
              id: 'versionOrder',
              label: 'Version number increases',
              grade: 'blocker',
              finding:
                comparison === 0
                  ? `${target.label} is already published on WordPress.org.`
                  : `${target.label} is lower than the published ${wpInfo.version}.`,
              rule: 'The new version must be numerically greater than what is published.',
              action: `Bump the version above ${wpInfo.version}.`,
            },
      );
    }

    // ---- Warning checks ------------------------------------------------------

    if (target) {
      const hasNotes = !!(target.notes && target.notes.trim().length > 20);
      checks.push(
        activities.length > 0 || hasNotes
          ? {
              id: 'changelog',
              label: 'Release is documented',
              grade: 'pass',
              finding:
                activities.length > 0
                  ? `${activities.length} changelog entr${activities.length === 1 ? 'y' : 'ies'} attached to ${target.label}.`
                  : `Release notes are set for ${target.label}.`,
              rule: 'Every release should tell users what changed.',
            }
          : {
              id: 'changelog',
              label: 'Release is documented',
              grade: 'warning',
              finding: `${target.label} has no changelog entries and no release notes.`,
              rule: 'Every release should tell users what changed.',
              action: 'Add changelog entries so users can judge whether to update.',
              refs: [String(target._id)],
            },
      );
    }

    const openHigh = issues.filter(
      (i) => (i.status === 'open' || i.status === 'in-progress') && i.severity === 'high',
    );
    if (openHigh.length >= 3) {
      checks.push({
        id: 'highIssues',
        label: 'High-severity issue load',
        grade: 'warning',
        finding: `${openHigh.length} high-severity issues remain open.`,
        rule: 'Fewer than 3 open high-severity issues at release time.',
        action: 'Consider clearing some before shipping, or confirm none are release regressions.',
        refs: openHigh.slice(0, 5).map((i) => String(i._id)),
      });
    } else {
      checks.push({
        id: 'highIssues',
        label: 'High-severity issue load',
        grade: 'pass',
        finding: `${openHigh.length} high-severity issue${openHigh.length === 1 ? '' : 's'} open.`,
        rule: 'Fewer than 3 open high-severity issues at release time.',
      });
    }

    if (wpInfo && currentWp) {
      const lag = wpVersionLag(wpInfo.testedUpTo, currentWp) ?? 0;
      // A release is the moment this costs nothing to fix, so shipping without
      // bumping it wastes the opportunity.
      checks.push(
        lag === 0
          ? {
              id: 'wpCompat',
              label: '"Tested up to" is current',
              grade: 'pass',
              finding: `Tested up to ${wpInfo.testedUpTo}, matching WordPress ${currentWp}.`,
              rule: '"Tested up to" should match the current WordPress release at ship time.',
            }
          : {
              id: 'wpCompat',
              label: '"Tested up to" is current',
              grade: 'warning',
              finding: `Tested up to ${wpInfo.testedUpTo} while WordPress ${currentWp} is live — ${lag} release(s) behind.`,
              rule: '"Tested up to" should match the current WordPress release at ship time.',
              action: `Test against WordPress ${currentWp} and bump the header as part of this release — it costs nothing to include now.`,
            },
      );

      const audit = ReadmeAuditor.audit(wpInfo, currentWp);
      const failingAssets = audit.checks.filter(
        (c) => ['banner', 'icon', 'screenshots'].includes(c.id) && c.status === 'fail',
      );
      if (failingAssets.length > 0) {
        checks.push({
          id: 'listingAssets',
          label: 'Listing assets published',
          grade: 'warning',
          finding: `Missing: ${failingAssets.map((c) => c.label.toLowerCase()).join(', ')}. Listing scores ${audit.score}/100.`,
          rule: 'Banner, icon and at least 3 screenshots should be published.',
          action: 'Add the missing assets to /assets — a release is the natural moment to update them.',
        });
      }

      const unresolved =
        wpInfo.supportThreads !== null && wpInfo.supportThreadsResolved !== null
          ? wpInfo.supportThreads - wpInfo.supportThreadsResolved
          : null;
      if (unresolved !== null && unresolved >= 5) {
        checks.push({
          id: 'supportBacklog',
          label: 'Support backlog before release',
          grade: 'warning',
          finding: `${unresolved} support threads are unresolved.`,
          rule: 'Fewer than 5 unresolved support threads at release time.',
          action:
            'Reply to the open threads first — a release often prompts the affected users to check back, ' +
            'and an unanswered thread at that moment tends to become a review.',
        });
      }
    }

    // ---- Informational -------------------------------------------------------

    const lastReleased = versions
      .filter((v) => v.status === 'released' && v.releasedAt)
      .sort((a, b) => new Date(b.releasedAt!).getTime() - new Date(a.releasedAt!).getTime())[0];
    if (lastReleased?.releasedAt) {
      const days = Math.floor((now.getTime() - new Date(lastReleased.releasedAt).getTime()) / 86_400_000);
      checks.push({
        id: 'sinceLastRelease',
        label: 'Time since last release',
        grade: 'info',
        finding: `${days} days since ${lastReleased.label} shipped.`,
        rule: 'Context for judging release size and risk.',
      });
    }

    if (target && activities.length > 0) {
      const features = activities.filter((a) => a.type === 'feature').length;
      const fixes = activities.filter((a) => a.type === 'bug-fix').length;
      const improvements = activities.filter((a) => a.type === 'improvement').length;
      checks.push({
        id: 'releaseContents',
        label: 'Release contents',
        grade: 'info',
        finding: `${fmtInt(features)} feature(s), ${fmtInt(improvements)} improvement(s), ${fmtInt(fixes)} fix(es).`,
        rule: 'Context for judging release size and risk.',
      });
    }

    const blockers = checks.filter((c) => c.grade === 'blocker');
    const warnings = checks.filter((c) => c.grade === 'warning');
    const passed = checks.filter((c) => c.grade === 'pass');
    const info = checks.filter((c) => c.grade === 'info');

    // Score reflects the gated checks only; `info` rows carry no judgement.
    const gated = blockers.length + warnings.length + passed.length;
    const score =
      gated === 0
        ? 100
        : Math.max(
            0,
            Math.round(((passed.length + warnings.length * 0.5) / gated) * 100 - blockers.length * 15),
          );

    return {
      productId: String(product._id),
      versionLabel: target?.label ?? null,
      verdict: blockers.length > 0 ? 'blocked' : warnings.length > 0 ? 'ready_with_warnings' : 'ready',
      score,
      blockers,
      warnings,
      passed,
      info,
      generatedAt: now,
    };
  }
}
