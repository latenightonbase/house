import mongoose, { Schema, Document, Types } from 'mongoose';

// Interface for the Bid document
export interface IBid extends Document {
  auction: Types.ObjectId;           // Reference to Auction document
  user: Types.ObjectId;              // Reference to User document
  socialId: string;                  // User's social ID (FID or Twitter ID)
  bidAmount: number;                 // Bid amount in token units
  usdcValue: number;                 // USD equivalent value
  currency: string;                  // Currency symbol (e.g., 'USDC', 'ETH')
  tokenAddress: string;              // Token contract address
  blockchainAuctionId: string;       // Blockchain auction ID for quick lookups
  bidTimestamp: Date;                // When the bid was placed
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose schema for Bid
const BidSchema: Schema = new Schema(
  {
    auction: {
      type: Schema.Types.ObjectId,
      ref: 'Auction',
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    socialId: {
      type: String,
      required: true,
      trim: true,
    },
    bidAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    usdcValue: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      trim: true,
    },
    tokenAddress: {
      type: String,
      required: true,
      trim: true,
    },
    blockchainAuctionId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    bidTimestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Compound index for querying bids by auction and timestamp
BidSchema.index({ auction: 1, bidTimestamp: -1 });

// Compound index for querying bids by user and timestamp
BidSchema.index({ user: 1, bidTimestamp: -1 });

// Export the model
export default mongoose.models.Bid || mongoose.model<IBid>('Bid', BidSchema);
