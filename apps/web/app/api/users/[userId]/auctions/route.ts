import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import User from '@/utils/schemas/User';
import Auction from '@/utils/schemas/Auction';
import { getFidsWithCache } from '@/utils/fidCache';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // const session = await getServerSession(); // Ensure session is initialized if needed in future
    // if(!session) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized' },
    //     { status: 401 }
    //   );
    // }
    await connectDB();

    const { userId } = await params;

    // Find user and their auctions
    const userDoc = await User.findById(userId)
      .select('wallets fid username hostedAuctions twitterProfile socialId socialPlatform');

    if (!userDoc) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('Fetched user document:', userDoc);

    const user: any = userDoc;

    // Fetch user details from Neynar and auctions in parallel
    const shouldFetchNeynar = user.socialId && user.socialPlatform !== "TWITTER";

    const [neynarData, auctions] = await Promise.all([
      // Fetch Neynar data if needed
      (async () => {
        if (shouldFetchNeynar) {
          const neynarUsersMap = await getFidsWithCache([user.socialId]);
          return neynarUsersMap[user.socialId] || null;
        }
        return null;
      })(),
      // Get all auctions hosted by this user
      Auction.find({ hostedBy: user._id })
        .select('auctionName endDate startDate currency blockchainAuctionId minimumBid bidders')
        .sort({ createdAt: -1 })
        .lean()
    ]);

    // Process user profile
    let userProfile = {
      username: (user.username as string) || null,
      pfp_url: null as string | null,
      display_name: null as string | null,
      bio: null as string | null,
      x_username: null as string | null
    };

    if (neynarData) {
      userProfile.username = neynarData.username || user.username;
      userProfile.pfp_url = neynarData.pfp_url || null;
      userProfile.display_name = neynarData.display_name || null;
      userProfile.bio = neynarData.profile?.bio?.text || null;
      
      // Extract X username from verified_accounts using correct Neynar API structure
      if (neynarData.verified_accounts && Array.isArray(neynarData.verified_accounts)) {
        const xAccount = neynarData.verified_accounts.find((account: any) => 
          account.platform === 'x'
        );
        if (xAccount && xAccount.username) {
          userProfile.x_username = xAccount.username;
          console.log('Found X username from verified_accounts:', xAccount.username);
        }
      }
      
      console.log('Final user profile with X username:', userProfile.x_username);
    } else {
      // FID starts with "none" or doesn't exist, use wallet-based defaults
      userProfile.username = user.twitterProfile.username ? user.twitterProfile.username : `${user.wallets[0].slice(0, 6)}...${user.wallets[0].slice(-4)}`;
      userProfile.pfp_url = user.twitterProfile.profileImageUrl ? user.twitterProfile.profileImageUrl : `https://api.dicebear.com/5.x/identicon/svg?seed=${user.wallets[0].toLowerCase()}`;
      
      // Check for Twitter profile in database
      // if (user.twitterProfile && user.twitterProfile.username) {
      //   userProfile.x_username = user.twitterProfile.username;
      //   if (user.twitterProfile.profileImageUrl) {
      //     userProfile.pfp_url = user.twitterProfile.profileImageUrl;
      //   }
      //   if (user.twitterProfile.name) {
      //     userProfile.display_name = user.twitterProfile.name;
      //   }
      // }
    }

    // Separate active and ended auctions
    const now = new Date();
    const activeAuctions = auctions.filter(auction => new Date(auction.endDate) > now);
    const endedAuctions = auctions.filter(auction => new Date(auction.endDate) <= now);

    // Calculate highest bid for each auction
    const processAuctions = (auctionList: any[]) => {
      return auctionList.map(auction => {
        console.log('Processing auction:', auction.auctionName, 'minimumBid:', auction.minimumBid, 'bidders:', auction.bidders);
        
        const highestBid = auction.bidders && auction.bidders.length > 0
          ? Math.max(...auction.bidders.map((b: any) => {
              console.log('Bidder bid amount:', b.bidAmount, 'type:', typeof b.bidAmount);
              return Number(b.bidAmount) || 0;
            }))
          : 0;

        console.log('Calculated highest bid:', highestBid);

        return {
          _id: auction._id,
          auctionName: auction.auctionName,
          endDate: auction.endDate,
          startDate: auction.startDate,
          currency: auction.currency,
          blockchainAuctionId: auction.blockchainAuctionId,
          minimumBid: Number(auction.minimumBid) || 0,
          highestBid,
          biddersCount: auction.bidders?.length || 0
        };
      });
    };

    return NextResponse.json({
      user: {
        _id: user._id,
        wallet: user.wallets[0],
        fid: user.socialId,
        username: userProfile.username,
        pfp_url: userProfile.pfp_url,
        display_name: userProfile.display_name,
        bio: userProfile.bio,
        x_username: userProfile.x_username,
        twitterProfile: user.twitterProfile || null,
        platform: user.socialPlatform || null
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

