"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "./UI/button";
import { cn } from "@/lib/utils";
import { RiLoader5Fill } from "react-icons/ri";
import { useNavigateWithLoader } from "@/utils/useNavigateWithLoader";
import { readContractSetup, writeNewContractSetup } from "@/utils/contractSetup";
import { auctionAbi } from "@/utils/contracts/abis/auctionAbi";
import { contractAdds } from "@/utils/contracts/contractAdds";
import toast from "react-hot-toast";
import { useAccount, useSendCalls } from "wagmi";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { encodeFunctionData, numberToHex } from "viem";
import { useGlobalContext } from "@/utils/providers/globalContext";
import {
  base,
  createBaseAccountSDK,
  getCryptoKeyAccount,
} from "@base-org/account";
import { checkStatus } from "@/utils/checkStatus";
import { usePrivy, useWallets } from '@privy-io/react-auth';

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
  const [loadingToastId, setLoadingToastId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentEndingAuction, setCurrentEndingAuction] = useState<{auctionId: string, bidders: any[]} | null>(null);

  const navigate = useNavigateWithLoader();
  const { sendCalls, isSuccess, status: txStatus } = useSendCalls();
  const { context } = useMiniKit();
  const {wallets} = useWallets();
  const externalWallets = wallets.filter(
    wallet => wallet.walletClientType !== 'privy'
  );
  
  const address = externalWallets.length > 0 ? externalWallets[0].address : null;

  const { user } = useGlobalContext();
  const { getAccessToken } = usePrivy();

  useEffect(() => {
    // When transaction succeeds
    if (isSuccess && currentEndingAuction) {
      if (loadingToastId) {
        toast.success("Transaction successful! Ending auction...", {
          id: loadingToastId,
        });
      }
      processEndAuctionSuccess(currentEndingAuction.auctionId, currentEndingAuction.bidders);
      setCurrentEndingAuction(null);
    }
    // When transaction fails (status === 'error')
    else if (txStatus === "error") {
      if (loadingToastId) {
        toast.error("Transaction failed. Please try again.", {
          id: loadingToastId,
        });
      }
      setIsLoading(false);
      setEndingAuction(null);
      setCurrentEndingAuction(null);
      console.error("Transaction failed");
    }
  }, [isSuccess, txStatus]);

  const processEndAuctionSuccess = async (auctionId: string, bidders: any[]) => {
    try {
      // Call the API to end the auction with bidders data
      const accessToken = await getAccessToken();
      const response = await fetch(
        `/api/protected/auctions/${auctionId}/end`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            bidders: bidders,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to end auction");
      }

      const data = await response.json();

      // Fee distribution will be handled server-side by the auction end API
      // This ensures it runs regardless of client connection status
      console.log('✅ Auction ended successfully, fee distribution initiated server-side');
      
      if (loadingToastId) {
        toast.success("Auction ended successfully! Fee distribution running in background...", {
          id: loadingToastId,
        });
      }

      setSuccessMessage("Auction ended successfully!");
      
      // Refresh auctions after ending
      await fetchAuctions();
      // Switch to ended tab to show the ended auction
      setActiveTab("ended");
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
      
      setIsLoading(false);
      setEndingAuction(null);
    } catch (error) {
      console.error("Error ending auction:", error);
      if (loadingToastId) {
        toast.error(`Failed to end auction: ${error instanceof Error ? error.message : 'Unknown error'}`, {
          id: loadingToastId,
        });
      }
      setIsLoading(false);
      setEndingAuction(null);
    }
  };

  const fetchAuctions = async () => {
    if (!session?.wallet) return;

    try {
      setLoading(true);
      setError(null);

      const accessToken = await getAccessToken();
      const response = await fetch(
        `/api/protected/auctions/my-auctions?wallet=${session.wallet}`,
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
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
      //check if address and session exist
      if (!address || !session) {
        toast.error("Please connect your wallet");
        return;
      }
      setEndingAuction(blockchainAuctionId);
      setSuccessMessage(null);

      const toastId = toast.loading("Preparing to end auction...");
      setLoadingToastId(toastId);
      setIsLoading(true);

      // Step 1: Get all bidders from the smart contract
      toast.loading("Fetching auction data...", { id: toastId });
      
      const contract = await readContractSetup(
        contractAdds.auctions,
        auctionAbi
      );
      if (!contract) {
        console.log("Contract not found!")
        throw new Error("Failed to setup contract connection");
      }

      console.log("Contract", contract);

      // Get bidders from contract
      const contractBidders = await contract?.getBidders(blockchainAuctionId);
      console.log("Contract Bidders:", contractBidders);

      const formattedBidders = contractBidders.map((item: any) => ({
        bidder: item[0], 
        bidAmount: item[1], 
        fid: item[2]
      }));

      if (!context) {
        toast.loading("Sending end auction transaction...", { id: toastId });
        
        const writeContract = await writeNewContractSetup(
          contractAdds.auctions,
          auctionAbi,
          externalWallets[0]
        );

        if (!writeContract) {
          throw new Error("Failed to setup write contract");
        }

        toast.loading("Waiting for transaction...", { id: toastId });
        
        const tx = await writeContract.endAuction(blockchainAuctionId);
        await tx.wait(); // Wait for transaction confirmation

        if(!tx){
          toast.error("Transaction failed", { id: toastId });
          setIsLoading(false);
          setEndingAuction(null);
          return;
        }

        toast.loading("Transaction confirmed! Ending auction...", { id: toastId });

        await processEndAuctionSuccess(blockchainAuctionId, formattedBidders);
      } else {
        const calls = [
          {
            to: contractAdds.auctions as `0x${string}`,
            value: context?.client.clientFid !== 309857 ? BigInt(0) : "0x0",

            data: encodeFunctionData({
              abi: auctionAbi,
              functionName: "endAuction",
              args: [blockchainAuctionId],
            }),
          },
          
        ];

        setCurrentEndingAuction({
          auctionId: blockchainAuctionId,
          bidders: formattedBidders
        });

        if (context?.client.clientFid === 309857) {
          toast.loading("Connecting to Base SDK...", { id: toastId });
          
          const provider = createBaseAccountSDK({
            appName: "Bill test app",
            appLogoUrl: "https://www.houseproto.fun/pfp.jpg",
            appChainIds: [base.constants.CHAIN_IDS.base],
          }).getProvider();

          const cryptoAccount = await getCryptoKeyAccount();
          const fromAddress = cryptoAccount?.account?.address;

          toast.loading("Submitting transaction...", { id: toastId });

          const callsId:any = await provider.request({
            method: "wallet_sendCalls",
            params: [
              {
                version: "1.0",
                from: fromAddress,
                chainId: numberToHex(base.constants.CHAIN_IDS.base),
                calls: calls,
              },
            ],
          });

          const result = await checkStatus(callsId);

          if (result) {
            toast.loading("Transaction confirmed! Saving auction details...", { id: toastId });
            await processEndAuctionSuccess(blockchainAuctionId, formattedBidders);
          } else {
            toast.error("Transaction failed or timed out", { id: toastId });
            setIsLoading(false);
          }
        } else {
          toast.loading("Waiting for wallet confirmation...", { id: toastId });
          
          sendCalls({
            // @ts-ignore
            calls: calls,
          });
        }
        
        // processEndAuctionSuccess will be called when transaction succeeds via useEffect
      }
    } catch (err) {
      console.error("Error ending auction:", err);
      if (loadingToastId) {
        toast.error(err instanceof Error ? err.message : "Failed to end auction", {
          id: loadingToastId,
        });
      }
      setIsLoading(false);
      setEndingAuction(null);
      setCurrentEndingAuction(null);
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
        <div className="mb-4 p-4 bg-green-900 border border-green-700 rounded-lg">
          <p className="text-green-200">{successMessage}</p>
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
        <div className="w-full max-w-6xl mx-auto mt-8">
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
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">No {activeTab} Auctions</h3>
              <p className="text-caption mb-4">
                There are currently no {activeTab} auctions available.
              </p>
            </div>
          </div>
        </div>
      </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {filteredAuctions.map((auction) => (
            <div
              key={auction._id}
              className="bg-white/10 rounded-lg shadow-md border border-gray-700 p-4 hover:shadow-lg transition-shadow w-full"
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
                    disabled={isLoading || endingAuction === auction.blockchainAuctionId}
                    variant="default"
                    size="sm"
                    className="flex-1 h-10"
                  >
                    {(isLoading && endingAuction === auction.blockchainAuctionId) || endingAuction === auction.blockchainAuctionId ? (
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
