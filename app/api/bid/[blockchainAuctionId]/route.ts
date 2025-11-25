import { NextRequest, NextResponse } from 'next/server';
import Auction, { IAuction } from '../../../../utils/schemas/Auction';
import connectToDB from '@/utils/db';
import { fetchTokenPrice, calculateUSDValue } from '@/utils/tokenPrice';
import { getServerSession } from 'next-auth';

interface ContractBidder {
  bidder: string;
  bidAmount: string;
  fid: string;
  twitterProfile?: {
    id: string;
    username: string;
    name: string;
    profileImageUrl?: string;
  };
}

interface ProcessedBidder {
  displayName: string;
  image: string;
  bidAmount: string;
  usdValue?: number;
  walletAddress: string;
  userId?: string;
}

// POST handler - processes bidders data from contract
export async function POST(
  req: NextRequest
) {
  try {
    
    await connectToDB();
    
    const blockchainAuctionId = req.nextUrl.pathname.split('/')[3];
    
    if (!blockchainAuctionId) {
      return NextResponse.json(
        { error: 'Missing blockchainAuctionId parameter' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { contractBidders } = body;

    console.log('Received contractBidders:', contractBidders);
    
    if (!contractBidders) {
      return NextResponse.json(
        { error: 'Missing contractBidders in request body' },
        { status: 400 }
      );
    }

    // Find auction in database
    const auction = await Auction.findOne({ blockchainAuctionId })
      .populate('bidders.user', 'wallet username fid twitterProfile')
      .populate('hostedBy', 'wallet username fid twitterProfile')
      .lean() as any | null;

      console.log('Fetched auction from DB:', auction);
    
    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      );
    }

    // Get current time to determine auction status
    const now = new Date();
    const isRunning = now <= auction.endDate;
    const auctionStatus = isRunning ? 'Running' : 'Ended';

    // Determine decimal places and fetch token price if needed
    const isUSDC = auction.tokenAddress?.toLowerCase() === '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
    const decimals = isUSDC ? 6 : 18;
    
    let tokenPriceUSD = 0;
    let hasStoredUSDValues = false;

    // Check if auction already has stored USD values in database
    if (auction.bidders && auction.bidders.length > 0) {
      hasStoredUSDValues = auction.bidders.some((bidder: any) => bidder.usdcValue !== null && bidder.usdcValue !== undefined);
    }

    // Fetch token price if we don't have stored USD values
    if (!hasStoredUSDValues) {
      try {
        if (isUSDC) {
          tokenPriceUSD = 1; // USDC is always $1
        } else {
          tokenPriceUSD = await fetchTokenPrice(auction.tokenAddress);
        }
        console.log(`Token price for ${auction.tokenAddress}: $${tokenPriceUSD}`);
      } catch (error) {
        console.error('Error fetching token price:', error);
        // Continue without USD values if price fetch fails
        tokenPriceUSD = 0;
      }
    }

    const bidders: ContractBidder[] = contractBidders;

    // Create a map of wallet addresses to user data from auction.bidders for quick lookup
    const walletToUserMap: Record<string, any> = {};
    if (auction.bidders && auction.bidders.length > 0) {
      auction.bidders.forEach((bidder: any) => {
        if (bidder.user && bidder.user.wallet) {
          walletToUserMap[bidder.user.wallet.toLowerCase()] = {
            ...bidder.user,
            userId: bidder.user._id?.toString() || bidder.user._id
          };
        }
      });
    }

    console.log("Wallet to User Map:", walletToUserMap);

    // Process bidders - separate numeric FIDs from wallet address FIDs
    const numericFids: string[] = [];
    const processedBidders: ProcessedBidder[] = [];

    for (let i = 0; i < bidders.length; i++) {
      const bidder = bidders[i];

      console.log("Processing bidder:", bidder);

      const fidValue = bidder.fid;
      
      // Get user data from the populated auction.bidders
      const userData = walletToUserMap[bidder.bidder.toLowerCase()];

      console.log(bidder.bidAmount, bidder, "Details of each bid", "User data:", userData)
      
      // Calculate USD value
      let usdValue: number | undefined = undefined;
      
      if (hasStoredUSDValues && auction.bidders && auction.bidders[i]) {
        // Use stored USD value from database if available
        usdValue = (auction.bidders[i] as any).usdcValue || undefined;
      } else if (tokenPriceUSD > 0) {
        // Calculate USD value using current token price
        const bidAmountFormatted = Number(bidder.bidAmount) / Math.pow(10, decimals);
        usdValue = calculateUSDValue(bidAmountFormatted, tokenPriceUSD);
      }
      
      // Check if FID is a hex string (wallet address)
      if (fidValue.startsWith('0x')) {
        // Use wallet address for identicon
        const truncatedAddress = `${fidValue.slice(0, 6)}...${fidValue.slice(-4)}`;
        const twitterProfile = userData?.twitterProfile;
        processedBidders.push({
          displayName: twitterProfile?.username || truncatedAddress,
          image: twitterProfile?.profileImageUrl || `https://api.dicebear.com/5.x/identicon/svg?seed=${bidder.bidder.toLowerCase()}`,
          bidAmount: bidder.bidAmount,
          usdValue,
          walletAddress: bidder.bidder,
          userId: userData?.userId
        });
      } else if (fidValue.startsWith('none')) {
        // FID starts with "none" - use Twitter profile if available
        const twitterProfile = userData?.twitterProfile;
        const truncatedAddress = `${bidder.bidder.slice(0, 6)}...${bidder.bidder.slice(-4)}`;
        processedBidders.push({
          displayName: twitterProfile?.name || twitterProfile?.username || truncatedAddress,
          image: twitterProfile?.profileImageUrl || `https://api.dicebear.com/5.x/identicon/svg?seed=${bidder.bidder.toLowerCase()}`,
          bidAmount: bidder.bidAmount,
          usdValue,
          walletAddress: bidder.bidder,
          userId: userData?.userId
        });
      } else {
        // Numeric FID - collect for batch processing
        numericFids.push(fidValue);
        // Temporarily add placeholder
        processedBidders.push({
          displayName: '',
          image: '',
          bidAmount: bidder.bidAmount,
          usdValue,
          walletAddress: bidder.bidder,
          userId: userData?.userId
        });
      }
    }

    console.log("Numeric FIDs to fetch from Neynar:", numericFids);

    // Fetch Neynar data for numeric FIDs if any exist
    let neynarUsers: any[] = [];
    if (numericFids.length > 0) {
      try {
        const neynarResponse = await fetch(
          `https://api.neynar.com/v2/farcaster/user/bulk?fids=${numericFids.join(',')}`,
          {
            headers: {
              "x-api-key": process.env.NEYNAR_API_KEY as string,
            },
          }
        );

        if (neynarResponse.ok) {
          const neynarData = await neynarResponse.json();

          console.log("Neynar data fetched:", neynarData);

          neynarUsers = neynarData.users || [];
        }
      } catch (error) {
        console.error('Error fetching Neynar data:', error);
        // Continue without Neynar data
      }
    }

    // Update processed bidders with Neynar data
    for (let i = 0; i < bidders.length; i++) {
      const bidder = bidders[i];
      
      if (!bidder.fid.startsWith('0x')) {
        // This is a numeric FID
        const neynarUser = neynarUsers.find(user => user.fid.toString() === bidder.fid);
        
        if (neynarUser) {
          processedBidders[i].displayName = neynarUser.display_name || neynarUser.username || `User ${bidder.fid}`;
          processedBidders[i].image = neynarUser.pfp_url || `https://api.dicebear.com/5.x/identicon/svg?seed=${bidder.bidder.toLowerCase()}`;
        } else {
          // Fallback if Neynar data not found
          processedBidders[i].displayName = `User ${bidder.fid}`;
          processedBidders[i].image = `https://api.dicebear.com/5.x/identicon/svg?seed=${bidder.bidder.toLowerCase()}`;
        }
      }
    }

    // Find highest bid
    const highestBid = bidders.length > 0 
      ? Math.max(...bidders.map(b => Number(b.bidAmount)))
      : 0;

    // Process hostedBy to add enhanced user data from Neynar or Twitter
    let enhancedHostedBy = { ...(auction.hostedBy as any) };
    const hostFid = (auction.hostedBy as any)?.fid;
    
    if (hostFid && hostFid !== '' && !hostFid.startsWith('none')) {
      try {
        const neynarResponse = await fetch(
          `https://api.neynar.com/v2/farcaster/user/bulk?fids=${hostFid}`,
          {
            headers: {
              "x-api-key": process.env.NEYNAR_API_KEY as string,
            },
          }
        );

        if (neynarResponse.ok) {
          const neynarData = await neynarResponse.json();
          const neynarUser = neynarData.users?.[0];
          
          if (neynarUser) {
            enhancedHostedBy.username = neynarUser.username || enhancedHostedBy.username;
            enhancedHostedBy.display_name = neynarUser.display_name;
            enhancedHostedBy.pfp_url = neynarUser.pfp_url;
          }
        }
      } catch (error) {
        console.error('Error fetching host data from Neynar:', error);
      }
    } else if (hostFid && hostFid.startsWith('none') && enhancedHostedBy.twitterProfile?.username) {
      // Use Twitter profile for "none" FID hosts
      enhancedHostedBy.username = enhancedHostedBy.twitterProfile.username;
      enhancedHostedBy.display_name = enhancedHostedBy.twitterProfile.name;
      enhancedHostedBy.pfp_url = enhancedHostedBy.twitterProfile.profileImageUrl;
    }

    // If no valid FID or Neynar/Twitter fetch failed, use fallback data
    if (!enhancedHostedBy.username || enhancedHostedBy.username === '') {
      const wallet = enhancedHostedBy.wallet;
      enhancedHostedBy.username = auction.hostedBy.username || (wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : wallet);
    }

    // Trigger outbid notification asynchronously (fire and forget)
    fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/notifications/outbid/${blockchainAuctionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }).catch(error => console.error('Error sending outbid notification:', error));

    // Prepare response with auction info and processed bidders
    const response = {
      auctionName: auction.auctionName,
      description: auction.description,
      auctionStatus,
      endDate: auction.endDate,
      currency: auction.currency,
      tokenAddress: auction.tokenAddress,
      highestBid: highestBid.toString(),
      minimumBid: auction.minimumBid.toString(),
      bidders: processedBidders,
      hostedBy: enhancedHostedBy
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error processing auction data:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
