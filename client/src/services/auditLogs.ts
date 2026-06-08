import { api } from './api';

export const getAuditLogs = async (params?: any) => {
  const response = await api.get('/audit-logs', { params });
  return response.data;
};
