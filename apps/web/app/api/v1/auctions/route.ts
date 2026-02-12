import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Auction from '@/utils/schemas/Auction';
import { authenticateApiKeyRequest } from '@/utils/apiKeyAuth';

// GET: List/search auctions with rich filtering for agent scouting
export async function GET(req: NextRequest) {
  const authResult = await authenticateApiKeyRequest(req);
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // 'ongoing' | 'ended' | 'all'
    const search = searchParams.get('search'); // keyword search on name/description
    const token = searchParams.get('token'); // filter by token address
    const currency = searchParams.get('currency'); // filter by currency symbol (USDC, WETH, etc)
    const minPrice = searchParams.get('minPrice'); // min highest bid or min bid
    const maxPrice = searchParams.get('maxPrice'); // max highest bid
    const createdAfter = searchParams.get('createdAfter'); // ISO date — for polling new auctions
    const endingWithin = searchParams.get('endingWithin'); // hours — auctions ending soon
    const sort = searchParams.get('sort'); // 'newest' | 'ending_soon' | 'highest_bid' | 'most_bids'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    const query: any = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    // Keyword search on auction name and description
    if (search) {
      query.$or = [
        { auctionName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by token address
    if (token) {
      query.tokenAddress = token.toLowerCase();
    }

    // Filter by currency symbol
    if (currency) {
      query.currency = currency.toUpperCase();
    }

    // Filter by minimum bid threshold
    if (minPrice) {
      query.minimumBid = { ...query.minimumBid, $gte: parseFloat(minPrice) };
    }

    // Filter by max price (useful for budget-conscious scouting)
    if (maxPrice) {
      query.minimumBid = { ...query.minimumBid, $lte: parseFloat(maxPrice) };
    }

    // Only auctions created after a certain time (for polling new ones)
    if (createdAfter) {
      query.createdAt = { $gt: new Date(createdAfter) };
    }

    // Auctions ending within N hours (for sniping / urgency)
    if (endingWithin) {
      const hours = parseFloat(endingWithin);
      const now = new Date();
      const deadline = new Date(now.getTime() + hours * 60 * 60 * 1000);
      query.endDate = { $gte: now, $lte: deadline };
      // Implicitly ongoing
      query.status = 'ongoing';
    }

    // Sort order
    let sortOrder: any = { createdAt: -1 }; // default: newest
    switch (sort) {
      case 'ending_soon':
        sortOrder = { endDate: 1 };
        break;
      case 'highest_bid':
        sortOrder = { minimumBid: -1 };
        break;
      case 'most_bids':
        // Sort by bidders array length - we'll do this in aggregation if needed,
        // for now sort by createdAt and let the client sort
        sortOrder = { createdAt: -1 };
        break;
      case 'newest':
      default:
        sortOrder = { createdAt: -1 };
    }

    const [auctions, total] = await Promise.all([
      Auction.find(query)
        .populate('hostedBy', 'username socialId socialPlatform twitterProfile wallets')
        .sort(sortOrder)
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
        createdAt: a.createdAt,
        imageUrl: a.imageUrl,
        biddersCount: a.bidders?.length || 0,
        highestBid: a.bidders?.length
          ? Math.max(...a.bidders.map((b: any) => b.bidAmount))
          : 0,
        host: a.hostedBy
          ? {
              username: a.hostedBy.twitterProfile?.username || a.hostedBy.username,
              socialId: a.hostedBy.socialId,
            }
          : null,
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[v1/auctions] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
