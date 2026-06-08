import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: 'PRODUCT' | 'ACTIVITY' | 'MARKETING';
  entityId: mongoose.Types.ObjectId;
  entityName: string;
  details?: string;
  createdAt: Date;
}

const AuditLogSchema: Schema = new Schema({
  action: {
    type: String,
    enum: ['CREATE', 'UPDATE', 'DELETE'],
    required: true
  },
  entityType: {
    type: String,
    enum: ['PRODUCT', 'ACTIVITY', 'MARKETING'],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  entityName: {
    type: String,
    required: true
  },
  details: {
    type: String,
    required: false
  }
}, { timestamps: { createdAt: true, updatedAt: false } });

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
