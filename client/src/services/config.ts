import { api } from './api';

export const getAppConfig = async () => {
  const { data } = await api.get('/config');
  return data;
};

export const updateAppConfig = async (config: any) => {
  const { data } = await api.post('/config', config);
  return data;
};
