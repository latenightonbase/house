import mongoose, { Schema, Document, Types } from 'mongoose';

// Interface for the User document
export interface IUser extends Document {
  token: string;
  fid: string;
  wallet: string;
  hostedAuctions: Types.ObjectId[];
  bidsWon: Types.ObjectId[];
  participatedAuctions: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose schema for User
const UserSchema: Schema = new Schema(
  {
    token: {
      type: String,
      trim: true,
      default: null,
      
    },
    fid: {
      type: String,
      default: null,
      trim: true,
    },
    wallet: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    hostedAuctions: [{
      type: Schema.Types.ObjectId,
      ref: 'Auction',
    }],
    bidsWon: [{
      type: Schema.Types.ObjectId,
      ref: 'WinningBid',
    }],
    participatedAuctions: [{
      type: Schema.Types.ObjectId,
      ref: 'Auction',
    }],
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

UserSchema.index({ wallet: 1 });

// Export the model
export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
