export interface AuctionData {
  auctionName: string;
  description?: string;
  tokenAddress: string;
  minimumBid: number;
  durationHours: number;
}

/**
 * Simple parser for auction creation commands
 * 
 * Expected format:
 * @bot create auction "Auction Name" token:0x... minbid:100 duration:24
 * 
 * Or with description:
 * @bot create auction "Auction Name" "Description here" token:0x... minbid:100 duration:24
 */
export function parseAuctionCommand(text: string): AuctionData | { error: string } {
  // Remove bot mention
  const cleanText = text.replace(/@\w+/g, "").trim();

  // Extract quoted strings (name and optional description)
  const quotedStrings = cleanText.match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, "")) || [];
  
  if (quotedStrings.length === 0) {
    return { error: 'Missing auction name. Use: "Auction Name"' };
  }

  const auctionName = quotedStrings[0];
  const description = quotedStrings.length > 1 ? quotedStrings[1] : undefined;

  // Validate auction name length
  if (auctionName.length > 30) {
    return { error: "Auction name must be 30 characters or less" };
  }

  if (description && description.length > 200) {
    return { error: "Description must be 200 characters or less" };
  }

  // Extract token address (0x followed by 40 hex chars)
  const tokenMatch = cleanText.match(/token[:\s]*(0x[a-fA-F0-9]{40})/i) ||
                     cleanText.match(/(0x[a-fA-F0-9]{40})/);
  
  if (!tokenMatch) {
    return { error: "Missing or invalid token address. Use: token:0x..." };
  }
  const tokenAddress = tokenMatch[1];

  // Extract minimum bid
  const minBidMatch = cleanText.match(/min(?:bid)?[:\s]*(\d+(?:\.\d+)?)/i);
  if (!minBidMatch) {
    return { error: "Missing minimum bid. Use: minbid:100" };
  }
  const minimumBid = parseFloat(minBidMatch[1]);

  // Extract duration in hours
  const durationMatch = cleanText.match(/duration[:\s]*(\d+)/i) ||
                        cleanText.match(/(\d+)\s*(?:hours?|hrs?|h)\b/i);
  if (!durationMatch) {
    return { error: "Missing duration. Use: duration:24 or 24h" };
  }
  const durationHours = parseInt(durationMatch[1]);

  if (durationHours < 1 || durationHours > 168) {
    return { error: "Duration must be between 1 and 168 hours (1 week)" };
  }

  return {
    auctionName,
    description,
    tokenAddress,
    minimumBid,
    durationHours,
  };
}

