import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/utils/auth';
import User from '@/utils/schemas/User';
import dbConnect from '@/utils/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.wallet) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { twitterProfile } = await request.json();

    if (!twitterProfile || !twitterProfile.id || !twitterProfile.username) {
      return NextResponse.json({ error: 'Invalid Twitter profile data' }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findOneAndUpdate(
      { wallet: session.wallet },
      {
        $set: {
          username: twitterProfile.username,
          twitterProfile: {
            id: twitterProfile.id,
            username: twitterProfile.username,
            name: twitterProfile.name || twitterProfile.username,
            profileImageUrl: twitterProfile.profileImageUrl || twitterProfile.profile_image_url
          }
        }
      },
      { new: true, upsert: true }
    );

    return NextResponse.json({ 
      success: true, 
      user: {
        wallet: user.wallet,
        twitterProfile: user.twitterProfile
      }
    });

  } catch (error) {
    console.error('Error saving Twitter profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}