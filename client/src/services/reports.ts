import { api } from './api';

export const getMonthlyReport = async (params: { month: number; year: number; productId?: string }) => {
  const { data } = await api.get('/reports/monthly', { params });
  return data;
};
