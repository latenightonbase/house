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

  const baseUrl = process.env.NEXT_PUBLIC_URL;
  
  if (!baseUrl) {
    console.error("[Frame] NEXT_PUBLIC_URL not set!");
    return new NextResponse("Server configuration error", { status: 500 });
  }
  
  // Build the target URL for the transaction (POST endpoint)
  const targetUrl = `${baseUrl}/api/bot/frame/create-auction?name=${encodeURIComponent(auctionName)}&token=${encodeURIComponent(tokenAddress)}&tokenName=${encodeURIComponent(tokenName)}&minBid=${encodeURIComponent(minimumBid)}&duration=${encodeURIComponent(durationHours)}`;
  
  // Success URL after transaction
  const postUrl = `${baseUrl}/api/bot/frame/create-auction/success`;

  // Use a simple, reliable image
  const imageUrl = `${baseUrl}/api/og?title=${encodeURIComponent(auctionName)}&minBid=${encodeURIComponent(minimumBid)}&token=${encodeURIComponent(tokenName)}&duration=${encodeURIComponent(durationHours)}`;
  // Fallback to external image service
  const fallbackImage = `https://via.placeholder.com/1200x630/7C3AED/FFFFFF?text=${encodeURIComponent(`${auctionName} - ${minimumBid} ${tokenName}`)}`;

  // Farcaster Frame HTML - minimal and spec-compliant
  const html = `<!DOCTYPE html>
<html>
<head>
<meta property="fc:frame" content="vNext"/>
<meta property="fc:frame:image" content="${fallbackImage}"/>
<meta property="fc:frame:image:aspect_ratio" content="1.91:1"/>
<meta property="fc:frame:button:1" content="Create Auction"/>
<meta property="fc:frame:button:1:action" content="tx"/>
<meta property="fc:frame:button:1:target" content="${targetUrl}"/>
<meta property="fc:frame:post_url" content="${postUrl}"/>
<meta property="og:image" content="${fallbackImage}"/>
<meta property="og:title" content="Create Auction: ${auctionName}"/>
</head>
<body>
<h1>Create Auction</h1>
<p>${auctionName}</p>
<p>Min Bid: ${minimumBid} ${tokenName}</p>
<p>Duration: ${durationHours}h</p>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html",
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

