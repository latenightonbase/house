import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import PendingDelivery from '@/utils/schemas/PendingDelivery';
import Auction from '@/utils/schemas/Auction';
import User from '@/utils/schemas/User';
import { authenticateRequest } from '@/utils/authService';
import { getFidsWithCache } from '@/utils/fidCache';

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

    // Collect all FIDs to fetch from Neynar
    const fidSet = new Set<string>();
    
    [...asHostPending, ...asWinnerDelivered, ...asWinnerUndelivered].forEach((delivery: any) => {
      if (delivery.winnerId && shouldFetchFromNeynar(delivery.winnerId)) {
        fidSet.add(String(delivery.winnerId.socialId));
      }
      if (delivery.hostId && shouldFetchFromNeynar(delivery.hostId)) {
        fidSet.add(String(delivery.hostId.socialId));
      }
    });

    const neynarUsersMap = fidSet.size > 0 ? await getFidsWithCache(Array.from(fidSet)) : {};

    // Enrich user data with social profiles
    const enrichDeliveries = (deliveries: any[]) => {
      return deliveries.map((delivery: any) => ({
        ...delivery.toObject(),
        winnerId: delivery.winnerId ? enrichWithSocialProfile(delivery.winnerId.toObject(), neynarUsersMap) : null,
        hostId: delivery.hostId ? enrichWithSocialProfile(delivery.hostId.toObject(), neynarUsersMap) : null,
      }));
    };

    return NextResponse.json({
      asHost: enrichDeliveries(asHostPending),
      asWinner: {
        delivered: enrichDeliveries(asWinnerDelivered),
        undelivered: enrichDeliveries(asWinnerUndelivered),
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

function shouldFetchFromNeynar(user: Record<string, any>): boolean {
  return Boolean(user?.socialId && user?.socialPlatform !== 'TWITTER');
}

function enrichWithSocialProfile(
  user: Record<string, any>,
  neynarUsersMap: Record<string, any>
) {
  const walletAddress = getPrimaryWallet(user);
  const neynarData = shouldFetchFromNeynar(user) && user.socialId
    ? neynarUsersMap[user.socialId]
    : null;

  let username = user.username || null;
  let display_name = user.display_name || user.twitterProfile?.name || null;
  let pfp_url = user.pfp_url || user.twitterProfile?.profileImageUrl || null;
  let bio = user.bio || null;
  let x_username = user.twitterProfile?.username || null;

  if (neynarData) {
    username = neynarData.username || username;
    display_name = neynarData.display_name || display_name;
    pfp_url = neynarData.pfp_url || pfp_url;
    bio = neynarData.profile?.bio?.text || bio;

    if (Array.isArray(neynarData.verified_accounts)) {
      const xAccount = neynarData.verified_accounts.find(
        (account: { platform: string }) => account.platform === 'x'
      );
      if (xAccount?.username) {
        x_username = xAccount.username;
      }
    }
  }

  if (!username && walletAddress) {
    username = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
  }

  if (!pfp_url && walletAddress) {
    pfp_url = `https://api.dicebear.com/5.x/identicon/svg?seed=${walletAddress.toLowerCase()}`;
  }

  return {
    ...user,
    username,
    display_name,
    pfp_url,
    bio,
    x_username,
  };
}

function getPrimaryWallet(user: Record<string, any>): string | null {
  if (Array.isArray(user?.wallets) && user.wallets.length > 0 && typeof user.wallets[0] === 'string') {
    return user.wallets[0];
  }
  if (typeof user?.wallet === 'string' && user.wallet) {
    return user.wallet;
  }
  return null;
}
