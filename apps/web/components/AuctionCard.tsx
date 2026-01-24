import React, { useEffect } from "react";
import Image from "next/image";
import { Users } from "lucide-react";
import ScrollingName from "./utils/ScrollingName";
import { fetchTokenPrice } from "@/utils/tokenPrice";

interface Bidder {
  user: string;
  bidAmount: number;
  bidTimestamp: string;
}

interface HostInfo {
  _id: string;
  wallet: string;
  username?: string;
  display_name?: string;
  socialId?: string;
  pfp_url?: string;
  averageRating?: number;
  totalReviews?: number;
}

interface Auction {
  _id: string;
  auctionName: string;
  description?: string;
  endDate: string;
  startDate: string;
  currency: string;
  minimumBid: number;
  tokenAddress: string;
  blockchainAuctionId: string;
  hostedBy: HostInfo;
  bidders: Bidder[];
  highestBid: number;
  imageUrl?: string;
  topBidder: {
    wallet: string;
    username: string;
    fid: string;
    socialId: string;
    pfp_url: string | null;
    bidAmount: number;
    bidTimestamp: Date;
    _id: string;
  } | null;
  participantCount: number;
  hoursRemaining: number;
  bidCount: number;
}

interface AuctionCardProps {
  auction: Auction;
  onNavigate: (path: string) => void;
  renderDescription: (description: string) => React.ReactNode;
  onBidClick?: (auction: Auction) => void;
}

const AuctionCard: React.FC<AuctionCardProps> = ({
  auction,
  onNavigate,
  renderDescription,
  onBidClick,
}) => {

  const [tokenPrice, setTokenPrice] = React.useState<number | null>(null);

  async function getTokenPrice() {
    try{
      const response = await fetchTokenPrice(auction.tokenAddress);
      setTokenPrice(response);
    }
    catch (error) {
      console.error("Error fetching token price:", error);
    }
  }

  useEffect(() => {
    if(auction && auction.tokenAddress)
    getTokenPrice();
  }, [auction]);

  return (
    <div
      key={auction._id}
      className="bg-black/40 w-full hover:scale-[1.02] duration-400 hover:shadow-lg shadow-primary/5 text-white border border-primary/10 rounded-2xl transition-all overflow-hidden flex flex-col h-full cursor-pointer"
      onClick={() => onNavigate(`/bid/${auction.blockchainAuctionId}`)}
    >
      {/* Image */}
      <div className="relative w-full h-64">
        <Image
          src={
            auction.imageUrl ||
            `https://api.dicebear.com/9.x/glass/svg?seed=${
              auction.hostedBy.username || auction.hostedBy.wallet
            }`
          }
          alt={auction.auctionName}
          width={400}
          height={300}
          className="w-full h-full object-cover"
          unoptimized
        />
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col grow">
        <ScrollingName 
          name={auction.auctionName} 
          className="text-2xl font-bold text-white mb-2"
        />
        {auction.description && renderDescription(auction.description)}
        <div
          className="flex items-center gap-2 mb-4 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(`/user/${auction.hostedBy._id}`);
          }}
        >
          <span className="text-gray-400 text-sm">by</span>
          <Image
            unoptimized
            alt="host"
            src={
              auction.hostedBy.pfp_url ||
              `https://api.dicebear.com/5.x/identicon/svg?seed=${auction.hostedBy.wallet}`
            }
            width={20}
            height={20}
            className="rounded-full w-5 h-5 aspect-square object-cover"
          />
          <span className="text-primary text-sm font-medium">
            {auction.hostedBy.username
              ? `@${auction.hostedBy.username}`
              : auction.hostedBy.display_name ||
                `User ${auction.hostedBy.socialId}`}
          </span>
        </div>

        <div className="border-t border-primary/10 pt-4 mt-auto space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex flex-col justify-center items-start">
              <span className="text-gray-400 text-sm">
                {auction.highestBid > 0 ? "Current Bid" : "Minimum Bid"}
              </span>
              <div className="text-left">
                <div className="text-white font-bold text-lg">
                  {auction.highestBid > 0
                    ? auction.highestBid
                    : auction.minimumBid}{" "}
                  {auction.currency}
                </div>
                <div className="text-gray-400 text-xs">
                  ≈ $
                  {(
                    (auction.highestBid > 0
                      ? auction.highestBid
                      : auction.minimumBid) *
                    (auction.currency === "USDC" ? 1 : tokenPrice || 0)
                  ).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between bg-white/10 rounded-full border border-white/30 px-2 py-1 gap-1">
              <Users className="w-4 h-4 text-white/50" />
              <span className="text-white text-sm font-semibold">
                {auction.participantCount}
              </span>
            </div>
          </div>
          {onBidClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBidClick(auction);
              }}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
            >
              Place Bid
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuctionCard;
