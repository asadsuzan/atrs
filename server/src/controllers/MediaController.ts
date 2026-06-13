import { Request, Response, NextFunction } from 'express';
import { MediaService } from '../services/MediaService';

const mediaService = new MediaService();

export const getMediaList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await mediaService.getAllMedia();
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

export const purgeOrphaned = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deletedFiles = await mediaService.purgeOrphaned();
    res.status(200).json({ success: true, count: deletedFiles.length, deletedFiles });
  } catch (error) {
    next(error);
  }
};
