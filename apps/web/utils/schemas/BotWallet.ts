import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBotWallet extends Document {
  userId: Types.ObjectId;
  address: string;
  encryptedPrivateKey: string;
  iv: string;
  authTag: string;
  createdAt: Date;
  updatedAt: Date;
}

const BotWalletSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    address: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    encryptedPrivateKey: {
      type: String,
      required: true,
    },
    iv: {
      type: String,
      required: true,
    },
    authTag: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.BotWallet || mongoose.model<IBotWallet>('BotWallet', BotWalletSchema);
