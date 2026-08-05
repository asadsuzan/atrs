import type { WpPluginInfo } from './wporg/WpOrgClient';
import { WpOrgClient } from './wporg/WpOrgClient';
import { wpVersionLag } from './wporg/readme';

/**
 * Deterministic audit of a WP.org listing's quality.
 *
 * On WordPress.org the listing page *is* the storefront: installs are won or
 * lost on the banner, the screenshots, the short description and whether the
 * "Tested up to" line triggers the scary red compatibility warning. All of that
 * is objectively checkable, so none of it should be left to an LLM's opinion.
 *
 * Every check states the rule it applied and what it found, so the resulting
 * score can be argued with rather than merely trusted.
 */

export type AuditStatus = 'pass' | 'warn' | 'fail' | 'unknown';

export interface AuditCheck {
  id: string;
  label: string;
  status: AuditStatus;
  /** What we found, in plain terms. */
  finding: string;
  /** The rule being applied, so the score is auditable. */
  rule: string;
  /** Points earned out of `weight`. */
  points: number;
  weight: number;
  /** Concrete next action when the check isn't passing. */
  fix?: string;
}

export interface ListingAudit {
  slug: string;
  /** 0–100 weighted score across all applicable checks. */
  score: number;
  checks: AuditCheck[];
  /** Failing/warning checks ordered by how much score they'd recover. */
  topOpportunities: AuditCheck[];
  auditedAt: Date;
}

/**
 * Weights reflect impact on install conversion, not effort. Screenshots and the
 * short description move the needle far more than a donate link, and a stale
 * "Tested up to" actively suppresses installs, so it carries the heaviest weight
 * of the hygiene checks.
 */
const WEIGHTS = {
  banner: 10,
  icon: 8,
  screenshots: 14,
  shortDescription: 12,
  descriptionDepth: 10,
  faq: 8,
  tags: 10,
  changelogPresent: 8,
  testedUpTo: 14,
  requiresPhp: 3,
  installation: 3,
} as const;

export class ReadmeAuditor {
  /**
   * Audits a live WP.org listing.
   *
   * `currentWp` is passed in rather than fetched so a batch audit makes one
   * core-version call instead of one per plugin.
   */
  static audit(info: WpPluginInfo, currentWp: string | null): ListingAudit {
    const checks: AuditCheck[] = [
      this.checkBanner(info),
      this.checkIcon(info),
      this.checkScreenshots(info),
      this.checkShortDescription(info),
      this.checkDescriptionDepth(info),
      this.checkFaq(info),
      this.checkTags(info),
      this.checkChangelog(info),
      this.checkTestedUpTo(info, currentWp),
      this.checkRequiresPhp(info),
      this.checkInstallation(info),
    ];

    // Unknown checks are excluded from the denominator so missing upstream data
    // can't be mistaken for a poor listing.
    const scored = checks.filter((c) => c.status !== 'unknown');
    const earned = scored.reduce((sum, c) => sum + c.points, 0);
    const possible = scored.reduce((sum, c) => sum + c.weight, 0);

    const topOpportunities = checks
      .filter((c) => c.status === 'fail' || c.status === 'warn')
      .sort((a, b) => b.weight - b.points - (a.weight - a.points))
      .slice(0, 5);

    return {
      slug: info.slug,
      score: possible > 0 ? Math.round((earned / possible) * 100) : 0,
      checks,
      topOpportunities,
      auditedAt: new Date(),
    };
  }

  private static checkBanner(info: WpPluginInfo): AuditCheck {
    const ok = info.hasBanner;
    return {
      id: 'banner',
      label: 'Header banner',
      status: ok ? 'pass' : 'fail',
      finding: ok ? 'A header banner is published.' : 'No header banner found.',
      rule: 'A 772×250 banner should be present in /assets.',
      points: ok ? WEIGHTS.banner : 0,
      weight: WEIGHTS.banner,
      fix: ok ? undefined : 'Add banner-772x250.png (and a 1544×500 retina version) to the plugin assets folder.',
    };
  }

  private static checkIcon(info: WpPluginInfo): AuditCheck {
    const ok = info.hasIcon;
    return {
      id: 'icon',
      label: 'Plugin icon',
      status: ok ? 'pass' : 'fail',
      finding: ok ? 'A custom icon is published.' : 'No custom icon — the directory shows a generated placeholder.',
      rule: 'A 256×256 icon should be present in /assets.',
      points: ok ? WEIGHTS.icon : 0,
      weight: WEIGHTS.icon,
      fix: ok ? undefined : 'Add icon-256x256.png to the plugin assets folder.',
    };
  }

  private static checkScreenshots(info: WpPluginInfo): AuditCheck {
    const n = info.screenshotCount;
    // Three is where a listing starts telling a story rather than just proving existence.
    const status: AuditStatus = n >= 3 ? 'pass' : n >= 1 ? 'warn' : 'fail';
    const points = n >= 3 ? WEIGHTS.screenshots : n >= 1 ? Math.round(WEIGHTS.screenshots * 0.5) : 0;
    return {
      id: 'screenshots',
      label: 'Screenshots',
      status,
      finding: n === 0 ? 'No screenshots published.' : `${n} screenshot${n === 1 ? '' : 's'} published.`,
      rule: 'At least 3 screenshots with captions.',
      points,
      weight: WEIGHTS.screenshots,
      fix: n >= 3 ? undefined : `Add ${Math.max(1, 3 - n)} more captioned screenshot(s) showing the plugin in real use.`,
    };
  }

  private static checkShortDescription(info: WpPluginInfo): AuditCheck {
    const len = info.shortDescription.length;
    // WP.org truncates the short description at 150 characters in search results,
    // so anything longer is invisible where it matters most, and anything much
    // shorter wastes the only line a browsing user reads.
    const status: AuditStatus = len === 0 ? 'fail' : len >= 90 && len <= 150 ? 'pass' : 'warn';
    const points =
      status === 'pass' ? WEIGHTS.shortDescription : status === 'warn' ? Math.round(WEIGHTS.shortDescription * 0.5) : 0;
    let finding: string;
    if (len === 0) finding = 'No short description set.';
    else if (len > 150) finding = `Short description is ${len} characters — WP.org truncates at 150.`;
    else if (len < 90) finding = `Short description is only ${len} characters, under-using the 150 available.`;
    else finding = `Short description is ${len} characters, within the visible range.`;
    return {
      id: 'shortDescription',
      label: 'Short description',
      status,
      finding,
      rule: '90–150 characters, benefit-led, containing the primary keyword.',
      points,
      weight: WEIGHTS.shortDescription,
      fix: status === 'pass' ? undefined : 'Rewrite to 90–150 characters leading with the user benefit and primary keyword.',
    };
  }

  private static checkDescriptionDepth(info: WpPluginInfo): AuditCheck {
    const text = WpOrgClient.stripHtml(info.sections['description'] || '');
    const words = text ? text.split(/\s+/).length : 0;
    const status: AuditStatus = words >= 300 ? 'pass' : words >= 120 ? 'warn' : 'fail';
    const points = words >= 300 ? WEIGHTS.descriptionDepth : words >= 120 ? Math.round(WEIGHTS.descriptionDepth * 0.5) : 0;
    return {
      id: 'descriptionDepth',
      label: 'Description depth',
      status,
      finding: words === 0 ? 'No description section.' : `Description is roughly ${words} words.`,
      rule: 'At least 300 words covering features, use cases and differentiation.',
      points,
      weight: WEIGHTS.descriptionDepth,
      fix: words >= 300 ? undefined : 'Expand the description with feature bullets, use cases, and how it differs from alternatives.',
    };
  }

  private static checkFaq(info: WpPluginInfo): AuditCheck {
    const faq = WpOrgClient.stripHtml(info.sections['faq'] || '');
    // WP.org's FAQ answers are what deflect support threads before they open.
    const questionCount = (info.sections['faq'] || '').match(/<h[1-6][^>]*>/gi)?.length ?? (faq ? 1 : 0);
    const status: AuditStatus = questionCount >= 3 ? 'pass' : questionCount >= 1 ? 'warn' : 'fail';
    const points = questionCount >= 3 ? WEIGHTS.faq : questionCount >= 1 ? Math.round(WEIGHTS.faq * 0.5) : 0;
    return {
      id: 'faq',
      label: 'FAQ section',
      status,
      finding: questionCount === 0 ? 'No FAQ section.' : `${questionCount} FAQ entr${questionCount === 1 ? 'y' : 'ies'}.`,
      rule: 'At least 3 FAQ entries answering the questions that generate support threads.',
      points,
      weight: WEIGHTS.faq,
      fix: questionCount >= 3 ? undefined : 'Add FAQ entries for your most frequent support questions to deflect threads.',
    };
  }

  private static checkTags(info: WpPluginInfo): AuditCheck {
    const n = info.tags.length;
    // WP.org indexes a maximum of 5 tags; using fewer leaves free search surface unused.
    const status: AuditStatus = n >= 4 && n <= 5 ? 'pass' : n >= 1 ? 'warn' : 'fail';
    const points = status === 'pass' ? WEIGHTS.tags : status === 'warn' ? Math.round(WEIGHTS.tags * 0.5) : 0;
    let finding: string;
    if (n === 0) finding = 'No tags set — the plugin is missing from tag browsing.';
    else if (n > 5) finding = `${n} tags set, but WP.org only indexes the first 5.`;
    else finding = `${n} of the 5 indexable tags in use: ${info.tags.slice(0, 5).join(', ')}.`;
    return {
      id: 'tags',
      label: 'Directory tags',
      status,
      finding,
      rule: 'Use 4–5 tags matching real search terms.',
      points,
      weight: WEIGHTS.tags,
      fix: status === 'pass' ? undefined : 'Set 4–5 tags matching the terms users actually search for in the directory.',
    };
  }

  private static checkChangelog(info: WpPluginInfo): AuditCheck {
    const changelog = WpOrgClient.stripHtml(info.sections['changelog'] || '');
    const words = changelog ? changelog.split(/\s+/).length : 0;
    const status: AuditStatus = words >= 60 ? 'pass' : words > 0 ? 'warn' : 'fail';
    const points = words >= 60 ? WEIGHTS.changelogPresent : words > 0 ? Math.round(WEIGHTS.changelogPresent * 0.5) : 0;
    return {
      id: 'changelog',
      label: 'Published changelog',
      status,
      finding: words === 0 ? 'No changelog section.' : `Changelog present (~${words} words).`,
      rule: 'A maintained changelog signals active development to prospective users.',
      points,
      weight: WEIGHTS.changelogPresent,
      fix: words >= 60 ? undefined : 'Publish per-version changelog entries in readme.txt.',
    };
  }

  private static checkTestedUpTo(info: WpPluginInfo, currentWp: string | null): AuditCheck {
    if (!info.testedUpTo || !currentWp) {
      return {
        id: 'testedUpTo',
        label: '"Tested up to" freshness',
        status: 'unknown',
        finding: !info.testedUpTo ? 'No "Tested up to" value published.' : 'Current WordPress version unavailable.',
        rule: 'Should match the current WordPress release.',
        points: 0,
        weight: WEIGHTS.testedUpTo,
      };
    }
    const lag = wpVersionLag(info.testedUpTo, currentWp) ?? 0;
    // WP.org shows a compatibility warning once a plugin trails the current
    // release, and it visibly suppresses installs at 2+ minors behind.
    const status: AuditStatus = lag === 0 ? 'pass' : lag === 1 ? 'warn' : 'fail';
    const points = lag === 0 ? WEIGHTS.testedUpTo : lag === 1 ? Math.round(WEIGHTS.testedUpTo * 0.5) : 0;
    return {
      id: 'testedUpTo',
      label: '"Tested up to" freshness',
      status,
      finding:
        lag === 0
          ? `Tested up to ${info.testedUpTo}, matching the current WordPress ${currentWp}.`
          : `Tested up to ${info.testedUpTo} while WordPress is on ${currentWp} — ${lag} release(s) behind.`,
      rule: 'Should match the current WordPress release.',
      points,
      weight: WEIGHTS.testedUpTo,
      fix:
        lag === 0
          ? undefined
          : `Test against WordPress ${currentWp} and bump "Tested up to" — the directory currently warns users about compatibility.`,
    };
  }

  private static checkRequiresPhp(info: WpPluginInfo): AuditCheck {
    const ok = !!info.requiresPhp;
    return {
      id: 'requiresPhp',
      label: 'PHP requirement declared',
      status: ok ? 'pass' : 'warn',
      finding: ok ? `Requires PHP ${info.requiresPhp}.` : 'No "Requires PHP" declared.',
      rule: 'Declaring Requires PHP prevents fatal errors on unsupported hosts.',
      points: ok ? WEIGHTS.requiresPhp : 0,
      weight: WEIGHTS.requiresPhp,
      fix: ok ? undefined : 'Add a "Requires PHP" header to readme.txt and the plugin bootstrap file.',
    };
  }

  private static checkInstallation(info: WpPluginInfo): AuditCheck {
    const text = WpOrgClient.stripHtml(info.sections['installation'] || '');
    const ok = text.split(/\s+/).length >= 25;
    return {
      id: 'installation',
      label: 'Installation instructions',
      status: ok ? 'pass' : 'warn',
      finding: ok ? 'Installation section present.' : 'Installation section missing or very short.',
      rule: 'Explain setup steps beyond "activate the plugin".',
      points: ok ? WEIGHTS.installation : 0,
      weight: WEIGHTS.installation,
      fix: ok ? undefined : 'Document the post-activation setup steps so first-run confusion does not become a support thread.',
    };
  }
}
