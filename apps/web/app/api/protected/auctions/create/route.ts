import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Auction from '@/utils/schemas/Auction';
import User from '@/utils/schemas/User';
import { authenticateRequest } from '@/utils/authService';
import { scheduleAuctionReminders, scheduleAuctionEnd } from '@repo/queue';

export async function POST(req: NextRequest) {
  console.log('Verifying token in auction creation route');

  const authResult = await authenticateRequest(req);
  if (!authResult.success) {
    return authResult.response;
  }
  try {
    const body = await req.json();
    const { auctionName, description, tokenAddress, endDate, startDate, hostedBy, hostPrivyId, minimumBid, blockchainAuctionId, currency, creationHash, startingWallet } = body;

    console.log('Creating auction with data:', body);

    if (!auctionName || !tokenAddress || !endDate || !startDate || !hostedBy || !minimumBid) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (auctionName.length > 30) {
      return NextResponse.json({ error: 'Auction title cannot exceed 30 characters' }, { status: 400 });
    }

    if (description && description.length > 200) {
      return NextResponse.json({ error: 'Description cannot exceed 200 characters' }, { status: 400 });
    }

    await dbConnect();

    var user:any;

    if(hostPrivyId) {
      user = await User.findOne({ privyId: hostPrivyId });
    }
    else{
      user = await User.findOne({ socialId: hostedBy });
    }

    console.log('Hosting user:', user);

    if (!user) {
      return NextResponse.json({ error: 'Hosting user not found' }, { status: 404 });
    }

    const newAuction = new Auction({
      auctionName,
      description: description || undefined,
      currency,
      tokenAddress,
      blockchainAuctionId,
      creationHash,
      endDate,
      hostedBy: user._id,
      minimumBid,
      startingWallet: startingWallet
    });

    await newAuction.save();

    user.hostedAuctions.push(newAuction._id);

    await user.save();

    // Schedule jobs (non-blocking)
    try {
      const [reminderResult, endResult] = await Promise.all([
        scheduleAuctionReminders(
          newAuction._id.toString(),
          blockchainAuctionId,
          auctionName,
          new Date(startDate),
          new Date(endDate)
        ),
        scheduleAuctionEnd(
          newAuction._id.toString(),
          blockchainAuctionId,
          auctionName,
          new Date(endDate)
        ),
      ]);
      console.log('Reminder scheduling result:', reminderResult);
      console.log('End job scheduling result:', endResult);
    } catch (err) {
      console.error('Failed to schedule jobs (non-blocking):', err);
    }

    return NextResponse.json(
      { message: 'Auction created successfully', auction: newAuction },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating auction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}