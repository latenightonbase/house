"use client";

import { useEffect, useState } from "react";
import { writeContract } from "@wagmi/core";
import { useAccount, useSendCalls } from "wagmi";
import {
  auctionAbi,
  contractAdds,
  erc20Abi,
  readContractSetup,
  writeNewContractSetup,
} from "@repo/contracts";
import Input from "./UI/Input";
import CurrencySearch from "./UI/CurrencySearch";
import DateTimePicker from "./UI/DateTimePicker";
import { useNavigateWithLoader } from "@/utils/useNavigateWithLoader";
import { useSearchParams } from "next/navigation";
import ImageUpload from "./ImageUpload";
// import { WalletConnect } from "./Web3/walletConnect";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { encodeFunctionData, numberToHex } from "viem";
import {
  base,
  createBaseAccountSDK,
  getCryptoKeyAccount,
} from "@base-org/account";
import { RiLoader5Fill } from "react-icons/ri";
import toast from "react-hot-toast";
import {
  fetchTokenPrice,
  calculateUSDValue,
  formatUSDAmount,
} from "@/utils/tokenPrice";
import { motion, AnimatePresence } from "framer-motion";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { checkStatus } from "@/utils/checkStatus";
import { useGlobalContext } from "@/utils/providers/globalContext";
import TwitterAuthModal from "./UI/TwitterAuthModal";
import LoginWithOAuth from "./utils/twitterConnect";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import AggregateConnector from "./utils/aggregateConnector";
import { base as baseChain } from "viem/chains";
import { ethers } from "ethers";
import { Drawer, DrawerContent } from "./UI/Drawer";
import sdk from "@farcaster/frame-sdk";
import { checkTokenAmount } from "@/utils/checkTokenAmount";

interface CurrencyOption {
  name: string;
  contractAddress: string;
  symbol: string;
}

type CurrencySelectionMode = "search" | "contract";

export default function CreateAuction() {
  // const { address, isConnected } = useAccount();
  const { wallets } = useWallets();
  const externalWallets = wallets.filter(
    (wallet) => wallet.walletClientType !== "privy"
  );

  const { user } = useGlobalContext();
  const address =
    externalWallets.length > 0 ? externalWallets[0].address : null;
  const { getAccessToken } = usePrivy();
  const [auctionTitle, setAuctionTitle] = useState("");
  const [description, setDescription] = useState("");
  // const [currencyMode, setCurrencyMode] = useState<CurrencySelectionMode>('search')
  const [selectedCurrency, setSelectedCurrency] =
    useState<CurrencyOption | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [minBidAmount, setMinBidAmount] = useState("5"); // Made the minimum bid amount optional and default to 0
  const [isLoading, setIsLoading] = useState(false);
  const [genAuctionId, setGenAuctionId] = useState("");
  const [loadingToastId, setLoadingToastId] = useState<string | null>(null);
  const { sendCalls, isSuccess, status } = useSendCalls();
  const [showTwitterModal, setShowTwitterModal] = useState(false);
  const [storedDurationHours, setStoredDurationHours] = useState<number>(0);
  const [storedMinBidAmountWei, setStoredMinBidAmountWei] = useState<bigint>(BigInt(0));

  const [currentStep, setCurrentStep] = useState(0);
  const [tokenPrice, setTokenPrice] = useState<number | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [isSuccessDrawerOpen, setIsSuccessDrawerOpen] = useState(false);
  const [createdAuctionData, setCreatedAuctionData] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);

  const { context } = useMiniKit();

  const [myCallId, setMyCallId] = useState<string | null>(null);

  const navigate = useNavigateWithLoader();
  const searchParams = useSearchParams();

  // Prefill form from URL params (from bot)
  useEffect(() => {
    const prefill = searchParams.get("prefill");
    if (prefill === "true") {
      const name = searchParams.get("name");
      const token = searchParams.get("token");
      const minBid = searchParams.get("minBid");
      const duration = searchParams.get("duration");

      if (name) {
        setAuctionTitle(name);
      }

      if (minBid) {
        setMinBidAmount(minBid);
      }

      if (token) {
        // Known tokens mapping
        const knownTokens: Record<string, { name: string; symbol: string }> = {
          "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": { name: "USD Coin", symbol: "USDC" },
          "0x4200000000000000000000000000000000000006": { name: "Wrapped Ether", symbol: "WETH" },
        };

        const tokenInfo = knownTokens[token.toLowerCase()];
        if (tokenInfo) {
          setSelectedCurrency({
            name: tokenInfo.name,
            symbol: tokenInfo.symbol,
            contractAddress: token,
          });
        } else {
          // For unknown tokens, set with address as name
          setSelectedCurrency({
            name: `Token (${token.slice(0, 6)}...${token.slice(-4)})`,
            symbol: "TOKEN",
            contractAddress: token,
          });
        }
      }

      if (duration) {
        const durationHours = parseInt(duration);
        if (!isNaN(durationHours) && durationHours > 0) {
          const endDate = new Date();
          endDate.setHours(endDate.getHours() + durationHours);
          setEndTime(endDate);
        }
      }
    }
  }, [searchParams]);

  async function composeCast() {
    try {
      if (!createdAuctionData) return;
      const url = `https://farcaster.xyz/miniapps/0d5aS3cWVprk/house/bid/${createdAuctionData.id}`;
      const text = `I just created "${createdAuctionData.title}" on House! Check it out and place your bid! ${url}`;

      await sdk.actions.composeCast({
        text,
        embeds: [
          `https://farcaster.xyz/miniapps/0d5aS3cWVprk/house/bid/${createdAuctionData.id}`,
        ],
      });
    } catch (e) {
      console.error("Error composing cast:", e);
      toast.error("Failed to compose cast");
    }
  }

  const handleFallbackTransaction = async (
    auctionId: string,
    durationHours: number,
    minBidAmountWei: bigint,
    toastId: string
  ) => {
    if (!selectedCurrency || !address || externalWallets.length === 0) {
      toast.error("Wallet not connected", { id: toastId });
      setIsLoading(false);
      return;
    }

    try {
      console.log("Initiating fallback transaction with external wallet...");

      await externalWallets[0].switchChain(baseChain.id);

      const contract = await writeNewContractSetup(
        contractAdds.auctions,
        auctionAbi,
        externalWallets[0]
      );

      toast.loading("Confirming...", { id: toastId });

      // Call the smart contract
      const txHash = await contract?.startAuction(
        auctionId,
        selectedCurrency.contractAddress as `0x${string}`,
        auctionTitle,
        BigInt(Math.round(durationHours)),
        minBidAmountWei
      );

      await txHash?.wait();

      if (!txHash) {
        toast.error("Failed to submit transaction", { id: toastId });
        setIsLoading(false);
        return;
      }

      toast.success("Transaction confirmed!", { id: toastId });
      await processSuccess(auctionId);
    } catch (error) {
      console.error("Fallback transaction failed:", error);
      toast.error("Transaction failed", { id: toastId });
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // When transaction succeeds
    if (status == "success") {
      if (loadingToastId) {
        toast.success("Success!", {
          id: loadingToastId,
        });
      }
      processSuccess(genAuctionId);
    }
    // When transaction fails (status === 'error') - fallback to external wallet
    else if (status === "error" && genAuctionId && loadingToastId && storedDurationHours > 0) {
      console.log("sendCalls failed, attempting fallback transaction...");
      handleFallbackTransaction(
        genAuctionId,
        storedDurationHours,
        storedMinBidAmountWei,
        loadingToastId
      );
    }
  }, [isSuccess, status]);

  useEffect(() => {
    if (selectedCurrency?.contractAddress) {
      setLoadingPrice(true);
      fetchTokenPrice(selectedCurrency.contractAddress)
        .then((price) => setTokenPrice(price))
        .catch((err) => {
          console.error("Failed to fetch token price:", err);
          setTokenPrice(null);
        })
        .finally(() => setLoadingPrice(false));
    }
  }, [selectedCurrency]);

  const processSuccess = async (auctionId: string) => {
    const saveToastId = toast.loading("Saving...");

    try {
      const now = new Date();
      const accessToken = await getAccessToken();
      console.log("Access Token:", accessToken);

      // Create FormData to handle file upload
      const formData = new FormData();
      formData.append("auctionName", auctionTitle);
      if (description) formData.append("description", description);
      formData.append("blockchainAuctionId", auctionId);
      formData.append("tokenAddress", selectedCurrency?.contractAddress || "");
      formData.append("endDate", endTime?.toISOString() || "");
      formData.append("currency", selectedCurrency?.symbol || "");
      formData.append("startDate", now.toISOString());
      formData.append("hostedBy", user.socialId);
      formData.append("startingWallet", address || "");
      formData.append("minimumBid", minBidAmount);
      
      // Add image file if selected
      if (selectedImageFile) {
        formData.append("image", selectedImageFile);
      }

      const response = await fetch("/api/protected/auctions/create", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        console.error("API Error Response:", errorData);
        throw new Error(errorData.error || "Failed to save auction details");
      }

      toast.success("Created!", {
        id: saveToastId,
      });

      setIsLoading(false);
      
      // Store created auction data for sharing
      setCreatedAuctionData({
        id: auctionId,
        title: auctionTitle,
      });
      
      // Reset form
      setAuctionTitle("");
      setDescription("");
      setSelectedCurrency(null);
      setEndTime(null);
      setMinBidAmount("5");
      setCurrentStep(0);
      setSelectedImageFile(null);
      
      // Open success drawer
      setIsSuccessDrawerOpen(true);
    } catch (error: any) {
      console.error("Error saving auction details:", error);

      let errorMessage = "Failed to save";

      // Handle specific error types
      if (error.code === "ECONNREFUSED") {
        errorMessage = "Server offline";
      } else if (
        error.name === "TypeError" &&
        error.message.includes("fetch")
      ) {
        errorMessage = "Network error";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage, { id: saveToastId });
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to calculate duration in hours
  const calculateDurationHours = (endDate: Date): number => {
    const now = new Date();
    const diffMs = endDate.getTime() - now.getTime();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60)); // Round up to ensure auction doesn't end early
    return Math.max(1, diffHours); // Minimum 1 hour
  };

  // Function to get token decimals from ERC20 contract
  const getTokenDecimals = async (tokenAddress: string): Promise<number> => {
    try {
      // Use contract setup for reading decimals with timeout
      const timeoutPromise = new Promise<number>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout fetching decimals")), 5000)
      );

      const fetchPromise = (async () => {
        const contract = await readContractSetup(tokenAddress, erc20Abi);
        if (!contract) {
          throw new Error("Contract setup failed");
        }
        const decimalsResult = await contract.decimals();
        return Number(decimalsResult) || 18;
      })();

      return await Promise.race([fetchPromise, timeoutPromise]);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    //check if address exists
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }
    setIsLoading(true);


    // Check whitelist from database
    try {
      const accessToken = await getAccessToken();
      const whitelistResponse = await fetch(`/api/users/${address}/checkWhitelist`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const whitelistData = await whitelistResponse.json();
      
      console.log("Whitelist data:", whitelistData);

      if (!whitelistData.whitelisted) {
        toast.error(`Must hold ${whitelistData.short.toLocaleString()} more $AUCTION tokens to create an auction`);
        setIsLoading(false);
        return;
      }

    } catch (error) {
      console.error("Error checking whitelist:", error);
      toast.error("Failed to verify whitelist status");
      setIsLoading(false);
      return;
    }

    // Validation
    if (!auctionTitle || !selectedCurrency || !endTime) {
      toast.error("Please fill in all required fields with valid values");
      setIsLoading(false);
      return;
    }

    if (auctionTitle.length > 30) {
      toast.error("Auction title cannot exceed 30 characters");
      setIsLoading(false);
      return;
    }

    if (!address) {
      toast.error("Please connect your wallet to create an auction");
      setIsLoading(false);
      return;
    }

    // Ensure auction ends in the future
    const now = new Date();
    if (endTime <= now) {
      toast.error("Auction end time must be in the future");
      setIsLoading(false);
      return;
    }

    // Start loading toast
    const toastId = toast.loading("Creating...");
    setLoadingToastId(toastId);

    try {
      const durationHours = calculateDurationHours(endTime);

      // Get token decimals for proper conversion
      let tokenDecimals = 18; // Default to 18
      let minBidAmountWei: bigint;

      try {
        tokenDecimals = await getTokenDecimals(
          selectedCurrency.contractAddress
        );
        console.log(
          `Token decimals for ${selectedCurrency.contractAddress}:`,
          tokenDecimals
        );

        // Convert minimum bid amount to proper decimal format
        const minBidFloat = parseFloat(minBidAmount || "0");
        minBidAmountWei = convertBidAmountToWei(minBidFloat, tokenDecimals);
        console.log(
          `Minimum bid ${minBidFloat} converted to ${minBidAmountWei} with ${tokenDecimals} decimals`
        );
      } catch (error) {
        console.error(
          "Error fetching token decimals, using default 18:",
          error
        );
        // Fallback to 18 decimals if fetching fails
        const minBidFloat = parseFloat(minBidAmount || "0");
        minBidAmountWei = convertBidAmountToWei(minBidFloat, 18);
        console.log(
          `Using default 18 decimals. Minimum bid ${minBidFloat} converted to ${minBidAmountWei}`
        );
      }

      const auctionId = String(Date.now());

      const startAuctionArgs: [string, `0x${string}`, string, bigint, bigint] =
        [
          auctionId,
          selectedCurrency.contractAddress as `0x${string}`,
          selectedCurrency.symbol,
          BigInt(durationHours),
          minBidAmountWei,
        ];

      const encodedStartAuctionData = encodeFunctionData({
        abi: auctionAbi,
        functionName: "startAuction",
        args: startAuctionArgs,
      });

      // PC/Browser Wallet flow
      if (!context) {
        toast.loading("Preparing...", { id: toastId });
        const wallet = externalWallets[0];
        
        // wallet.walletClientType ==="embedded"  ;
        await wallet.switchChain(baseChain.id); // Base Mainnet chain ID
        const provider = await wallet.getEthereumProvider();

        const callsRequest = {
          version: "1.0",
          chainId: numberToHex(baseChain.id),
          atomicRequired: true,
          from: wallet.address,
          calls: [
            {
              to: contractAdds.auctions as `0x${string}`,
              data: encodedStartAuctionData,
              value: "0x0",
              capabilities: {
                gasLimitOverride: "0x7A120", // 500,000 in hex
              },
            },
          ],
        };

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

          await processSuccess(auctionId);
        } catch (e) {
          console.log("wallet_sendCalls failed, falling back to direct contract call:", e);
          await handleFallbackTransaction(auctionId, durationHours, minBidAmountWei, toastId);
        }
      }
      // Farcaster/Base App Flow
      else {

        toast.loading("Preparing...", {
          id: toastId,
        });

        setGenAuctionId(auctionId);
        setStoredDurationHours(durationHours);
        setStoredMinBidAmountWei(minBidAmountWei);
        const calls = [
          {
            to: contractAdds.auctions,
            value: context?.client.clientFid === 309857 ? "0x0" : BigInt(0),
            data: encodedStartAuctionData,
          },
        ];
        try{
if (context?.client.clientFid === 309857) {
          toast.loading("Connecting...", { id: toastId });

          const provider = createBaseAccountSDK({
            appName: "Bill test app",
            appLogoUrl: "https://www.houseproto.fun/pfp.jpg",
            appChainIds: [base.constants.CHAIN_IDS.base],
          }).getProvider();

          const cryptoAccount = await getCryptoKeyAccount();
          const fromAddress = cryptoAccount?.account?.address;

          toast.loading("Submitting...", { id: toastId });

          const callsId: any = await provider.request({
            method: "wallet_sendCalls",
            params: [
              {
                version: "1.0",
                chainId: numberToHex(base.constants.CHAIN_IDS.base),
                atomicRequired: true,
                from: fromAddress,
                calls: calls,
              },
            ],
          });

          toast.loading("Transaction submitted, checking status...", {
            id: toastId,
          });

          const result = await checkStatus(callsId);

          if (result == true) {
            await processSuccess(auctionId);
          } else {
            toast.error("Failed", { id: toastId });
            setIsLoading(false);
          }
        } else {
          toast.loading("Waiting...", { id: toastId });

          sendCalls({
            account: address as `0x${string}`,
            // @ts-ignore
            calls: calls,
          });
        }
        }
        catch(error){
          toast.error("Transaction failed", { id: toastId });
          setIsLoading(false);
        }
        
      }
    } catch (error: any) {
      console.error("Error creating auction:", error);

      // Handle different types of errors
      let errorMessage = "Failed";

      if (error?.message?.includes("user rejected")) {
        errorMessage = "Cancelled";
      } else if (error?.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient funds";
      } else if (error?.message?.includes("Max 3 active auctions")) {
        errorMessage = "Max 3 active auctions";
      } else if (
        error?.message?.includes("Minimum bid must be greater than 0")
      ) {
        errorMessage = "Min bid > 0";
      } else if (error?.shortMessage) {
        errorMessage = error.shortMessage;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      // Update the loading toast with error message
      toast.error(errorMessage, { id: toastId });
      setIsLoading(false);
    } finally {
      // Ensure loading state is always reset
      if (isLoading && status !== "pending") {
        setIsLoading(false);
      }
    }
  };

  const handleCurrencySelect = (currency: CurrencyOption) => {
    setSelectedCurrency(currency);
  };

  const handleCurrencyModeChange = (mode: CurrencySelectionMode) => {
    // setCurrencyMode(mode)
    setSelectedCurrency(null); // Reset selection when changing modes
  };

  const isFormValid =
    address &&
    auctionTitle.trim() &&
    selectedCurrency &&
    endTime &&
    minBidAmount.trim() !== "" &&
    !isNaN(parseFloat(minBidAmount));

  const canGoNext = () => {
    switch (currentStep) {
      case 0:
        return auctionTitle.trim().length > 0;
      case 1:
        return selectedCurrency !== null && selectedCurrency.name && !loadingPrice && minBidAmount.trim() !== "" && !isNaN(parseFloat(minBidAmount));
      case 2:
        return endTime !== null;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canGoNext() || currentStep >= 2) return;

    setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!address)
    return (
      <div className=" max-lg:mx-auto mt-4">
        <div className="bg-white/10 rounded-lg shadow-md border border-white/20 p-8 text-center">
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
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Create Your First Auction
              </h3>
              <p className="text-caption mb-4">
                Connect your wallet to start creating and managing auctions on
                the platform.
              </p>
              <p className="text-sm text-caption">
                Once connected, you'll be able to set up auctions with custom
                tokens, durations, and minimum bids.
              </p>
            </div>
            <AggregateConnector />
          </div>
        </div>
      </div>
    );

  return (
    <div className="max-w-2xl mx-auto px-4 lg:min-w-[800px] max-lg:pb-20">
      <form onSubmit={handleSubmit} className="space-y-6 mt-8">
        {/* Step Progress */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center max-w-sm mx-auto">
            {[1, 2, 3].map((step, idx) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all flex-shrink-0 ${
                    idx === currentStep
                      ? "bg-gradient-to-r from-primary to-secondary text-white shadow-lg"
                      : idx < currentStep
                      ? "bg-gradient-to-r from-primary to-secondary text-white"
                      : "bg-white/10 text-gray-400 border border-gray-600"
                  }`}
                >
                  {step}
                </div>
                {idx < 2 && (
                  <div
                    className={`h-0.5 w-16 mx-2 transition-all ${
                      idx < currentStep
                        ? "bg-gradient-to-r from-primary to-secondary"
                        : "bg-white/10"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:min-h-[450px] min-h-[300px] flex flex-col">
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <Input
                  label="Auction Title"
                  value={auctionTitle}
                  onChange={(value) => {
                    if (value.length <= 30) {
                      setAuctionTitle(value);
                    }
                  }}
                  placeholder="Enter auction title"
                  required
                />
                <Input
                  label="Description"
                  value={description}
                  onChange={(value) => {
                    if (value.length <= 200) {
                      setDescription(value);
                    }
                  }}
                  placeholder="Describe your auction item"
                  multiline
                  rows={4}
                />
              </motion.div>
            )}

            {currentStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <CurrencySearch
                  onSelect={handleCurrencySelect}
                  selectedCurrency={selectedCurrency}
                />
                <Input
                  label="Minimum Bid"
                  value={minBidAmount}
                  onChange={setMinBidAmount}
                  placeholder="0.00"
                  type="number"
                />
                {minBidAmount && tokenPrice !== null && !loadingPrice && (
                  <div className="text-sm text-gray-400">
                    ≈ {formatUSDAmount(calculateUSDValue(parseFloat(minBidAmount), tokenPrice))}
                  </div>
                )}
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endTime ? endTime.toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        const date = new Date(e.target.value);
                        if (endTime) {
                          date.setHours(endTime.getHours());
                          date.setMinutes(endTime.getMinutes());
                        }
                        setEndTime(date);
                      }}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={endTime ? `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}` : ''}
                      onChange={(e) => {
                        const [hours, minutes] = e.target.value.split(':');
                        const date = endTime ? new Date(endTime) : new Date();
                        date.setHours(parseInt(hours));
                        date.setMinutes(parseInt(minutes));
                        setEndTime(date);
                      }}
                      className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="bg-white/10 border border-white/10 rounded-lg p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-white mb-4">Auction Summary</h3>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Title:</span>
                    <span className="text-white font-medium">{auctionTitle || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Currency:</span>
                    <span className="text-white font-medium">{selectedCurrency?.symbol || 'ETH'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Minimum Bid:</span>
                    <span className="text-white font-medium">{minBidAmount || '0'} {selectedCurrency?.symbol || 'ETH'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">End Date:</span>
                    <span className="text-white font-medium">{endTime ? endTime.toLocaleDateString() : 'Not set'}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-between items-center pt-6 border-t border-white/10">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              currentStep === 0
                ? 'bg-white/10 text-gray-600 cursor-not-allowed'
                : 'bg-white/10 text-white hover:bg-gray-600'
            }`}
          >
            Previous
          </button>

          {currentStep < 2 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canGoNext()}
              className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-semibold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={!isFormValid || isLoading}
              className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-semibold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <RiLoader5Fill className="text-xl animate-spin" />
                  Creating...
                </div>
              ) : (
                'Create'
              )}
            </button>
          )}
        </div>
      </form>

      <TwitterAuthModal
        isOpen={showTwitterModal}
        onClose={() => setShowTwitterModal(false)}
        onSuccess={() => {
          // Close modal and proceed to next step after successful Twitter auth
          setShowTwitterModal(false);
          setCurrentStep(currentStep + 1);
        }}
      />

      {/* Success Drawer */}
      <Drawer open={isSuccessDrawerOpen} onOpenChange={setIsSuccessDrawerOpen}>
        <DrawerContent className="drawer-content">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-center mb-4">
              Auction Created Successfully! 🎉
            </h2>
            <p className="text-center text-caption mb-6">
              Your auction "{createdAuctionData?.title}" has been created.
            </p>
            
            <div className="space-y-3">
              {context && (
                <button
                  onClick={() => {
                    composeCast();
                    setIsSuccessDrawerOpen(false);
                  }}
                  className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg font-semibold transition-all hover:bg-purple-700"
                >
                  Share on App
                </button>
              )}
              
              <button
                onClick={() => {
                  if (createdAuctionData) {
                    const url = `https://farcaster.xyz/miniapps/0d5aS3cWVprk/house/bid/${createdAuctionData.id}`;
                    const text = `I just created "${createdAuctionData.title}" on House! Check it out and place your bid! ${url}`;
                    window.open(
                      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
                      '_blank'
                    );
                  }
                  setIsSuccessDrawerOpen(false);
                }}
                className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg font-semibold transition-all hover:bg-blue-600"
              >
                Share on X
              </button>
              
              <button
                onClick={() => {
                  setIsSuccessDrawerOpen(false);
                  navigate("/");
                }}
                className="w-full px-4 py-3 bg-white/10 text-white rounded-lg font-semibold transition-all hover:bg-white/20"
              >
                Home
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
