import { api } from './api';

export type IssueStatus = 'open' | 'in-progress' | 'resolved' | 'closed';
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Issue {
  _id: string;
  productId: string;
  title: string;
  description?: string;
  status: IssueStatus;
  severity: IssueSeverity;
  reporter?: string;
  versionLabel?: string;
  mediaUrls?: string[];
  foundAt?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicIssuesPayload {
  product: {
    id: string;
    name: string;
    slug: string;
    description: string;
    icon: string;
    githubUrl: string;
    wpOrgSlug: string;
  };
  issues: Issue[];
}

export const getIssues = async (productId: string): Promise<Issue[]> => {
  const { data } = await api.get('/issues', { params: { productId } });
  return data;
};

export const createIssue = async (issue: any) => {
  const { data } = await api.post('/issues', issue);
  return data;
};

export const updateIssue = async ({ id, ...issue }: any) => {
  const { data } = await api.patch(`/issues/${id}`, issue);
  return data;
};

export const deleteIssue = async (id: string) => {
  const { data } = await api.delete(`/issues/${id}`);
  return data;
};

/** Public (no auth): the hosted issue tracker for an opted-in product. */
export const getPublicIssues = async (id: string): Promise<PublicIssuesPayload> => {
  const res = await fetch(`/api/public/issues/${id}`);
  if (!res.ok) {
    const err = new Error('Issues not found') as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
};
