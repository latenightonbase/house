import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import User from '@/utils/schemas/User';
import { getPrivyUser } from '@/lib/privy-server';

export async function GET(req: NextRequest) {
  try {
    const authToken = req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!authToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const verifiedClaims = await getPrivyUser(authToken);
    
    if (!verifiedClaims) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
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
        { fid: { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } }
      ]
    })
    .select('_id wallet fid username')
    .limit(10)
    .lean();

    // Fetch Neynar data for users with valid FIDs
    const usersWithProfiles = await Promise.all(
      users.map(async (user: any) => {
        let pfp_url = null;
        let displayUsername = user.username;

        if (user.fid && !user.fid.toLowerCase().startsWith('none')) {
          // Fetch from Neynar
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
                displayUsername = neynarUser.username || user.username;
                pfp_url = neynarUser.pfp_url || null;
              }
            }
          } catch (error) {
            console.error('Error fetching Neynar data for search:', error);
          }
        } else {
          // Use wallet-based defaults
          displayUsername =  user.username ? user.username : `${user.wallet.slice(0, 6)}...${user.wallet.slice(-4)}`;
          pfp_url = `https://api.dicebear.com/5.x/identicon/svg?seed=${user.wallet.toLowerCase()}`;
        }

        return {
          _id: user._id,
          wallet: user.wallet,
          fid: user.fid,
          username: displayUsername,
          pfp_url
        };
      })
    );

    return NextResponse.json({ users: usersWithProfiles });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    );
  }
}

