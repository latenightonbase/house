import { NeynarAPIClient, Configuration, isApiErrorResponse } from "@neynar/nodejs-sdk";

const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY!,
});

export const neynar = new NeynarAPIClient(config);

export async function replyToCast(
  parentHash: string,
  text: string
): Promise<void> {
  const signerUuid = process.env.BOT_SIGNER_UUID;
  
  if (!signerUuid) {
    throw new Error("BOT_SIGNER_UUID is not set");
  }

  console.log(`[Neynar] Publishing cast with signer: ${signerUuid.substring(0, 8)}...`);
  console.log(`[Neynar] Reply to: ${parentHash}`);
  
  try {
    const result = await neynar.publishCast({
      signerUuid,
      text,
      parent: parentHash,
    });
    console.log(`[Neynar] Cast published: ${result.cast.hash}`);
  } catch (error) {
    if (isApiErrorResponse(error)) {
      console.error(`[Neynar] API Error ${error.response.status}:`, error.response.data);
    }
    throw error;
  }
}

export async function getUserVerifiedWallet(fid: number): Promise<string | null> {
  try {
    const { verifications } = await neynar.fetchVerifications({ fid });
    const ethWallet = verifications.find((v) => v.protocol === "evm");
    return ethWallet?.address || null;
  } catch (error) {
    console.error("Error fetching user verifications:", error);
    return null;
  }
}

export function createAuctionFrameUrl(params: {
  auctionName: string;
  tokenAddress: string;
  tokenName: string;
  minimumBid: number;
  durationHours: number;
}): string {
  // Generate URL to our custom frame endpoint that handles contract calls
  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://your-app.com";
  
  const frameUrl = new URL(`${baseUrl}/api/bot/frame/create-auction`);
  frameUrl.searchParams.set("name", params.auctionName);
  frameUrl.searchParams.set("token", params.tokenAddress);
  frameUrl.searchParams.set("tokenName", params.tokenName);
  frameUrl.searchParams.set("minBid", params.minimumBid.toString());
  frameUrl.searchParams.set("duration", params.durationHours.toString());
  
  return frameUrl.toString();
}

