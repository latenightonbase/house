import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Auction from '@/utils/schemas/Auction';
import Bid from '@/utils/schemas/Bid';
import { authenticateApiKeyRequest } from '@/utils/apiKeyAuth';

// GET: Get a single auction with its bid history
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ blockchainAuctionId: string }> }
) {
  const authResult = await authenticateApiKeyRequest(req);
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    await dbConnect();

    const { blockchainAuctionId } = await params;

    const auction = await Auction.findOne({ blockchainAuctionId })
      .populate('hostedBy', 'username socialId socialPlatform twitterProfile wallets')
      .lean();

    if (!auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }

    // Fetch separate bid documents for richer data
    const bids = await Bid.find({ blockchainAuctionId })
      .populate('user', 'username socialId twitterProfile wallets')
      .sort({ bidTimestamp: -1 })
      .lean();

    const auctionData: any = auction;

    return NextResponse.json({
      auction: {
        id: auctionData._id,
        blockchainAuctionId: auctionData.blockchainAuctionId,
        auctionName: auctionData.auctionName,
        description: auctionData.description,
        currency: auctionData.currency,
        tokenAddress: auctionData.tokenAddress,
        minimumBid: auctionData.minimumBid,
        status: auctionData.status,
        startDate: auctionData.startDate,
        endDate: auctionData.endDate,
        imageUrl: auctionData.imageUrl,
        createdByType: auctionData.createdByType || 'human',
        biddersCount: auctionData.bidders?.length || 0,
        highestBid: auctionData.bidders?.length
          ? Math.max(...auctionData.bidders.map((b: any) => b.bidAmount))
          : 0,
        host: auctionData.hostedBy
          ? {
              username:
                auctionData.hostedBy.twitterProfile?.username ||
                auctionData.hostedBy.username,
              socialId: auctionData.hostedBy.socialId,
            }
          : null,
      },
      bids: bids.map((b: any) => ({
        id: b._id,
        bidAmount: b.bidAmount,
        usdcValue: b.usdcValue,
        currency: b.currency,
        bidTimestamp: b.bidTimestamp,
        source: b.source || 'human',
        bidder: b.user
          ? {
              username: b.user.twitterProfile?.username || b.user.username,
              socialId: b.user.socialId,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error('[v1/auctions/:id] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
