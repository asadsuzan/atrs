import { api } from './api';

/** Downloads the full DB export via the authenticated API client (admin only). */
export const exportAllData = async () => {
  const response = await api.get('/export', { responseType: 'blob' });
  const url = window.URL.createObjectURL(response.data as Blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'atrs-export.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
