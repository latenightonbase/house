import mongoose, { Schema, Document, Types } from 'mongoose';

enum SocialPlatform {
  TWITTER = 'TWITTER',
  FARCASTER = 'FARCASTER',
}

// Interface for XP History entry
export interface IXPHistory {
  amount: number;
  action: string;
  timestamp: Date;
  metadata?: {
    auctionId?: Types.ObjectId;
    usdValue?: number;
    [key: string]: any;
  };
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
  averageRating?: number;
  totalReviews?: number;
  // XP and Level System
  totalXP: number;
  currentSeasonXP: number;
  level: number;
  lastXPUpdate?: Date;
  lastDailyLoginReward?: Date;
  xpHistory: IXPHistory[];
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
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    totalXP: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentSeasonXP: {
      type: Number,
      default: 0,
      min: 0,
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
    },
    lastXPUpdate: {
      type: Date,
      default: null,
    },
    lastDailyLoginReward: {
      type: Date,
      default: null,
    },
    xpHistory: [{
      amount: {
        type: Number,
        required: true,
      },
      action: {
        type: String,
        required: true,
        trim: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
      metadata: {
        type: Schema.Types.Mixed,
        default: {},
      },
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

UserSchema.index({ username: 1 });
UserSchema.index({ currentSeasonXP: -1 });
UserSchema.index({ totalXP: -1 });
UserSchema.index({ level: -1 });

// Export the model
export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
