import mongoose, { Schema, Document } from 'mongoose';

export interface IVersion extends Document {
  ownerId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  label: string;
  notes?: string;
  status: 'released' | 'unreleased';
  releasedAt?: Date;
  author?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VersionSchema: Schema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    label: { type: String, required: true },
    notes: { type: String, default: '' },
    status: { type: String, enum: ['released', 'unreleased'], default: 'released' },
    releasedAt: { type: Date, required: false },
    author: { type: String, default: '' },
  },
  { timestamps: true }
);

// Index for productId lookups.
VersionSchema.index({ productId: 1 });

export const Version = mongoose.model<IVersion>('Version', VersionSchema);
