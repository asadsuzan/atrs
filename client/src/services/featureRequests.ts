import { api } from './api';

export type FeatureRequestStatus = 'pending' | 'planned' | 'in-progress' | 'done' | 'declined';

export interface FeatureRequest {
  _id: string;
  /** Populated with name/email for admins; a plain id string otherwise. */
  requesterId: string | { _id: string; name: string; email: string };
  title: string;
  description?: string;
  status: FeatureRequestStatus;
  /** Admin's response, visible to the requester. */
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

/** Own requests for users; every user's requests for admins. */
export const getFeatureRequests = async (): Promise<FeatureRequest[]> => {
  const { data } = await api.get('/feature-requests');
  return data;
};

export const createFeatureRequest = async (request: { title: string; description?: string }) => {
  const { data } = await api.post('/feature-requests', request);
  return data;
};

export const updateFeatureRequest = async ({ id, ...request }: { id: string } & Partial<Pick<FeatureRequest, 'title' | 'description' | 'status' | 'adminNote'>>) => {
  const { data } = await api.patch(`/feature-requests/${id}`, request);
  return data;
};

export const deleteFeatureRequest = async (id: string) => {
  const { data } = await api.delete(`/feature-requests/${id}`);
  return data;
};
