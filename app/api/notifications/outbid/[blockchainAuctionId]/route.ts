import { NextRequest, NextResponse } from 'next/server';
import Auction from '@/utils/schemas/Auction';
import User from '@/utils/schemas/User';
import connectToDB from '@/utils/db';

export async function POST(
  req: NextRequest,
) {
  try {
    await connectToDB();
    const blockchainAuctionId = req.nextUrl.pathname.split('/').pop();

    if (!blockchainAuctionId) {
      return NextResponse.json(
        { error: 'Missing blockchainAuctionId parameter' },
        { status: 400 }
      );
    }

    // Fetch auction with populated bidders
    const auction = await Auction.findOne({ blockchainAuctionId })
      .populate('bidders.user', 'wallet username fid notificationDetails')
      .lean() as any | null;

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      );
    }

    if (!auction.bidders || auction.bidders.length < 2) {
      return NextResponse.json(
        { error: 'Not enough bidders to send notification' },
        { status: 400 }
      );
    }

    // Sort bidders by bid amount descending
    const sortedBidders = [...auction.bidders].sort((a, b) => b.bidAmount - a.bidAmount);

    // Get the highest and second-highest bidder
    const highestBidder = sortedBidders[0];
    const secondHighestBidder = sortedBidders[1];

    // Fetch the highest bidder's username (could be from Farcaster or Twitter)
    const highestBidderUser = highestBidder.user;
    let highestBidderUsername = highestBidderUser.username || highestBidderUser.wallet;

    // Fetch from Neynar if FID exists and is numeric
    if (highestBidderUser.fid && !highestBidderUser.fid.startsWith('0x') && !highestBidderUser.fid.startsWith('none')) {
      try {
        const neynarResponse = await fetch(
          `https://api.neynar.com/v2/farcaster/user/bulk?fids=${highestBidderUser.fid}`,
          {
            headers: {
              'x-api-key': process.env.NEYNAR_API_KEY as string,
            },
          }
        );

        if (neynarResponse.ok) {
          const neynarData = await neynarResponse.json();
          const neynarUser = neynarData.users?.[0];
          if (neynarUser) {
            highestBidderUsername = neynarUser.username || neynarUser.display_name || highestBidderUsername;
          }
        }
      } catch (error) {
        console.error('Error fetching highest bidder from Neynar:', error);
      }
    }

    // Get notification details for second highest bidder
    const secondHighestBidderUser = secondHighestBidder.user;
    
    if (!secondHighestBidderUser.notificationDetails) {
      return NextResponse.json(
        { error: 'Second highest bidder has no notification details' },
        { status: 400 }
      );
    }

    const { url, token } = secondHighestBidderUser.notificationDetails;

    const notificationTitle = "You've been outbid!";
    const notificationBody = `${highestBidderUsername} outbid you in "${auction.auctionName}"`;
    const targetUrl = `${process.env.NEXT_PUBLIC_MINIAPP_URL || 'https://farcaster-miniapp-liart.vercel.app'}/bid/${blockchainAuctionId}`;

    // Send notification
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notificationId: crypto.randomUUID(),
        title: notificationTitle,
        body: notificationBody,
        targetUrl: targetUrl,
        tokens: [token],
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      return NextResponse.json(
        { error: 'Failed to send notification', details: errorData },
        { status: res.status }
      );
    }

    const responseData = await res.json();

    return NextResponse.json({
      success: true,
      message: 'Notification sent to second highest bidder',
      response: responseData,
    });
  } catch (error: any) {
    console.error('Error sending outbid notification:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
