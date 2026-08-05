import { api } from './api';

export interface Competitor {
  _id: string;
  productId: string;
  name: string;
  url?: string;
  type: 'direct' | 'indirect' | 'alternative';
  wpOrgSlug?: string;
  rssFeedUrl?: string;
  keyFeatures: string[];
  status: 'active' | 'inactive';
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompetitorSnapshot {
  _id: string;
  competitorId: string;
  type: 'wp_org' | 'changelog_rss' | 'manual';
  data: Record<string, any>;
  capturedAt: string;
}

export const getCompetitors = async (productId: string): Promise<Competitor[]> => {
  const { data } = await api.get(`/competitors/${productId}`);
  return data;
};

export const getCompetitorDetails = async (productId: string, competitorId: string): Promise<{ competitor: Competitor; snapshots: CompetitorSnapshot[] }> => {
  const { data } = await api.get(`/competitors/${productId}/${competitorId}`);
  return data;
};

export const createCompetitor = async (productId: string, payload: Partial<Competitor>): Promise<Competitor> => {
  const { data } = await api.post(`/competitors/${productId}`, payload);
  return data;
};

export const updateCompetitor = async (productId: string, competitorId: string, payload: Partial<Competitor>): Promise<Competitor> => {
  const { data } = await api.patch(`/competitors/${productId}/${competitorId}`, payload);
  return data;
};

export const deleteCompetitor = async (productId: string, competitorId: string): Promise<void> => {
  await api.delete(`/competitors/${productId}/${competitorId}`);
};

// --- Discovery and sync -----------------------------------------------------

/**
 * A real WordPress.org plugin proposed as a competitor.
 *
 * Every field is live directory data. The previous implementation asked an LLM to
 * name competitors, which produced plugins that frequently did not exist — so
 * `relevance` and `relevanceBasis` are carried here specifically so the user can
 * judge each suggestion rather than being asked to trust it.
 */
export interface DiscoveredCompetitor {
  slug: string;
  name: string;
  url: string;
  shortDescription: string;
  author: string | null;
  activeInstalls: number | null;
  rating: number | null;
  numRatings: number;
  lastUpdated: string | null;
  tags: string[];
  /** 0–100 likelihood this genuinely competes. */
  relevance: number;
  /** Plain-language reasons behind the score. */
  relevanceBasis: string[];
  /** Which directory searches surfaced it. */
  matchedVia: string[];
  alreadyTracked: boolean;
  suggestedType: 'direct' | 'indirect' | 'alternative';
}

export interface DiscoverResponse {
  candidates: DiscoveredCompetitor[];
  searchTerms: string[];
  /** Explains an empty result rather than leaving the user guessing. */
  caveat?: string;
}

export const discoverCompetitors = async (productId: string, limit = 12): Promise<DiscoverResponse> => {
  const { data } = await api.get(`/competitors/${productId}/discover`, { params: { limit } });
  return data;
};

export const trackCompetitors = async (
  productId: string,
  slugs: string[],
): Promise<{ added: Competitor[]; skipped: string[] }> => {
  const { data } = await api.post(`/competitors/${productId}/track`, { slugs });
  return data;
};

export const syncCompetitors = async (
  productId: string,
): Promise<{ productSnapshot: unknown; competitorSnapshots: number }> => {
  const { data } = await api.post(`/competitors/${productId}/sync`, {});
  return data;
};
