import { api } from './api';

export interface GitHubStatus {
  connected: boolean;
  login: string | null;
  connectedAt: string | null;
}

export interface ReleaseSyncResult {
  repo: string;
  total: number;
  created: number;
  updated: number;
  skipped: number;
}

/** Whether the current user has a GitHub account connected. */
export const getGithubStatus = async (): Promise<GitHubStatus> => {
  const { data } = await api.get('/github/status');
  return data;
};

/** Connect (or replace) the user's GitHub Personal Access Token. */
export const connectGithub = async (token: string): Promise<GitHubStatus> => {
  const { data } = await api.post('/github/connect', { token });
  return data;
};

/** Remove the stored GitHub token. */
export const disconnectGithub = async (): Promise<GitHubStatus> => {
  const { data } = await api.delete('/github/connect');
  return data;
};

/** Pull a product's GitHub Releases into its Versions. */
export const syncProductReleases = async (productId: string): Promise<ReleaseSyncResult> => {
  const { data } = await api.post(`/github/products/${productId}/sync-releases`);
  return data;
};
