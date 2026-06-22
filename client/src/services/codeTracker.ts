import { api } from './api';

export interface CodeActivity {
  _id: string;
  title: string;
  type: 'feature' | 'improvement' | 'bug-fix';
  shortDescription: string;
  filePath?: string;
  productId?: { _id: string; name: string; icon?: string } | string | null;
  tags?: string[];
  activityDate: string;
  createdAt: string;
}

export interface CodeTrackerStatus {
  enabled: boolean;
  model: string;
  ollamaUrl: string;
  lastError: string | null;
  lastEventAt: string | null;
  lastActivityAt: string | null;
  watching: { productId: string; productName: string; repoPath: string }[];
}

/** Recent auto-tracked changelog drafts (the "Currently Working On" feed). */
export const getCodeFeed = async (limit = 50) => {
  const { data } = await api.get('/code-tracker/feed', { params: { limit } });
  return data as CodeActivity[];
};

/** Admin-only tracker status (enabled, model, watched repos). */
export const getCodeTrackerStatus = async () => {
  const { data } = await api.get('/code-tracker/status');
  return data as CodeTrackerStatus;
};
