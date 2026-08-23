import React, { useEffect } from "react";
import Image from "next/image";
import { Users, Bot, User, Clock } from "lucide-react";
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
  createdByType?: 'human' | 'bot';
}

interface AuctionCardProps {
  auction: Auction;
  onNavigate: (path: string) => void;
  renderDescription: (description: string) => React.ReactNode;
  onBidClick?: (auction: Auction) => void;
}

const formatTimeRemaining = (hours: number): string => {
  if (hours < 1) return "Less than 1 hour";
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""}`;  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days} day${days !== 1 ? "s" : ""} ${
    remainingHours > 0 ? `${remainingHours}h` : ""
  }`;
};

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

  const isEndingSoon = auction.hoursRemaining <= 6;

  return (
    <div
      key={auction._id}
      className="card w-full text-white overflow-hidden flex flex-col h-full cursor-pointer transition-colors duration-200 hover:border-primary/40"
      onClick={() => onNavigate(`/bid/${auction.blockchainAuctionId}`)}
    >
      {/* Image */}
      <div className="relative w-full h-48 border-b border-line">
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
        {/* Fade into the card surface */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/20 to-transparent" />

        {/* Origin tag */}
        {auction.createdByType === "bot" && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-background/80 backdrop-blur-sm border border-primary/40 text-primary-light text-[11px] font-semibold px-2 py-1 rounded-md">
            <Bot className="w-3 h-3" />
            <span>Bot</span>
          </div>
        )}
        {auction.createdByType === "human" && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-background/80 backdrop-blur-sm border border-line-strong text-caption text-[11px] font-semibold px-2 py-1 rounded-md">
            <User className="w-3 h-3" />
            <span>Human</span>
          </div>
        )}

        {/* Time remaining */}
        <div
          className={`absolute top-3 right-3 flex items-center gap-1.5 bg-background/80 backdrop-blur-sm border text-[11px] font-semibold px-2 py-1 rounded-md ${
            isEndingSoon
              ? "border-warning/40 text-warning"
              : "border-line-strong text-caption"
          }`}
        >
          <Clock className="w-3 h-3" />
          <span>{formatTimeRemaining(auction.hoursRemaining)}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col grow">
        <ScrollingName
          name={auction.auctionName}
          className="text-lg font-bold text-white mb-1.5"
        />
        {auction.description && renderDescription(auction.description)}

        <div
          className="flex items-center gap-2 mb-4"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(`/user/${auction.hostedBy._id}`);
          }}
        >
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
          <span className="text-caption text-sm hover:text-white transition-colors">
            {auction.hostedBy.username
              ? `@${auction.hostedBy.username}`
              : auction.hostedBy.display_name ||
                `User ${auction.hostedBy.socialId}`}
          </span>
        </div>

        {/* Stat strip */}
        <div className="mt-auto grid grid-cols-2 gap-2">
          <div className="tile p-3">
            <p className="panel-label mb-1">
              {auction.highestBid > 0 ? "Current Bid" : "Minimum Bid"}
            </p>
            <div className="text-white font-bold text-base leading-tight">
              {auction.highestBid > 0 ? auction.highestBid : auction.minimumBid}{" "}
              <span className="text-caption font-medium text-sm">
                {auction.currency}
              </span>
            </div>
            <div className="text-caption text-xs mt-0.5">
              ≈ $
              {(
                (auction.highestBid > 0
                  ? auction.highestBid
                  : auction.minimumBid) *
                (auction.currency === "USDC" ? 1 : tokenPrice || 0)
              ).toLocaleString()}
            </div>
          </div>

          <div className="tile p-3">
            <p className="panel-label mb-1">Bidders</p>
            <div className="flex items-center gap-1.5 text-white font-bold text-base leading-tight">
              <Users className="w-4 h-4 text-primary-light" />
              {auction.participantCount}
            </div>
            <div className="text-caption text-xs mt-0.5">
              {auction.bidCount} bid{auction.bidCount !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {onBidClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBidClick(auction);
            }}
            className="mt-3 w-full gradient-button text-white text-sm font-semibold py-2.5 px-4 rounded-lg transition-all"
          >
            Place Bid
          </button>
        )}
      </div>
    </div>
  );
};

export default AuctionCard;
