import { NextRequest, NextResponse } from "next/server";
import { encodeFunctionData } from "viem";
import { auctionAbi } from "@repo/contracts";
import { contractAdds } from "@repo/contracts";

const AUCTION_CONTRACT = contractAdds.auctions;
const BASE_CHAIN_ID = 8453;

// Generate a unique auction ID
function generateAuctionId(): string {
  return `auction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Frame metadata for initial display
function getFrameHtml(params: {
  auctionName: string;
  tokenAddress: string;
  tokenName: string;
  minimumBid: number;
  durationHours: number;
  postUrl: string;
  imageUrl: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta property="fc:frame" content="vNext" />
  <meta property="fc:frame:image" content="${params.imageUrl}" />
  <meta property="fc:frame:button:1" content="🚀 Create Auction" />
  <meta property="fc:frame:button:1:action" content="tx" />
  <meta property="fc:frame:button:1:target" content="${params.postUrl}" />
  <meta property="fc:frame:button:1:post_url" content="${params.postUrl}/success" />
  <meta property="og:title" content="Create Auction: ${params.auctionName}" />
  <meta property="og:description" content="Min bid: ${params.minimumBid} ${params.tokenName} | Duration: ${params.durationHours}h" />
</head>
<body>
  <h1>Create Auction: ${params.auctionName}</h1>
  <p>Token: ${params.tokenName}</p>
  <p>Minimum Bid: ${params.minimumBid}</p>
  <p>Duration: ${params.durationHours} hours</p>
</body>
</html>`;
}

// GET: Return frame HTML with auction details
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  
  const auctionName = searchParams.get("name") || "Auction";
  const tokenAddress = searchParams.get("token") || "";
  const tokenName = searchParams.get("tokenName") || "TOKEN";
  const minimumBid = parseFloat(searchParams.get("minBid") || "0");
  const durationHours = parseInt(searchParams.get("duration") || "24");
  
  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://your-app.com";
  const postUrl = `${baseUrl}/api/bot/frame/create-auction`;
  
  // Use a placeholder image for now (you can create a dynamic OG image endpoint later)
  // Frame images should be 1.91:1 aspect ratio (e.g., 1200x630)
  const imageUrl = `https://placehold.co/1200x630/7C3AED/white?text=${encodeURIComponent(auctionName)}`;

  const html = getFrameHtml({
    auctionName,
    tokenAddress,
    tokenName,
    minimumBid,
    durationHours,
    postUrl: `${postUrl}?name=${encodeURIComponent(auctionName)}&token=${tokenAddress}&tokenName=${tokenName}&minBid=${minimumBid}&duration=${durationHours}`,
    imageUrl,
  });

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}

// POST: Return transaction data for startAuction
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const body = await req.json();
    
    // Extract params from URL
    const auctionName = searchParams.get("name") || "Auction";
    const tokenAddress = searchParams.get("token") || "";
    const tokenName = searchParams.get("tokenName") || "TOKEN";
    const minimumBid = parseFloat(searchParams.get("minBid") || "0");
    const durationHours = parseInt(searchParams.get("duration") || "24");
    
    // Generate unique auction ID
    const auctionId = generateAuctionId();
    
    // Convert minimumBid to wei (assuming 18 decimals, adjust for USDC which is 6)
    const decimals = tokenName === "USDC" ? 6 : 18;
    const minBidWei = BigInt(Math.floor(minimumBid * 10 ** decimals));
    
    // Encode the startAuction function call
    const calldata = encodeFunctionData({
      abi: auctionAbi,
      functionName: "startAuction",
      args: [
        auctionId,           // _auctionId
        tokenAddress,        // _token
        tokenName,           // _tokenName
        BigInt(durationHours), // durationHours
        minBidWei,           // _minBidAmount
      ],
    });

    // Return transaction data in Farcaster frame format
    return NextResponse.json({
      chainId: `eip155:${BASE_CHAIN_ID}`,
      method: "eth_sendTransaction",
      params: {
        abi: auctionAbi,
        to: AUCTION_CONTRACT,
        data: calldata,
        value: "0x0",
      },
    });
  } catch (error) {
    console.error("Error creating auction transaction:", error);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}

