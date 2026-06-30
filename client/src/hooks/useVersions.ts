import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getVersions, getAllVersions } from '../services/versions';
import {
  decorateVersions,
  groupVersionsByProduct,
  summarizeLabels,
  type DecoratedVersion,
  type LabelInfo,
} from '../lib/versions';

/**
 * All versions for a single product, ordered + flagged from the single source.
 * Mirrors the existing `['versions', productId]` query key so cache/invalidation
 * stays shared with VersionManager's mutations.
 */
export function useProductVersions(productId: string | undefined | null) {
  const query = useQuery({
    queryKey: ['versions', productId],
    queryFn: () => getVersions(productId as string),
    enabled: !!productId,
  });
  const versions = useMemo<DecoratedVersion[]>(() => decorateVersions(query.data as any[]), [query.data]);
  return { ...query, versions };
}

/**
 * Every version across the owner's products (with the product populated).
 * Returns the raw list plus a per-product decorated map and a label→status
 * summary for cross-product, label-keyed filters.
 */
export function useAllVersions() {
  const query = useQuery({
    queryKey: ['allVersions'],
    queryFn: () => getAllVersions(),
  });
  const raw = useMemo<any[]>(() => (query.data as any[]) || [], [query.data]);
  const byProduct = useMemo(() => groupVersionsByProduct(raw), [raw]);
  const labelInfo = useMemo<Map<string, LabelInfo>>(() => summarizeLabels(raw), [raw]);
  return { ...query, raw, byProduct, labelInfo };
}
