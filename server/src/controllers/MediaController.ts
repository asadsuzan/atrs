import { Request, Response, NextFunction } from 'express';
import { MediaService } from '../services/MediaService';
import { runStreamJob } from '../utils/sseStream';

const mediaService = new MediaService();

export const getMediaList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await mediaService.getAllMedia(req.user);
    res.status(200).json(list);
  } catch (error) {
    next(error);
  }
};

export const deleteMedia = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filename } = req.params;
    const force = req.query.force === 'true';
    const result = await mediaService.deleteMedia(filename as string, force);
    res.status(200).json(result);
  } catch (error: any) {
    if (error.message && error.message.includes('Cannot delete referenced file')) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
};

export const bulkDeleteMedia = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filenames, force = false } = req.body;
    if (!Array.isArray(filenames) || filenames.length === 0) {
      return res.status(400).json({ message: 'filenames must be a non-empty array' });
    }
    const results: { deleted: string[]; failed: { filename: string; error: string }[] } = { deleted: [], failed: [] };
    for (const filename of filenames) {
      try {
        await mediaService.deleteMedia(filename, force);
        results.deleted.push(filename);
      } catch (err: any) {
        results.failed.push({ filename, error: err.message || 'Unknown error' });
      }
    }
    res.status(200).json({ success: true, ...results });
  } catch (error) {
    next(error);
  }
};

export const purgeOrphaned = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deletedFiles = await mediaService.purgeOrphaned();
    res.status(200).json({ success: true, count: deletedFiles.length, deletedFiles });
  } catch (error) {
    next(error);
  }
};

export const purgeOrphanedStream = async (req: Request, res: Response) => {
  await runStreamJob(req, res, async ({ emit, isCancelled }) => {
    emit({ type: 'info', step: 'scan', message: 'Scanning uploads for unused files...' });
    const all = await mediaService.getAllMedia();
    const orphans = all.filter((m) => m.isOrphaned);
    emit({ type: 'info', step: 'scan', message: `Found ${orphans.length} unused file${orphans.length !== 1 ? 's' : ''}` });

    let deleted = 0;
    const errors: string[] = [];
    let cancelled = false;

    for (let i = 0; i < orphans.length; i++) {
      if (isCancelled()) { cancelled = true; break; }
      const file = orphans[i];
      const ctx = { itemIndex: i + 1, totalItems: orphans.length };
      try {
        await mediaService.deleteMedia(file.filename, true);
        deleted++;
        emit({ ...ctx, type: 'success', step: 'delete', label: file.filename, message: `✓ Removed ${file.filename} (${(file.size / 1024).toFixed(1)} KB)` });
      } catch (err: any) {
        errors.push(`${file.filename}: ${err.message}`);
        emit({ ...ctx, type: 'error', step: 'delete', message: `✗ Failed ${file.filename}: ${err.message}` });
      }
    }

    emit({
      type: errors.length ? 'warn' : 'success',
      step: 'summary',
      message: `${cancelled ? 'Stopped' : 'Done'}: purged ${deleted} file(s), ${errors.length} error(s)`,
    });
    return { deleted, errors, cancelled, total: orphans.length };
  });
};
