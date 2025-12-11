import mongoose, { Schema, Document, Types } from 'mongoose';

// Interface for the WinningBid document
export interface IWinningBid extends Document {
  user: Types.ObjectId;
  auction: Types.ObjectId;
  usdcAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose schema for WinningBid
const WinningBidSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    auction: {
      type: Schema.Types.ObjectId,
      ref: 'Auction',
      required: true,
    },
    usdcAmount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Create indexes for better query performance
WinningBidSchema.index({ user: 1 });
WinningBidSchema.index({ auction: 1 });
WinningBidSchema.index({ usdcAmount: 1 });
WinningBidSchema.index({ usdcAmount: -1 }); // Descending for leaderboards
WinningBidSchema.index({ createdAt: -1 }); // Recent wins first

// Compound index for user-auction pairs (each auction should have only one winning bid)
WinningBidSchema.index({ auction: 1 }, { unique: true });

// Compound index for user leaderboard queries
WinningBidSchema.index({ user: 1, usdcAmount: -1 });

// Export the model
export default mongoose.models.WinningBid || mongoose.model<IWinningBid>('WinningBid', WinningBidSchema);
