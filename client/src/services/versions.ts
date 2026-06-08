import { api } from './api';

export const getVersions = async (productId: string) => {
  const { data } = await api.get('/versions', { params: { productId } });
  return data;
};

export const createVersion = async (version: any) => {
  const { data } = await api.post('/versions', version);
  return data;
};

export const updateVersion = async ({ id, ...version }: any) => {
  const { data } = await api.patch(`/versions/${id}`, version);
  return data;
};

export const deleteVersion = async (id: string) => {
  const { data } = await api.delete(`/versions/${id}`);
  return data;
};
