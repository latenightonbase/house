import { NextRequest, NextResponse } from 'next/server';
import Auction, { IAuction } from '../../../../utils/schemas/Auction';
import User from '../../../../utils/schemas/User';
import connectToDB from '@/utils/db';
import { fetchTokenPrice, calculateUSDValue } from '@/utils/tokenPrice';
import { getFidsWithCache } from '@/utils/fidCache';
import { getRedisClient } from '@/utils/redisCache';

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

// Helper function to handle ended auctions using database data
async function handleEndedAuction(auction: any, auctionStatus: string) {
  const dbBidders = auction.bidders || [];
  
  // Group bids by user and keep only the highest bid for each user
  const userBidMap: Record<string, any> = {};
  dbBidders.forEach((bidder: any) => {
    const userId = bidder.user?._id?.toString() || bidder.user?._id;
    if (userId) {
      const existingBid = userBidMap[userId];
      if (!existingBid || bidder.bidAmount > existingBid.bidAmount) {
        userBidMap[userId] = bidder;
      }
    }
  });

  // Convert map back to array of highest bids per user
  const uniqueBidders = Object.values(userBidMap);
  
  // Collect Farcaster FIDs for batch Neynar fetch
  const farcasterFids: string[] = [];
  const fidToIndexMap: Record<string, number[]> = {};

  uniqueBidders.forEach((bidder: any, index: number) => {
    if (bidder.user?.socialPlatform === 'FARCASTER' && bidder.user?.socialId && !bidder.user.socialId.startsWith('none') && !bidder.user.socialId.startsWith('0x')) {
      farcasterFids.push(bidder.user.socialId);
      if (!fidToIndexMap[bidder.user.socialId]) {
        fidToIndexMap[bidder.user.socialId] = [];
      }
      fidToIndexMap[bidder.user.socialId].push(index);
    }
  });

  // Fetch Neynar data for both bidders and host
  const hostSocialId = auction.hostedBy?.socialId;
  const hostSocialPlatform = auction.hostedBy?.socialPlatform;
  const shouldFetchHost = hostSocialPlatform === 'FARCASTER' && hostSocialId && !hostSocialId.startsWith('none') && !hostSocialId.startsWith('0x');

  const allFids = [...farcasterFids];
  if (shouldFetchHost) {
    allFids.push(hostSocialId);
  }

  const neynarUsersMap = await getFidsWithCache(allFids);
  
  // Identify missing FIDs and make fallback API call if needed
  const missingFids: string[] = [];
  for (const fid of farcasterFids) {
    if (!neynarUsersMap[fid]) {
      // Check if bidder has Twitter profile
      const hasTwitterProfile = uniqueBidders.some((bidder: any) => 
        bidder.user?.socialId === fid && bidder.user?.twitterProfile
      );
      if (!hasTwitterProfile) {
        missingFids.push(fid);
      }
    }
  }

  // Make fallback Neynar API call for missing FIDs
  if (missingFids.length > 0) {
    try {
      const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${missingFids.join(',')}`, {
        headers: {
          'api_key': process.env.NEYNAR_API_KEY || ''
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const redisClient = getRedisClient();
        
        // Cache each user in Redis and add to neynarUsersMap
        for (const user of data.users) {
          neynarUsersMap[user.fid.toString()] = user;
          
          if (redisClient) {
            try {
              await redisClient.setex(
                `fid:${user.fid}`,
                3600,
                JSON.stringify(user)
              );
            } catch (err) {
              console.warn('Failed to cache Neynar user:', err);
            }
          }
        }
      }
    } catch (error) {
      console.error('Fallback Neynar API call failed:', error);
    }
  }
  
  const neynarUsers = Object.values(neynarUsersMap);
  const hostNeynarData = shouldFetchHost ? neynarUsersMap[hostSocialId] : null;

  // Process bidders from database
  const processedBidders: ProcessedBidder[] = uniqueBidders.map((bidder: any) => {
    const user = bidder.user;
    let displayName = '';
    let image = '';

    console.log('Processing ended auction bidder:', bidder);

    if (user?.socialPlatform === 'FARCASTER') {
      const neynarUser = neynarUsers.find((nu:any) => nu.fid.toString() === user.socialId);
      if (neynarUser) {
        displayName = neynarUser.display_name || neynarUser.username || `User ${user.socialId}`;
        image = neynarUser.pfp_url || `https://api.dicebear.com/5.x/identicon/svg?seed=${user.wallet?.toLowerCase() || 'default'}`;
      } else {
        displayName = user.username || `User ${user.socialId}`;
        image = `https://api.dicebear.com/5.x/identicon/svg?seed=${user.wallet?.toLowerCase() || 'default'}`;
      }
    } else if (user?.socialPlatform === 'TWITTER' && user?.twitterProfile) {
      displayName = user.twitterProfile.username || user.twitterProfile.name || user.username;
      image = user.twitterProfile.profileImageUrl || `https://api.dicebear.com/5.x/identicon/svg?seed=${user.wallet?.toLowerCase() || 'default'}`;
    } else {
      const wallet = user?.wallet || '';
      displayName = user?.username || (wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : 'Unknown');
      image = `https://api.dicebear.com/5.x/identicon/svg?seed=${wallet?.toLowerCase() || 'default'}`;
    }

    // Convert bidAmount to wei format (multiply by 10^decimals) to match contract format
    const isUSDC = auction.tokenAddress?.toLowerCase() === '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
    const decimals = isUSDC ? 6 : 18;
    const bidAmountInWei = (BigInt(Math.floor(bidder.bidAmount * Math.pow(10, decimals)))).toString();

    return {
      displayName,
      image,
      bidAmount: bidAmountInWei,
      usdValue: bidder.usdcValue,
      walletAddress: user?.wallet || '',
      userId: user?._id?.toString() || user?._id
    };
  });

  // Process hostedBy
  let enhancedHostedBy = { ...(auction.hostedBy as any) };

  if (hostNeynarData) {
    enhancedHostedBy.username = hostNeynarData.username || enhancedHostedBy.username;
    enhancedHostedBy.display_name = hostNeynarData.display_name;
    enhancedHostedBy.pfp_url = hostNeynarData.pfp_url;
  } else if (hostSocialPlatform === 'TWITTER' && enhancedHostedBy.twitterProfile) {
    enhancedHostedBy.username = enhancedHostedBy.twitterProfile.username;
    enhancedHostedBy.display_name = enhancedHostedBy.twitterProfile.name;
    enhancedHostedBy.pfp_url = enhancedHostedBy.twitterProfile.profileImageUrl;
  }

  if (!enhancedHostedBy.username || enhancedHostedBy.username === '') {
    const wallet = enhancedHostedBy.wallet;
    enhancedHostedBy.username = wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : 'Unknown';
  }

  // Calculate highest bid in wei format
  const isUSDC = auction.tokenAddress?.toLowerCase() === '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
  const decimals = isUSDC ? 6 : 18;
  const highestBidValue = uniqueBidders.length > 0 
    ? Math.max(...uniqueBidders.map((b: any) => Number(b.bidAmount)))
    : 0;
  const highestBid = (BigInt(Math.floor(highestBidValue * Math.pow(10, decimals)))).toString();

  console.log('Ended auction processed bidders:', processedBidders);

  return NextResponse.json({
    auctionName: auction.auctionName,
    description: auction.description,
    auctionStatus,
    endDate: auction.endDate,
    currency: auction.currency,
    tokenAddress: auction.tokenAddress,
    highestBid: highestBid,
    minimumBid: (BigInt(Math.floor(auction.minimumBid * Math.pow(10, decimals)))).toString(),
    bidders: processedBidders,
    hostedBy: enhancedHostedBy
  });
}

// POST handler - processes bidders data from contract
export async function POST(
  req: NextRequest
) {
  try {
    
    await connectToDB();
    
    // Ensure User model is registered
    const _ = User;
    
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
      .populate('bidders.user', 'wallets username socialId socialPlatform twitterProfile')
      .populate('hostedBy', 'wallet username socialId socialPlatform twitterProfile')
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
    const isRunning = now <= auction.endDate && auction.status !== 'ended';
    const auctionStatus = isRunning ? 'Running' : 'Ended';

    // If auction has ended, use database bidders instead of contract bidders
    if (!isRunning) {
      return await handleEndedAuction(auction, auctionStatus);
    }

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

    console.log("Processing bidders from contract:", bidders);
    console.log("Auction bidders from DB:", auction.bidders);

    // Create a map of wallet addresses to user data from auction.bidders for quick lookup
    const walletToUserMap: Record<string, any> = {};
    if (auction.bidders && auction.bidders.length > 0) {
      auction.bidders.forEach((dbBidder: any) => {
        console.log("This is the bidder from DB:", dbBidder);
        // Check if user exists and if any contract bidder has a wallet matching this user's wallets
        if (dbBidder.user && bidders.some((contractBidder: any) => 
          dbBidder.user.wallets.some((w: string) => {
            console.log("This is W", w, "Contract bidder:", contractBidder.bidder);
            return w.toLowerCase() === contractBidder.bidder.toLowerCase();
          })
        )) {
          // Map all of the user's wallets to their user data
          dbBidder.user.wallets.forEach((wallet: string) => {
            walletToUserMap[wallet.toLowerCase()] = {
              ...dbBidder.user,
              userId: dbBidder.user._id?.toString() || dbBidder.user._id
            };
          });
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

    // Prepare host FID fetch
    const hostFid = (auction.hostedBy as any)?.socialId;
    const shouldFetchHostFid = hostFid && hostFid !== '' && !hostFid.startsWith('none');

    console.log('Processing hostedBy with FID:', hostFid);

    // Fetch Neynar data for both numeric FIDs and host
    const allFids = [...numericFids];
    if (shouldFetchHostFid) {
      allFids.push(hostFid);
    }

    const neynarUsersMap = await getFidsWithCache(allFids);
    
    // Identify missing FIDs and make fallback API call if needed
    const missingFids: string[] = [];
    for (const fid of numericFids) {
      if (!neynarUsersMap[fid]) {
        // Check if bidder has Twitter profile
        const bidderIndex = bidders.findIndex(b => b.fid === fid);
        if (bidderIndex !== -1) {
          const userData = walletToUserMap[bidders[bidderIndex].bidder.toLowerCase()];
          if (!userData?.twitterProfile) {
            missingFids.push(fid);
          }
        }
      }
    }

    // Make fallback Neynar API call for missing FIDs
    if (missingFids.length > 0) {
      try {
        const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${missingFids.join(',')}`, {
          headers: {
            'api_key': process.env.NEYNAR_API_KEY || ''
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const redisClient = getRedisClient();
          
          // Cache each user in Redis and add to neynarUsersMap
          for (const user of data.users) {
            neynarUsersMap[user.fid.toString()] = user;
            
            if (redisClient) {
              try {
                await redisClient.setex(
                  `fid:${user.fid}`,
                  3600,
                  JSON.stringify(user)
                );
              } catch (err) {
                console.warn('Failed to cache Neynar user:', err);
              }
            }
          }
        }
      } catch (error) {
        console.error('Fallback Neynar API call failed:', error);
      }
    }
    
    const neynarUsers = Object.values(neynarUsersMap);
    const hostNeynarUser = shouldFetchHostFid ? neynarUsersMap[hostFid] : null;

    console.log("Neynar data fetched from redis:", neynarUsers);

    // Update processed bidders with Neynar data
    for (let i = 0; i < bidders.length; i++) {
      const bidder = bidders[i];
      
      if (!bidder.fid.startsWith('0x') && !bidder.fid.startsWith('none')) {
        // This is a numeric FID
        const neynarUser = neynarUsers.find((user:any) => user.fid.toString() === bidder.fid);
        
        console.log(`Matching Neynar user for FID ${bidder.fid}:`, neynarUser);

        if (neynarUser) {
          processedBidders[i].displayName = neynarUser.display_name || neynarUser.username || `User ${bidder.fid}`;
          processedBidders[i].image = neynarUser.pfp_url || `https://api.dicebear.com/5.x/identicon/svg?seed=${bidder.bidder.toLowerCase()}`;
        } else {
          // Fallback if Neynar data not found
          processedBidders[i].displayName = bidder.twitterProfile?.username || `User ${bidder.fid}`;
          processedBidders[i].image = bidder.twitterProfile?.profileImageUrl || `https://api.dicebear.com/5.x/identicon/svg?seed=${bidder.bidder.toLowerCase()}`;
        }
      }
    }

    // Find highest bid
    const highestBid = bidders.length > 0 
      ? Math.max(...bidders.map(b => Number(b.bidAmount)))
      : 0;

    // Process hostedBy to add enhanced user data from Neynar or Twitter
    let enhancedHostedBy = { ...(auction.hostedBy as any) };
    
    if (hostNeynarUser) {
      enhancedHostedBy.username = hostNeynarUser.username || enhancedHostedBy.username;
      enhancedHostedBy.display_name = hostNeynarUser.display_name;
      enhancedHostedBy.pfp_url = hostNeynarUser.pfp_url;
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