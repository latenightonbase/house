import mongoose, { Schema, Document, Types } from 'mongoose';

// Interface for the WeeklyBidderLeaderboard document
export interface IWeeklyBidderLeaderboard extends Document {
  user: Types.ObjectId;
  weekStartDate: Date;
  weekEndDate: Date;
  totalSpentUSD: number;
  bidCount: number;
  claimed: boolean;
  rewardAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose schema for WeeklyBidderLeaderboard
const WeeklyBidderLeaderboardSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    weekStartDate: {
      type: Date,
      required: true,
    },
    weekEndDate: {
      type: Date,
      required: true,
    },
    totalSpentUSD: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    bidCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    claimed: {
      type: Boolean,
      default: false,
    },
    rewardAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Create indexes for better query performance
WeeklyBidderLeaderboardSchema.index({ user: 1, weekStartDate: 1 }, { unique: true });
WeeklyBidderLeaderboardSchema.index({ weekStartDate: 1 });
WeeklyBidderLeaderboardSchema.index({ weekEndDate: 1 });
WeeklyBidderLeaderboardSchema.index({ totalSpentUSD: -1 });
WeeklyBidderLeaderboardSchema.index({ claimed: 1 });

// Compound index for unclaimed rewards queries
WeeklyBidderLeaderboardSchema.index({ user: 1, claimed: 1 });

// Compound index for weekly leaderboard queries
WeeklyBidderLeaderboardSchema.index({ weekStartDate: 1, totalSpentUSD: -1 });

// Export the model
export default mongoose.models.WeeklyBidderLeaderboard || 
  mongoose.model<IWeeklyBidderLeaderboard>('WeeklyBidderLeaderboard', WeeklyBidderLeaderboardSchema);
