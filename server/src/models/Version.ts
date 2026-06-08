import mongoose, { Schema, Document } from 'mongoose';

export interface IVersion extends Document {
  productId: mongoose.Types.ObjectId;
  label: string;
  notes?: string;
  releasedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VersionSchema: Schema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    label: { type: String, required: true },
    notes: { type: String, default: '' },
    releasedAt: { type: Date, required: false },
  },
  { timestamps: true }
);

export const Version = mongoose.model<IVersion>('Version', VersionSchema);
