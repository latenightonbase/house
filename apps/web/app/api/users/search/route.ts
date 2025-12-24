import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import User from '@/utils/schemas/User';
import { signOut } from 'next-auth/react';
import { authenticateRequest } from '@/utils/authService';
import { getFidsWithCache } from '@/utils/fidCache';

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.success) {
      return authResult.response;
    }
    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ users: [] });
    }

    // Search by wallet address, username, or FID
    const users = await User.find({
      $or: [
        { wallet: { $regex: query, $options: 'i' } },
        { wallets: { $regex: query, $options: 'i' } },
        { fid: { $regex: query, $options: 'i' } },
        { socialId: { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } },
        { 'twitterProfile.username': { $regex: query, $options: 'i' } },
        { 'twitterProfile.name': { $regex: query, $options: 'i' } },
        { 'twitterProfile.id': { $regex: query, $options: 'i' } }
      ]
    })
    .select('_id wallet wallets fid socialId socialPlatform username twitterProfile')
    .limit(10)
    .lean();

    // Fetch Neynar data for users with valid FIDs
    const fidsToFetch = users
      .filter((user: any) => user.socialId && user.socialPlatform !== "TWITTER")
      .map((user: any) => user.socialId);
    
    const neynarUsersMap = await getFidsWithCache(fidsToFetch);

    const usersWithProfiles = users.map((user: any) => {
      let pfp_url = null;
      let displayUsername = user.username;

      if (user.socialId && user.socialPlatform !== "TWITTER") {
        const neynarUser = neynarUsersMap[user.socialId];
        if (neynarUser) {
          displayUsername = neynarUser.username || user.username;
          pfp_url = neynarUser.pfp_url || null;
        }
      } else {
        // Use wallet-based defaults
        displayUsername = user.username ? user.username : `${user.wallet.slice(0, 6)}...${user.wallet.slice(-4)}`;
        pfp_url = `https://api.dicebear.com/5.x/identicon/svg?seed=${user.wallet.toLowerCase()}`;
      }

      return {
        _id: user._id,
        wallet: user.wallet,
        fid: user.socialId,
        username: displayUsername,
        pfp_url
      };
    });

    return NextResponse.json({ users: usersWithProfiles });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    );
  }
}

