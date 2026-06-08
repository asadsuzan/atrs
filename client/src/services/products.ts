import { api } from './api';

export const getProducts = async (params?: any) => {
  const { data } = await api.get('/products', { params });
  return data;
};

export const getProductById = async (id: string) => {
  const { data } = await api.get(`/products/${id}`);
  return data;
};

export const createProduct = async (product: any) => {
  const { data } = await api.post('/products', product);
  return data;
};

export const updateProduct = async ({ id, ...product }: any) => {
  const { data } = await api.patch(`/products/${id}`, product);
  return data;
};

export const deleteProduct = async (id: string) => {
  const { data } = await api.delete(`/products/${id}`);
  return data;
};
