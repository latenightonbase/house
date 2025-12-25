import mongoose, { Schema, Document } from 'mongoose';

enum WhitelistStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

// Interface for the Whitelist document
export interface IWhitelist extends Document {
  walletAddress: string;
  nickname?: string;
  addedBy?: string;
  status: WhitelistStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose schema for Whitelist
const WhitelistSchema: Schema = new Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    nickname: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    addedBy: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(WhitelistStatus),
      default: WhitelistStatus.ACTIVE,
    },
  },
  {
    timestamps: true,
  }
);

// Create and export the model
const Whitelist = mongoose.models.Whitelist || mongoose.model<IWhitelist>('Whitelist', WhitelistSchema);

export default Whitelist;
