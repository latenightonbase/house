import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Review from '@/utils/schemas/Review';

export async function GET(
  req: NextRequest,
  { params }: { params: { auctionId: string } }
) {
  try {
    const { auctionId } = params;

    if (!auctionId) {
      return NextResponse.json({ error: 'Auction ID is required' }, { status: 400 });
    }

    await dbConnect();

    // Find review for this auction and populate reviewer and reviewee details
    const review = await Review.findOne({ auction: auctionId })
      .populate('reviewer', 'username twitterProfile wallets')
      .populate('reviewee', 'username twitterProfile wallets')
      .populate('auction', 'auctionName endDate');

    if (!review) {
      return NextResponse.json({ review: null }, { status: 200 });
    }

    return NextResponse.json({ 
      success: true,
      review 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching review:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
