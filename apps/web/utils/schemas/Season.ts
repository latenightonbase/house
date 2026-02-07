import mongoose, { Schema, Document } from 'mongoose';

// Interface for the Season document
export interface ISeason extends Document {
  seasonNumber: number;
  startDate: Date;
  endDate: Date;
  active: boolean;
  totalXPAwarded: number;
  totalParticipants: number;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose schema for Season
const SeasonSchema: Schema = new Schema(
  {
    seasonNumber: {
      type: Number,
      required: true,
      unique: true,
      min: 1,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    totalXPAwarded: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalParticipants: {
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
SeasonSchema.index({ seasonNumber: 1 }, { unique: true });
SeasonSchema.index({ active: 1 });
SeasonSchema.index({ startDate: 1 });
SeasonSchema.index({ endDate: 1 });

// Compound index for active season queries
SeasonSchema.index({ active: 1, startDate: -1 });

// Export the model
export default mongoose.models.Season || mongoose.model<ISeason>('Season', SeasonSchema);
