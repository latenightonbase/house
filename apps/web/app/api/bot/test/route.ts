import { NextRequest, NextResponse } from "next/server";
import { neynar } from "../lib/neynarClient";
import { isApiErrorResponse } from "@neynar/nodejs-sdk";

// Simple test endpoint to verify bot can cast
export async function GET(req: NextRequest) {
  const signerUuid = process.env.BOT_SIGNER_UUID;

  if (!signerUuid) {
    return NextResponse.json({ error: "BOT_SIGNER_UUID not set" }, { status: 500 });
  }

  try {
    // Post a simple test cast (not a reply)
    const result = await neynar.publishCast({
      signerUuid,
      text: "🤖 Bot test - ignore this!",
    });

    return NextResponse.json({
      success: true,
      castHash: result.cast.hash,
      message: "Test cast published! Check the bot's profile on Warpcast.",
    });
  } catch (error) {
    if (isApiErrorResponse(error)) {
      return NextResponse.json({
        error: "Neynar API error",
        status: error.response.status,
        details: error.response.data,
      }, { status: error.response.status });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

