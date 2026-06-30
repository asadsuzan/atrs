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
    // Owners clear this to approve a public submission onto the public page.
    needsReview: z.boolean().optional(),
  }),
  params: z.object({
    id: objectId,
  }),
});

/**
 * Public "Report an issue" form. Deliberately narrow: anonymous reporters can
 * only suggest a title/description/version/contact. Status, severity, source,
 * and the review flag are set server-side, never by the client.
 */
export const publicReportIssueSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3, 'Please describe the issue').max(200),
    description: z.string().trim().max(5000).optional(),
    versionLabel: z.string().trim().max(60).optional(),
    reporter: z.string().trim().max(120).optional(),
    reporterEmail: z.string().trim().email('Enter a valid email').max(200).optional().or(z.literal('')),
    // Honeypot: bots fill hidden fields; humans leave it blank. Must be empty.
    website: z.string().max(0).optional(),
  }),
  params: z.object({
    id: objectId,
  }),
});
