import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Auction from '@/utils/schemas/Auction';
import Review from '@/utils/schemas/Review';
import User from '@/utils/schemas/User';
import PendingDelivery from '@/utils/schemas/PendingDelivery';
import { authenticateRequest } from '@/utils/authService';
import { awardXP, XP_REWARDS } from '@/utils/xpService';

export async function POST(req: NextRequest) {
  const authResult = await authenticateRequest(req);
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const body = await req.json();
    const { auctionId, rating, comment } = body;

    // Validate required fields
    if (!auctionId || !rating) {
      return NextResponse.json({ error: 'Auction ID and rating are required' }, { status: 400 });
    }

    // Validate rating value
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json({ error: 'Rating must be an integer between 1 and 5' }, { status: 400 });
    }

    // Validate comment length if provided
    if (comment && comment.length > 500) {
      return NextResponse.json({ error: 'Comment cannot exceed 500 characters' }, { status: 400 });
    }

    // @ts-ignore
    const socialId = req.headers.get('x-user-social-id');

    if (!socialId) {
      return NextResponse.json(
        { error: 'Social ID not found in session' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find the pending delivery
    const pendingDelivery = await PendingDelivery.findOne({ auctionId });
    
    if (!pendingDelivery) {
      return NextResponse.json({ error: 'Pending delivery not found' }, { status: 404 });
    }

    // Verify the requesting user is the winner
    if (pendingDelivery.winnerSocialId !== socialId) {
      return NextResponse.json({ error: 'Only the auction winner can leave a review' }, { status: 403 });
    }

    // Find the auction
    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }

    // Verify the auction has ended
    if (auction.status !== 'ended') {
      return NextResponse.json({ error: 'Can only review ended auctions' }, { status: 400 });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ auction: auctionId });
    if (existingReview) {
      return NextResponse.json({ error: 'Review already exists for this auction' }, { status: 400 });
    }

    // Create the review
    const review = new Review({
      auction: auctionId,
      reviewer: auction.winningBid,
      reviewee: auction.hostedBy,
      rating,
      comment: comment || undefined,
      deliveredByHost: pendingDelivery.delivered,
    });

    await review.save();

    // Mark auction as having a review
    auction.hasReview = true;
    await auction.save();

    // Update the host's average rating and total reviews
    const hostId = auction.hostedBy;
    const allReviews = await Review.find({ reviewee: hostId });
    
    const totalReviews = allReviews.length;
    const sumOfRatings = allReviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalReviews > 0 ? sumOfRatings / totalReviews : 0;

    await User.findByIdAndUpdate(hostId, {
      averageRating: Math.round(averageRating * 100) / 100, // Round to 2 decimal places
      totalReviews,
    });

    // Award XP for leaving review
    let xpAwarded = 0;
    try {
      const xpResult = await awardXP({
        userId: auction.winningBid,
        amount: XP_REWARDS.LEAVE_REVIEW,
        action: 'LEAVE_REVIEW',
        metadata: {
          auctionId: auction._id,
          rating,
          reviewId: review._id,
        },
      });
      if (xpResult.success) {
        xpAwarded = XP_REWARDS.LEAVE_REVIEW;
        console.log(`✅ Awarded ${xpAwarded} XP for review`);
      }
    } catch (err) {
      console.error('⚠️ Failed to award XP for review:', err);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Review submitted successfully',
      review: {
        id: review._id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
      },
      hostUpdatedRating: {
        averageRating: Math.round(averageRating * 100) / 100,
        totalReviews,
      },
      xpAwarded,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating review:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
