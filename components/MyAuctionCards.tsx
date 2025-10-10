"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "./UI/button";
import { cn } from "@/lib/utils";
import { RiLoader5Fill } from "react-icons/ri";
import { useNavigateWithLoader } from "@/utils/useNavigateWithLoader";
import { readContractSetup, writeContractSetup } from "@/utils/contractSetup";
import { auctionAbi } from "@/utils/contracts/abis/auctionAbi";
import { contractAdds } from "@/utils/contracts/contractAdds";
import toast from "react-hot-toast";

interface Bidder {
  user: string;
  bidAmount: number;
  bidTimestamp: string;
}

interface Auction {
  _id: string;
  auctionName: string;
  endDate: string;
  startDate: string;
  bidders: Bidder[];
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
  status: "active" | "upcoming" | "ended";
  timeInfo: string;
}

interface AuctionsResponse {
  success: boolean;
  auctions: Auction[];
  grouped: {
    active: Auction[];
    upcoming: Auction[];
    ended: Auction[];
  };
  total: number;
  counts: {
    active: number;
    upcoming: number;
    ended: number;
  };
}

export default function MyAuctionCards() {
  const { data: session, status } = useSession();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [endingAuction, setEndingAuction] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "upcoming" | "ended">(
    "active"
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const navigate = useNavigateWithLoader();

  const fetchAuctions = async () => {
    if (!session?.wallet) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/protected/auctions/my-auctions?wallet=${session.wallet}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AuctionsResponse = await response.json();

      if (data.success) {
        setAuctions(data.auctions);
      } else {
        throw new Error("Failed to fetch auctions");
      }
    } catch (err) {
      console.error("Error fetching auctions:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch auctions");
    } finally {
      setLoading(false);
    }
  };

  const endAuction = async (blockchainAuctionId: string) => {
    try {
      setEndingAuction(blockchainAuctionId);
      setSuccessMessage(null);

      // Step 1: Get all bidders from the smart contract
      const contract = await readContractSetup(
        contractAdds.auctions,
        auctionAbi
      );
      if (!contract) {
        throw new Error("Failed to setup contract connection");
      }

      // Get bidders from contract
      const contractBidders = await contract.getBidders(blockchainAuctionId);

      console.log("Contract Bidders:", contractBidders);

      // Step 2: Call the API to end the auction with bidders data
      const response = await fetch(
        `/api/protected/auctions/${blockchainAuctionId}/end`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bidders: contractBidders.map((item:any)=> ({bidder: item[0], bidAmount: item[1], fid: item[2]})),
          }),
        }
      );

      if (response.ok) {
        // Step 3: Call the contract's endAuction method
        const writeContract = await writeContractSetup(
          contractAdds.auctions,
          auctionAbi
        );

        if (writeContract) {
          const tx = await writeContract.endAuction(blockchainAuctionId);
          await tx.wait(); // Wait for transaction confirmation
        }

        const data = await response.json();
        setSuccessMessage(
          `Auction ended successfully!`
        );
        // Refresh auctions after ending
        await fetchAuctions();
        // Switch to ended tab to show the ended auction
        setActiveTab("ended");
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to end auction");
      }
    } catch (err) {
      console.error("Error ending auction:", err);
      toast.error(err instanceof Error ? err.message : "Failed to end auction");
    } finally {
      setEndingAuction(null);
    }
  };

  const viewAuction = (blockchainAuctionId: string) => {
    navigate(`/bid/${blockchainAuctionId}`);
    console.log("Viewing auction:", blockchainAuctionId);
    // You can implement navigation here, for example:
    // router.push(`/auction/${blockchainAuctionId}`);
  };

  useEffect(() => {
    if (status === "authenticated" && session?.wallet) {
      fetchAuctions();
    }
  }, [session?.wallet, status]);

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="flex flex-col gap-2">
          <RiLoader5Fill className="animate-spin h-8 w-8 text-primary mx-auto" />
          <span className="ml-2 text-caption">Loading your auctions...</span>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || !session?.wallet) {
    return (
      <div className="w-full overflow-hidden p-4">
        <h1 className="text-2xl font-bold gradient-text mb-6">My Auctions</h1>
        <div className="bg-white/10 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-8 text-center">
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
                Please connect your wallet to view and manage your auctions.
              </p>
              <p className="text-sm text-caption">
                Once connected, you'll be able to create, view, and manage your auction listings.
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
          <span className="ml-2 text-caption">Loading your auctions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={fetchAuctions} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  const filteredAuctions = auctions.filter(
    (auction) => auction.status === activeTab
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-500";
      case "upcoming":
        return "text-yellow-500";
      case "ended":
        return "text-gray-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <div className="w-full overflow-hidden p-4">
      <h1 className="text-2xl font-bold gradient-text">My Auctions</h1>
      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded-lg">
          <p className="text-green-800 dark:text-green-200">{successMessage}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex mb-6 overflow-x-hidden mt-4">
        {(["active", "ended"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 font-medium transition-colors capitalize whitespace-nowrap flex-shrink-0",
              activeTab === tab
                ? "text-primary border-b-2 border-primary bg-white/5 rounded-md"
                : "text-caption hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Auctions Grid */}
      {filteredAuctions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-caption text-lg">No {activeTab} auctions found.</p>
          {activeTab === "active" && (
            <p className="text-sm text-caption mt-2">
              Your active auctions will appear here when they go live.
            </p>
          )}
        </div>
      ) : (
        <div className="">
          {filteredAuctions.map((auction) => (
            <div
              key={auction._id}
              className="bg-white/10 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition-shadow w-full"
            >
              <div className="flex justify-between items-start mb-4 w-full">
                <h3 className="text-lg font-semibold truncate flex-1 pr-2 min-w-0">
                  {auction.auctionName}
                </h3>
                <span
                  className={cn(
                    "text-sm font-medium capitalize flex-shrink-0",
                    getStatusColor(auction.status)
                  )}
                >
                  {auction.status}
                </span>
              </div>

              <div className="space-y-2 mb-4 w-full">
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
                    Highest Bid:
                  </span>
                  <span className="font-medium text-sm truncate ml-2 text-right">
                    {auction.highestBid} {auction.currency}
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

                <div className="flex justify-between items-start w-full">
                  <span className="text-caption text-sm flex-shrink-0">
                    Time:
                  </span>
                  <span className="font-medium text-xs text-right ml-2 leading-tight max-w-[60%] break-words">
                    {auction.timeInfo}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 w-full">
                {auction.status === "active" && (
                  <Button
                    onClick={() => endAuction(auction.blockchainAuctionId)}
                    disabled={endingAuction === auction.blockchainAuctionId}
                    variant="default"
                    size="sm"
                    className="flex-1 h-10"
                  >
                    {endingAuction === auction.blockchainAuctionId ? (
                      <>
                        <RiLoader5Fill className="animate-spin h-3 w-3 mr-2" />
                        Ending...
                      </>
                    ) : (
                      "End Auction"
                    )}
                  </Button>
                )}

                <Button
                  onClick={() => viewAuction(auction.blockchainAuctionId)}
                  variant="outline"
                  size="sm"
                  className="flex-1 h-10"
                >
                  View
                </Button>
              </div>

              {auction.status === "ended" && (
                <div className="text-center mt-2">
                  <p className="text-caption text-xs">
                    {auction.highestBid > 0 ? (
                      <>
                        Winner: {auction.highestBid} {auction.currency}
                      </>
                    ) : (
                      "No bids received"
                    )}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
