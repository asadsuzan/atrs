import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  slug: string;
  githubUrl: string;
  banner?: string;
  icon?: string;
  wpOrgSlug?: string;
  category: 'plugin' | 'block';
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    githubUrl: { type: String, required: true },
    banner: { type: String, default: '' },
    icon: { type: String, default: '' },
    wpOrgSlug: { type: String, default: '' },
    category: {
      type: String,
      enum: ['plugin', 'block'],
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
