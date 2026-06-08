import { api } from './api';

export const getActivities = async (params?: any) => {
  const { data } = await api.get('/activities', { params });
  return data;
};

export const getActivityById = async (id: string) => {
  const { data } = await api.get(`/activities/${id}`);
  return data;
};

export const createActivity = async (activity: any) => {
  const { data } = await api.post('/activities', activity);
  return data;
};

export const updateActivity = async ({ id, ...activity }: any) => {
  const { data } = await api.patch(`/activities/${id}`, activity);
  return data;
};

export const deleteActivity = async (id: string) => {
  const { data } = await api.delete(`/activities/${id}`);
  return data;
};
