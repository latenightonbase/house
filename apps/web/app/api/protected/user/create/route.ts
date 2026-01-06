import { NextRequest, NextResponse } from 'next/server';
import User from '@/utils/schemas/User';
import dbConnect from '@/utils/db';
import { authenticateRequest } from '@/utils/authService';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { privyId, socialId, socialPlatform, walletAddress, twitterProfile } = await request.json();


    console.log('Request data:', { privyId, socialId, socialPlatform, walletAddress, twitterProfile });

    if (!privyId || !socialId || !socialPlatform) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    

    await dbConnect();

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { privyId },
        { socialId }
      ]
    });

    console.log('Existing user check:', existingUser);

    if (existingUser) {
      let updated = false;

      if(!existingUser.privyId){
        existingUser.privyId = privyId;
        updated = true;
      }

      if (twitterProfile) {
        const currentTwitterProfile = existingUser.twitterProfile;
        const needsUpdate = !currentTwitterProfile ||
          currentTwitterProfile.id !== twitterProfile.id ||
          currentTwitterProfile.username !== twitterProfile.username ||
          currentTwitterProfile.name !== (twitterProfile.name || twitterProfile.username) ||
          currentTwitterProfile.profileImageUrl !== twitterProfile.profileImageUrl;

        if (needsUpdate) {
          existingUser.twitterProfile = {
            id: twitterProfile.id,
            username: twitterProfile.username,
            name: twitterProfile.name || twitterProfile.username,
            profileImageUrl: twitterProfile.profileImageUrl
          };
          if (!existingUser.username) {
            existingUser.username = twitterProfile.username;
          }
          updated = true;
        }
      }

      if (updated) {
        await existingUser.save();
      }

      return NextResponse.json({ 
        success: true, 
        user: existingUser,
        message: 'User already exists'
      }, { status: 200 });
    }

    // Create new user
    const newUser = await User.create({
      privyId,
      socialId,
      socialPlatform,
      ...(walletAddress && {
        wallet: walletAddress,
        wallets: [walletAddress]
      }),
      username: twitterProfile?.username,
      twitterProfile: twitterProfile ? {
        id: twitterProfile.id,
        username: twitterProfile.username,
        name: twitterProfile.name || twitterProfile.username,
        profileImageUrl: twitterProfile.profileImageUrl
      } : undefined,
      hostedAuctions: [],
      bidsWon: [],
      participatedAuctions: [],
    });

    return NextResponse.json({ 
      success: true, 
      user: newUser,
      message: 'User created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
