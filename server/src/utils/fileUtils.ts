import fs from 'fs';
import path from 'path';
import { r2KeyFromUrl, deleteFromR2 } from './r2Storage';

const uploadsRoot = path.resolve(__dirname, '../../../uploads');

export const deleteMediaFile = (url?: string | null | undefined) => {
  if (!url) return;

  // R2-hosted media: absolute URL under the configured public base URL.
  // Deletion is fire-and-forget to keep this helper's sync signature.
  const r2Key = r2KeyFromUrl(url);
  if (r2Key) {
    deleteFromR2(r2Key).catch((error) => {
      console.error(`Failed to delete R2 media object: ${url}`, error);
    });
    return;
  }

  if (!url.startsWith('/uploads/')) return;
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
