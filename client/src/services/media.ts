import { api } from './api';

export interface IMediaReference {
  entityType: 'product' | 'marketing' | 'activity';
  entityId: string;
  entityName: string;
  field: string;
  productId?: string;
  productName?: string;
}

export interface IMediaFile {
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  createdAt: string;
  references: IMediaReference[];
  isOrphaned: boolean;
  /** Where the file physically lives. */
  storage?: 'local' | 'r2';
}

export const getMediaList = async (): Promise<IMediaFile[]> => {
  const { data } = await api.get('/media');
  return data;
};

export const deleteMedia = async (filename: string, force: boolean = false): Promise<{ success: boolean; filename: string }> => {
  const { data } = await api.delete(`/media/${encodeURIComponent(filename)}`, {
    params: { force }
  });
  return data;
};

export const bulkDeleteMedia = async (filenames: string[], force: boolean = false): Promise<{ success: boolean; deleted: string[]; failed: { filename: string; error: string }[] }> => {
  const { data } = await api.post('/media/bulk-delete', { filenames, force });
  return data;
};

export const purgeOrphanedMedia = async (): Promise<{ success: boolean; count: number; deletedFiles: string[] }> => {
  const { data } = await api.post('/media/purge-orphaned');
  return data;
};
