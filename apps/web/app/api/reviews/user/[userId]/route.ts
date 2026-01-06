import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Review from '@/utils/schemas/Review';
import User from '@/utils/schemas/User';
import { getFidsWithCache } from '@/utils/fidCache';

export async function GET(
  req: NextRequest
) {
  try {
    const userId = req.nextUrl.pathname.split('/').pop();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await dbConnect();

    // Get user to fetch their rating stats
    const user = await User.findById(userId)
      .select('averageRating totalReviews username twitterProfile socialId socialPlatform wallets wallet')
      .lean();

    if (!user || Array.isArray(user)) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all reviews for this user (as reviewee/host)
    const reviews = await Review.find({ reviewee: user._id })
      .populate({
        path: 'reviewer',
        select: 'username twitterProfile wallets wallet socialId socialPlatform',
        options: { lean: true },
      })
      .populate({
        path: 'auction',
        select: 'auctionName endDate blockchainAuctionId bidders',
        options: { lean: true },
      })
      .sort({ createdAt: -1 }) // Most recent first
      .lean();

    const fidSet = new Set<string>();
    if (shouldFetchFromNeynar(user)) {
      fidSet.add(String(user.socialId));
    }

    reviews.forEach((review) => {
      const reviewer: any = review.reviewer;
      if (reviewer && shouldFetchFromNeynar(reviewer)) {
        fidSet.add(String(reviewer.socialId));
      }
    });

    const neynarUsersMap = fidSet.size > 0 ? await getFidsWithCache(Array.from(fidSet)) : {};

    const formattedUser = enrichWithSocialProfile(user, neynarUsersMap);
    const responseUserId = (user._id as any)?.toString?.() ?? user._id;
    const formattedReviews = reviews.map((review) => {
      const reviewer = review.reviewer
        ? enrichWithSocialProfile(review.reviewer as Record<string, any>, neynarUsersMap)
        : null;
      return {
        ...review,
        reviewer,
      };
    });

    return NextResponse.json({ 
      success: true,
      user: {
        id: responseUserId,
        username: formattedUser.username,
        display_name: formattedUser.display_name,
        pfp_url: formattedUser.pfp_url,
        bio: formattedUser.bio,
        x_username: formattedUser.x_username,
        twitterProfile: user.twitterProfile,
        averageRating: user.averageRating,
        totalReviews: user.totalReviews,
        platform: user.socialPlatform || null,
        socialId: user.socialId || null,
        wallets: user.wallets || [],
      },
      reviews: formattedReviews 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching user reviews:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
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
