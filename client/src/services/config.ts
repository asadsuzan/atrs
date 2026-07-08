import { api } from './api';

export const getAppConfig = async () => {
  const { data } = await api.get('/config');
  return data;
};

export const updateAppConfig = async (config: any) => {
  const { data } = await api.post('/config', config);
  return data;
};

export interface R2TestResult {
  ok: boolean;
  message: string;
}

/**
 * Verifies Cloudflare R2 credentials with a server-side write/read/delete
 * round-trip before saving. Blank fields fall back to stored settings.
 */
export const testStorageConnection = async (r2: {
  accountId: string;
  bucket: string;
  publicBaseUrl: string;
  accessKeyId: string;
  secretAccessKey: string;
}): Promise<R2TestResult> => {
  const { data } = await api.post('/config/storage/test', r2);
  return data as R2TestResult;
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
  /** When true, the presentation deck derives the accent from each product's logo/banner. */
  accentDynamic: boolean;
  thankYouEnabled: boolean;
  thankYouTitle: string;
  thankYouMessage: string;
}

/** Branding for the presentation deck — readable by any authenticated user. */
export const getBranding = async (): Promise<Branding> => {
  const { data } = await api.get('/notifications/branding');
  return data as Branding;
};
