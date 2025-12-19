import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Review from '@/utils/schemas/Review';
import User from '@/utils/schemas/User';

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await dbConnect();

    // Get user to fetch their rating stats
    const user = await User.findById(userId).select('averageRating totalReviews username twitterProfile');
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all reviews for this user (as reviewee/host)
    const reviews = await Review.find({ reviewee: userId })
      .populate('reviewer', 'username twitterProfile wallets')
      .populate('auction', 'auctionName endDate blockchainAuctionId')
      .sort({ createdAt: -1 }); // Most recent first

    return NextResponse.json({ 
      success: true,
      user: {
        id: user._id,
        username: user.username,
        twitterProfile: user.twitterProfile,
        averageRating: user.averageRating,
        totalReviews: user.totalReviews,
      },
      reviews 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching user reviews:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
