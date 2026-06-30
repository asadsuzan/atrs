import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { IssueService } from '../services/IssueService';
import { Product } from '../models/Product';

const issueService = new IssueService();

export const createIssue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const issue = await issueService.createIssue(req.body, req.user!);
    res.status(201).json(issue);
  } catch (error) {
    next(error);
  }
};

export const getIssues = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // productId is optional: omit it to get every issue across the owner's
    // products (used by the dashboard aggregate), with the product populated.
    const { productId } = req.query;
    const issues = await issueService.getIssues(productId as string | undefined, req.user!);
    res.status(200).json(issues);
  } catch (error) {
    next(error);
  }
};

export const getPendingReviewIssues = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const issues = await issueService.getPendingReview(req.user!);
    res.status(200).json(issues);
  } catch (error) {
    next(error);
  }
};

export const getIssueById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const issue = await issueService.getIssueById(req.params.id as string, req.user!);
    if (!issue) return res.status(404).json({ message: 'Issue not found' });
    res.status(200).json(issue);
  } catch (error) {
    next(error);
  }
};

export const updateIssue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const issue = await issueService.updateIssue(req.params.id as string, req.body, req.user!);
    if (!issue) return res.status(404).json({ message: 'Issue not found' });
    res.status(200).json(issue);
  } catch (error) {
    next(error);
  }
};

export const deleteIssue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const issue = await issueService.deleteIssue(req.params.id as string, req.user!);
    if (!issue) return res.status(404).json({ message: 'Issue not found' });
    res.status(200).json({ message: 'Issue deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Public (no auth): the issue tracker for a product whose owner has opted in via
 * `publicIssuesEnabled`. Returns 404 for unknown/malformed ids and unpublished
 * products so they can't be probed.
 */
export const getPublicIssues = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Issues not found' });
    }
    const product = await Product.findById(id);
    if (!product || !product.publicIssuesEnabled) {
      return res.status(404).json({ message: 'Issues not found' });
    }
    const issues = await issueService.getPublicIssues(id);
    res.status(200).json({
      product: {
        id: String(product._id),
        name: product.name,
        slug: product.slug,
        description: product.description || '',
        icon: product.icon || '',
        githubUrl: product.githubUrl || '',
        wpOrgSlug: product.wpOrgSlug || '',
      },
      issues,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public (no auth): accept a bug report from the public "Report an issue" form.
 * The product must have a published issues page. Created issues are queued for
 * owner review and hidden from the public page until approved.
 */
export const reportPublicIssue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Issues not found' });
    }
    // Honeypot: silently accept (200) but drop bot submissions.
    if (req.body.website) {
      return res.status(201).json({ ok: true });
    }
    await issueService.reportPublicIssue(id, req.body);
    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
};
