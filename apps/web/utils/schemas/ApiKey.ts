import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IApiKey extends Document {
  keyHash: string;
  keyPrefix: string;
  userId: Types.ObjectId;
  botWallet: Types.ObjectId;
  name: string;
  active: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema: Schema = new Schema(
  {
    keyHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    keyPrefix: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    botWallet: {
      type: Schema.Types.ObjectId,
      ref: 'BotWallet',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      default: 'Default',
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for quick lookups of active keys by user
ApiKeySchema.index({ userId: 1, active: 1 });

export default mongoose.models.ApiKey || mongoose.model<IApiKey>('ApiKey', ApiKeySchema);
