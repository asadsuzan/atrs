import mongoose, { Schema, Document } from 'mongoose';

export type FeatureRequestStatus = 'pending' | 'planned' | 'in-progress' | 'done' | 'declined';

/**
 * A feature request for the ATRS platform itself, submitted in-app by a
 * logged-in user and triaged by admins (status + optional response note).
 */
export interface IFeatureRequest extends Document {
  requesterId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: FeatureRequestStatus;
  /** Admin's response, visible to the requester (e.g. why it was declined). */
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FeatureRequestSchema: Schema = new Schema(
  {
    requesterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'planned', 'in-progress', 'done', 'declined'],
      default: 'pending',
      index: true,
    },
    adminNote: { type: String, default: '' },
  },
  { timestamps: true }
);

export const FeatureRequest = mongoose.model<IFeatureRequest>('FeatureRequest', FeatureRequestSchema);
