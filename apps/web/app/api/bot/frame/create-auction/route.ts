import { NextRequest, NextResponse } from "next/server";
import { encodeFunctionData, parseUnits } from "viem";
import { auctionAbi, contractAdds } from "@repo/contracts";

const AUCTION_CONTRACT = contractAdds.auctions;
const BASE_CHAIN_ID = 8453;

// Generate a unique auction ID
function generateAuctionId(): string {
  return `auction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
  
  // The POST URL includes all params so we can reconstruct them
  const postUrl = new URL(`${baseUrl}/api/bot/frame/create-auction`);
  postUrl.searchParams.set("name", auctionName);
  postUrl.searchParams.set("token", tokenAddress);
  postUrl.searchParams.set("tokenName", tokenName);
  postUrl.searchParams.set("minBid", minimumBid);
  postUrl.searchParams.set("duration", durationHours);

  // Frame image - using a placeholder, you can create a dynamic OG image later
  const imageUrl = `https://placehold.co/1200x630/7C3AED/white?text=${encodeURIComponent(`Create: ${auctionName}%0AMin Bid: ${minimumBid} ${tokenName}%0ADuration: ${durationHours}h`)}`;

  // Return HTML with Farcaster Frame meta tags
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Create Auction: ${auctionName}</title>
  
  <!-- Open Graph -->
  <meta property="og:title" content="Create Auction: ${auctionName}" />
  <meta property="og:description" content="Min bid: ${minimumBid} ${tokenName} | Duration: ${durationHours}h" />
  <meta property="og:image" content="${imageUrl}" />
  
  <!-- Farcaster Frame v1 meta tags -->
  <meta property="fc:frame" content="vNext" />
  <meta property="fc:frame:image" content="${imageUrl}" />
  <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
  <meta property="fc:frame:button:1" content="🚀 Create Auction" />
  <meta property="fc:frame:button:1:action" content="tx" />
  <meta property="fc:frame:button:1:target" content="${postUrl.toString()}" />
  <meta property="fc:frame:button:1:post_url" content="${baseUrl}/api/bot/frame/create-auction/success" />
</head>
<body>
  <h1>Create Auction: ${auctionName}</h1>
  <p>Token: ${tokenName} (${tokenAddress})</p>
  <p>Minimum Bid: ${minimumBid}</p>
  <p>Duration: ${durationHours} hours</p>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}

// POST: Return transaction data for startAuction
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

    // Return transaction data in Farcaster frame format
    return NextResponse.json({
      chainId: `eip155:${BASE_CHAIN_ID}`,
      method: "eth_sendTransaction",
      params: {
        to: AUCTION_CONTRACT,
        data: calldata,
        value: "0x0",
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

