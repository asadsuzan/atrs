import fs from 'fs';
import path from 'path';

const uploadsRoot = path.resolve(__dirname, '../../../uploads');

export const deleteMediaFile = (url?: string | null | undefined) => {
  if (!url || !url.startsWith('/uploads/')) return;
  try {
    const filename = url.replace('/uploads/', '');
    const filePath = path.resolve(uploadsRoot, filename);
    // Containment check: never delete anything outside the uploads directory.
    if (filePath !== uploadsRoot && !filePath.startsWith(uploadsRoot + path.sep)) {
      console.error(`Refusing to delete file outside uploads dir: ${url}`);
      return;
    }
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
