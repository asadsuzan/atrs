import { Request, Response, NextFunction } from 'express';
import { FeatureRequestService } from '../services/FeatureRequestService';

const featureRequestService = new FeatureRequestService();

export const createFeatureRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const request = await featureRequestService.createRequest(req.body, req.user!);
    res.status(201).json(request);
  } catch (error) {
    next(error);
  }
};

export const getFeatureRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requests = await featureRequestService.getRequests(req.user!);
    res.status(200).json(requests);
  } catch (error) {
    next(error);
  }
};

export const updateFeatureRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const request = await featureRequestService.updateRequest(req.params.id as string, req.body, req.user!);
    if (!request) return res.status(404).json({ message: 'Feature request not found' });
    res.status(200).json(request);
  } catch (error) {
    next(error);
  }
};

export const deleteFeatureRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const request = await featureRequestService.deleteRequest(req.params.id as string, req.user!);
    if (!request) return res.status(404).json({ message: 'Feature request not found' });
    res.status(200).json({ message: 'Feature request deleted successfully' });
  } catch (error) {
    next(error);
  }
};
