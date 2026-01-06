import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPendingDelivery extends Document {
  auctionId: Types.ObjectId;
  hostId: Types.ObjectId;
  winnerId: Types.ObjectId;
  hostSocialId: string;
  winnerSocialId: string;
  delivered: boolean;
  deliveredDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PendingDeliverySchema: Schema = new Schema(
  {
    auctionId: {
      type: Schema.Types.ObjectId,
      ref: 'Auction',
      required: true,
      unique: true,
    },
    hostId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    winnerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    hostSocialId: {
      type: String,
      required: true,
      trim: true,
    },
    winnerSocialId: {
      type: String,
      required: true,
      trim: true,
    },
    delivered: {
      type: Boolean,
      default: false,
    },
    deliveredDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
PendingDeliverySchema.index({ hostSocialId: 1, delivered: 1 });
PendingDeliverySchema.index({ winnerSocialId: 1, delivered: 1 });

export default mongoose.models.PendingDelivery || mongoose.model<IPendingDelivery>('PendingDelivery', PendingDeliverySchema);
