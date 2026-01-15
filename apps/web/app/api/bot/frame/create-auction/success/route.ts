import { NextRequest, NextResponse } from "next/server";

// POST: Handle successful transaction callback
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const auctionName = searchParams.get("name") || "Auction";
  
  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://your-app.com";
  
  // Return success frame
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta property="fc:frame" content="vNext" />
  <meta property="fc:frame:image" content="${baseUrl}/api/og/success" />
  <meta property="fc:frame:button:1" content="🎉 View My Auctions" />
  <meta property="fc:frame:button:1:action" content="link" />
  <meta property="fc:frame:button:1:target" content="${baseUrl}/my-auctions" />
  <meta property="og:title" content="Auction Created!" />
  <meta property="og:description" content="${auctionName} has been created successfully!" />
</head>
<body>
  <h1>🎉 Auction Created Successfully!</h1>
  <p>Your auction "${auctionName}" is now live.</p>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}

