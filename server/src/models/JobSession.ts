import mongoose, { Schema, Document } from 'mongoose';

/**
 * Cross-instance cancellation flag for a streaming job (WP import, bulk
 * delete, ...). On serverless the request that starts a job and the request
 * that cancels it can land on different function instances, so the cancel
 * signal can't live only in process memory — it's mirrored here and the
 * running instance polls it. Documents auto-expire so the collection stays
 * small.
 */
export interface IJobSession extends Document {
  sessionId: string;
  userId: string;
  cancelled: boolean;
  createdAt: Date;
}

const JobSessionSchema = new Schema<IJobSession>({
  sessionId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  cancelled: { type: Boolean, default: false },
  // TTL: drop the row an hour after creation (jobs are far shorter-lived).
  createdAt: { type: Date, default: Date.now, expires: 3600 },
});

export const JobSession = mongoose.model<IJobSession>('JobSession', JobSessionSchema);
