import mongoose, { Schema, Document } from 'mongoose';

export interface IActivityItem {
  title: string;
  description?: string;
  mediaType?: 'image' | 'gif' | 'video';
  mediaUrl?: string;
}

export interface IActivity extends Document {
  productId: mongoose.Types.ObjectId;
  type: 'feature' | 'improvement' | 'bug-fix';
  title: string;
  shortDescription: string;
  tier?: 'free' | 'pro';
  mediaType?: 'image' | 'gif' | 'video';
  mediaUrl?: string;
  tags?: string[];
  items: IActivityItem[];
  activityDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ActivityItemSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: false },
    mediaType: {
      type: String,
      enum: ['image', 'gif', 'video'],
      required: false,
    },
    mediaUrl: { type: String, required: false },
  },
  { _id: false }
);

const ActivitySchema: Schema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    type: {
      type: String,
      enum: ['feature', 'improvement', 'bug-fix'],
      required: true,
    },
    title: { type: String, required: true },
    shortDescription: { type: String, required: true },
    tier: {
      type: String,
      enum: ['free', 'pro'],
      required: false,
    },
    tags: [{ type: String }],
    mediaType: {
      type: String,
      enum: ['image', 'gif', 'video'],
      required: false,
    },
    mediaUrl: { type: String, required: false },
    items: [ActivityItemSchema],
    activityDate: { type: Date, required: true },
  },
  { timestamps: true }
);

export const Activity = mongoose.model<IActivity>('Activity', ActivitySchema);
