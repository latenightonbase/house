import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReview extends Document {
  auction: Types.ObjectId;
  reviewer: Types.ObjectId;
  reviewee: Types.ObjectId;
  rating: number;
  comment?: string;
  deliveredByHost: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema: Schema = new Schema(
  {
    auction: {
      type: Schema.Types.ObjectId,
      ref: 'Auction',
      required: true,
      unique: true,
      index: true,
    },
    reviewer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reviewee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be an integer',
      },
    },
    comment: {
      type: String,
      maxlength: 500,
      trim: true,
    },
    deliveredByHost: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

ReviewSchema.index({ reviewee: 1, createdAt: -1 });
ReviewSchema.index({ reviewer: 1, createdAt: -1 });

export default mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);
