import { Request, Response, NextFunction } from 'express';
import { VersionService } from '../services/VersionService';

const versionService = new VersionService();

export const createVersion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const version = await versionService.createVersion(req.body);
    res.status(201).json(version);
  } catch (error) {
    next(error);
  }
};

export const getVersions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.query;
    if (!productId) {
      return res.status(400).json({ message: 'productId is required' });
    }
    const versions = await versionService.getVersions(productId as string);
    res.status(200).json(versions);
  } catch (error) {
    next(error);
  }
};

export const getVersionById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const version = await versionService.getVersionById(req.params.id as string);
    if (!version) return res.status(404).json({ message: 'Version not found' });
    res.status(200).json(version);
  } catch (error) {
    next(error);
  }
};

export const updateVersion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const version = await versionService.updateVersion(req.params.id as string, req.body);
    if (!version) return res.status(404).json({ message: 'Version not found' });
    res.status(200).json(version);
  } catch (error) {
    next(error);
  }
};

export const deleteVersion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const version = await versionService.deleteVersion(req.params.id as string);
    if (!version) return res.status(404).json({ message: 'Version not found' });
    res.status(200).json({ message: 'Version deleted successfully' });
  } catch (error) {
    next(error);
  }
};
