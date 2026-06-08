import { api } from './api';

export const getAuditLogs = async (params?: any) => {
  const { data } = await api.get('/audit-logs', { params });
  return data;
};
