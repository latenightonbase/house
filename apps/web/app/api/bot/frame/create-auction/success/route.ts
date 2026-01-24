import { NextRequest, NextResponse } from "next/server";

// POST: Called after successful transaction - show success frame
export async function POST(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://house-auction.vercel.app";
  const miniAppUrl = process.env.NEXT_PUBLIC_MINIAPP_URL || "https://farcaster.xyz/miniapps/0d5aS3cWVprk/house";
  
  // Success image
  const imageUrl = "https://placehold.co/1200x630/22C55E/white?text=Auction+Created+Successfully!";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Auction Created!</title>
  
  <!-- Open Graph -->
  <meta property="og:title" content="Auction Created!" />
  <meta property="og:description" content="Your auction has been successfully created on-chain." />
  <meta property="og:image" content="${imageUrl}" />
  
  <!-- Farcaster Frame meta tags -->
  <meta property="fc:frame" content="vNext" />
  <meta property="fc:frame:image" content="${imageUrl}" />
  <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
  <meta property="fc:frame:button:1" content="🏠 View My Auctions" />
  <meta property="fc:frame:button:1:action" content="link" />
  <meta property="fc:frame:button:1:target" content="${miniAppUrl}/my-auctions" />
</head>
<body>
  <h1>Auction Created Successfully!</h1>
  <p>Your auction is now live on-chain.</p>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}

