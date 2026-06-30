import { api } from './api';

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
  label: string;
  releasedAt: string | null;
  notes?: string;
  unreleased?: boolean;
  groups: Record<ReleaseType, ReleaseItem[]>;
  counts: Record<ReleaseType, number>;
  total: number;
}

export interface ReleaseProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  banner: string;
  githubUrl: string;
  wpOrgSlug: string;
  category: string;
  publicChangelogEnabled: boolean;
  listedInDirectory: boolean;
}

export interface ReleasePayload {
  product: ReleaseProduct;
  releases: ReleaseBlock[];
  unreleased: ReleaseBlock | null;
  formats?: { readme: string; markdown: string };
}

/** Authenticated: full payload incl. WP.org / Markdown export formats. */
export const getProductRelease = async (id: string): Promise<ReleasePayload> => {
  const { data } = await api.get(`/products/${id}/release`);
  return data;
};

/** Public (no auth): the hosted changelog for an opted-in product. */
export const getPublicChangelog = async (id: string): Promise<ReleasePayload> => {
  const res = await fetch(`/api/public/changelog/${id}`);
  if (!res.ok) {
    const err = new Error('Changelog not found') as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
};
