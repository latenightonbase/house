import mongoose, { Schema, Document, Types } from 'mongoose';

// Interface for a bidder object
export interface IBidder {
  user: Types.ObjectId;
  bidAmount: number;
  usdcValue?: number;
  bidTimestamp: Date;
}

// Interface for the Auction document
export interface IAuction extends Document {
  auctionName: string;
  description?: string;
  endDate: Date;
  bidders: IBidder[];
  currency: string;
  startDate: Date;
  hostedBy: Types.ObjectId;
  winningBid?: Types.ObjectId | string;
  minimumBid: number;
  reservePrice?: number;
  hostFeePercentage: number;
  totalRevenue?: number;
  createdAt: Date;
  updatedAt: Date;
  tokenAddress: string;
  enabled: boolean;
  startingWallet: string;
  status: 'ongoing' | 'ended' | 'paused';
  imageUrl?: string;
  imageKey?: string;
}

// Sub-schema for bidders
const BidderSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  bidAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  usdcValue: {
    type: Number,
    required: false,
    min: 0,
    default: null,
  },
  bidTimestamp: {
    type: Date,
    required: true,
    default: Date.now,
  },
}, { _id: false }); // _id: false to prevent automatic _id generation for subdocuments

// Mongoose schema for Auction
const AuctionSchema: Schema = new Schema(
  {
    auctionName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    startingWallet: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      required: false,
      trim: true,
      maxlength: 200,
    },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator: function(this: IAuction, value: Date) {
          return value > this.startDate;
        },
        message: 'End date must be after start date',
      },
    },
    bidders: {
      type: [BidderSchema],
      default: [],
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    hostedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    deliveredByHost: {
      type: Boolean,
      default: false,
    },
    hasReview: {
      type: Boolean,
      default: false,
    },
    rating:{
      type: Schema.Types.ObjectId,
      ref: 'Review',
      default: null,
    },
    winningBid: {
      type: Schema.Types.Mixed,
      default: null,
    },
    minimumBid: {
      type: Number,
      required: true,
      min: 0,
    },
    blockchainAuctionId: {
      type: String,
      required: true,
      unique: true,
    },
    tokenAddress: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['ongoing', 'ended', 'paused'],
      default: 'ongoing',
    },
    imageUrl: {
      type: String,
      required: false,
      trim: true,
    },
    imageKey: {
      type: String,
      required: false,
      trim: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Create indexes for better query performance
AuctionSchema.index({ hostedBy: 1 });
AuctionSchema.index({ endDate: 1 });
AuctionSchema.index({ startDate: 1 });
AuctionSchema.index({ currency: 1 });
AuctionSchema.index({ winningBid: 1 });
AuctionSchema.index({ minimumBid: 1 });
AuctionSchema.index({ totalRevenue: 1 });

// Add a compound index for active auctions
AuctionSchema.index({ startDate: 1, endDate: 1 });

// Compound index for host revenue queries
AuctionSchema.index({ hostedBy: 1, totalRevenue: 1 });

// Compound index for currency popularity queries
AuctionSchema.index({ currency: 1, endDate: 1 });

// Virtual to check if auction is active
AuctionSchema.virtual('isActive').get(function(this: IAuction) {
  const now = new Date();
  return now >= this.startDate && now <= this.endDate;
});

// Virtual to get the highest bid
AuctionSchema.virtual('highestBid').get(function(this: IAuction) {
  if (!this.bidders || this.bidders.length === 0) return 0;
  return Math.max(...this.bidders.map(bidder => bidder.bidAmount));
});

// Virtual to get the highest bidder
AuctionSchema.virtual('highestBidder').get(function(this: IAuction) {
  if (!this.bidders || this.bidders.length === 0) return null;
  const highestBid = Math.max(...this.bidders.map(bidder => bidder.bidAmount));
  return this.bidders.find(bidder => bidder.bidAmount === highestBid);
});

// Virtual to get unique participants count
AuctionSchema.virtual('participantCount').get(function(this: IAuction) {
  if (!this.bidders) return 0;
  const uniqueUsers = new Set(this.bidders.map(bidder => bidder.user.toString()));
  return uniqueUsers.size;
});

// Virtual to get host revenue (fee from winning bid)
AuctionSchema.virtual('hostRevenue').get(function(this: IAuction) {
  if (!this.totalRevenue) return 0;
  return (this.totalRevenue * this.hostFeePercentage) / 100;
});

// Virtual to check if reserve price was met
AuctionSchema.virtual('reservePriceMet').get(function(this: IAuction) {
  if (!this.reservePrice) return true;
  if (this.bidders.length === 0) return false;
  const highestBid = Math.max(...this.bidders.map(bidder => bidder.bidAmount));
  return highestBid >= this.reservePrice;
});

// Ensure virtual fields are serialized
AuctionSchema.set('toJSON', { virtuals: true });
AuctionSchema.set('toObject', { virtuals: true });

// Export the model
export default mongoose.models.Auction || mongoose.model<IAuction>('Auction', AuctionSchema);
