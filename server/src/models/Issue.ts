import mongoose, { Schema, Document } from 'mongoose';

export type IssueStatus = 'open' | 'in-progress' | 'resolved' | 'closed';
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface IIssue extends Document {
  ownerId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: IssueStatus;
  severity: IssueSeverity;
  /** Who reported the issue (free text — a name, username, or email). */
  reporter?: string;
  /** Affected version label (free text, e.g. "2.0.3"). */
  versionLabel?: string;
  /** Screenshots / recordings attached to the issue. */
  mediaUrls?: string[];
  foundAt?: Date;
  resolvedAt?: Date;
  assigneeIds?: mongoose.Types.ObjectId[];
  dueDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  createdAt: Date;
  updatedAt: Date;
}

const IssueSchema: Schema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'resolved', 'closed'],
      default: 'open',
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    reporter: { type: String, default: '' },
    versionLabel: { type: String, default: '' },
    mediaUrls: [{ type: String, required: false }],
    foundAt: { type: Date, required: false },
    resolvedAt: { type: Date, required: false },
    assigneeIds: [{ type: Schema.Types.ObjectId, ref: 'User', required: false, index: true }],
    dueDate: { type: Date, required: false },
    estimatedHours: { type: Number, required: false },
    actualHours: { type: Number, required: false },
  },
  { timestamps: true }
);

// Index for productId lookups.
IssueSchema.index({ productId: 1 });

export const Issue = mongoose.model<IIssue>('Issue', IssueSchema);
