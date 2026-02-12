import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Bid from '@/utils/schemas/Bid';
import { authenticateApiKeyRequest } from '@/utils/apiKeyAuth';

// GET: Get bids placed by the authenticated user
export async function GET(req: NextRequest) {
  const authResult = await authenticateApiKeyRequest(req);
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    const [bids, total] = await Promise.all([
      Bid.find({ user: authResult.user._id })
        .populate('auction', 'auctionName blockchainAuctionId status endDate currency')
        .sort({ bidTimestamp: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      Bid.countDocuments({ user: authResult.user._id }),
    ]);

    return NextResponse.json({
      bids: bids.map((b: any) => ({
        id: b._id,
        bidAmount: b.bidAmount,
        usdcValue: b.usdcValue,
        currency: b.currency,
        bidTimestamp: b.bidTimestamp,
        blockchainAuctionId: b.blockchainAuctionId,
        auction: b.auction
          ? {
              name: b.auction.auctionName,
              blockchainAuctionId: b.auction.blockchainAuctionId,
              status: b.auction.status,
              endDate: b.auction.endDate,
            }
          : null,
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[v1/me/bids] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
