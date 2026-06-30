// Single source of truth for version ordering + status flagging.
//
// Versions arrive from the API in a few shapes (per-product list, or the
// owner-wide list with the product populated). These helpers normalise them,
// order them canonically, and compute the two flags the whole app renders:
//   - isUnreleased: status === 'unreleased'
//   - isLatest:     the newest *released* version (the current public release)
// Every version selector / badge in the app derives from these so "Latest" and
// "Unreleased" mean the same thing everywhere.

export type VersionStatus = 'released' | 'unreleased';

export interface RawVersion {
  _id?: string;
  id?: string;
  label: string;
  status?: VersionStatus | string;
  releasedAt?: string | null;
  productId?: any;
  author?: string;
  notes?: string;
  tags?: string[];
  [key: string]: any;
}

export interface DecoratedVersion extends RawVersion {
  id: string;
  isUnreleased: boolean;
  isLatest: boolean;
}

/** Compare two version labels, newest first (numeric-aware, ignores a leading "v"). */
export function compareVersionDesc(a: string, b: string): number {
  const clean = (s: string) => (s || '').replace(/^v/i, '').trim();
  return clean(b).localeCompare(clean(a), undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Normalise, order and flag a list of versions for one product.
 * Order: unreleased first (newest label first), then released (newest first).
 * Exactly one released version is flagged `isLatest`.
 */
export function decorateVersions(raw: RawVersion[] | undefined | null): DecoratedVersion[] {
  const list: DecoratedVersion[] = (raw || []).map(v => ({
    ...v,
    id: String(v._id ?? v.id ?? v.label),
    isUnreleased: v.status === 'unreleased',
    isLatest: false,
  }));
  list.sort((a, b) => {
    if (a.isUnreleased !== b.isUnreleased) return a.isUnreleased ? -1 : 1;
    return compareVersionDesc(a.label, b.label);
  });
  const latest = list.find(v => !v.isUnreleased);
  if (latest) latest.isLatest = true;
  return list;
}

/** The newest released version label for a product, or undefined. */
export function latestReleasedLabel(raw: RawVersion[] | undefined | null): string | undefined {
  return decorateVersions(raw).find(v => v.isLatest)?.label;
}

/** Group versions by product id, each group independently decorated. */
export function groupVersionsByProduct(raw: RawVersion[] | undefined | null): Record<string, DecoratedVersion[]> {
  const buckets: Record<string, RawVersion[]> = {};
  for (const v of raw || []) {
    const pid = String(v.productId?._id ?? v.productId ?? '');
    (buckets[pid] ||= []).push(v);
  }
  const out: Record<string, DecoratedVersion[]> = {};
  for (const pid of Object.keys(buckets)) out[pid] = decorateVersions(buckets[pid]);
  return out;
}

export interface LabelInfo {
  label: string;
  isUnreleased: boolean;
}

/**
 * Union version status by label across (possibly many) products. Used by
 * cross-product, label-keyed filters (e.g. Reports) so they can badge an
 * "Unreleased" label without per-product version objects. A label counts as
 * unreleased if any version carrying it is unreleased.
 */
export function summarizeLabels(raw: RawVersion[] | undefined | null): Map<string, LabelInfo> {
  const map = new Map<string, LabelInfo>();
  for (const v of raw || []) {
    if (!v.label) continue;
    const existing = map.get(v.label);
    const isUnreleased = v.status === 'unreleased';
    if (!existing) map.set(v.label, { label: v.label, isUnreleased });
    else if (isUnreleased) existing.isUnreleased = true;
  }
  return map;
}
