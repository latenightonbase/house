import { NextRequest, NextResponse } from "next/server";
import { encodeFunctionData, parseUnits } from "viem";
import { auctionAbi, contractAdds } from "@repo/contracts";

const AUCTION_CONTRACT = contractAdds.auctions;
const BASE_CHAIN_ID = 8453;

// Generate a unique auction ID
function generateAuctionId(): string {
  return `auction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper to escape HTML entities
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// GET: Return frame HTML with proper fc:frame meta tags
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const auctionName = searchParams.get("name") || "Auction";
  const tokenAddress = searchParams.get("token") || "";
  const tokenName = searchParams.get("tokenName") || "TOKEN";
  const minimumBid = searchParams.get("minBid") || "0";
  const durationHours = searchParams.get("duration") || "24";

  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://house-auction.vercel.app";
  
  console.log(`[Frame GET] baseUrl: ${baseUrl}`);
  console.log(`[Frame GET] Params: name=${auctionName}, token=${tokenAddress}, minBid=${minimumBid}, duration=${durationHours}`);
  
  // The POST URL includes all params so we can reconstruct them
  const postUrl = new URL(`${baseUrl}/api/bot/frame/create-auction`);
  postUrl.searchParams.set("name", auctionName);
  postUrl.searchParams.set("token", tokenAddress);
  postUrl.searchParams.set("tokenName", tokenName);
  postUrl.searchParams.set("minBid", minimumBid);
  postUrl.searchParams.set("duration", durationHours);

  const successUrl = `${baseUrl}/api/bot/frame/create-auction/success`;

  // Frame image - simple text on colored background
  const imageText = `Create Auction\n${auctionName}\nMin: ${minimumBid} ${tokenName}`;
  const imageUrl = `https://placehold.co/1200x630/7C3AED/white?text=${encodeURIComponent(imageText)}`;

  // Escape values for HTML attributes
  const safeAuctionName = escapeHtml(auctionName);
  const safeTokenName = escapeHtml(tokenName);
  const safePostUrl = escapeHtml(postUrl.toString());
  const safeSuccessUrl = escapeHtml(successUrl);

  // Return HTML with Farcaster Frame meta tags
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Create Auction: ${safeAuctionName}</title>
  
  <!-- Open Graph -->
  <meta property="og:title" content="Create Auction: ${safeAuctionName}" />
  <meta property="og:description" content="Min bid: ${minimumBid} ${safeTokenName} | Duration: ${durationHours}h" />
  <meta property="og:image" content="${imageUrl}" />
  
  <!-- Farcaster Frame meta tags -->
  <meta property="fc:frame" content="vNext" />
  <meta property="fc:frame:image" content="${imageUrl}" />
  <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
  <meta property="fc:frame:button:1" content="🚀 Create Auction" />
  <meta property="fc:frame:button:1:action" content="tx" />
  <meta property="fc:frame:button:1:target" content="${safePostUrl}" />
  <meta property="fc:frame:button:1:post_url" content="${safeSuccessUrl}" />
</head>
<body>
  <h1>Create Auction: ${safeAuctionName}</h1>
  <p>Token: ${safeTokenName} (${tokenAddress})</p>
  <p>Minimum Bid: ${minimumBid}</p>
  <p>Duration: ${durationHours} hours</p>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

// POST: Return transaction data for startAuction
// Based on Farcaster Frame Transaction spec
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Extract params from URL
    const auctionName = searchParams.get("name") || "Auction";
    const tokenAddress = searchParams.get("token") || "";
    const tokenName = searchParams.get("tokenName") || "TOKEN";
    const minimumBid = searchParams.get("minBid") || "0";
    const durationHours = searchParams.get("duration") || "24";

    // Generate unique auction ID
    const auctionId = generateAuctionId();

    // Determine decimals based on token (USDC = 6, most others = 18)
    const decimals = tokenName.toUpperCase() === "USDC" ? 6 : 18;
    const minBidWei = parseUnits(minimumBid, decimals);

    // Encode the startAuction function call
    // startAuction(string _auctionId, address _token, string _tokenName, uint256 durationHours, uint256 _minBidAmount)
    const calldata = encodeFunctionData({
      abi: auctionAbi,
      functionName: "startAuction",
      args: [
        auctionId,                           // _auctionId
        tokenAddress as `0x${string}`,       // _token
        auctionName,                         // _tokenName (using auction name here)
        BigInt(durationHours),               // durationHours
        minBidWei,                           // _minBidAmount
      ],
    });

    console.log(`[Frame] Creating auction: ${auctionId}`);
    console.log(`[Frame] Token: ${tokenAddress}, MinBid: ${minimumBid} (${minBidWei}), Duration: ${durationHours}h`);

    // Return transaction data in Farcaster Frame Transaction spec format
    // See: https://www.notion.so/farcasterhq/Frame-Transactions-Public-9d9f9f4f527249519a41bd8d16165f73
    return NextResponse.json({
      chainId: `eip155:${BASE_CHAIN_ID}`,
      method: "eth_sendTransaction",
      attribution: false,
      params: {
        abi: auctionAbi,
        to: AUCTION_CONTRACT,
        data: calldata,
        value: "0",
      },
    });
  } catch (error) {
    console.error("[Frame] Error creating auction transaction:", error);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}

