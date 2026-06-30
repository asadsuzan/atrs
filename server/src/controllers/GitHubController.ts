import { Request, Response, NextFunction } from 'express';
import { GitHubService } from '../services/GitHubService';

const githubService = new GitHubService();

/** Returns whether the current user has a connected GitHub account. */
export const getStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await githubService.getStatus(req.user!);
    res.status(200).json(status);
  } catch (error) {
    next(error);
  }
};

/** Stores (encrypted) and validates the user's GitHub token. */
export const connect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await githubService.connect(req.body.token, req.user!);
    res.status(200).json(status);
  } catch (error) {
    next(error);
  }
};

/** Removes the user's stored GitHub token. */
export const disconnect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await githubService.disconnect(req.user!);
    res.status(200).json({ connected: false, login: null, connectedAt: null });
  } catch (error) {
    next(error);
  }
};

/** Syncs a product's GitHub Releases into Versions. */
export const syncReleases = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await githubService.syncReleases(req.params.id as string, req.user!);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
