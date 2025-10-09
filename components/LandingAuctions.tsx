"use client";

import React, { useState, useEffect } from "react";
import { Button } from "./UI/button";

interface Bidder {
  user: string;
  bidAmount: number;
  bidTimestamp: string;
}

interface HostInfo {
  wallet: string;
  username?: string;
}

interface Auction {
  _id: string;
  auctionName: string;
  endDate: string;
  startDate: string;
  currency: string;
  minimumBid: number;
  tokenAddress: string;
  hostedBy: HostInfo;
  bidders: Bidder[];
  highestBid: number;
  participantCount: number;
  hoursRemaining: number;
  bidCount: number;
}

interface ApiResponse {
  success: boolean;
  auctions: Auction[];
  total: number;
  error?: string;
  message?: string;
}

const LandingAuctions: React.FC = () => {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTopAuctions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/protected/auctions/getTopFive");
      const data: ApiResponse = await response.json();

      console.log("API Response:", data);

      if (data.success) {
        setAuctions(data.auctions);
      } else {
        setError(data.message || data.error || "Failed to fetch auctions");
      }
    } catch (err) {
      setError("Network error: Unable to fetch auctions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopAuctions();
  }, []);

  async function handleBid(auctionId: string) {
    try{
      //get auction meta
      //trigger a batch txn for approval and placeBid
    }
    catch{
      setError("Failed to place bid");
      console.error("Bid error");
    }
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

  const formatBidAmount = (amount: number, currency: string): string => {
    return `${amount.toLocaleString()} ${currency}`;
  };

  const truncateAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto mt-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-lg text-gray-600">Loading top auctions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-6xl mx-auto mt-4">
        <div className="text-center bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchTopAuctions} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (auctions.length === 0) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6">
        <div className="text-center bg-red-500/20 border border-red-700 rounded-lg p-8">
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No Active Auctions
          </h3>
          <p className="text-gray-600">
            There are currently no running auctions to display.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto mt-4">
      <div className="flex flex-col items-start justify-between mb-8">
        <h2 className="text-xl font-bold gradient-text">
          Top Running Auctions
        </h2>
        <p className="text-caption text-sm mt-2">
          Discover the most active auctions happening right now
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {auctions.map((auction, index) => (
          <div
            key={auction._id}
            className="bg-primary/10 border border-primary rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
          >
            {/* Header with ranking */}
            <div className="gradient-button p-4">
              <div className="flex items-center justify-between">
                <span className="bg-white/20 text-white text-sm font-semibold px-3 py-1 rounded-full">
                  #{index + 1}
                </span>
                <span className="text-white text-sm">
                  {formatTimeRemaining(auction.hoursRemaining)} left
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="text-xl font-semibold text-white mb-2 line-clamp-2">
                {auction.auctionName}
              </h3>

              <div className="space-y-3">
                {/* Highest bid */}
                <div className="flex justify-between items-center">
                  <span className="text-caption text-sm">Highest Bid:</span>
                  <span className="font-semibold text-lg text-primary">
                    {auction.highestBid > 0
                      ? formatBidAmount(auction.highestBid, auction.currency)
                      : `Min: ${formatBidAmount(
                          auction.minimumBid,
                          auction.currency
                        )}`}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <div className="font-semibold text-white">
                      {auction.participantCount}
                    </div>
                    <div className="text-caption">Participants</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <div className="font-semibold text-white">
                      {auction.bidCount}
                    </div>
                    <div className="text-caption">Bids</div>
                  </div>
                </div>

                {/* Host info */}
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-caption">Hosted by:</span>
                    <span className="font-medium text-white">
                      {auction.hostedBy.username ||
                        truncateAddress(auction.hostedBy.wallet)}
                    </span>
                  </div>
                </div>

                {/* Action button */}
                <div className="flex justify-center gap-2">
                    <Button
                    variant={"default"}
                    className="w-[60%] h-10 hover:opacity-90"
                    onClick={() => {
                      // do bid stuff
                    }}
                  >
                    Bid
                  </Button>
                  <Button
                    variant={"outline"}
                    className="w-[40%] h-10 hover:opacity-90"
                    onClick={() => {
                      // Navigate to auction detail page
                      window.location.href = `/auction/${auction._id}`;
                    }}
                  >
                    View
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Show all auctions link */}
      
    </div>
  );
};

export default LandingAuctions;
