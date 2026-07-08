import mongoose, { Schema, Document } from 'mongoose';

/**
 * One entry in a user's personal daily work journal — the unit of the
 * logging-streak habit. Deliberately independent of Products/Activities:
 * it's a private "what did I work on today" note, not a changelog record.
 */
export interface IDailyLog extends Document {
  ownerId: mongoose.Types.ObjectId;
  note: string;
  createdAt: Date;
}

const DailyLogSchema: Schema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    note: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// The streak aggregation groups a user's entries by day.
DailyLogSchema.index({ ownerId: 1, createdAt: -1 });

export const DailyLog = mongoose.model<IDailyLog>('DailyLog', DailyLogSchema);
