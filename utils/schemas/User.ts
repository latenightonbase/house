import mongoose, { Schema, Document, Types } from 'mongoose';

// Interface for the User document
export interface IUser extends Document {
  token: string;
  fid: string;
  wallet: string;
  username?: string;
  whitelisted: boolean;
  hostedAuctions: Types.ObjectId[];
  bidsWon: Types.ObjectId[];
  participatedAuctions: Types.ObjectId[];
  twitterProfile?: {
    id: string;
    username: string;
    name: string;
    profileImageUrl?: string;
  };
  notificationDetails?: {
    url: string;
    token: string;
    appFid: string;
  };
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
      trim: true,
    },
    wallet: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    username: {
      type: String,
      trim: true,
      default: null,
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
    twitterProfile: {
      id: {
        type: String,
        trim: true,
      },
      username: {
        type: String,
        trim: true,
      },
      name: {
        type: String,
        trim: true,
      },
      profileImageUrl: {
        type: String,
        trim: true,
      },
    },
    notificationDetails: {
      url: {
        type: String,
        trim: true,
      },
      token: {
        type: String,
        trim: true,
      },
      appFid: {
        type: String,
        trim: true,
      },
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

UserSchema.index({ wallet: 1 });
UserSchema.index({ username: 1 });

// Export the model
export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
