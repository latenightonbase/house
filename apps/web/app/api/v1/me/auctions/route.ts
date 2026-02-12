import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Auction from '@/utils/schemas/Auction';
import { authenticateApiKeyRequest } from '@/utils/apiKeyAuth';

// GET: Get auctions hosted by the authenticated user
export async function GET(req: NextRequest) {
  const authResult = await authenticateApiKeyRequest(req);
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    const query: any = { hostedBy: authResult.user._id };
    if (status && status !== 'all') {
      query.status = status;
    }

    const [auctions, total] = await Promise.all([
      Auction.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      Auction.countDocuments(query),
    ]);

    return NextResponse.json({
      auctions: auctions.map((a: any) => ({
        id: a._id,
        blockchainAuctionId: a.blockchainAuctionId,
        auctionName: a.auctionName,
        description: a.description,
        currency: a.currency,
        tokenAddress: a.tokenAddress,
        minimumBid: a.minimumBid,
        status: a.status,
        startDate: a.startDate,
        endDate: a.endDate,
        imageUrl: a.imageUrl,
        biddersCount: a.bidders?.length || 0,
        highestBid: a.bidders?.length
          ? Math.max(...a.bidders.map((b: any) => b.bidAmount))
          : 0,
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[v1/me/auctions] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
