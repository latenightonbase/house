function withValidProperties(
  properties: Record<string, undefined | string | string[]>,
) {
  return Object.fromEntries(
    Object.entries(properties).filter(([key, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return !!value;
    }),
  );
}

export async function GET() {
  const URL = process.env.NEXT_PUBLIC_URL;

  return {
  "frame": {
    "name": "Test Auction House",
    "version": "1",
    "iconUrl": "https://auction-house-red.vercel.app/pfp.jpg",
    "homeUrl": "https://auction-house-red.vercel.app",
    "imageUrl": "https://auction-house-red.vercel.app/pfp.jpg",
    "buttonTitle": "Bid Now!",
    "splashImageUrl": "https://auction-house-red.vercel.app/pfp.jpg",
    "splashBackgroundColor": "#000000",
    "webhookUrl": "https://auction-house-red.vercel.app/api/webhook",
    "subtitle": "xyz xyz absc",
    "description": "yes this is very real and legit",
    "screenshotUrls": [
      "https://auction-house-red.vercel.app/pfp.jpg"
    ],
    "primaryCategory": "games",
    "tags": [
      "auction",
      "bids"
    ],
    "heroImageUrl": "https://auction-house-red.vercel.app/pfp.jpg"
  },
  "accountAssociation": {
    "header": "",
    "payload": "",
    "signature": ""
  }
}
}