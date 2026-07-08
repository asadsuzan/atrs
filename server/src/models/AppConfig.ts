import mongoose, { Schema, Document } from 'mongoose';

/**
 * Singleton document holding the runtime app configuration (the contents of
 * app.config.json) for deployments with a read-only filesystem (Vercel).
 * Locally the file on disk remains the source of truth.
 */
export interface IAppConfig extends Document {
  singleton: 'app';
  data: Record<string, any>;
  updatedAt: Date;
}

const AppConfigSchema = new Schema<IAppConfig>(
  {
    singleton: { type: String, required: true, unique: true, default: 'app' },
    data: { type: Schema.Types.Mixed, required: true, default: {} },
  },
  { timestamps: true, minimize: false }
);

export const AppConfig = mongoose.model<IAppConfig>('AppConfig', AppConfigSchema);
