import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Auction from '@/utils/schemas/Auction';
import User from '@/utils/schemas/User';
import PendingDelivery from '@/utils/schemas/PendingDelivery';
import { authenticateRequest } from '@/utils/authService';

export async function POST(req: NextRequest) {
  const authResult = await authenticateRequest(req);
  if (!authResult.success) {
    return authResult.response;
  }

  console.log('Authenticated user ID:', authResult);

  try {
    const body = await req.json();
    const { auctionId } = body;

    if (!auctionId) {
      return NextResponse.json({ error: 'Auction ID is required' }, { status: 400 });
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

    // Find the pending delivery
    const pendingDelivery = await PendingDelivery.findOne({ auctionId }).populate('auctionId');
    
    if (!pendingDelivery) {
      return NextResponse.json({ error: 'Pending delivery not found' }, { status: 404 });
    }

    // Verify the requesting user is the host
    if (pendingDelivery.hostSocialId !== socialId) {
      return NextResponse.json({ error: 'Only the auction host can mark as delivered' }, { status: 403 });
    }

    // Check if already marked as delivered
    if (pendingDelivery.delivered) {
      return NextResponse.json({ error: 'Auction already marked as delivered' }, { status: 400 });
    }

    // Mark as delivered
    pendingDelivery.delivered = true;
    pendingDelivery.deliveredDate = new Date();
    await pendingDelivery.save();

    // Also update auction for backward compatibility
    const auction = await Auction.findById(auctionId);
    if (auction) {
      auction.deliveredByHost = true;
      await auction.save();
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Auction marked as delivered. The winner can now leave a review.',
      pendingDelivery: {
        id: pendingDelivery._id,
        auctionId: pendingDelivery.auctionId,
        delivered: pendingDelivery.delivered,
        deliveredDate: pendingDelivery.deliveredDate,
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error marking auction as delivered:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
