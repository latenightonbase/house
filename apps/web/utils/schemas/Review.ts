import mongoose, { Schema, Document, Types } from 'mongoose';

// Interface for the Review document
export interface IReview extends Document {
  auction: Types.ObjectId;
  reviewer: Types.ObjectId; // Winner who is leaving the review
  reviewee: Types.ObjectId; // Host being reviewed
  rating: number; // 1-5 stars
  comment?: string;
  deliveredByHost: boolean; // Whether host marked as delivered
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose schema for Review
const ReviewSchema: Schema = new Schema(
  {
    auction: {
      type: Schema.Types.ObjectId,
      ref: 'Auction',
      required: true,
      unique: true, // One review per auction
    },
    reviewer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    deliveredByHost: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for better query performance
ReviewSchema.index({ reviewee: 1 }); // For fetching all reviews about a user
ReviewSchema.index({ reviewer: 1 }); // For fetching reviews by a user
ReviewSchema.index({ auction: 1 }); // For fetching review for specific auction
ReviewSchema.index({ rating: 1 }); // For rating-based queries
ReviewSchema.index({ reviewee: 1, rating: 1 }); // Compound index for rating calculations

// Ensure virtual fields are serialized
ReviewSchema.set('toJSON', { virtuals: true });
ReviewSchema.set('toObject', { virtuals: true });

// Export the model
export default mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);
