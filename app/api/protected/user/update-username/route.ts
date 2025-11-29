import { NextRequest, NextResponse } from 'next/server';
import User from '../../../../../utils/schemas/User';
import connectToDB from '@/utils/db';
import { verifyAccessToken } from '@/utils/privyAuth';

export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    try {
      await verifyAccessToken(token);
    } catch (error) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    await connectToDB();
    
    const body = await req.json();
    const { wallet, username } = body;

    if (!wallet || !username) {
      return NextResponse.json(
        { error: 'Wallet address and username are required' }, 
        { status: 400 }
      );
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { error: 'Username can only contain letters, numbers, and underscores' },
        { status: 400 }
      );
    }

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(
        { error: 'Username must be between 3 and 20 characters' },
        { status: 400 }
      );
    }

    // Check if username is already taken by another user
    const existingUser = await User.findOne({ 
      username: username.toLowerCase(),
      wallet: { $ne: wallet } // Exclude the current user's wallet
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      );
    }

    // Update the user's username
    const updatedUser = await User.findOneAndUpdate(
      { wallet },
      { username: username.toLowerCase() },
      { new: true, select: 'wallet username fid createdAt updatedAt' }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Username updated successfully',
      user: updatedUser
    });

  } catch (error: any) {
    console.error('Error updating username:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}