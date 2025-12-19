import mongoose, { Schema, Document, Types } from 'mongoose';
import { unique } from 'next/dist/build/utils';

enum SocialPlatform {
  TWITTER = 'TWITTER',
  FARCASTER = 'FARCASTER',
}

// Interface for the User document
export interface IUser extends Document {
  token: string;
  //redundant
  fid: string;
  wallet: string;
  //new--start
  socialId?: string;
  socialPlatform?: SocialPlatform;
  wallets: string[];
  privyId?: string;
  //new--end
  username?: string;
  whitelisted: boolean;
  hostedAuctions: Types.ObjectId[];
  bidsWon: Types.ObjectId[];
  participatedAuctions: Types.ObjectId[];
  averageRating: number;
  totalReviews: number;
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
      sparse: true
    },
    socialId: {
      type: String,
      trim: true
    },
    socialPlatform: {
      type: String,
      enum: Object.values(SocialPlatform),
      trim: true
    },
    privyId: {
      type: String,
      unique: true,
      trim: true,
    },
    wallets: [{
      type: String,
      trim: true
    }],
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
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },
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

UserSchema.index({ username: 1 });

// Export the model
UserSchema.index({ averageRating: 1 });
UserSchema.index({ totalReviews: 1 });
export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
