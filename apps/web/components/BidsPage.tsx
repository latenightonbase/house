"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Heading from "./UI/Heading";
import RatingCircle from "./UI/RatingCircle";
import ScrollingName from "./utils/ScrollingName";
import {
  auctionAbi,
  contractAdds,
  erc20Abi,
  readContractSetup,
  writeNewContractSetup,
} from "@repo/contracts";
import { RiLoader5Fill, RiShareBoxLine, RiFileCopyLine } from "react-icons/ri";
import { IoShareOutline, IoLinkOutline, IoCopyOutline } from "react-icons/io5";
import { FaShare } from "react-icons/fa";
import { Users, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/UI/button";
import Input from "@/components/UI/Input";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/UI/Drawer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/UI/Dialog";
import {
  fetchTokenPrice,
  calculateUSDValue,
  formatUSDAmount,
} from "@/utils/tokenPrice";
import toast from "react-hot-toast";
import { useSendCalls } from "wagmi";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { encodeFunctionData, numberToHex } from "viem";
import { base as baseChain } from "viem/chains";
import { useGlobalContext } from "@/utils/providers/globalContext";
import {
  base,
  createBaseAccountSDK,
  getCryptoKeyAccount,
} from "@base-org/account";
import { checkStatus } from "@/utils/checkStatus";
import { ethers } from "ethers";
import { checkUsdc } from "@/utils/checkUsdc";
// import { WalletConnect } from "@/components/Web3/walletConnect";
import sdk from "@farcaster/miniapp-sdk";
import { useNavigateWithLoader } from "@/utils/useNavigateWithLoader";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import AggregateConnector from "./utils/aggregateConnector";

interface Bidder {
  displayName: string;
  image: string;
  bidAmount: string;
  usdValue?: number;
  walletAddress: string;
  userId?: string;
}

interface ContractBidder {
  bidder: string;
  bidAmount: bigint;
  fid: string;
}

interface AuctionData {
  auctionName: string;
  description?: string;
  auctionStatus: "Running" | "Ended";
  endDate: string;
  currency: string;
  tokenAddress: string;
  highestBid: string;
  minimumBid: string;
  bidders: Bidder[];
  imageUrl?: string;
  hostedBy: {
    _id?: string;
    username: string;
    display_name?: string;
    pfp_url?: string;
    fid?: string;
    wallet?: string;
    averageRating?: number;
    totalReviews?: number;
    twitterProfile?: {
      id: string;
      username: string;
      name: string;
      profileImageUrl?: string;
    };
  };
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
  highestBid: number;
}

export default function BidPage() {
  const params = useParams();
  const blockchainAuctionId = params.blockchainAuctionId as string;

  const navigate = useNavigateWithLoader();

  const [auctionData, setAuctionData] = useState<AuctionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareDropdownOpen, setShareDropdownOpen] = useState(false);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    setIsDesktop(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  const [bidAmount, setBidAmount] = useState("");
  const [bidError, setBidError] = useState("");
  const [isPlacingBid, setIsPlacingBid] = useState(false);

  // Token price state
  const [tokenPrice, setTokenPrice] = useState<number | null>(null);
  const [tokenPriceLoading, setTokenPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  
  // Token price for auction (separate from bid input)
  const [auctionTokenPrice, setAuctionTokenPrice] = useState<number | null>(null);

  // Additional state for handleBid functionality
  const [loadingToastId, setLoadingToastId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentBid, setCurrentBid] = useState<{
    auctionId: string;
    amount: number;
  } | null>(null);

  // Hooks
  const { sendCalls, isSuccess, status } = useSendCalls();
  const { context } = useMiniKit();
  const [storedAuction, setStoredAuction] = useState<Auction | null>(null);
  const [storedBidAmountInWei, setStoredBidAmountInWei] = useState<bigint>(BigInt(0));
  const { user } = useGlobalContext();
  const { getAccessToken } = usePrivy();

  const { wallets } = useWallets();
  const externalWallets = wallets.filter(
    (wallet) => wallet.walletClientType !== "privy"
  );

  const address =
    externalWallets.length > 0 ? externalWallets[0].address : null;

  // Debounced token price fetching
  useEffect(() => {
    const fetchPrice = async () => {
      if (!auctionData || !bidAmount || parseFloat(bidAmount) <= 0) {
        setTokenPrice(null);
        setPriceError(null);
        return;
      }

      try {
        setTokenPriceLoading(true);
        setPriceError(null);
        const price = await fetchTokenPrice(auctionData.tokenAddress);
        setTokenPrice(price);
      } catch (error) {
        console.error("Error fetching token price:", error);
        setPriceError("Unable to fetch price");
        setTokenPrice(null);
      } finally {
        setTokenPriceLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchPrice, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [bidAmount, auctionData?.tokenAddress]);

  const handleFallbackTransaction = async (
    auctionId: string,
    bidAmount: number,
    bidAmountInWei: bigint,
    auction: Auction,
    toastId: string
  ) => {
    if (!address || externalWallets.length === 0) {
      toast.error("Wallet not connected", { id: toastId });
      setIsLoading(false);
      return;
    }

    try {
      console.log("Initiating fallback transaction with external wallet...");

      const wallet = externalWallets[0];
      if (!wallet) {
        toast.error("Unable to find a connected wallet", { id: toastId });
        setIsLoading(false);
        return;
      }

      await wallet.switchChain(baseChain.id);
      const bidderIdentifier = String(user.socialId);

      toast.loading("Approving...", { id: toastId });
      const erc20Contract = await writeNewContractSetup(
        auction.tokenAddress,
        erc20Abi,
        externalWallets[0]
      );

      const approveTx = await erc20Contract?.approve(
        contractAdds.auctions as `0x${string}`,
        bidAmountInWei
      );

      await approveTx?.wait();

      if (!approveTx) {
        toast.error("Approval transaction failed", { id: toastId });
        setIsLoading(false);
        return;
      }

      toast.loading("Bidding...", { id: toastId });

      const contract = await writeNewContractSetup(
        contractAdds.auctions,
        auctionAbi,
        externalWallets[0]
      );

      toast.loading("Confirming...", { id: toastId });

      const txHash = await contract?.placeBid(
        auctionId,
        bidAmountInWei,
        bidderIdentifier
      );

      await txHash?.wait();

      if (!txHash) {
        toast.error("Transaction failed", { id: toastId });
        setIsLoading(false);
        return;
      }

      toast.success("Transaction confirmed!", { id: toastId });
      await processSuccess(auctionId, bidAmount);
    } catch (error) {
      console.error("Fallback transaction failed:", error);
      toast.error("Failed", { id: toastId });
      setIsLoading(false);
      setCurrentBid(null);
      setLoadingToastId(null);
    }
  };

  // Handle transaction success/failure
  useEffect(() => {
    // When transaction succeeds
    if (status == "success" && currentBid) {
      if (loadingToastId) {
        toast.success("Transaction successful! Saving bid details...", {
          id: loadingToastId,
        });
      }
      // Don't clear currentBid here - let processSuccess handle it
      processSuccess(currentBid.auctionId, currentBid.amount);
    }
    // When transaction fails (status === 'error') - fallback to external wallet
    else if (status === "error" && currentBid && loadingToastId && storedAuction && storedBidAmountInWei > BigInt(0)) {
      console.log("sendCalls failed, attempting fallback transaction...");
      handleFallbackTransaction(
        currentBid.auctionId,
        currentBid.amount,
        storedBidAmountInWei,
        storedAuction,
        loadingToastId
      );
    }
  }, [isSuccess, status]);

  const getUSDValue = () => {
    if (!bidAmount || !tokenPrice || parseFloat(bidAmount) <= 0) return null;
    const amount = parseFloat(bidAmount);
    console.log(
      "Calculating USD value for amount:",
      amount,
      "with token price:",
      tokenPrice
    );
    return calculateUSDValue(amount, tokenPrice);
  };



  useEffect(() => {
    const fetchAuctionData = async () => {
      try {
        setLoading(true);

        // Get bidders from contract
        let contractBidders: ContractBidder[] = [];
        try {
          console.log("Setting up contract...");
          const contract = await readContractSetup(
            contractAdds.auctions,
            auctionAbi
          );

          if (contract) {
            console.log(
              "Fetching bidders from contract for auction ID:",
              blockchainAuctionId
            );
            contractBidders = await contract.getBidders(blockchainAuctionId);
            console.log(
              "Fetched bidders from contract:",
              contractBidders
            );
          }
        } catch (contractError) {
          console.error("Error fetching bidders from contract:", contractError);
          // Continue with empty bidders array if contract call fails
        }

        // Process the bidders data via API (which will also fetch auction info)
        const processedResponse = await fetch(
          `/api/bid/${blockchainAuctionId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contractBidders: contractBidders.map((bidder) => ({
                bidder: bidder.bidder,
                bidAmount: bidder.bidAmount.toString(),
                fid: bidder.fid,
              })),
            }),
          }
        );

        if (!processedResponse.ok) {
          const errorData = await processedResponse.json();
          throw new Error(errorData.error || "Failed to process auction data");
        }

        const data = await processedResponse.json();
        console.log("Fetched auction data from API:", data);
        console.log(parseFloat(data.highestBid));
        setAuctionData(data);
        
        // Fetch token price for USD calculations
        if (data.tokenAddress) {
          try {
            const price = await fetchTokenPrice(data.tokenAddress);
            setAuctionTokenPrice(price);
          } catch (error) {
            console.error("Error fetching auction token price:", error);
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (blockchainAuctionId) {
      fetchAuctionData();
    }
  }, [blockchainAuctionId]);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast.success(`${type} copied to clipboard!`);
        setShareDropdownOpen(false);
      })
      .catch(() => {
        toast.error("Failed to copy to clipboard");
      });
  };

  const handleShareClick = () => {
    setShareDropdownOpen(!shareDropdownOpen);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RiLoader5Fill className="text-primary animate-spin text-3xl mx-auto" />
          <p className="mt-4 text-caption">Loading auction details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!auctionData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">No auction data found</p>
      </div>
    );
  }

  const formatBidAmount = (amount: string, currency: string) => {
    // Use 6 decimals for USDC, otherwise use 18 decimals for ETH and other tokens
    const decimals = currency.toUpperCase() === "USDC" ? 6 : 18;
    const converted = parseFloat(amount) / Math.pow(10, decimals);
    return converted.toFixed(2).toLocaleString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };
  
  const calculateBidderUSDValue = (bidAmount: string): number | null => {
    if (!auctionTokenPrice || !auctionData) return null;
    const decimals = auctionData.currency.toUpperCase() === "USDC" ? 6 : 18;
    const amount = parseFloat(bidAmount) / Math.pow(10, decimals);
    return amount * auctionTokenPrice;
  };

  const openBidDrawer = () => {
    setBidAmount("");
    setBidError("");
    setTokenPrice(null);
    setPriceError(null);
    setIsDrawerOpen(true);
  };

  const validateBidAmount = () => {
    if (!auctionData) return false;

    const amount = parseFloat(bidAmount);

    if (!bidAmount || isNaN(amount) || amount <= 0) {
      setBidError("Please enter a valid bid amount");
      return false;
    }

    // Check against minimum bid if no bids exist, otherwise check against highest bid
    const currentHighestBid = parseFloat(
      formatBidAmount(auctionData.highestBid, auctionData.currency)
    );
    const minimumBidAmount = parseFloat(
      formatBidAmount(auctionData.minimumBid, auctionData.currency)
    );

    if (currentHighestBid > 0) {
      // There are existing bids - must beat the highest bid
      if (amount <= currentHighestBid) {
        setBidError(
          `Bid must be higher than current highest bid of ${currentHighestBid} ${auctionData.currency}`
        );
        return false;
      }
    } else {
      // No existing bids - must meet minimum bid
      if (amount < minimumBidAmount) {
        setBidError(
          `Bid must be at least ${minimumBidAmount} ${auctionData.currency}`
        );
        return false;
      }
    }

    setBidError("");
    return true;
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
  const convertBidAmountToWei = (
    bidAmount: number,
    decimals: number
  ): bigint => {
    // Use ethers.js parseUnits to avoid floating point precision issues
    return ethers.parseUnits(bidAmount.toString(), decimals);
  };

  const processSuccess = async (auctionId: string, bidAmount: number) => {
    try {
      console.log("Starting processSuccess with:", {
        auctionId,
        bidAmount,
        address,
      });

      // Call the API to save bid details in the database
      const accessToken = await getAccessToken();
      const response = await fetch(`/api/protected/auctions/${auctionId}/bid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          bidAmount: bidAmount,
          socialId: user?.socialId,
          // privyId: user?.privyId || undefined,
        }),
      });

      console.log("API Response status:", response.status);
      const data = await response.json();
      console.log("API Response data:", data);

      if (!response.ok) {
        throw new Error(
          data.error || `API request failed with status ${response.status}`
        );
      }

      toast.success("Bid placed!");

      // Refresh the auction data to show updated bid data
      if (blockchainAuctionId) {
        const fetchAuctionData = async () => {
          try {
            setLoading(true);

            // Get bidders from contract
            let contractBidders: ContractBidder[] = [];
            try {
              console.log("Setting up contract...");
              const contract = await readContractSetup(
                contractAdds.auctions,
                auctionAbi
              );

              if (contract) {
                console.log(
                  "Fetching bidders from contract for auction ID:",
                  blockchainAuctionId
                );
                contractBidders = await contract.getBidders(
                  blockchainAuctionId
                );
                console.log(
                  "Fetched bidders from contract:",
                  contractBidders.length
                );
              }
            } catch (contractError) {
              console.error(
                "Error fetching bidders from contract:",
                contractError
              );
              // Continue with empty bidders array if contract call fails
            }

            // Process the bidders data via API (which will also fetch auction info)
            const processedResponse = await fetch(
              `/api/bid/${blockchainAuctionId}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  contractBidders: contractBidders.map((bidder) => ({
                    bidder: bidder.bidder,
                    bidAmount: bidder.bidAmount.toString(),
                    fid: bidder.fid,
                  })),
                }),
              }
            );

            if (!processedResponse.ok) {
              const errorData = await processedResponse.json();
              throw new Error(
                errorData.error || "Failed to process auction data"
              );
            }

            const data = await processedResponse.json();
            setAuctionData(data);
          } catch (err: any) {
            setError(err.message);
          } finally {
            setLoading(false);
          }
        };

        await fetchAuctionData();
      }

      console.log("Successfully completed processSuccess");
    } catch (error) {
      console.error("Error in processSuccess:", error);
      if (loadingToastId) {
        toast.error(
          `Failed to save bid details: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          {
            id: loadingToastId,
          }
        );
      }
    } finally {
      // Always clean up state regardless of success/failure
      setIsLoading(false);
      setCurrentBid(null);
      setLoadingToastId(null);
      setIsDrawerOpen(false);
    }
  };

  async function handleBid(
    auctionId: string,
    auction: Auction,
    bidAmountParam?: number
  ) {
    try {
      //check if address exists
      if (!address) {
        toast.error("Please connect your wallet");
        return;
      }

      if(!user){
        toast.error("Please log in to place a bid");
        setIsLoading(false);
        return;
      }

      let bidAmount: number;

      if (bidAmountParam) {
        bidAmount = bidAmountParam;
      } else {
        // Fallback to prompt if called directly (though we should use drawer now)
        const bidAmountStr = prompt(
          `Enter your bid amount (minimum: ${auction.minimumBid} ${auction.currency}):`
        );
        if (!bidAmountStr) return;

        bidAmount = parseFloat(bidAmountStr);
        if (isNaN(bidAmount) || bidAmount <= 0) {
          toast.error("Invalid bid amount");
          return;
        }

        if (bidAmount < auction.minimumBid) {
          toast.error(
            `Bid must be at least ${auction.minimumBid} ${auction.currency}`
          );
          return;
        }

        if (bidAmount <= auction.highestBid) {
          toast.error(
            `Bid must be higher than current highest bid of ${auction.highestBid} ${auction.currency}`
          );
          return;
        }
      }

      const toastId = toast.loading("Preparing...");
      setLoadingToastId(toastId);
      setIsLoading(true);

      // Get token decimals for proper conversion
      let tokenDecimals = 18; // Default to 18
      let bidAmountInWei: bigint;

      try {
        toast.loading("Fetching token information...", { id: toastId });
        console.log("Fetching token decimals for:", auction.tokenAddress);
        tokenDecimals = await getTokenDecimals(auction.tokenAddress);
        console.log(
          `Token decimals for ${auction.tokenAddress}:`,
          tokenDecimals
        );

        // Convert bid amount to proper decimal format
        bidAmountInWei = convertBidAmountToWei(bidAmount, tokenDecimals);
        console.log(
          `Bid amount ${bidAmount} converted to ${bidAmountInWei} with ${tokenDecimals} decimals`
        );
      } catch (error) {
        console.error(
          "Error fetching token decimals, using default 18:",
          error
        );
        // Fallback to 18 decimals if fetching fails
        bidAmountInWei = convertBidAmountToWei(bidAmount, 18);
        toast.loading("Using default token configuration...", { id: toastId });
      }

      const contract = await readContractSetup(auction.tokenAddress, erc20Abi);

      console.log("Contract setup", contract);

      const balanceResult = await contract?.balanceOf(address as `0x${string}`);

      console.log(
        "User balance:",
        balanceResult ? balanceResult.toString() : "N/A"
      );

      const formattedBalance = parseFloat(
        ethers.formatUnits(
          balanceResult,
          checkUsdc(auction.tokenAddress) ? 6 : 18
        )
      );
      if (formattedBalance < bidAmount) {
        toast.error("Insufficient token balance to place bid", { id: toastId });
        setIsLoading(false);
        return;
      }

      if (!context) {
        const wallet = externalWallets[0];
        if (!wallet) {
          toast.error("Unable to find a connected wallet", { id: toastId });
          setIsLoading(false);
          return;
        }

        await wallet.switchChain(baseChain.id);
        const provider = await wallet.getEthereumProvider();
        const bidderIdentifier = String(user.socialId)
        const approveData = encodeFunctionData({
          abi: erc20Abi,
          functionName: "approve",
          args: [contractAdds.auctions as `0x${string}`, bidAmountInWei],
        });
        const bidData = encodeFunctionData({
          abi: auctionAbi,
          functionName: "placeBid",
          args: [auctionId, bidAmountInWei, bidderIdentifier],
        });

        const callsRequest = {
          version: "1.0",
          chainId: numberToHex(baseChain.id),
          atomicRequired: true,
          from: wallet.address,
          calls: [
            {
              to: auction.tokenAddress as `0x${string}`,
              data: approveData,
              value: "0x0",
              capabilities: {
                gasLimitOverride: "0x186a0",
              },
            },
            {
              to: contractAdds.auctions as `0x${string}`,
              data: bidData,
              value: "0x0",
              capabilities: {
                gasLimitOverride: "0x7a120",
              },
            },
          ],
        } as const;

        try {
          const callsResponse = await provider.request({
            method: "wallet_sendCalls",
            params: [callsRequest],
          });

          const callsId =
            typeof callsResponse === "string"
              ? callsResponse
              : (callsResponse as { callsId?: string; id?: string })?.callsId ??
                (callsResponse as { callsId?: string; id?: string })?.id;

          if (!callsId) {
            throw new Error("Failed to retrieve smart wallet callsId");
          }

          toast.loading("Transaction submitted, checking status...", {
            id: toastId,
          });

          const confirmed = await checkStatus(callsId);

          if (!confirmed) {
            toast.error("Transaction failed or timed out", { id: toastId });
            setIsLoading(false);
            return;
          }

          toast.loading("Transaction confirmed! Saving bid details...", {
            id: toastId,
          });
          await processSuccess(auctionId, bidAmount);
          return;
        } catch (walletSendError) {

          toast.error("Transaction failed", { id: toastId });
          setIsLoading(false);
        }
      } else {
        toast.loading(`Preparing ${bidAmount} ${auction.currency} bid...`, {
          id: toastId,
        });
        const sendingCalls = [
          {
            //approve transaction
            to: auction.tokenAddress as `0x${string}`,
            value: context?.client.clientFid !== 309857 ? BigInt(0) : "0x0",
            data: encodeFunctionData({
              abi: erc20Abi,
              functionName: "approve",
              args: [contractAdds.auctions, bidAmountInWei],
            }),
          },
          {
            to: contractAdds.auctions as `0x${string}`,
            value: context?.client.clientFid !== 309857 ? BigInt(0) : "0x0",

            data: encodeFunctionData({
              abi: auctionAbi,
              functionName: "placeBid",
              args: [
                auctionId,
                bidAmountInWei,
                user.platform == "FARCASTER" ? String(user.socialId) : address,
              ],
            }),
            capabilities: {
              gasLimitOverride: {
                value: "0x7a1200", // 8,000,000 in hex
              },
            },
          },
        ];

        // Store current bid info for useEffect to handle
        setCurrentBid({ auctionId, amount: bidAmount });
        setStoredAuction(auction);
        setStoredBidAmountInWei(bidAmountInWei);

        if (context?.client.clientFid === 309857) {
          toast.loading("Connecting to Base SDK...", { id: toastId });

          const provider = createBaseAccountSDK({
            appName: "Bill test app",
            appLogoUrl: "https://www.houseproto.fun/pfp.jpg",
            appChainIds: [base.constants.CHAIN_IDS.base],
          }).getProvider();

          const cryptoAccount = await getCryptoKeyAccount();
          const fromAddress = cryptoAccount?.account?.address;

          toast.loading(`Submitting transaction...`, { id: toastId });

          const callsId: any = await provider.request({
            method: "wallet_sendCalls",
            params: [
              {
                version: "1.0",
                from: fromAddress,
                chainId: numberToHex(base.constants.CHAIN_IDS.base),
                atomicRequired: true,
                calls: sendingCalls,
              },
            ],
          });

          toast.loading("Transaction submitted, checking status...", {
            id: toastId,
          });

          const result = await checkStatus(callsId);

          if (result) {
            toast.loading("Transaction confirmed! Saving auction details...", {
              id: toastId,
            });
            await processSuccess(auctionId, bidAmount);
          } else {
            toast.error("Transaction failed or timed out", { id: toastId });
            setIsLoading(false);
          }
        } else {
          toast.loading("Waiting for wallet confirmation...", { id: toastId });

          sendCalls({
            account: address as `0x${string}`,
            // @ts-ignore
            calls: sendingCalls,
          });
        }

        // processSuccess will be called when transaction succeeds
      }
    } catch (error) {
      console.error("Bid error:", error);

      if (loadingToastId) {
        toast.error(
          `Failed to place bid: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          {
            id: loadingToastId,
          }
        );
      }

      // Clean up state on error
      setIsLoading(false);
      setCurrentBid(null);
      setLoadingToastId(null);
      setIsDrawerOpen(false);
    }
  }

  const handleConfirmBid = () => {
    if (!auctionData || !validateBidAmount()) return;

    const amount = parseFloat(bidAmount);
    // Create an Auction object from auctionData for handleBid
    const auction: Auction = {
      _id: blockchainAuctionId,
      auctionName: auctionData.auctionName,
      endDate: auctionData.endDate,
      startDate: auctionData.endDate, // Using endDate as placeholder
      currency: auctionData.currency,
      minimumBid: parseFloat(auctionData.minimumBid),
      tokenAddress: auctionData.tokenAddress,
      blockchainAuctionId: blockchainAuctionId,
      highestBid: parseFloat(auctionData.highestBid),
    };

    // Don't close drawer here - let it close after processSuccess completes
    handleBid(blockchainAuctionId, auction, amount);
  };

  async function composeCast() {
    try {
      if (!auctionData) return;
      const url = `https://farcaster.xyz/miniapps/0d5aS3cWVprk/house/bid/${blockchainAuctionId}`;
      const hostName =
        auctionData.hostedBy.display_name || auctionData.hostedBy.username;
      const text = `Check out "${auctionData.auctionName}" hosted by ${hostName}! Bidding in ${auctionData.currency}. ${url}`;

      await sdk.actions.composeCast({
        text,
        embeds: [
          `https://farcaster.xyz/miniapps/0d5aS3cWVprk/house/bid/${blockchainAuctionId}`,
        ],
      });
    } catch (e) {
      console.error("Error composing cast:", e);
      toast.error("Failed to compose cast");
    }
  }

  // Function to render description with clickable links
  const renderDescription = (description: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = description.split(urlRegex);
    
    return (
      <p className="text-caption text-sm mt-2">
        {parts.map((part, index) => {
          if (part.match(urlRegex)) {
            const displayText = part.length > 40 
              ? part.substring(0, 40) + '...' 
              : part;
            return (
              <a
                key={index}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {displayText}
              </a>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </p>
    );
  };

  return (
    <div className="max-lg:pb-20">
      <div className="max-w-7xl mx-auto">
        {/* Auction Header - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Auction Image */}
          <div className="w-full">
          
              <Image
                src={auctionData.imageUrl || `https://api.dicebear.com/9.x/glass/svg?seed=${
              auctionData.hostedBy.username || auctionData.hostedBy.wallet
            }`}
                alt={auctionData.auctionName}
                width={800}
                height={600}
                className="w-full lg:min-h-[600px] aspect-square object-cover rounded-3xl"
                unoptimized
              />
            
          </div>

          {/* Right Column - Auction Details Card */}
          <div className="bg-white/5 rounded-3xl p-3 lg:p-6 shadow-2xl flex flex-col h-full">
            {/* Header Section */}
            <div className="mb-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
                    {auctionData.auctionName}
                  </h1>
                  {auctionData.description && (
                    <p className="text-gray-400 text-xs">
                      {auctionData.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleShareClick}
                  className="text-gray-400 hover:text-white transition-colors p-2 ml-2 flex-shrink-0"
                >
                  <RiShareBoxLine className="text-xl" />
                </button>
              </div>

              {/* Share Dropdown */}
              {shareDropdownOpen && (
                <div className="absolute right-8 mt-2 bg-[#2a2435] border border-white/10 rounded-xl shadow-xl z-50 py-2 min-w-[200px]">
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `${window.location.origin}/bid/${blockchainAuctionId}`,
                        "Link"
                      )
                    }
                    className="w-full px-4 py-2 text-left text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                  >
                    <RiFileCopyLine className="text-lg" />
                    Copy Link
                  </button>
                  {context && (
                    <button
                      onClick={composeCast}
                      className="w-full px-4 py-2 text-left text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                    >
                      <RiShareBoxLine className="text-lg" />
                      Share on Farcaster
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Current Highest Bid */}
            <div className="bg-[#251d33] bg-secondary/5 rounded-2xl p-5 mb-6">
              <p className="text-gray-400 text-xs mb-2">
                {parseFloat(auctionData.highestBid) > 0 ? "Current Highest Bid" : "Minimum Bid"}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-primary">
                  {parseFloat(auctionData.highestBid) > 0
                    ? formatBidAmount(auctionData.highestBid, auctionData.currency)
                    : auctionData.minimumBid}
                </span>
                <span className="text-xl text-white font-semibold">
                  {auctionData.currency}
                </span>
              </div>
              {auctionTokenPrice && (() => {
                const highestBidValue = parseFloat(auctionData.highestBid) > 0
                  ? calculateBidderUSDValue(auctionData.highestBid)
                  : (auctionTokenPrice ? parseFloat(auctionData.minimumBid) * auctionTokenPrice : null);
                return highestBidValue !== null && (
                  <p className="text-gray-400 text-sm mt-1">
                    ≈ ${highestBidValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                );
              })()}

              {/* Place Bid Button */}
            <button
              onClick={openBidDrawer}
              disabled={auctionData.auctionStatus !== "Running" || isLoading}
              className="w-full bg-green-500 hover:bg-green-600 mt-4 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded-2xl transition-colors text-base "
            >
              {isLoading ? "Processing..." : "Place a Bid"}
            </button>
            </div>

            {/* Grid Info */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {/* Hosted By */}
              <div className="bg-white/5 rounded-xl p-2">
                <p className="text-gray-400 text-xs mb-1">Hosted By</p>
                <div
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    if (auctionData.hostedBy._id) {
                      navigate(`/user/${auctionData.hostedBy._id}`);
                    }
                  }}
                >
                  {auctionData.hostedBy.pfp_url ? (
                    <Image
                      src={auctionData.hostedBy.pfp_url}
                      alt={auctionData.hostedBy.username}
                      width={32}
                      height={32}
                      className="rounded-full"
                      unoptimized
                    />
                  ) : auctionData.hostedBy.twitterProfile?.profileImageUrl ? (
                    <Image
                      src={auctionData.hostedBy.twitterProfile.profileImageUrl}
                      alt={auctionData.hostedBy.username}
                      width={32}
                      height={32}
                      className="rounded-full"
                      unoptimized
                    />
                  ) : (
                    <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {(auctionData.hostedBy.display_name?.[0] ||
                        auctionData.hostedBy.username[0]
                      ).toUpperCase()}
                    </div>
                  )}
                  <ScrollingName 
                    name={auctionData.hostedBy.display_name || auctionData.hostedBy.username} 
                    className="text-white text-sm font-medium"
                  />
                </div>
              </div>

              {/* End Date */}
              <div className="bg-white/5 rounded-xl p-2">
                <p className="text-gray-400 text-xs mb-1">End Date</p>
                <p className="text-white font-medium text-xs">
                  {formatDate(auctionData.endDate).split(',')[0]}
                </p>
                <p className="text-gray-400 text-xs">
                  {formatDate(auctionData.endDate).split(',')[1]}
                </p>
              </div>

              {/* Total Bids */}
              <div className="bg-white/5 rounded-xl p-2">
                <p className="text-gray-400 text-xs mb-1">Total Bids</p>
                <p className="text-white text-xl font-bold">
                  {auctionData.bidders.length}
                </p>
              </div>

              {/* Participants */}
              <div className="bg-white/5 rounded-xl p-2">
                <p className="text-gray-400 text-xs mb-1">Participants</p>
                <p className="text-white text-xl font-bold">
                  {new Set(auctionData.bidders.map(b => b.walletAddress)).size}
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="mb-4">
              <span
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                  auctionData.auctionStatus === "Running"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-current"></span>
                {auctionData.auctionStatus}
              </span>
            </div>

            {/* Bidders Section */}
            <div className="mb-4 flex-1 overflow-hidden flex flex-col">
              <h2 className="text-lg font-bold text-white mb-3">
                Bidders ({auctionData.bidders.length})
              </h2>
              <div className="space-y-2 overflow-y-auto flex-1 custom-scrollbar pr-2">
                {auctionData.bidders.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No bids yet</p>
                    <p className="text-gray-500 text-sm mt-2">
                      Be the first to place a bid!
                    </p>
                  </div>
                ) : (
                  auctionData.bidders
                    .sort((a, b) => parseFloat(b.bidAmount) - parseFloat(a.bidAmount))
                    .map((bidder, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-[#0f0b15] bg-secondary/5 rounded-xl p-2.5 hover:bg-[#1a1420] transition-colors cursor-pointer"
                        onClick={() => {
                          if (bidder.userId) {
                            navigate(`/user/${bidder.userId}`);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          {bidder.image ? (
                            <Image
                              src={bidder.image}
                              alt={bidder.displayName}
                              width={40}
                              height={40}
                              className="rounded-full"
                              unoptimized
                            />
                          ) : (
                            <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center text-white font-semibold">
                              {bidder.displayName[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-white text-sm font-medium">
                              {bidder.displayName}
                            </p>
                            <p className="text-gray-400 text-[10px]">
                              @{bidder.displayName.toLowerCase().replace(/\s+/g, '_')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white text-sm font-bold">
                            {formatBidAmount(bidder.bidAmount, auctionData.currency)} {auctionData.currency}
                          </p>
                          {(() => {
                            const usdValue = calculateBidderUSDValue(bidder.bidAmount);
                            return usdValue !== null && (
                              <p className="text-green-400 text-[10px]">
                                ${usdValue.toFixed(0)}
                              </p>
                            );
                          })()}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

      
          </div>
        </div>

        {/* Click outside to close share dropdown */}
        {shareDropdownOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShareDropdownOpen(false)}
          />
        )}

        {/* Responsive Bid Modal */}
        {!isDesktop ? (
          <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <DrawerContent className="drawer-content">
              <DrawerHeader>
                <DrawerTitle className="my-4 text-xl">Place Your Bid</DrawerTitle>
                <div className="text-left text-md">
                  {auctionData && (
                    <ul>
                      <li className="border-b border-b-white/10 py-2 flex ">
                        <span className="text-left w-1/2">Bidding on:</span>
                        <strong className="text-primary text-right w-1/2">
                          {auctionData.auctionName}
                        </strong>
                      </li>
                      <li className="border-b border-b-white/10 py-2 flex ">
                        <span className="text-left w-1/2">Currency:</span>
                        <strong className="text-primary text-right w-1/2">
                          {auctionData.currency}
                        </strong>
                      </li>
                      {parseFloat(auctionData.highestBid) > 0 ? (
                        <li className="border-b border-b-white/10 py-2 flex ">
                          <span className="text-left w-1/2">
                            Current highest bid:
                          </span>
                          <strong className="text-primary text-right w-1/2">
                            {formatBidAmount(
                              auctionData.highestBid,
                              auctionData.currency
                            )}{" "}
                            {auctionData.currency}
                          </strong>
                        </li>
                      ) : (
                        <li className="border-b border-b-white/10 py-2 flex ">
                          <span className="text-left w-1/2">Minimum bid:</span>
                          <strong className="text-primary text-right w-1/2">
                            {auctionData.minimumBid} {auctionData.currency}
                          </strong>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </DrawerHeader>

              {!address ? (
                <div className="px-4 pb-4">
                  <div className="text-center mb-4">
                    <p className="text-caption mb-4">
                      Please connect your wallet to place a bid
                    </p>
                    <AggregateConnector />
                  </div>
                </div>
              ) : (
                <>
                  <div className="px-4 pb-2">
                    <Input
                      label="Bid Amount"
                      value={bidAmount}
                      onChange={(value) => {
                        setBidAmount(value);
                        if (bidError) setBidError(""); // Clear error when user types
                      }}
                      placeholder={
                        auctionData
                          ? `Enter amount in ${auctionData.currency}`
                          : "Enter bid amount"
                      }
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
                            1 {auctionData?.currency} ={" "}
                            {formatUSDAmount(tokenPrice)}
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
                      disabled={isPlacingBid || !bidAmount}
                      className="w-full h-12 text-lg font-bold"
                    >
                      {isPlacingBid ? (
                        <>
                          <RiLoader5Fill className="text-2xl mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Confirm Bid"
                      )}
                    </Button>
                  </DrawerFooter>
                </>
              )}
            </DrawerContent>
          </Drawer>
        ) : (
          <Dialog open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-xl">Place Your Bid</DialogTitle>
                <div className="text-left text-sm mt-4">
                  {auctionData && (
                    <ul className="space-y-2">
                      <li className="border-b border-b-white/10 py-2 flex justify-between">
                        <span className="text-caption">Bidding on:</span>
                        <strong className="text-primary">
                          {auctionData.auctionName}
                        </strong>
                      </li>
                      <li className="border-b border-b-white/10 py-2 flex justify-between">
                        <span className="text-caption">Currency:</span>
                        <strong className="text-primary">
                          {auctionData.currency}
                        </strong>
                      </li>
                      {parseFloat(auctionData.highestBid) > 0 ? (
                        <li className="border-b border-b-white/10 py-2 flex justify-between">
                          <span className="text-caption">
                            Current highest bid:
                          </span>
                          <strong className="text-primary">
                            {formatBidAmount(
                              auctionData.highestBid,
                              auctionData.currency
                            )}{" "}
                            {auctionData.currency}
                          </strong>
                        </li>
                      ) : (
                        <li className="border-b border-b-white/10 py-2 flex justify-between">
                          <span className="text-caption">Minimum bid:</span>
                          <strong className="text-primary">
                            {auctionData.minimumBid} {auctionData.currency}
                          </strong>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </DialogHeader>

              {!address ? (
                <div className="py-4">
                  <div className="text-center mb-4">
                    <p className="text-caption mb-4">
                      Please connect your wallet to place a bid
                    </p>
                    <AggregateConnector />
                  </div>
                </div>
              ) : (
                <>
                  <div className="py-4">
                    <Input
                      label="Bid Amount"
                      value={bidAmount}
                      onChange={(value) => {
                        setBidAmount(value);
                        if (bidError) setBidError(""); // Clear error when user types
                      }}
                      placeholder={
                        auctionData
                          ? `Enter amount in ${auctionData.currency}`
                          : "Enter bid amount"
                      }
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
                            1 {auctionData?.currency} ={" "}
                            {formatUSDAmount(tokenPrice)}
                          </div>
                        )}
                      </div>
                    )}

                    {bidError && (
                      <p className="text-red-500 text-sm mt-1">{bidError}</p>
                    )}
                  </div>

                  <DialogFooter>
                    <Button
                      onClick={handleConfirmBid}
                      disabled={isPlacingBid || !bidAmount}
                      className="w-full h-12 text-lg font-bold"
                    >
                      {isPlacingBid ? (
                        <>
                          <RiLoader5Fill className="text-2xl mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Confirm Bid"
                      )}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}