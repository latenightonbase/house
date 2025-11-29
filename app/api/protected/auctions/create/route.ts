import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/db';
import Auction from '@/utils/schemas/Auction';
import User from '@/utils/schemas/User';
import { getServerSession } from 'next-auth';
import { verifyAccessToken } from '@/utils/privyAuth';

export async function POST(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    console.log('Verifying token in auction creation route', token);

    try {
        await verifyAccessToken(token);
    } catch (error) {
        return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }
  try {
    const body = await req.json();
    const { auctionName, description, tokenAddress, endDate, startDate, hostedBy, minimumBid, blockchainAuctionId, currency, creationHash } = body;

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

    var user = await User.findOne({ wallet: hostedBy });

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
    });

    await newAuction.save();

    user.hostedAuctions.push(newAuction._id);

    await user.save()

    return NextResponse.json(
      { message: 'Auction created successfully', auction: newAuction },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating auction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}