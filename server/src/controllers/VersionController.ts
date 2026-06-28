import { Request, Response, NextFunction } from 'express';
import { VersionService } from '../services/VersionService';

const versionService = new VersionService();

export const createVersion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const version = await versionService.createVersion(req.body, req.user!);
    res.status(201).json(version);
  } catch (error) {
    next(error);
  }
};

export const getVersions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // productId is optional: omit it to get every version across the owner's
    // products (used by the dashboard aggregate), with the product populated.
    const { productId } = req.query;
    const versions = await versionService.getVersions(productId as string | undefined, req.user!);
    res.status(200).json(versions);
  } catch (error) {
    next(error);
  }
};

export const getVersionById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const version = await versionService.getVersionById(req.params.id as string, req.user!);
    if (!version) return res.status(404).json({ message: 'Version not found' });
    res.status(200).json(version);
  } catch (error) {
    next(error);
  }
};

export const updateVersion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const version = await versionService.updateVersion(req.params.id as string, req.body, req.user!);
    if (!version) return res.status(404).json({ message: 'Version not found' });
    res.status(200).json(version);
  } catch (error) {
    next(error);
  }
};

export const deleteVersion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const version = await versionService.deleteVersion(req.params.id as string, req.user!);
    if (!version) return res.status(404).json({ message: 'Version not found' });
    res.status(200).json({ message: 'Version deleted successfully' });
  } catch (error) {
    next(error);
  }
};
