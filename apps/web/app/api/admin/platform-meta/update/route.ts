import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import PlatformMeta from '@/utils/schemas/PlatformMeta';
import User from '@/utils/schemas/User';
import { verifyAccessToken } from '@/utils/privyAuth';

export async function PATCH(req: NextRequest) {
  try {
    // Verify Privy token and check admin status
    const authorization = req.headers.get('Authorization');
    if (!authorization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authorization.split(' ')[1];
    const claims = await verifyAccessToken(token);
    
    await dbConnect();
    
    // Get user and verify admin status
    const user = await User.findOne({ privyId: claims.userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isAdmin = user.socialId === '666038' || user.socialId === '1129842';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { minTokenRequired } = body;

    // Validate input
    if (minTokenRequired === undefined || minTokenRequired === null) {
      return NextResponse.json({ error: 'minTokenRequired is required' }, { status: 400 });
    }

    const minTokenValue = Number(minTokenRequired);
    
    if (isNaN(minTokenValue) || minTokenValue < 0) {
      return NextResponse.json({ error: 'minTokenRequired must be a non-negative number' }, { status: 400 });
    }

    // Update or create platform meta (singleton pattern with upsert)
    const platformMeta = await PlatformMeta.findOneAndUpdate(
      {}, // Empty filter to match any document (singleton)
      { minTokenRequired: minTokenValue },
      { 
        new: true, // Return the updated document
        upsert: true, // Create if doesn't exist
        runValidators: true 
      }
    );

    return NextResponse.json(
      { 
        message: 'Platform meta updated successfully', 
        minTokenRequired: platformMeta.minTokenRequired 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating platform meta:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
