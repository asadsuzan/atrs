import { api } from './api';

export const getMarketingData = async (productId: string) => {
  const { data } = await api.get(`/products/${productId}/marketing`);
  return data;
};

export const updateMarketingData = async ({ productId, ...marketingData }: any) => {
  const { data } = await api.put(`/products/${productId}/marketing`, marketingData);
  return data;
};

export const deleteMarketingData = async (productId: string) => {
  const { data } = await api.delete(`/products/${productId}/marketing`);
  return data;
};
