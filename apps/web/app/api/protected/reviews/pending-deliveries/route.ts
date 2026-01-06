import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import PendingDelivery from '@/utils/schemas/PendingDelivery';
import Auction from '@/utils/schemas/Auction';
import User from '@/utils/schemas/User';
import { authenticateRequest } from '@/utils/authService';

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.success) {
      return authResult.response;
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

    // Find all pending deliveries where user is host or winner
    const [asHostPending, asWinnerDelivered, asWinnerUndelivered] = await Promise.all([
      // As host - only undelivered
      PendingDelivery.find({
        hostSocialId: socialId,
        delivered: false,
      })
        .populate('auctionId')
        .populate('winnerId')
        .sort({ createdAt: -1 }),

      // As winner - delivered (ready for review)
      PendingDelivery.find({
        winnerSocialId: socialId,
        delivered: true,
      })
        .populate('auctionId')
        .populate('hostId')
        .sort({ deliveredDate: -1 }),

      // As winner - not delivered yet
      PendingDelivery.find({
        winnerSocialId: socialId,
        delivered: false,
      })
        .populate('auctionId')
        .populate('hostId')
        .sort({ createdAt: -1 }),
    ]);

    return NextResponse.json({
      asHost: asHostPending,
      asWinner: {
        delivered: asWinnerDelivered,
        undelivered: asWinnerUndelivered,
      },
    });
  } catch (error: any) {
    console.error('Error fetching pending deliveries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending deliveries' },
      { status: 500 }
    );
  }
}
