import { NextRequest, NextResponse } from 'next/server';
import { getUserXPStats } from '@/utils/xpService';
import dbConnect from '@/utils/db';
import { authenticateRequest } from '@/utils/authService';
import User from '@/utils/schemas/User';

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.success) {
      console.error('Authentication failed:', authResult);
      return authResult.response;
    }

    const socialId = req.headers.get('x-user-social-id');
    console.log('Fetching XP stats for socialId:', socialId);
    
    await dbConnect();

    // Find user by socialId first to get MongoDB _id
    const user = await User.findOne({ socialId });
    
    if (!user) {
      console.error('User not found for socialId:', socialId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const stats = await getUserXPStats(user._id);
    console.log('User XP stats:', stats);

    if (!stats) {
      console.error('Failed to get stats for user:', user._id);
      return NextResponse.json({ error: 'User stats not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error fetching user XP stats:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
