import { NextRequest, NextResponse } from 'next/server';
import User from '@/utils/schemas/User';
import dbConnect from '@/utils/db';
import { authenticateRequest } from '@/utils/authService';

export async function POST(request: NextRequest) {
  try {

    console.log('Request received to save Twitter profile');
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const { twitterProfile, privyId } = await request.json();

    if (!twitterProfile || !twitterProfile.id || !twitterProfile.username || !privyId) {
      return NextResponse.json({ error: 'Invalid Twitter profile data' }, { status: 400 });
    }

    await dbConnect();

    console.log('Updating Twitter profile for socialId:', twitterProfile.id, 'with privyId:', privyId);

    const user = await User.findOneAndUpdate(
      { socialId: twitterProfile.id },
      {
        $set: {
          username: twitterProfile.username,
          privyId: privyId,
          twitterProfile: {
            id: twitterProfile.id,
            username: twitterProfile.username,
            name: twitterProfile.name || twitterProfile.username,
            profileImageUrl: twitterProfile.profileImageUrl || twitterProfile.profile_image_url
          }
        }
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found. Please complete registration first.' }, { status: 404 });
    }

    console.log('Twitter profile updated:', user);

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