import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  ownerId: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  githubUrl: string;
  banner?: string;
  icon?: string;
  wpOrgSlug?: string;
  category: 'plugin' | 'block' | 'theme' | 'standalone';
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    githubUrl: { type: String, required: true },
    banner: { type: String, default: '' },
    icon: { type: String, default: '' },
    wpOrgSlug: { type: String, default: '' },
    category: {
      type: String,
      enum: ['plugin', 'block', 'theme', 'standalone'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  { timestamps: true }
);

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
