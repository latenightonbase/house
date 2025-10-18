"use client";

import React, { useState, useEffect } from "react";
import { Button } from "./UI/button";
import Input from "./UI/Input";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./UI/Drawer";
import { useNavigateWithLoader } from "@/utils/useNavigateWithLoader";
import toast from "react-hot-toast";
import { useAccount, useSendCalls, useReadContract } from "wagmi";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { RiLoader5Fill } from "react-icons/ri";
import { contractAdds } from "@/utils/contracts/contractAdds";
import { encodeFunctionData, numberToHex } from "viem";
import { auctionAbi } from "@/utils/contracts/abis/auctionAbi";
import { erc20Abi } from "@/utils/contracts/abis/erc20Abi";
import { readContractSetup, writeContractSetup } from "@/utils/contractSetup";
import { useGlobalContext } from "@/utils/providers/globalContext";
import {
  base,
  createBaseAccountSDK,
  getCryptoKeyAccount,
} from "@base-org/account";
import { useSession } from "next-auth/react";
import { fetchTokenPrice, calculateUSDValue, formatUSDAmount } from "@/utils/tokenPrice";
import Image from "next/image";

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
  blockchainAuctionId: string;
  hostedBy: HostInfo;
  bidders: Bidder[];
  highestBid: number;
  topBidder: {
    wallet: string,
    username: string, // Enhanced with Neynar display_name
    fid: string,
    pfp_url: string | null, // Profile picture from Neynar
    bidAmount: number,
    bidTimestamp: Date
  } | null;
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
  const [loadingToastId, setLoadingToastId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentBid, setCurrentBid] = useState<{auctionId: string, amount: number} | null>(null);
  
  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [bidError, setBidError] = useState("");
  
  // Token price state
  const [tokenPrice, setTokenPrice] = useState<number | null>(null);
  const [tokenPriceLoading, setTokenPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  
  const { sendCalls, isSuccess, status } = useSendCalls();

  const { context } = useMiniKit();

  const {address} = useAccount()
  const {user} = useGlobalContext()

  const fetchTopAuctions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/auctions/getTopFive");
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

  const { data: session } = useSession();

  useEffect(() => {
    if(session){
      fetchTopAuctions();
  }
  }, [session]);

  const navigate = useNavigateWithLoader();

  useEffect(() => {
    // When transaction succeeds
    if (isSuccess && currentBid) {
      if (loadingToastId) {
        toast.success("Transaction successful! Saving bid details...", {
          id: loadingToastId,
        });
      }
      // Don't clear currentBid here - let processSuccess handle it
      processSuccess(currentBid.auctionId, currentBid.amount);
    }
    // When transaction fails (status === 'error')
    else if (status === "error") {
      if (loadingToastId) {
        toast.error("Transaction failed. Please try again.", {
          id: loadingToastId,
        });
      }
      setIsLoading(false);
      setCurrentBid(null);
      setLoadingToastId(null);
      console.error("Transaction failed");
    }
  }, [isSuccess, status]);

  const processSuccess = async (auctionId: string, bidAmount: number) => {
    try {
      console.log("Starting processSuccess with:", { auctionId, bidAmount, address });
      
      // Call the API to save bid details in the database
      const response = await fetch(`/api/protected/auctions/${auctionId}/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bidAmount: bidAmount,
          userWallet: address,
        }),
      });

      console.log("API Response status:", response.status);
      const data = await response.json();
      console.log("API Response data:", data);

      if (!response.ok) {
        throw new Error(data.error || `API request failed with status ${response.status}`);
      }

      
        toast.success("Bid placed successfully! Refreshing auctions...");
     

      // Refresh the auctions to show updated bid data
      await fetchTopAuctions();
      
      console.log("Successfully completed processSuccess");
      
    } catch (error) {
      console.error("Error in processSuccess:", error);
      if (loadingToastId) {
        toast.error(`Failed to save bid details: ${error instanceof Error ? error.message : 'Unknown error'}`, {
          id: loadingToastId,
        });
      }
    } finally {
      // Always clean up state regardless of success/failure
      setIsLoading(false);
      setCurrentBid(null);
      setLoadingToastId(null);
      setIsDrawerOpen(false);
    }
  };

  async function handleBid(auctionId: string, auction: Auction, bidAmountParam?: number) {
    try {
      let bidAmount: number;
      
      if (bidAmountParam) {
        bidAmount = bidAmountParam;
      } else {
        // Fallback to prompt if called directly (though we should use drawer now)
        const bidAmountStr = prompt(`Enter your bid amount (minimum: ${auction.minimumBid} ${auction.currency}):`);
        if (!bidAmountStr) return;
        
        bidAmount = parseFloat(bidAmountStr);
        if (isNaN(bidAmount) || bidAmount <= 0) {
          toast.error("Invalid bid amount");
          return;
        }

        if (bidAmount < auction.minimumBid) {
          toast.error(`Bid must be at least ${auction.minimumBid} ${auction.currency}`);
          return;
        }

        if (bidAmount <= auction.highestBid) {
          toast.error(`Bid must be higher than current highest bid of ${auction.highestBid} ${auction.currency}`);
          return;
        }
      }

      const toastId = toast.loading("Preparing transaction...");
      setLoadingToastId(toastId);
      setIsLoading(true);

      // Get token decimals for proper conversion
      let tokenDecimals = 18; // Default to 18
      let bidAmountInWei: bigint;

      try {
        toast.loading("Fetching token information...", { id: toastId });
        tokenDecimals = await getTokenDecimals(auction.tokenAddress);
        console.log(`Token decimals for ${auction.tokenAddress}:`, tokenDecimals);
        
        // Convert bid amount to proper decimal format
        bidAmountInWei = convertBidAmountToWei(bidAmount, tokenDecimals);
        console.log(`Bid amount ${bidAmount} converted to ${bidAmountInWei} with ${tokenDecimals} decimals`);
      } catch (error) {
        console.error("Error fetching token decimals, using default 18:", error);
        // Fallback to 18 decimals if fetching fails
        bidAmountInWei = convertBidAmountToWei(bidAmount, 18);
        toast.loading("Using default token configuration...", { id: toastId });
      }

      if (!context) {
        toast.loading("Sending approval transaction", { id: toastId });
        const erc20Contract = await writeContractSetup(auction.tokenAddress, erc20Abi);

        // approve transaction
        const approveTx = await erc20Contract?.approve(
          contractAdds.auctions as `0x${string}`,
          bidAmountInWei
        );

        await approveTx?.wait();

        toast.success("Approval successful!", { id: toastId });

        toast.loading("Sending bid transaction", { id: toastId });

        const contract = await writeContractSetup(contractAdds.auctions, auctionAbi);

        toast.loading("Waiting for transaction confirmation...", { id: toastId });
        
        // Call the smart contract
        const txHash = await contract?.placeBid(
          auctionId,
          bidAmountInWei,
          address as `0x${string}`
        );

        toast.loading("Transaction submitted, waiting for confirmation...", { id: toastId });
        
        await txHash?.wait();

        toast.loading("Transaction confirmed! Saving bid details...", { id: toastId });

        // Directly call processSuccess for non-MiniKit flow
        await processSuccess(auctionId, bidAmount);
      } else {
        const calls = [
          {
            //approve transaction
            to: auction.tokenAddress as `0x${string}`,
            value: context?.client.clientFid !== 309857 ? BigInt(0) : BigInt(0),
            data: encodeFunctionData({
              abi: erc20Abi,
              functionName: "approve",
              args: [contractAdds.auctions, bidAmountInWei],
            }),
          },
          {
            to: contractAdds.auctions as `0x${string}`,
            value: context?.client.clientFid !== 309857 ? BigInt(0) : BigInt(0),
            data: encodeFunctionData({
              abi: auctionAbi,
              functionName: "placeBid",
              args: [
                auctionId,
                numberToHex(bidAmountInWei),
                String(user.fid) || address
              ],
            }),
          },
        ];
        
        // Store current bid info for useEffect to handle
        setCurrentBid({ auctionId, amount: bidAmount });
        
       if (context?.client.clientFid === 309857) {
          toast.loading("Connecting to Base SDK...", { id: toastId });
          
          const provider = createBaseAccountSDK({
            appName: "Bill test app",
            appLogoUrl: "https://farcaster-miniapp-chi.vercel.app/pfp.jpg",
            appChainIds: [base.constants.CHAIN_IDS.base],
          }).getProvider();

          const cryptoAccount = await getCryptoKeyAccount();
          const fromAddress = cryptoAccount?.account?.address;

          toast.loading("Submitting transaction...", { id: toastId });

          const result = await provider.request({
            method: "wallet_sendCalls",
            params: [
              {
                version: "2.0.0",
                from: fromAddress,
                chainId: numberToHex(base.constants.CHAIN_IDS.base),
                atomicRequired: true,
                calls: calls,
              },
            ],
          });

          toast.loading("Transaction submitted! Waiting for confirmation...", { id: toastId });
          
          // Wait longer for transaction to be mined and confirmed
          await new Promise((resolve) => setTimeout(resolve, 8000));
          
          // Directly call processSuccess for Base SDK flow since useEffect won't trigger
          await processSuccess(auctionId, bidAmount);
          
        } else {
          toast.loading("Waiting for wallet confirmation...", { id: toastId });
          
          sendCalls({
            // @ts-ignore
            calls: calls,
          });
        }
        
        
        // processSuccess will be called when transaction succeeds
      }
    } catch (error) {
      console.error("Bid error:", error);
      
      if (loadingToastId) {
        toast.error(`Failed to place bid: ${error instanceof Error ? error.message : 'Unknown error'}`, {
          id: loadingToastId,
        });
      }
      
      // Clean up state on error
      setIsLoading(false);
      setCurrentBid(null);
      setLoadingToastId(null);
      setIsDrawerOpen(false);
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

  // Function to get token decimals from ERC20 contract
  const getTokenDecimals = async (tokenAddress: string): Promise<number> => {
    try {
      // Use contract setup for reading decimals
      const contract = await readContractSetup(tokenAddress, erc20Abi);
      const decimalsResult = await contract?.decimals();
      return Number(decimalsResult) || 18; // Default to 18 if failed
    } catch (error) {
      console.error("Error fetching token decimals:", error);
      // Default to 18 decimals if we can't fetch (most common for ERC20)
      return 18;
    }
  };

  // Function to convert bid amount to proper decimal format
  const convertBidAmountToWei = (bidAmount: number, decimals: number): bigint => {
    // Convert the bid amount to the token's decimal representation
    const factor = Math.pow(10, decimals);
    const amountInWei = Math.floor(bidAmount * factor);
    return BigInt(amountInWei);
  };

  const openBidDrawer = (auction: Auction) => {
    setSelectedAuction(auction);
    setBidAmount("");
    setBidError("");
    setTokenPrice(null);
    setPriceError(null);
    setIsDrawerOpen(true);
  };

  const validateBidAmount = () => {
    if (!selectedAuction) return false;
    
    const amount = parseFloat(bidAmount);
    
    if (!bidAmount || isNaN(amount) || amount <= 0) {
      setBidError("Please enter a valid bid amount");
      return false;
    }

    if (amount < selectedAuction.minimumBid) {
      setBidError(`Bid must be at least ${selectedAuction.minimumBid} ${selectedAuction.currency}`);
      return false;
    }

    if (amount <= selectedAuction.highestBid) {
      setBidError(`Bid must be higher than current highest bid of ${selectedAuction.highestBid} ${selectedAuction.currency}`);
      return false;
    }

    setBidError("");
    return true;
  };

  // Debounced token price fetching
  useEffect(() => {
    const fetchPrice = async () => {
      if (!selectedAuction || !bidAmount || parseFloat(bidAmount) <= 0) {
        setTokenPrice(null);
        setPriceError(null);
        return;
      }

      try {
        setTokenPriceLoading(true);
        setPriceError(null);
        const price = await fetchTokenPrice(selectedAuction.tokenAddress);
        setTokenPrice(price);
      } catch (error) {
        console.error('Error fetching token price:', error);
        setPriceError('Unable to fetch price');
        setTokenPrice(null);
      } finally {
        setTokenPriceLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchPrice, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [bidAmount, selectedAuction?.tokenAddress]);

  const getUSDValue = () => {
    if (!bidAmount || !tokenPrice || parseFloat(bidAmount) <= 0) return null;
    const amount = parseFloat(bidAmount);
    console.log('Calculating USD value for amount:', amount, 'with token price:', tokenPrice);
    return calculateUSDValue(amount, tokenPrice);
  };

  const handleConfirmBid = () => {
    if (!selectedAuction || !validateBidAmount()) return;
    
    const amount = parseFloat(bidAmount);
    // Don't close drawer here - let it close after processSuccess completes
    handleBid(selectedAuction.blockchainAuctionId, selectedAuction, amount);
  };

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto mt-8">
        <div className="bg-white/10 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <RiLoader5Fill className="animate-spin text-4xl text-primary" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Loading Auctions</h3>
              <p className="text-caption">Fetching the latest auction data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-6xl mx-auto mt-8">
        <div className="bg-white/10 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
              <svg 
                className="w-8 h-8 text-red-500 dark:text-red-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Unable to Load Auctions</h3>
              <p className="text-caption mb-4">{error}</p>
              <Button onClick={fetchTopAuctions} variant="outline">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (auctions.length === 0) {
    return (
      <div className="w-full max-w-6xl mx-auto mt-8">
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
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">No Active Auctions</h3>
              <p className="text-caption mb-4">
                There are currently no active auctions available.
              </p>
              <p className="text-sm text-caption">
                Check back later or create your own auction to get started!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-lg:mx-auto mt-8">
      <div className="flex flex-col items-start justify-between mb-8">
        <h2 className="text-2xl font-bold gradient-text">Latest Auctions</h2>
        <p className="text-caption text-sm mt-2">
          Discover the most active auctions happening right now
        </p>
      </div>

      <div className="w-full grid grid-cols-1 lg:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {auctions.map((auction, index) => (
          <div
            key={auction._id}
            className="bg-primary/10 w-full border border-primary rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
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
                  {auction.highestBid == 0 ? <>
                  <span className="text-caption text-sm w-[30%]">Min Bid:</span>
                  <span className="font-semibold text-md text-primary text-nowrap text-truncate w-[70%] text-end overflow-hidden">
                    {formatBidAmount(
                          auction.minimumBid,
                          auction.currency
                        )}
                  </span>
                  </> : <>
                  <span className="text-caption text-sm w-[30%]">Highest Bid:</span>
                  <span className="font-semibold text-md text-primary text-nowrap text-truncate w-[70%] text-end overflow-hidden">
                        {formatBidAmount(auction.highestBid, auction.currency)}
                  </span>
                  </>}
                </div>

                {/* Stats */}
                
                  <div className="flex justify-between items-center">
                    <div className="text-caption text-sm">Participants</div>
                    <div className="font-semibold text-md text-white">
                      {auction.participantCount}
                    </div>
                    
                  </div>

                  {auction.topBidder && <div className="flex justify-between items-center">
                    <div className="text-caption text-sm">Top Bidder</div>
                    <div className="font-semibold text-md text-white bg-white/10 rounded-full px-2 py-1 flex gap-2">
                    <Image alt="top bidder" src={auction.topBidder?.pfp_url || ""} width={100} height={100} className="rounded-full w-6 aspect-square"  />
                      <h3 className="max-w-32 truncate text-md">{auction.topBidder?.username}</h3>
                    </div>
                    
                  </div>}
                

                {/* Host info */}
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-caption">Hosted by:</span>
                    <span className="font-medium text-white">
                      {auction.hostedBy.username ||
                        auction.hostedBy.wallet}
                    </span>
                  </div>
                </div>

                {/* Action button */}
                <div className="flex justify-center gap-2 px-1">
                  <Button
                    variant={"default"}
                    className="w-[70%] h-12 hover:opacity-90"
                    onClick={() => openBidDrawer(auction)}
                  >
                    Bid
                  </Button>
                  <Button
                    variant={"outline"}
                    className="w-[30%] h-12 hover:opacity-90"
                    onClick={() => {
                      // Navigate to auction detail page
                      window.location.href = `/bid/${auction.blockchainAuctionId}`;
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

      {/* Bid Drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="drawer-content">
          <DrawerHeader>
            <DrawerTitle className="my-4 text-xl">Place Your Bid</DrawerTitle>
            <div className="text-left text-md">
              {selectedAuction && (
                <ul>
                  <li className="border-b border-b-white/10 py-2 flex ">
                    <span className="text-left w-1/2">Bidding on:</span> <strong className="text-primary text-right w-1/2">{selectedAuction.auctionName}</strong>
                  </li>
                  <li className="border-b border-b-white/10 py-2 flex ">
                    <span className="text-left w-1/2">Minimum bid: </span><strong className="text-primary text-right w-1/2">{formatBidAmount(selectedAuction.minimumBid, selectedAuction.currency)}</strong>
                  </li>
                  
                  
                  
                  {selectedAuction.highestBid > 0 && (
                    <li className="border-b border-b-white/10 py-2 flex ">
                      <span className="text-left w-1/2">Current highest bid:</span> <strong className="text-primary text-right w-1/2">{formatBidAmount(selectedAuction.highestBid, selectedAuction.currency)}</strong>
                    </li>
                  )}
                </ul>
              )}
            </div>
          </DrawerHeader>
          
          <div className="px-4 pb-2">
            <Input
              label="Bid Amount"
              value={bidAmount}
              onChange={(value) => {
                setBidAmount(value);
                if (bidError) setBidError(""); // Clear error when user types
              }}
              placeholder={selectedAuction ? `Enter amount in ${selectedAuction.currency}` : "Enter bid amount"}
              type="number"
              required
              className="mb-2"
            />
            
            {/* USD Value Display */}
            {bidAmount && parseFloat(bidAmount) > 0 && (
              <div className="mt-2 p-2 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-caption">USD Value:</span>
                  <div className="flex items-center">
                    {tokenPriceLoading ? (
                      <>
                        <RiLoader5Fill className="animate-spin text-primary mr-1" />
                        <span className="text-caption">Loading...</span>
                      </>
                    ) : priceError ? (
                      <span className="text-red-400">{priceError}</span>
                    ) : tokenPrice && getUSDValue() ? (
                      <span className="text-primary font-medium">
                        {formatUSDAmount(getUSDValue()!)}
                      </span>
                    ) : (
                      <span className="text-caption">--</span>
                    )}
                  </div>
                </div>
                {tokenPrice && !tokenPriceLoading && !priceError && (
                  <div className="text-xs text-caption mt-1">
                    1 {selectedAuction?.currency} = {formatUSDAmount(tokenPrice)}
                  </div>
                )}
              </div>
            )}
            
            {bidError && (
              <p className="text-red-500 text-sm mt-1">{bidError}</p>
            )}
          </div>

          <DrawerFooter>
            <Button 
              onClick={handleConfirmBid}
              disabled={isLoading || !bidAmount}
              className="w-full h-12 text-lg font-bold"
            >
              {isLoading ? (
                <>
                  <RiLoader5Fill className="text-2xl mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Bid"
              )}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Show all auctions link */}
    </div>
  );
};

export default LandingAuctions;
