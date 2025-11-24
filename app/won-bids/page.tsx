'use client';

import { useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useGlobalContext } from "@/utils/providers/globalContext";
import { Button } from "@/components/UI/button";
import { cn } from "@/lib/utils";
import { RiLoader5Fill, RiTrophyFill } from "react-icons/ri";
import { useNavigateWithLoader } from "@/utils/useNavigateWithLoader";

interface Auction {
  _id: string;
  auctionName: string;
  endDate: string;
  startDate: string;
  currency: string;
  minimumBid: number;
  blockchainAuctionId: string;
  tokenAddress: string;
  hostedBy: {
    _id: string;
    wallet: string;
    username?: string;
  };
  highestBid: number;
  participantCount: number;
  bidCount: number;
  timeInfo: string;
}

interface WonBidsResponse {
  success: boolean;
  auctions: Auction[];
  total: number;
}

export default function WonBidsPage() {
  const { authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const { user } = useGlobalContext();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigateWithLoader();

  const fetchWonBids = async () => {
    if (!user?.wallet) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/protected/auctions/won-bids?wallet=${user.wallet}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: WonBidsResponse = await response.json();

      if (data.success) {
        setAuctions(data.auctions);
      } else {
        throw new Error("Failed to fetch won auctions");
      }
    } catch (err) {
      console.error("Error fetching won auctions:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch won auctions");
    } finally {
      setLoading(false);
    }
  };

  const viewAuction = (blockchainAuctionId: string) => {
    navigate(`/bid/${blockchainAuctionId}`);
  };

  useEffect(() => {
    if (authenticated && user?.wallet) {
      fetchWonBids();
    }
  }, [user?.wallet, authenticated]);

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="flex flex-col gap-2">
          <RiLoader5Fill className="animate-spin h-8 w-8 text-primary mx-auto" />
          <span className="ml-2 text-caption">Loading your won auctions...</span>
        </div>
      </div>
    );
  }

  if (!authenticated || !user?.wallet) {
    return (
      <div className="w-full overflow-hidden p-4">
        <h1 className="text-2xl font-bold gradient-text mb-6">Won Auctions</h1>
        <div className="bg-white/10 rounded-lg shadow-md border border-gray-700 p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 gradient-button rounded-full flex items-center justify-center">
              <svg 
                className="w-8 h-8 text-white" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
              <p className="text-caption mb-4">
                Please connect your wallet to view your won auctions.
              </p>
              <p className="text-sm text-caption">
                Once connected, you'll be able to see all the auctions you've won.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="flex flex-col gap-2">
          <RiLoader5Fill className="animate-spin h-8 w-8 text-primary mx-auto" />
          <span className="ml-2 text-caption">Loading your won auctions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full overflow-hidden p-4">
        <h1 className="text-2xl font-bold gradient-text mb-6">Won Auctions</h1>
        <div className="text-center py-8">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchWonBids} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden p-4">
      <div className="flex items-center gap-2 mb-6">
        <RiTrophyFill className="text-2xl text-primary" />
        <h1 className="text-2xl font-bold gradient-text">Won Auctions</h1>
      </div>

      {/* Auctions Grid */}
      {auctions.length === 0 ? (
        <div className="w-full max-w-6xl mx-auto mt-8">
          <div className="bg-white/10 rounded-lg shadow-md border border-gray-700 p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 gradient-button rounded-full flex items-center justify-center">
                <RiTrophyFill className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">No Won Auctions Yet</h3>
                <p className="text-caption mb-4">
                  You haven't won any auctions yet. Keep bidding to claim your first victory!
                </p>
                <Button 
                  onClick={() => navigate('/')} 
                  className="mt-4"
                >
                  Browse Live Auctions
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {auctions.map((auction) => (
            <div
              key={auction._id}
              className="bg-white/10 rounded-lg shadow-md border border-gray-700 p-4 hover:shadow-lg transition-shadow w-full relative"
            >
              {/* Winner Badge */}
              <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full p-2 shadow-lg">
                <RiTrophyFill className="w-4 h-4 text-white" />
              </div>

              <div className="flex justify-between items-start mb-4 w-full pr-6">
                <h3 className="text-lg font-semibold truncate flex-1 pr-2 min-w-0">
                  {auction.auctionName}
                </h3>
                <span className="text-sm font-medium text-green-500 flex-shrink-0">
                  Won
                </span>
              </div>

              <div className="space-y-2 mb-4 w-full">
                <div className="flex justify-between items-center w-full">
                  <span className="text-caption text-sm flex-shrink-0">
                    Winning Bid:
                  </span>
                  <span className="font-medium text-sm truncate ml-2 text-right text-primary">
                    {auction.highestBid} {auction.currency}
                  </span>
                </div>

                <div className="flex justify-between items-center w-full">
                  <span className="text-caption text-sm flex-shrink-0">
                    Minimum Bid:
                  </span>
                  <span className="font-medium text-sm truncate ml-2 text-right">
                    {auction.minimumBid} {auction.currency}
                  </span>
                </div>

                <div className="flex justify-between items-center w-full">
                  <span className="text-caption text-sm flex-shrink-0">
                    Participants:
                  </span>
                  <span className="font-medium text-sm">
                    {auction.participantCount}
                  </span>
                </div>

                <div className="flex justify-between items-center w-full">
                  <span className="text-caption text-sm flex-shrink-0">
                    Total Bids:
                  </span>
                  <span className="font-medium text-sm">
                    {auction.bidCount}
                  </span>
                </div>

                <div className="flex justify-between items-center w-full">
                  <span className="text-caption text-sm flex-shrink-0">
                    Host:
                  </span>
                  <span className="font-medium text-sm truncate ml-2 text-right">
                    {auction.hostedBy.username || `${auction.hostedBy.wallet.slice(0, 6)}...${auction.hostedBy.wallet.slice(-4)}`}
                  </span>
                </div>

                <div className="flex justify-between items-start w-full">
                  <span className="text-caption text-sm flex-shrink-0">
                    Ended:
                  </span>
                  <span className="font-medium text-xs text-right ml-2 leading-tight max-w-[60%] break-words">
                    {new Date(auction.endDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex gap-2 w-full">
                <Button
                  onClick={() => viewAuction(auction.blockchainAuctionId)}
                  variant="outline"
                  size="sm"
                  className="flex-1 h-10"
                >
                  View Details
                </Button>
              </div>

              <div className="text-center mt-2">
                <p className="text-caption text-xs">
                  🎉 Congratulations on your victory!
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {auctions.length > 0 && (
        <div className="mt-8 text-center">
          <p className="text-caption text-sm">
            Total victories: <span className="font-semibold text-primary">{auctions.length}</span>
          </p>
        </div>
      )}
    </div>
  );
}