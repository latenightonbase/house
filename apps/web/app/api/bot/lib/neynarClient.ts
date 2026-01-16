import { NeynarAPIClient, Configuration, isApiErrorResponse } from "@neynar/nodejs-sdk";

const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY!,
});

export const neynar = new NeynarAPIClient(config);

export async function replyToCast(
  parentHash: string,
  text: string,
  embedUrl?: string
): Promise<void> {
  const signerUuid = process.env.BOT_SIGNER_UUID;
  
  if (!signerUuid) {
    throw new Error("BOT_SIGNER_UUID is not set");
  }

  console.log(`[Neynar] Publishing cast with signer: ${signerUuid.substring(0, 8)}...`);
  console.log(`[Neynar] Reply to: ${parentHash}`);
  if (embedUrl) {
    console.log(`[Neynar] Embed URL: ${embedUrl}`);
  }
  
  try {
    const result = await neynar.publishCast({
      signerUuid,
      text,
      parent: parentHash,
      embeds: embedUrl ? [{ url: embedUrl }] : undefined,
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

export function createAuctionLink(params: {
  auctionName: string;
  tokenAddress: string;
  tokenName: string;
  minimumBid: number;
  durationHours: number;
}): string {
  // Use the Farcaster mini app URL with prefilled data
  const miniAppUrl = process.env.NEXT_PUBLIC_MINIAPP_URL || "https://farcaster.xyz/miniapps/0d5aS3cWVprk/house";
  
  // Build URL to the create page with prefilled data
  const createUrl = new URL(`${miniAppUrl}/create`);
  createUrl.searchParams.set("prefill", "true");
  createUrl.searchParams.set("name", params.auctionName);
  createUrl.searchParams.set("token", params.tokenAddress);
  createUrl.searchParams.set("minBid", params.minimumBid.toString());
  createUrl.searchParams.set("duration", params.durationHours.toString());

  return createUrl.toString();
}

