import fs from 'fs';
import path from 'path';

export const deleteMediaFile = (url?: string | null | undefined) => {
  if (!url || !url.startsWith('/uploads/')) return;
  try {
    const filename = url.replace('/uploads/', '');
    const filePath = path.join(__dirname, '../../../uploads', filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(`Failed to delete media file: ${url}`, error);
  }
};

export const deleteMediaFiles = (urls?: (string | null | undefined)[]) => {
  if (!urls || !Array.isArray(urls)) return;
  urls.forEach(url => deleteMediaFile(url));
};
