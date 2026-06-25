import { z } from 'zod';
import { objectId } from './common.schema';

const status = z.enum(['open', 'in-progress', 'resolved', 'closed']);
const severity = z.enum(['low', 'medium', 'high', 'critical']);
const optionalDate = z.string().nullable().optional().transform((val) => (val === '' ? null : val));

export const createIssueSchema = z.object({
  body: z.object({
    productId: objectId,
    title: z.string().min(1, 'title is required'),
    description: z.string().optional(),
    status: status.optional(),
    severity: severity.optional(),
    reporter: z.string().optional(),
    versionLabel: z.string().optional(),
    mediaUrls: z.array(z.string()).optional(),
    foundAt: optionalDate,
    resolvedAt: optionalDate,
    assigneeIds: z.array(objectId).optional(),
    dueDate: optionalDate,
    estimatedHours: z.number().optional(),
    actualHours: z.number().optional(),
  }),
});

export const updateIssueSchema = z.object({
  body: z.object({
    productId: objectId.optional(),
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    status: status.optional(),
    severity: severity.optional(),
    reporter: z.string().optional(),
    versionLabel: z.string().optional(),
    mediaUrls: z.array(z.string()).optional(),
    foundAt: optionalDate,
    resolvedAt: optionalDate,
    assigneeIds: z.array(objectId).optional(),
    dueDate: optionalDate,
    estimatedHours: z.number().optional(),
    actualHours: z.number().optional(),
  }),
  params: z.object({
    id: objectId,
  }),
});
