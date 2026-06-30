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
  reporterEmail?: string;
  source?: 'internal' | 'public';
  needsReview?: boolean;
  versionLabel?: string;
  mediaUrls?: string[];
  foundAt?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicIssueReport {
  title: string;
  description?: string;
  versionLabel?: string;
  reporter?: string;
  reporterEmail?: string;
  /** Honeypot — leave empty; bots that fill it are dropped server-side. */
  website?: string;
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

/** All issues across the owner's products, with the product populated. */
export interface IssueWithProduct extends Issue {
  productId: string | { _id: string; name: string; slug: string; icon?: string };
}
export const getAllIssues = async (): Promise<IssueWithProduct[]> => {
  const { data } = await api.get('/issues');
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

/** Public (no auth): submit a bug report via the "Report an issue" form. */
export const reportPublicIssue = async (id: string, report: PublicIssueReport): Promise<void> => {
  const res = await fetch(`/api/public/products/${id}/issues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
  });
  if (!res.ok) {
    let message = 'Could not submit your report. Please try again.';
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch { /* keep default */ }
    throw new Error(message);
  }
};
