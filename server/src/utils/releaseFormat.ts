/**
 * Turns a product's versions + changelog activities into publishable release
 * artifacts: a structured per-version model (for the public page / app UI), a
 * WordPress.org `== Changelog ==` block, and GitHub-flavoured Markdown.
 *
 * Pure functions — no DB access — so they're trivially testable. The inverse of
 * the readme *importer* (utils/readmeChangelog.ts): there we parse a changelog
 * in, here we render one out, using prefixes the importer round-trips.
 */

export type ReleaseType = 'feature' | 'improvement' | 'bug-fix';

export interface ReleaseItem {
  title: string;
  shortDescription?: string;
  type: ReleaseType;
  tier?: string;
  tags?: string[];
}

export interface ReleaseBlock {
  versionId: string | null;
  /** Version label (e.g. "1.4.0") or "Unreleased" for unversioned entries. */
  label: string;
  /** ISO date string, or null when unknown / unreleased. */
  releasedAt: string | null;
  notes?: string;
  groups: Record<ReleaseType, ReleaseItem[]>;
  counts: Record<ReleaseType, number>;
  total: number;
}

export interface AssembledRelease {
  /** Released, versioned blocks — newest first. */
  releases: ReleaseBlock[];
  /** Activities not tied to a version, if any. */
  unreleased: ReleaseBlock | null;
}

const TYPE_ORDER: ReleaseType[] = ['feature', 'improvement', 'bug-fix'];
const TYPE_HEADING: Record<ReleaseType, string> = {
  feature: 'Features',
  improvement: 'Improvements',
  'bug-fix': 'Bug Fixes',
};
// Keywords the WP.org readme importer (readmeChangelog.ts) classifies back to
// each type, so an exported changelog re-imports cleanly.
const TYPE_KEYWORD: Record<ReleaseType, string> = {
  feature: 'New',
  improvement: 'Improvement',
  'bug-fix': 'Fix',
};

interface RawVersion {
  _id: any;
  label: string;
  notes?: string;
  releasedAt?: Date | string | null;
}

interface RawActivity {
  type: ReleaseType;
  title: string;
  shortDescription?: string;
  tier?: string;
  tags?: string[];
  versionId?: any;
  activityDate?: Date | string | null;
}

const idStr = (v: any): string | null =>
  v == null ? null : typeof v === 'object' && v._id ? String(v._id) : String(v);

function emptyGroups(): Record<ReleaseType, ReleaseItem[]> {
  return { feature: [], improvement: [], 'bug-fix': [] };
}

function toItem(a: RawActivity): ReleaseItem {
  return {
    title: a.title,
    shortDescription: a.shortDescription,
    type: a.type,
    tier: a.tier,
    tags: a.tags,
  };
}

function finalizeBlock(
  versionId: string | null,
  label: string,
  releasedAt: string | null,
  notes: string | undefined,
  acts: RawActivity[],
): ReleaseBlock {
  const groups = emptyGroups();
  for (const a of acts) {
    if (groups[a.type]) groups[a.type].push(toItem(a));
  }
  const counts = {
    feature: groups.feature.length,
    improvement: groups.improvement.length,
    'bug-fix': groups['bug-fix'].length,
  };
  return {
    versionId,
    label,
    releasedAt,
    notes: notes || undefined,
    groups,
    counts,
    total: acts.length,
  };
}

/** Latest activityDate within a set, as ISO, or null. */
function latestDate(acts: RawActivity[]): string | null {
  let best: number | null = null;
  for (const a of acts) {
    if (!a.activityDate) continue;
    const t = new Date(a.activityDate).getTime();
    if (!isNaN(t) && (best === null || t > best)) best = t;
  }
  return best === null ? null : new Date(best).toISOString();
}

/**
 * Group activities by version into release blocks. Versioned blocks are sorted
 * newest-first (by release date, then numeric-aware label); unversioned
 * activities become a single "Unreleased" block.
 */
export function assembleRelease(versions: RawVersion[], activities: RawActivity[]): AssembledRelease {
  const versionsById = new Map<string, RawVersion>();
  for (const v of versions) versionsById.set(String(v._id), v);

  const byVersion = new Map<string, RawActivity[]>();
  const unversioned: RawActivity[] = [];

  for (const a of activities) {
    const vid = idStr(a.versionId);
    if (vid && versionsById.has(vid)) {
      if (!byVersion.has(vid)) byVersion.set(vid, []);
      byVersion.get(vid)!.push(a);
    } else {
      unversioned.push(a);
    }
  }

  const releases: ReleaseBlock[] = [];
  for (const v of versions) {
    const acts = byVersion.get(String(v._id)) || [];
    if (acts.length === 0) continue; // skip versions with no changelog entries
    const released = v.releasedAt ? new Date(v.releasedAt).toISOString() : latestDate(acts);
    releases.push(finalizeBlock(String(v._id), v.label, released, v.notes, acts));
  }

  // Newest first: by release date desc, then label desc (numeric-aware).
  releases.sort((a, b) => {
    const ta = a.releasedAt ? Date.parse(a.releasedAt) : 0;
    const tb = b.releasedAt ? Date.parse(b.releasedAt) : 0;
    if (tb !== ta) return tb - ta;
    return b.label.localeCompare(a.label, undefined, { numeric: true });
  });

  const unreleased =
    unversioned.length > 0
      ? finalizeBlock(null, 'Unreleased', null, undefined, unversioned)
      : null;

  return { releases, unreleased };
}

/** "4 June 2026" — the conventional WordPress.org changelog date style. */
function wpDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function orderedItems(block: ReleaseBlock): ReleaseItem[] {
  return TYPE_ORDER.flatMap((t) => block.groups[t]);
}

/**
 * Render the released blocks as a WordPress.org `== Changelog ==` section.
 * Lines are prefixed (`New:`/`Improvement:`/`Fix:`) so the importer can
 * round-trip them back into typed activities. Unreleased entries are omitted.
 */
export function toReadmeChangelog(assembled: AssembledRelease): string {
  const lines: string[] = ['== Changelog =='];
  for (const block of assembled.releases) {
    const date = wpDate(block.releasedAt);
    lines.push('');
    lines.push(date ? `= ${block.label} - ${date} =` : `= ${block.label} =`);
    for (const t of TYPE_ORDER) {
      for (const item of block.groups[t]) {
        lines.push(`* ${TYPE_KEYWORD[t]}: ${item.title}`);
      }
    }
  }
  return lines.join('\n') + '\n';
}

/** Render everything (including an "Unreleased" section) as GitHub Markdown. */
export function toMarkdown(productName: string, assembled: AssembledRelease): string {
  const out: string[] = [`# ${productName} — Changelog`, ''];

  const renderBlock = (block: ReleaseBlock) => {
    const date = wpDate(block.releasedAt);
    out.push(date ? `## ${block.label} — ${date}` : `## ${block.label}`);
    if (block.notes) out.push('', block.notes);
    for (const t of TYPE_ORDER) {
      const items = block.groups[t];
      if (items.length === 0) continue;
      out.push('', `### ${TYPE_HEADING[t]}`);
      for (const item of items) {
        const desc =
          item.shortDescription && item.shortDescription.trim() && item.shortDescription !== item.title
            ? ` — ${item.shortDescription.trim()}`
            : '';
        out.push(`- **${item.title}**${desc}`);
      }
    }
    out.push('');
  };

  if (assembled.unreleased) renderBlock(assembled.unreleased);
  for (const block of assembled.releases) renderBlock(block);

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

// Re-export for callers that want the shape without importing the helpers.
export const __types = { TYPE_ORDER, orderedItems };
