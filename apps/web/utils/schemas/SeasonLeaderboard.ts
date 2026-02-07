import mongoose, { Schema, Document, Types } from 'mongoose';

// Interface for the SeasonLeaderboard document
export interface ISeasonLeaderboard extends Document {
  user: Types.ObjectId;
  season: Types.ObjectId;
  seasonNumber: number;
  totalXP: number;
  level: number;
  rank?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose schema for SeasonLeaderboard
const SeasonLeaderboardSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    season: {
      type: Schema.Types.ObjectId,
      ref: 'Season',
      required: true,
    },
    seasonNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    totalXP: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    level: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    rank: {
      type: Number,
      min: 1,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Create indexes for better query performance
SeasonLeaderboardSchema.index({ user: 1, seasonNumber: 1 }, { unique: true });
SeasonLeaderboardSchema.index({ season: 1, totalXP: -1 });
SeasonLeaderboardSchema.index({ seasonNumber: 1, totalXP: -1 });
SeasonLeaderboardSchema.index({ totalXP: -1 });
SeasonLeaderboardSchema.index({ rank: 1 });

// Compound index for leaderboard queries with season filter
SeasonLeaderboardSchema.index({ seasonNumber: 1, rank: 1 });

// Export the model
export default mongoose.models.SeasonLeaderboard || 
  mongoose.model<ISeasonLeaderboard>('SeasonLeaderboard', SeasonLeaderboardSchema);
