import { NextRequest, NextResponse } from 'next/server';
import Auction from '@/utils/schemas/Auction';
import User from '@/utils/schemas/User';
import connectToDB from '@/utils/db';

export async function POST(
  req: NextRequest,
) {
  try {
    console.log('[Outbid Notification] Starting outbid notification process');
    await connectToDB();
    const blockchainAuctionId = req.nextUrl.pathname.split('/').pop();
    console.log('[Outbid Notification] blockchainAuctionId:', blockchainAuctionId);

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

    console.log('[Outbid Notification] Auction found:', !!auction);
    console.log('[Outbid Notification] Number of bidders:', auction?.bidders?.length || 0);

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

    console.log('[Outbid Notification] Highest bidder:', highestBidder.user.wallet);
    console.log('[Outbid Notification] Second highest bidder:', secondHighestBidder.user.wallet);

    // Fetch the highest bidder's username (could be from Farcaster or Twitter)
    const highestBidderUser = highestBidder.user;
    let highestBidderUsername = highestBidderUser.username || highestBidderUser.wallet;

    console.log('[Outbid Notification] Initial highest bidder username:', highestBidderUsername);
    console.log('[Outbid Notification] Highest bidder FID:', highestBidderUser.socialId);

    // Fetch from Neynar if FID exists and is numeric
    if (highestBidderUser.socialId && !highestBidderUser.socialId.startsWith('0x') && !highestBidderUser.socialId.startsWith('none')) {
      try {
        const neynarResponse = await fetch(
          `https://api.neynar.com/v2/farcaster/user/bulk?fids=${highestBidderUser.socialId}`,
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
            console.log('[Outbid Notification] Fetched username from Neynar:', highestBidderUsername);
          } else {
            console.log('[Outbid Notification] No user found in Neynar response');
          }
        } else {
          console.log('[Outbid Notification] Neynar response not OK:', neynarResponse.status);
        }
      } catch (error) {
        console.error('Error fetching highest bidder from Neynar:', error);
      }
    }

    // Get notification details for second highest bidder
    const secondHighestBidderUser = secondHighestBidder.user;
    
    console.log('[Outbid Notification] Second highest bidder has notification details:', !!secondHighestBidderUser.notificationDetails);
    
    if (!secondHighestBidderUser.notificationDetails) {
      return NextResponse.json(
        { error: 'Second highest bidder has no notification details' },
        { status: 400 }
      );
    }

    const { url, token } = secondHighestBidderUser.notificationDetails;

    const notificationTitle = "You've been outbid!";
    const notificationBody = `${highestBidderUsername} outbid you in "${auction.auctionName}"`;
    const targetUrl = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/bid/${blockchainAuctionId}`;

    console.log('[Outbid Notification] Notification details:');
    console.log('[Outbid Notification] Title:', notificationTitle);
    console.log('[Outbid Notification] Body:', notificationBody);
    console.log('[Outbid Notification] Target URL:', targetUrl);
    console.log('[Outbid Notification] Notification URL:', url);

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

    console.log('[Outbid Notification] Notification response status:', res.status);

    if (!res.ok) {
      const errorData = await res.json();
      console.error('[Outbid Notification] Failed to send notification:', errorData);
      return NextResponse.json(
        { error: 'Failed to send notification', details: errorData },
        { status: res.status }
      );
    }

    const responseData = await res.json();
    console.log('[Outbid Notification] Notification sent successfully:', responseData);

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
