import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCompetitors,
  getCompetitorDetails,
  createCompetitor,
  updateCompetitor,
  deleteCompetitor,
  discoverCompetitors,
  trackCompetitors,
  syncCompetitors,
  type Competitor,
  type CompetitorSnapshot,
  type DiscoverResponse,
} from '../services/competitors';

export function useCompetitors(productId: string | undefined | null) {
  return useQuery<Competitor[]>({
    queryKey: ['competitors', productId],
    queryFn: () => getCompetitors(productId as string),
    enabled: !!productId,
  });
}

export function useCompetitorDetails(productId: string | undefined | null, competitorId: string | undefined | null) {
  return useQuery<{ competitor: Competitor; snapshots: CompetitorSnapshot[] }>({
    queryKey: ['competitors', productId, competitorId],
    queryFn: () => getCompetitorDetails(productId as string, competitorId as string),
    enabled: !!productId && !!competitorId,
  });
}

export function useCreateCompetitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, payload }: { productId: string; payload: Partial<Competitor> }) =>
      createCompetitor(productId, payload),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['competitors', productId] });
    },
  });
}

export function useUpdateCompetitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, competitorId, payload }: { productId: string; competitorId: string; payload: Partial<Competitor> }) =>
      updateCompetitor(productId, competitorId, payload),
    onSuccess: (_, { productId, competitorId }) => {
      queryClient.invalidateQueries({ queryKey: ['competitors', productId] });
      queryClient.invalidateQueries({ queryKey: ['competitors', productId, competitorId] });
    },
  });
}

export function useDeleteCompetitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, competitorId }: { productId: string; competitorId: string }) =>
      deleteCompetitor(productId, competitorId),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['competitors', productId] });
    },
  });
}

/**
 * Read-only competitor discovery.
 *
 * Deliberately not auto-run on mount: it issues several WordPress.org searches, and
 * nobody wants that on every page load. Callers enable it explicitly when the user
 * opens the discovery panel.
 */
export function useDiscoverCompetitors(productId: string | undefined | null, enabled = false) {
  return useQuery<DiscoverResponse>({
    queryKey: ['competitors', 'discover', productId],
    queryFn: () => discoverCompetitors(productId as string),
    enabled: !!productId && enabled,
    // Directory rankings move slowly; an hour avoids re-searching on every reopen.
    staleTime: 60 * 60_000,
    retry: false,
  });
}

export function useTrackCompetitors() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, slugs }: { productId: string; slugs: string[] }) =>
      trackCompetitors(productId, slugs),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['competitors', productId] });
      // A new competitor changes every comparative view.
      queryClient.invalidateQueries({ queryKey: ['intelligence', 'matrix', productId] });
      queryClient.invalidateQueries({ queryKey: ['intelligence', 'gapAnalysis', productId] });
      queryClient.invalidateQueries({ queryKey: ['intelligence', 'standout', productId] });
    },
  });
}

export function useSyncCompetitors() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId }: { productId: string }) => syncCompetitors(productId),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['competitors', productId] });
      queryClient.invalidateQueries({ queryKey: ['intelligence', 'matrix', productId] });
      queryClient.invalidateQueries({ queryKey: ['intelligence', 'market', productId] });
    },
  });
}
