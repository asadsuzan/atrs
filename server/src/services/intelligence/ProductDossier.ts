import type { SignalContext } from './signals/context';
import type { ISignal } from '../../models/Signal';
import { WpOrgClient } from './wporg/WpOrgClient';
import { fmtInt, fmtPct } from './signals/types';

/**
 * The complete factual picture of a product, rendered for a prompt.
 *
 * Previously the language model only ever saw a handful of clustered signals — "bug
 * health 66", "installs declining 4%" — with no idea what the product actually *is*.
 * That produced technically-grounded but generic prose: advice that would read the
 * same for a gallery block and a payment gateway, because the model had no way to know
 * which it was writing about.
 *
 * This assembles everything the platform knows: identity, positioning, published
 * features, release history, defect profile, market position, and how competitors
 * compare. The grounding rule is unchanged — the model still may not invent a figure,
 * and citations are still validated against real signal codes — but it can now reason
 * about *this* product rather than about an anonymous set of metrics.
 *
 * Everything here is already loaded by `buildSignalContext`, so producing the dossier
 * costs no extra queries or network calls.
 */

/** Caps per section, so a large product can't produce a prompt the model truncates mid-fact. */
const LIMITS = {
  features: 25,
  recentActivities: 20,
  openIssues: 15,
  recentVersions: 10,
  competitors: 6,
  descriptionChars: 700,
};

export interface DossierOptions {
  /** Include the competitor comparison block. */
  includeCompetitors?: boolean;
  /** Include the full signal list. Off when the caller renders signals separately. */
  includeSignals?: boolean;
  signals?: ISignal[];
}

export class ProductDossier {
  /**
   * Renders the dossier as plain text for prompt inclusion.
   *
   * Plain text rather than JSON: local models follow labelled prose more reliably than
   * nested objects, and it keeps the token cost down on a payload this broad.
   */
  static build(ctx: SignalContext, opts: DossierOptions = {}): string {
    const sections = [
      this.identity(ctx),
      this.positioning(ctx),
      this.capabilities(ctx),
      this.marketPosition(ctx),
      this.releaseHistory(ctx),
      this.defectProfile(ctx),
      this.recentWork(ctx),
    ];

    if (opts.includeCompetitors !== false) sections.push(this.competitors(ctx));
    if (opts.includeSignals && opts.signals) sections.push(this.signals(opts.signals, ctx));

    return sections.filter(Boolean).join('\n\n');
  }

  /** What the product is. */
  private static identity(ctx: SignalContext): string {
    const p = ctx.product;
    const lines = [
      `## PRODUCT`,
      `Name: ${p.name}`,
      `Type: ${p.category}`,
      p.wpOrgSlug ? `WordPress.org slug: ${p.wpOrgSlug}` : `Not listed on WordPress.org`,
    ];

    const description = (p.description || ctx.wpInfo?.shortDescription || '').trim();
    if (description) {
      lines.push(`Description: ${truncate(description, LIMITS.descriptionChars)}`);
    }
    if (ctx.wpInfo?.shortDescription && ctx.wpInfo.shortDescription !== description) {
      lines.push(`Directory tagline: ${ctx.wpInfo.shortDescription}`);
    }
    if (p.githubUrl) lines.push(`Repository: ${p.githubUrl}`);

    return lines.join('\n');
  }

  /** How it presents itself in the market. */
  private static positioning(ctx: SignalContext): string {
    if (!ctx.wpInfo) return '';

    const lines = [`## POSITIONING`];
    if (ctx.wpInfo.tags.length) lines.push(`Directory tags: ${ctx.wpInfo.tags.join(', ')}`);
    if (ctx.wpInfo.author) lines.push(`Author: ${ctx.wpInfo.author}`);
    if (ctx.listingAudit) {
      lines.push(`Listing quality: ${ctx.listingAudit.score}/100`);
      const weak = ctx.listingAudit.checks.filter((c) => c.status === 'fail' || c.status === 'warn');
      if (weak.length) {
        lines.push(`Listing weaknesses: ${weak.map((c) => c.label.toLowerCase()).join(', ')}`);
      }
    }
    // The long description is where the product explains itself; a trimmed version
    // gives the model the vocabulary the author actually uses.
    const longDescription = WpOrgClient.stripHtml(ctx.wpInfo.sections['description'] || '');
    if (longDescription) {
      lines.push(`How it describes itself: ${truncate(longDescription, LIMITS.descriptionChars)}`);
    }

    return lines.length > 1 ? lines.join('\n') : '';
  }

  /** What it can actually do, read from the published readme. */
  private static capabilities(ctx: SignalContext): string {
    if (ctx.ownFeatures.length === 0) return '';
    const shown = ctx.ownFeatures.slice(0, LIMITS.features);
    const lines = [`## ADVERTISED CAPABILITIES (${ctx.ownFeatures.length} total, from the published readme)`];
    lines.push(...shown.map((f) => `- ${f}`));
    if (ctx.ownFeatures.length > shown.length) {
      lines.push(`- (${ctx.ownFeatures.length - shown.length} more not listed here)`);
    }
    return lines.join('\n');
  }

  /** Live market figures. */
  private static marketPosition(ctx: SignalContext): string {
    if (!ctx.wpInfo) return '';
    const snapshot = ctx.productSeries[0];
    const lines = [`## MARKET POSITION (live WordPress.org data)`];

    lines.push(`Active installs: ${fmtInt(ctx.wpInfo.activeInstalls)}`);
    lines.push(`Total downloads: ${fmtInt(ctx.wpInfo.downloaded)}`);

    const stars = snapshot?.meanStars ?? (ctx.wpInfo.rating != null ? ctx.wpInfo.rating / 20 : null);
    if (stars !== null) {
      lines.push(`Rating: ${stars.toFixed(2)} stars from ${fmtInt(ctx.wpInfo.numRatings)} reviews`);
    }
    if (ctx.wpInfo.ratings) {
      const r = ctx.wpInfo.ratings;
      lines.push(`Review spread: ${r[5]}×5★, ${r[4]}×4★, ${r[3]}×3★, ${r[2]}×2★, ${r[1]}×1★`);
    }
    if (ctx.wpInfo.supportThreads !== null && ctx.wpInfo.supportThreadsResolved !== null) {
      const rate =
        ctx.wpInfo.supportThreads > 0
          ? (ctx.wpInfo.supportThreadsResolved / ctx.wpInfo.supportThreads) * 100
          : null;
      lines.push(
        `Support threads: ${ctx.wpInfo.supportThreadsResolved} of ${ctx.wpInfo.supportThreads} resolved` +
          (rate !== null ? ` (${fmtPct(rate)})` : ''),
      );
    }
    if (snapshot?.ranking != null) lines.push(`Directory rank: #${fmtInt(snapshot.ranking)}`);
    if (snapshot?.memoryUsage) lines.push(`Measured memory use: ${snapshot.memoryUsage}`);
    if (snapshot?.vulnerabilitiesPresent != null) {
      lines.push(`Unpatched security advisories: ${snapshot.vulnerabilitiesPresent}`);
    }
    lines.push(`Requires WordPress: ${ctx.wpInfo.requires ?? 'unspecified'}`);
    lines.push(`Tested up to: ${ctx.wpInfo.testedUpTo ?? 'unspecified'} (current WordPress: ${ctx.currentWp ?? 'unknown'})`);
    lines.push(`Requires PHP: ${ctx.wpInfo.requiresPhp ?? 'unspecified'}`);

    // Trend needs at least two snapshots; say so rather than implying stability.
    if (ctx.productSeries.length < 2) {
      lines.push(`Trend data: not yet available (${ctx.productSeries.length} snapshot on record)`);
    }

    return lines.join('\n');
  }

  /** Shipping record. */
  private static releaseHistory(ctx: SignalContext): string {
    const released = ctx.versions
      .filter((v) => v.status === 'released' && v.releasedAt)
      .sort((a, b) => new Date(b.releasedAt!).getTime() - new Date(a.releasedAt!).getTime());

    const lines = [`## RELEASE HISTORY`];
    lines.push(`Released versions on record: ${released.length}`);

    const unreleased = ctx.versions.filter((v) => v.status === 'unreleased');
    if (unreleased.length) {
      lines.push(`Unreleased/in-progress versions: ${unreleased.map((v) => v.label).join(', ')}`);
    }

    if (released[0]?.releasedAt) {
      const days = Math.floor((ctx.now.getTime() - new Date(released[0].releasedAt).getTime()) / 86_400_000);
      lines.push(`Latest release: ${released[0].label}, ${days} days ago`);
    } else if (ctx.wpInfo?.lastUpdated) {
      const days = Math.floor((ctx.now.getTime() - ctx.wpInfo.lastUpdated.getTime()) / 86_400_000);
      lines.push(`Latest release (per WordPress.org): ${ctx.wpInfo.version ?? 'unknown'}, ${days} days ago`);
    }

    if (ctx.cadence?.medianDaysBetween) {
      lines.push(`Typical gap between releases: ${ctx.cadence.medianDaysBetween} days (median)`);
    }
    if (ctx.cadence?.releasesLast90Days !== null && ctx.cadence?.releasesLast90Days !== undefined) {
      lines.push(`Releases in the last 90 days: ${ctx.cadence.releasesLast90Days}`);
    }

    const recent = released.slice(0, LIMITS.recentVersions);
    if (recent.length) {
      lines.push(`Recent versions: ${recent.map((v) => v.label).join(', ')}`);
    }

    return lines.join('\n');
  }

  /** Defect profile — what is actually broken. */
  private static defectProfile(ctx: SignalContext): string {
    const isOpen = (s: string) => s === 'open' || s === 'in-progress';
    const open = ctx.issues.filter((i) => isOpen(i.status));
    const bySeverity = (sev: string) => open.filter((i) => i.severity === sev);

    const thirtyDaysAgo = ctx.now.getTime() - 30 * 86_400_000;
    const created30 = ctx.issues.filter((i) => new Date(i.createdAt).getTime() >= thirtyDaysAgo).length;
    const resolved30 = ctx.issues.filter(
      (i) => i.resolvedAt && new Date(i.resolvedAt).getTime() >= thirtyDaysAgo,
    ).length;

    const lines = [`## DEFECTS`];
    lines.push(`Total issues on record: ${ctx.issues.length}`);
    lines.push(
      `Currently open: ${open.length} (${bySeverity('critical').length} critical, ` +
        `${bySeverity('high').length} high, ${bySeverity('medium').length} medium, ${bySeverity('low').length} low)`,
    );
    lines.push(`Last 30 days: ${created30} reported, ${resolved30} resolved`);

    // Actual issue titles are the highest-value part of this block: they tell the model
    // what kind of thing goes wrong with this product, which no aggregate can convey.
    const notable = open
      .filter((i) => i.severity === 'critical' || i.severity === 'high')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, LIMITS.openIssues);

    if (notable.length) {
      lines.push(`Open critical and high-severity issues:`);
      for (const issue of notable) {
        const age = Math.floor((ctx.now.getTime() - new Date(issue.createdAt).getTime()) / 86_400_000);
        lines.push(
          `- [${issue.severity}] ${issue.title} (open ${age}d${issue.versionLabel ? `, affects ${issue.versionLabel}` : ''})`,
        );
      }
    }

    return lines.join('\n');
  }

  /** What has shipped lately, in the author's own words. */
  private static recentWork(ctx: SignalContext): string {
    if (ctx.activities.length === 0) return '';

    const recent = ctx.activities.slice(0, LIMITS.recentActivities);
    const counts = {
      feature: ctx.activities.filter((a) => a.type === 'feature').length,
      improvement: ctx.activities.filter((a) => a.type === 'improvement').length,
      bugFix: ctx.activities.filter((a) => a.type === 'bug-fix').length,
    };

    const lines = [`## RECENT DEVELOPMENT (last 12 months)`];
    lines.push(
      `${ctx.activities.length} logged changes: ${counts.feature} features, ` +
        `${counts.improvement} improvements, ${counts.bugFix} fixes`,
    );
    lines.push(`Most recent:`);
    for (const activity of recent) {
      const date = new Date(activity.activityDate).toISOString().slice(0, 10);
      lines.push(`- [${activity.type}] ${activity.title}${activity.shortDescription ? ` — ${truncate(activity.shortDescription, 120)}` : ''} (${date})`);
    }

    return lines.join('\n');
  }

  /** How rivals compare, factually. */
  private static competitors(ctx: SignalContext): string {
    if (ctx.competitors.length === 0) {
      return `## COMPETITORS\nNone tracked for this product.`;
    }

    const lines = [`## COMPETITORS (${ctx.competitors.length} tracked)`];

    for (const c of ctx.competitors.slice(0, LIMITS.competitors)) {
      if (!c.info) {
        lines.push(`- ${c.competitor.name}: not measurable (no WordPress.org listing resolved)`);
        continue;
      }
      const stars = c.info.rating != null ? (c.info.rating / 20).toFixed(2) : 'unknown';
      const parts = [
        `${fmtInt(c.info.activeInstalls)} installs`,
        `${stars}★ from ${fmtInt(c.info.numRatings)} reviews`,
      ];
      if (c.cadence?.medianDaysBetween) parts.push(`ships every ~${c.cadence.medianDaysBetween}d`);
      if (c.info.lastUpdated) {
        const days = Math.floor((ctx.now.getTime() - c.info.lastUpdated.getTime()) / 86_400_000);
        parts.push(`last updated ${days}d ago`);
      }
      lines.push(`- ${c.competitor.name} (${c.competitor.type}): ${parts.join(', ')}`);

      // A few of their features give the model concrete comparison material.
      if (c.features.length) {
        lines.push(`  Advertises: ${c.features.slice(0, 6).join('; ')}`);
      }
    }

    return lines.join('\n');
  }

  /** The detected signals, with their evidence. */
  private static signals(signals: ISignal[], ctx: SignalContext): string {
    if (signals.length === 0) return '';

    const lines = [`## DETECTED SIGNALS (the only findings you may cite)`];
    for (const s of signals) {
      lines.push(`- CODE: ${s.code}`);
      lines.push(`  ${s.direction === 'positive' ? 'STRENGTH' : 'ISSUE'} (${s.severity}): ${s.detail}`);
      if (s.metric) {
        lines.push(
          `  METRIC: ${s.metric.name} = ${s.metric.value}${s.metric.unit ? ` ${s.metric.unit}` : ''}` +
            (s.metric.delta !== undefined ? ` (change ${s.metric.delta})` : ''),
        );
      }
      const age = Math.floor((ctx.now.getTime() - new Date(s.firstDetectedAt).getTime()) / 86_400_000);
      if (age > 0) lines.push(`  FIRST DETECTED: ${age} days ago`);
    }

    return lines.join('\n');
  }
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}
