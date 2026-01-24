"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./UI/Dialog";
import { useNavigateWithLoader } from "@/utils/useNavigateWithLoader";
import RatingCircle from "./UI/RatingCircle";
import toast from "react-hot-toast";
import { useAccount, useSendCalls, useReadContract } from "wagmi";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { RiLoader5Fill } from "react-icons/ri";
import { IoShareOutline, IoLinkOutline, IoCopyOutline } from "react-icons/io5";
import {
  auctionAbi,
  contractAdds,
  erc20Abi,
  readContractSetup,
  writeNewContractSetup,
} from "@repo/contracts";
import { encodeFunctionData, numberToHex } from "viem";
import { base as baseChain } from "viem/chains";
import { useGlobalContext } from "@/utils/providers/globalContext";
import {
  base,
  createBaseAccountSDK,
  getCryptoKeyAccount,
} from "@base-org/account";
import {
  fetchTokenPrice,
  calculateUSDValue,
  formatUSDAmount,
} from "@/utils/tokenPrice";
import Image from "next/image";
import { checkStatus } from "@/utils/checkStatus";
import { ethers } from "ethers";
import { checkUsdc } from "@/utils/checkUsdc";
import sdk from "@farcaster/miniapp-sdk";
import { FaShare } from "react-icons/fa";
import LoginWithOAuth from "./utils/twitterConnect";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import AggregateConnector from "./utils/aggregateConnector";
import ScrollingName from "./utils/ScrollingName";
import { Users } from "lucide-react";
import AuctionCard from "./AuctionCard";
import LeaderboardSidebar from "./LeaderboardSidebar";

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
    username: string; // Enhanced with Neynar display_name
    fid: string;
    socialId: string;
    pfp_url: string | null; // Profile picture from Neynar
    bidAmount: number;
    bidTimestamp: Date;
    _id: string
  } | null;
  participantCount: number;
  hoursRemaining: number;
  bidCount: number;
}

interface ApiResponse {
  success: boolean;
  auctions: Auction[];
  total: number;
  page: number;
  hasMore: boolean;
  error?: string;
  message?: string;
}

const LandingAuctions: React.FC = () => {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingToastId, setLoadingToastId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentBid, setCurrentBid] = useState<{
    auctionId: string;
    amount: number;
  } | null>(null);
  const [shareDropdownOpen, setShareDropdownOpen] = useState<string | null>(
    null
  );
  const [currencyFilter, setCurrencyFilter] = useState<
    "all" | "usdc" | "creator-coins"
  >("all");

  // Recent Activity Ticker State
  const [recentBids, setRecentBids] = useState<{
    bidderName: string;
    auctionName: string;
    bidAmount: number;
    currency: string;
    bidTimestamp: string;
  }[]>([]);

  // Intersection Observer ref
  const observerRef = useRef<HTMLDivElement>(null);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [bidError, setBidError] = useState("");
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    setIsDesktop(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Token price state
  const [tokenPrice, setTokenPrice] = useState<number | null>(null);
  const [tokenPriceLoading, setTokenPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const { sendCalls, isSuccess, status } = useSendCalls();
  const [storedAuction, setStoredAuction] = useState<Auction | null>(null);
  const [storedBidAmountInWei, setStoredBidAmountInWei] = useState<bigint>(BigInt(0));

  const { context } = useMiniKit();

  const { wallets } = useWallets();
  const externalWallets = wallets.filter(
    (wallet) => wallet.walletClientType !== "privy"
  );

  const address =
    externalWallets.length > 0 ? externalWallets[0].address : null;

  const { user } = useGlobalContext();
  const { getAccessToken, user: privyUser } = usePrivy();

  const fetchTopAuctions = async (
    pageNum: number = 1,
    append: boolean = false
  ) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const response = await fetch(
        `/api/auctions/getTopFive?page=${pageNum}&limit=3&currency=${currencyFilter}`
      );
      const data: ApiResponse = await response.json();

      console.log("Fetched auctions data:", data);

      if (data.success) {
        if (append) {
          setAuctions((prev) => {
            // Filter out duplicates by creating a Set of existing IDs
            const existingIds = new Set(prev.map(a => a._id));
            const newAuctions = data.auctions.filter(a => !existingIds.has(a._id));
            return [...prev, ...newAuctions];
          });
        } else {
          setAuctions(data.auctions);
        }
        setHasMore(data.hasMore);
        setPage(data.page);
      } else {
        setError(data.message || data.error || "Failed to fetch auctions");
      }
    } catch (err) {
      setError("Network error: Unable to fetch auctions");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreAuctions = useCallback(() => {
    console.log("loadMoreAuctions called:", { loadingMore, hasMore, page });
    if (!loadingMore && hasMore) {
      console.log("Fetching page:", page + 1);
      fetchTopAuctions(page + 1, true);
    }
  }, [page, hasMore, loadingMore]);

  useEffect(() => {
    // Fetch auctions for all users (both authenticated and unauthenticated)
    fetchTopAuctions(1, false);
  }, [currencyFilter]);

  // Fetch recent activity for ticker
  useEffect(() => {
    const fetchRecentActivity = async () => {
      try {
        const res = await fetch('/api/leaderboard/recent-bids');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setRecentBids(data.data.slice(0, 10));
          }
        }
      } catch (err) {
        console.error('Error fetching recent bids:', err);
      }
    };

    fetchRecentActivity();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchRecentActivity, 30000);
    return () => clearInterval(interval);
  }, []);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        console.log(
          "Observer triggered:",
          entries[0].isIntersecting,
          "hasMore:",
          hasMore,
          "loadingMore:",
          loadingMore
        );
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          console.log("Loading more auctions via observer");
          loadMoreAuctions();
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [loadMoreAuctions, hasMore, loadingMore]);

  const navigate = useNavigateWithLoader();

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

      // Refresh the auctions to show updated bid data
      await fetchTopAuctions(1, false);

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
      if (!address) {
        toast.error("Please connect your wallet");
        setIsLoading(false);
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
      const balanceResult = await contract?.balanceOf(address as `0x${string}`);

      const formattedBalance = parseFloat(
        ethers.formatUnits(
          balanceResult,
          checkUsdc(auction.tokenAddress) ? 6 : 18
        )
      );

      console.log("User token balance:", formattedBalance);

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

        console.log("Using external wallet provider for transaction...", user);

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

        console.log("Calls request prepared:", callsRequest);

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
          console.log("wallet_sendCalls failed, attempting fallback transaction...");
          await handleFallbackTransaction(
            auctionId,
            bidAmount,
            bidAmountInWei,
            auction,
            toastId
          );
        }
      } else {
        console.log("Using OnChainKit context for transaction..., bidAmount:");
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
            capabilities: {
              gasLimitOverride: {
                value: "0x7a1200", // 8,000,000 in hex
              },
            },
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
                user.socialId,
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
      setBidError(
        `Bid must be at least ${selectedAuction.minimumBid} ${selectedAuction.currency}`
      );
      return false;
    }

    if (amount <= selectedAuction.highestBid) {
      setBidError(
        `Bid must be higher than current highest bid of ${selectedAuction.highestBid} ${selectedAuction.currency}`
      );
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
        console.error("Error fetching token price:", error);
        setPriceError("Unable to fetch price");
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

    return calculateUSDValue(amount, tokenPrice);
  };

  const handleConfirmBid = () => {
    //check if address exists
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }
    if (!selectedAuction || !validateBidAmount()) return;

    const amount = parseFloat(bidAmount);
    // Don't close drawer here - let it close after processSuccess completes
    handleBid(selectedAuction.blockchainAuctionId, selectedAuction, amount);
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast.success(`${type} copied to clipboard!`);
        setShareDropdownOpen(null);
      })
      .catch(() => {
        toast.error("Failed to copy to clipboard");
      });
  };

  const handleShareClick = (auctionId: string) => {
    setShareDropdownOpen(shareDropdownOpen === auctionId ? null : auctionId);
  };

  const composeCast = async (auction: Auction) => {
    try {
      const url = `https://farcaster.xyz/miniapps/0d5aS3cWVprk/house/bid/${auction.blockchainAuctionId}`;
      const hostName =
        auction.hostedBy.display_name ||
        (auction.hostedBy.username
          ? `@${auction.hostedBy.username}`
          : "Unknown Host");
      const text = `Check out "${auction.auctionName}" hosted by ${hostName}! Bidding in ${auction.currency}. ${url}`;

      await sdk.actions.composeCast({
        text,
        embeds: [
          `https://farcaster.xyz/miniapps/0d5aS3cWVprk/house/bid/${auction.blockchainAuctionId}`,
        ],
      });
    } catch (e) {
      console.error("Error composing cast:", e);
      toast.error("Failed to compose cast");
    }
  };

  // Function to render description with clickable links
  const renderDescription = (description: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = description.split(urlRegex);
    
    return (
      <p className="text-caption text-sm mb-3 line-clamp-2 min-h-6">
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

  const SkeletonCard = () => (
    <div className="bg-black/40 w-full max-w-full text-white border border-secondary/10 rounded-2xl transition-all overflow-hidden flex flex-col animate-pulse col-span-1">
      {/* Image skeleton */}
      <div className="relative w-full h-64 bg-secondary/20"></div>

      {/* Content skeleton */}
      <div className="p-6 flex flex-col grow">
        {/* Title */}
        <div className="h-8 bg-secondary/20 rounded w-3/4 mb-2"></div>
        
        {/* Description with min-h-6 to match actual card */}
        <div className="mb-3 min-h-6">
          <div className="h-4 bg-secondary/20 rounded w-full"></div>
        </div>

        {/* Host info */}
        <div className="flex items-center gap-2 mb-4">
          <div className="h-3 bg-secondary/20 rounded w-6"></div>
          <div className="w-5 h-5 bg-secondary/20 rounded-full"></div>
          <div className="h-3 bg-secondary/20 rounded w-24"></div>
        </div>

        {/* Bottom section */}
        <div className="border-t border-secondary/10 pt-4 mt-auto space-y-3 flex justify-between items-center">
          <div className="flex flex-col justify-center items-start">
            <div className="h-4 bg-secondary/20 rounded w-20 mb-1"></div>
            <div className="h-6 bg-secondary/20 rounded w-28 mb-1"></div>
            <div className="h-3 bg-secondary/20 rounded w-16"></div>
          </div>
          <div className="flex items-center justify-between bg-secondary/20 rounded-full border border-secondary/30 px-2 py-1 w-16">
            <div className="w-4 h-4 bg-secondary/20 rounded-full"></div>
            <div className="h-4 bg-secondary/20 rounded w-6"></div>
          </div>
        </div>
      </div>
    </div>
  );

  // Currency Filter Component (reusable)
  const CurrencyFilterButtons = () => (
    <div className="flex gap-1 justify-end mb-6 overflow-x-hidden">
      <button
        onClick={() => setCurrencyFilter("all")}
        className={`px-3 py-2 font-medium text-white text-sm transition-colors duration-200 capitalize rounded-lg whitespace-nowrap shrink-0 border-white/10 ${
          currencyFilter === "all"
            ? "selected-gradient"
            : "bg-white/5 border "
        }`}
      >
        All
      </button>
      <button
        onClick={() => setCurrencyFilter("usdc")}
        className={`px-3 py-2 font-medium text-white text-sm transition-colors duration-200 capitalize rounded-lg whitespace-nowrap shrink-0 border-white/10 ${
          currencyFilter === "usdc"
            ? "selected-gradient"
            : "bg-white/5 border "
        }`}
      >
        USDC
      </button>
      <button
        onClick={() => setCurrencyFilter("creator-coins")}
        className={`px-3 py-2 font-medium text-white text-sm transition-colors duration-200 capitalize rounded-lg whitespace-nowrap shrink-0 border-white/10 ${
          currencyFilter === "creator-coins"
            ? "selected-gradient"
            : "bg-white/5 border "
        }`}
      >
        Creator Coins
      </button>
    </div>
  );

  return (
    <div className="w-full lg:mt-10 mt-8 pb-24 ">
      {/* Main Content */}
      <div className="w-full max-lg:mx-auto lg:w-[1000px]">
        {/* Recent Activity Ticker - Mobile Only */}
        <div className="lg:hidden mb-4 overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20 rounded-lg py-2">
          <div className="flex animate-scroll whitespace-nowrap">
            {recentBids.length > 0 ? (
              <>
                {[...recentBids, ...recentBids, ...recentBids].map((bid, index) => (
                  <div key={index} className="inline-flex items-center mx-4 text-sm">
                    <span className="text-caption">{bid.bidderName}</span>
                    
                    <span className="mx-2 text-caption">•</span>
                    <span className="text-white font-medium">{bid.auctionName}</span>
                    <span className="mx-2 text-green-500">→</span>
                    <span className="text-primary font-semibold">
                      {bid.bidAmount.toLocaleString()} {bid.currency}
                    </span>
                  </div>
                ))}
              </>
            ) : (
              <div className="inline-flex items-center mx-4 text-sm text-caption">
                <span>Loading recent activity...</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex max-lg:flex-col lg:items-center justify-between lg:mb-4 max-lg:gap-4">
          <h2 className="text-2xl font-bold gradient-text">Latest Auctions</h2>
          {/* Currency Filter */}
        <CurrencyFilterButtons />
        </div>

        

      <div className="w-full">
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <div className="bg-white/10 rounded-lg shadow-md border border-gray-700 p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-red-900 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-400"
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
              <h3 className="text-lg font-semibold mb-2">
                Unable to Load Auctions
              </h3>
              <p className="text-caption mb-4">{error}</p>
              <Button
                onClick={() => fetchTopAuctions(1, false)}
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      ) : auctions.length === 0 ? (
        <div className="bg-white/10 rounded-lg shadow-md border border-primary/10 p-8 text-center">
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
              <h3 className="text-lg font-semibold mb-2">
                {currencyFilter === "all"
                  ? "No Active Auctions"
                  : "No auctions found"}
              </h3>
              <p className="text-caption mb-4">
                {currencyFilter === "all"
                  ? "There are currently no active auctions available."
                  : "No auctions match the selected filter. Try selecting a different filter."}
              </p>
              {currencyFilter === "all" && (
                <p className="text-sm text-caption">
                  Check back later or create your own auction to get started!
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {auctions.map((auction, index) => (
          <AuctionCard
            key={auction._id}
            auction={auction}
            onNavigate={navigate}
            renderDescription={renderDescription}
            onBidClick={openBidDrawer}
          />
        ))}

        {/* Skeleton cards for loading more */}
        {loadingMore && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {/* Observer element for intersection observer */}
        {hasMore && !loadingMore && auctions.length > 0 && (
          <div ref={observerRef} className="w-full h-10" />
        )}

        {/* Debug info and manual load more */}
        {/* {process.env.NEXT_PUBLIC_ENV === "DEV" && (
          <div className="mt-4 p-4 bg-gray-800 rounded">
            <p>
              Debug: hasMore={String(hasMore)}, loadingMore={String(loadingMore)},
              page={page}, auctionsCount={auctions.length}, filter=
              {currencyFilter}
            </p>
            {hasMore && (
              <Button
                onClick={loadMoreAuctions}
                disabled={loadingMore}
                className="mt-2"
              >
                {loadingMore ? "Loading..." : "Load More (Manual)"}
              </Button>
            )}
          </div>
        )} */}

        {/* Click outside to close share dropdown */}
        {shareDropdownOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShareDropdownOpen(null)}
          />
        )}
      </div>
      )}
      </div>
      </div>
      
        {/* Responsive Bid Modal */}
        {!isDesktop ? (
          <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerContent className="drawer-content max-h-[85vh] h-auto flex flex-col">
            <DrawerHeader className="shrink-0">
            <DrawerTitle className="my-4 text-xl">Place Your Bid</DrawerTitle>
            <div className="text-left text-md">
              {selectedAuction && (
                <ul>
                  <li className="border-b border-b-white/10 py-2 flex ">
                    <span className="text-left w-1/2">Bidding on:</span>{" "}
                    <strong className="text-primary text-right w-1/2">
                      {selectedAuction.auctionName}
                    </strong>
                  </li>
                  <li className="border-b border-b-white/10 py-2 flex ">
                    <span className="text-left w-1/2">Minimum bid: </span>
                    <strong className="text-primary text-right w-1/2">
                      {formatBidAmount(
                        selectedAuction.minimumBid,
                        selectedAuction.currency
                      )}
                    </strong>
                  </li>

                  {selectedAuction.highestBid > 0 && (
                    <li className="border-b border-b-white/10 py-2 flex ">
                      <span className="text-left w-1/2">
                        Current highest bid:
                      </span>{" "}
                      <strong className="text-primary text-right w-1/2">
                        {formatBidAmount(
                          selectedAuction.highestBid,
                          selectedAuction.currency
                        )}
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
              <div className="px-4 pb-2 flex-1 overflow-hidden">
                <Input
                  label="Bid Amount"
                  value={bidAmount}
                  onChange={(value) => {
                    setBidAmount(value);
                    if (bidError) setBidError(""); // Clear error when user types
                  }}
                  placeholder={
                    selectedAuction
                      ? `Enter amount in ${selectedAuction.currency}`
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
                        1 {selectedAuction?.currency} ={" "}
                        {formatUSDAmount(tokenPrice)}
                      </div>
                    )}
                  </div>
                )}

                {bidError && (
                  <p className="text-red-500 text-sm mt-1">{bidError}</p>
                )}
              </div>

              <DrawerFooter className="shrink-0">
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
                  {selectedAuction && (
                    <ul className="space-y-2">
                      <li className="border-b border-b-white/10 py-2 flex justify-between">
                        <span className="text-caption">Bidding on:</span>
                        <strong className="text-primary">
                          {selectedAuction.auctionName}
                        </strong>
                      </li>
                      <li className="border-b border-b-white/10 py-2 flex justify-between">
                        <span className="text-caption">Minimum bid:</span>
                        <strong className="text-primary">
                          {formatBidAmount(
                            selectedAuction.minimumBid,
                            selectedAuction.currency
                          )}
                        </strong>
                      </li>

                      {selectedAuction.highestBid > 0 && (
                        <li className="border-b border-b-white/10 py-2 flex justify-between">
                          <span className="text-caption">
                            Current highest bid:
                          </span>
                          <strong className="text-primary">
                            {formatBidAmount(
                              selectedAuction.highestBid,
                              selectedAuction.currency
                            )}
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
                        selectedAuction
                          ? `Enter amount in ${selectedAuction.currency}`
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
                            1 {selectedAuction?.currency} ={" "}
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
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        )}
    </div>
  );
};

export default LandingAuctions;