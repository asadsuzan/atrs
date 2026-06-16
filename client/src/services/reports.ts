import { api } from './api';

export const getMonthlyReport = async (params: { month?: number; year?: number; productId?: string; startDate?: string; endDate?: string; ownerId?: string }) => {
  const { data } = await api.get('/reports/monthly', { params });
  return data;
};

export const getTrendData = async (params: { months?: number; productId?: string }) => {
  const { data } = await api.get('/reports/trend', { params });
  return data;
};

export const getAnnualReport = async (params: { year?: number; productId?: string; ownerId?: string }) => {
  const { data } = await api.get('/reports/annual', { params });
  return data;
};
