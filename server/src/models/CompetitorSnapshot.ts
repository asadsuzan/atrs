import mongoose, { Schema, Document } from 'mongoose';

export interface ICompetitorSnapshot extends Document {
  competitorId: mongoose.Types.ObjectId;
  type: 'wp_org' | 'changelog_rss' | 'manual';
  data: Record<string, any>;
  capturedAt: Date;
}

const CompetitorSnapshotSchema = new Schema(
  {
    competitorId: { type: Schema.Types.ObjectId, ref: 'Competitor', required: true, index: true },
    type: { type: String, enum: ['wp_org', 'changelog_rss', 'manual'], required: true },
    data: { type: Schema.Types.Mixed, required: true },
    capturedAt: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

export const CompetitorSnapshot = mongoose.model<ICompetitorSnapshot>('CompetitorSnapshot', CompetitorSnapshotSchema);
