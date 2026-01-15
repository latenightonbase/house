import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/utils/db";
import User from "@/utils/schemas/User";
import { replyToCast, getUserVerifiedWallet, createAuctionFrameUrl } from "../lib/neynarClient";
import { parseAuctionCommand } from "../lib/simpleParser";
import { getCurrencyFromToken } from "../lib/tokenLookup";

interface WebhookCast {
  hash: string;
  thread_hash: string;
  text: string;
  author: {
    fid: number;
    username: string;
    display_name: string;
  };
  parent_hash: string | null;
}

interface WebhookPayload {
  type: string;
  data: WebhookCast;
}

export async function POST(req: NextRequest) {
  try {
    const body: WebhookPayload = await req.json();

    // Only handle cast.created events
    if (body.type !== "cast.created") {
      return NextResponse.json({ success: true });
    }

    const cast = body.data;
    const authorFid = cast.author.fid;
    const castHash = cast.hash;
    const text = cast.text;

    console.log(`[Bot] Received cast from @${cast.author.username}: ${text}`);

    // Connect to database
    await dbConnect();

    // Check if user is registered
    const user = await User.findOne({
      $or: [
        { fid: authorFid.toString() },
        { socialId: authorFid.toString(), socialPlatform: "FARCASTER" },
      ],
    });

    if (!user) {
      // TODO: Handle unregistered users properly
      await replyToCast(castHash, "Coming soon! 🚀");
      return NextResponse.json({ success: true });
    }

    // Parse the auction command
    const parsed = parseAuctionCommand(text);

    if ("error" in parsed) {
      await replyToCast(
        castHash,
        `❌ ${parsed.error}\n\n📝 Format:\n@bot "Auction Name" token:0x... minbid:100 duration:24`
      );
      return NextResponse.json({ success: true });
    }

    // Get user's verified wallet
    const userWallet = await getUserVerifiedWallet(authorFid);

    if (!userWallet) {
      await replyToCast(
        castHash,
        "⚠️ No verified wallet found on your Farcaster account. Please verify a wallet first!"
      );
      return NextResponse.json({ success: true });
    }

    // Get currency from token address
    const currency = await getCurrencyFromToken(parsed.tokenAddress);

    // Create frame URL
    const frameUrl = createAuctionFrameUrl({
      auctionName: parsed.auctionName,
      tokenAddress: parsed.tokenAddress,
      tokenName: currency,
      minimumBid: parsed.minimumBid,
      durationHours: parsed.durationHours,
    });

    // Reply with auction summary and frame
    const response = `🎉 Ready to create your auction!

📝 **${parsed.auctionName}**
${parsed.description ? `📄 ${parsed.description}\n` : ""}💰 Min Bid: ${parsed.minimumBid} ${currency}
⏰ Duration: ${parsed.durationHours} hours

Click below to sign and create! 👇

${frameUrl}`;

    await replyToCast(castHash, response);

    console.log(`[Bot] Replied to @${cast.author.username} with frame URL`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bot webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
