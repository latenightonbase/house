import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import User from '@/utils/schemas/User';
import Auction from '@/utils/schemas/Auction';
import { getServerSession } from 'next-auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(); // Ensure session is initialized if needed in future
    if(!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    await connectDB();

    const { userId } = await params;

    // Find user and their auctions
    const userDoc = await User.findById(userId)
      .select('wallet fid username hostedAuctions')
      .lean();

    if (!userDoc) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user: any = userDoc;

    // Fetch user details from Neynar if FID is a valid number
    let userProfile = {
      username: (user.username as string) || null,
      pfp_url: null as string | null,
      display_name: null as string | null,
      bio: null as string | null
    };

    if (user.fid && !user.fid.toLowerCase().startsWith('none')) {
      // FID is a valid number, fetch from Neynar
      try {
        const neynarResponse = await fetch(
          `https://api.neynar.com/v2/farcaster/user/bulk?fids=${user.fid}`,
          {
            headers: {
              'api_key': process.env.NEYNAR_API_KEY || '',
            },
          }
        );

        if (neynarResponse.ok) {
          const neynarData = await neynarResponse.json();
          if (neynarData.users && neynarData.users.length > 0) {
            const neynarUser = neynarData.users[0];
            userProfile.username = neynarUser.username || user.username;
            userProfile.pfp_url = neynarUser.pfp_url || null;
            userProfile.display_name = neynarUser.display_name || null;
            userProfile.bio = neynarUser.profile?.bio?.text || null;
          }
        }
      } catch (neynarError) {
        console.error('Error fetching Neynar data:', neynarError);
        // Continue with existing user data
      }
    } else {
      // FID starts with "none" or doesn't exist, use wallet-based defaults
      userProfile.username = `${user.wallet.slice(0, 6)}...${user.wallet.slice(-4)}`;
      userProfile.pfp_url = `https://api.dicebear.com/5.x/identicon/svg?seed=${user.wallet.toLowerCase()}`;
    }

    // Get all auctions hosted by this user
    const auctions = await Auction.find({ hostedBy: userId })
      .select('auctionName endDate startDate currency blockchainAuctionId minimumBid bidders')
      .sort({ createdAt: -1 })
      .lean();

    // Separate active and ended auctions
    const now = new Date();
    const activeAuctions = auctions.filter(auction => new Date(auction.endDate) > now);
    const endedAuctions = auctions.filter(auction => new Date(auction.endDate) <= now);

    // Calculate highest bid for each auction
    const processAuctions = (auctionList: any[]) => {
      return auctionList.map(auction => {
        const highestBid = auction.bidders && auction.bidders.length > 0
          ? Math.max(...auction.bidders.map((b: any) => b.bidAmount))
          : 0;

        return {
          _id: auction._id,
          auctionName: auction.auctionName,
          endDate: auction.endDate,
          startDate: auction.startDate,
          currency: auction.currency,
          blockchainAuctionId: auction.blockchainAuctionId,
          minimumBid: auction.minimumBid,
          highestBid,
          biddersCount: auction.bidders?.length || 0
        };
      });
    };

    return NextResponse.json({
      user: {
        _id: user._id,
        wallet: user.wallet,
        fid: user.fid,
        username: userProfile.username,
        pfp_url: userProfile.pfp_url,
        display_name: userProfile.display_name,
        bio: userProfile.bio
      },
      activeAuctions: processAuctions(activeAuctions),
      endedAuctions: processAuctions(endedAuctions)
    });
  } catch (error) {
    console.error('Error fetching user auctions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user auctions' },
      { status: 500 }
    );
  }
}

