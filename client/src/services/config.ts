import { api } from './api';

export const getAppConfig = async () => {
  const { data } = await api.get('/config');
  return data;
};

export const updateAppConfig = async (config: any) => {
  const { data } = await api.post('/config', config);
  return data;
};

export type NavMode = 'expanded' | 'collapsed' | 'disabled';

/** Readable by any authenticated user (not just admins). */
export const getNavSettings = async () => {
  const { data } = await api.get('/notifications/nav-settings');
  return data as { mode: NavMode };
};

export interface Branding {
  companyName: string;
  logoUrl: string;
  accentColor: string;
  thankYouEnabled: boolean;
  thankYouTitle: string;
  thankYouMessage: string;
}

/** Branding for the presentation deck — readable by any authenticated user. */
export const getBranding = async (): Promise<Branding> => {
  const { data } = await api.get('/notifications/branding');
  return data as Branding;
};
