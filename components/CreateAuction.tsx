"use client";

import { useEffect, useState } from "react";
import { writeContract } from "@wagmi/core";
import { useAccount, useSendCalls } from "wagmi";
import { config } from "@/utils/providers/rainbow";
import { auctionAbi } from "@/utils/contracts/abis/auctionAbi";
import { erc20Abi } from "@/utils/contracts/abis/erc20Abi";
import { contractAdds } from "@/utils/contracts/contractAdds";
import Input from "./UI/Input";
import CurrencySearch from "./UI/CurrencySearch";
import DateTimePicker from "./UI/DateTimePicker";
import { readContractSetup, writeContractSetup } from "@/utils/contractSetup";
import { useSession } from "next-auth/react";
import { useNavigateWithLoader } from "@/utils/useNavigateWithLoader";
import { randomUUID } from "crypto";
import { WalletConnect } from "./Web3/walletConnect";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { encodeFunctionData, numberToHex } from "viem";
import {
  base,
  createBaseAccountSDK,
  getCryptoKeyAccount,
} from "@base-org/account";
import { RiLoader5Fill } from "react-icons/ri";
import toast from "react-hot-toast";
import { fetchTokenPrice, calculateUSDValue, formatUSDAmount } from "@/utils/tokenPrice";
import { motion, AnimatePresence } from "framer-motion";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { checkStatus } from "@/utils/checkStatus";
import { useGlobalContext } from "@/utils/providers/globalContext";
import TwitterAuthModal from "./UI/TwitterAuthModal";


interface CurrencyOption {
  name: string;
  contractAddress: string;
  symbol: string;
}

type CurrencySelectionMode = "search" | "contract";

export default function CreateAuction() {

  const { address, isConnected } = useAccount();
  const { isDesktopWallet, hasTwitterProfile } = useGlobalContext();
  const [auctionTitle, setAuctionTitle] = useState("");
  // const [currencyMode, setCurrencyMode] = useState<CurrencySelectionMode>('search')
  const [selectedCurrency, setSelectedCurrency] =
    useState<CurrencyOption | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [minBidAmount, setMinBidAmount] = useState("5"); // Made the minimum bid amount optional and default to 0
  const [isLoading, setIsLoading] = useState(false);
  const { data: session } = useSession();
  const [genAuctionId, setGenAuctionId] = useState("");
  const [loadingToastId, setLoadingToastId] = useState<string | null>(null);
  const { sendCalls, isSuccess, status } = useSendCalls();
  const [showTwitterModal, setShowTwitterModal] = useState(false);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [tokenPrice, setTokenPrice] = useState<number | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);

  const { context } = useMiniKit();

  const [myCallId, setMyCallId] = useState<string | null>(null);

  const navigate = useNavigateWithLoader();

  useEffect(() => {
    // When transaction succeeds
    if (isSuccess) {
      if (loadingToastId) {
        toast.success("Transaction successful! Saving auction details...", {
          id: loadingToastId,
        });
      }
      processSuccess(genAuctionId);
    }
    // When transaction fails (status === 'error')
    else if (status === "error") {
      if (loadingToastId) {
        toast.error("Transaction failed. Please try again.", {
          id: loadingToastId,
        });
      }
      setIsLoading(false);
      console.error("Transaction failed");
    }
  }, [isSuccess, status]);

  useEffect(() => {
    if (selectedCurrency?.contractAddress) {
      setLoadingPrice(true);
      fetchTokenPrice(selectedCurrency.contractAddress)
        .then(price => setTokenPrice(price))
        .catch(err => {
          console.error("Failed to fetch token price:", err);
          setTokenPrice(null);
        })
        .finally(() => setLoadingPrice(false));
    }
  }, [selectedCurrency]);

  const processSuccess = async (auctionId: string) => {
    try {
      // Call the API to save auction details in the database

      toast.loading("Saving auction details...");

      const now = new Date();
      const response = await fetch("/api/protected/auctions/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auctionName: auctionTitle,
          blockchainAuctionId: auctionId,
          tokenAddress: selectedCurrency?.contractAddress,
          endDate: endTime,
          currency: selectedCurrency?.symbol,
          startDate: now,
          hostedBy: address,
          minimumBid: parseFloat(minBidAmount),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save auction details in the database");
      }

      
        toast.success("Auction created successfully! Redirecting...");
      
setIsLoading(false);
      // Small delay to show success message before navigation
      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (error) {
      console.error("Error saving auction details:", error);
      if (loadingToastId) {
        toast.error("Failed to save auction details. Please try again.", {
          id: loadingToastId,
        });
      }
      toast.error("Failed to save auction details. Please try again.");
      setIsLoading(false);
    }
    finally{
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    //check if address and session exist
      if (!address || !session) {
        toast.error("Please connect your wallet");
        // return;
      }
    setIsLoading(true);

    const res = await fetch(`/api/users/${address}/checkWhitelist`);
    const user = await res.json();
    console.log("Whitelist check result:", user);
    //first check if the user is whitelisted, if not, show error toast and return
    if (!user?.whitelisted) {
      toast.error("You are not whitelisted to create an auction");
      
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

    if (!isConnected || !address) {
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
    const toastId = toast.loading("Creating auction...");
    setLoadingToastId(toastId);
    
    try {
      const durationHours = calculateDurationHours(endTime);
      
      // Get token decimals for proper conversion
      let tokenDecimals = 18; // Default to 18
      let minBidAmountWei: bigint;

      try {
        toast.loading("Fetching token information...", { id: toastId });
        tokenDecimals = await getTokenDecimals(selectedCurrency.contractAddress);
        console.log(`Token decimals for ${selectedCurrency.contractAddress}:`, tokenDecimals);
        
        // Convert minimum bid amount to proper decimal format
        const minBidFloat = parseFloat(minBidAmount || "0");
        minBidAmountWei = convertBidAmountToWei(minBidFloat, tokenDecimals);
        console.log(`Minimum bid ${minBidFloat} converted to ${minBidAmountWei} with ${tokenDecimals} decimals`);
      } catch (error) {
        console.error("Error fetching token decimals, using default 18:", error);
        // Fallback to 18 decimals if fetching fails
        const minBidFloat = parseFloat(minBidAmount || "0");
        minBidAmountWei = convertBidAmountToWei(minBidFloat, 18);
        toast.loading("Using default token configuration...", { id: toastId });
      }

      const auctionId = crypto.randomUUID();

      //PC flow
      if (!context) {
        toast.loading("Preparing transaction...", { id: toastId });
        
        const contract = await writeContractSetup(contractAdds.auctions, auctionAbi);

        toast.loading("Waiting for transaction...", { id: toastId });
        
        // Call the smart contract
        const txHash = await contract?.startAuction(
          auctionId,
          selectedCurrency.contractAddress as `0x${string}`,
          auctionTitle,
          BigInt(Math.round(durationHours)),
          minBidAmountWei
        );

        toast.loading("Transaction submitted, waiting for confirmation...", { id: toastId });
        
        await txHash?.wait();

        toast.loading("Transaction confirmed! Saving auction details...", { id: toastId });

        await processSuccess(auctionId);
      } 
      // Farcaster/Base App Flow
      else {
        toast.loading("Preparing transaction for mobile wallet...", { id: toastId });
        
        setGenAuctionId(auctionId);
        const calls = [
          {
            to: contractAdds.auctions,
            value: context?.client.clientFid !== 309857 ? BigInt(0) : "0x0",
            data: encodeFunctionData({
              abi: auctionAbi,
              functionName: "startAuction",
              args: [
                auctionId,
                selectedCurrency.contractAddress as `0x${string}`,
                selectedCurrency.symbol,
                BigInt(durationHours),
                minBidAmountWei
              ],
            }),
          },
        ];

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
                chainId: numberToHex(base.constants.CHAIN_IDS.base),
                from: fromAddress,
                calls: calls
              },
            ],
          });

          toast.loading("Transaction submitted, checking status...", { id: toastId });

          const result = await checkStatus(callsId);

          if (result) {
            toast.loading("Transaction confirmed! Saving auction details...", { id: toastId });
            await processSuccess(auctionId);
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
      }
    } catch (error: any) {
      console.error("Error creating auction:", error);

      // Handle different types of errors
      let errorMessage = "Failed to create auction. Please try again.";

      if (error?.message?.includes("user rejected")) {
        errorMessage = "Transaction was cancelled by user.";
      } else if (error?.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient funds to complete the transaction.";
      } else if (error?.message?.includes("Max 3 active auctions")) {
        errorMessage = "You can only have 3 active auctions at a time.";
      } else if (
        error?.message?.includes("Minimum bid must be greater than 0")
      ) {
        errorMessage = "Minimum bid amount must be greater than 0.";
      } else if (error?.shortMessage) {
        errorMessage = error.shortMessage;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      // Update the loading toast with error message
      if (loadingToastId) {
        toast.error(errorMessage, { id: loadingToastId });
      } else {
        toast.error(errorMessage);
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
    session?.user &&
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
        return selectedCurrency !== null && selectedCurrency.name && !loadingPrice;
      case 2:
        return minBidAmount.trim() !== "" && !isNaN(parseFloat(minBidAmount));
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canGoNext() || currentStep >= 3) return;
    
    // Check Twitter auth after auction name is entered (step 0)
    if (currentStep === 0 && isDesktopWallet && !hasTwitterProfile) {
      setShowTwitterModal(true);
      return;
    }
    
    setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!session)
    return (
      <div className=" max-lg:mx-auto mt-4">
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
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6" 
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Create Your First Auction</h3>
              <p className="text-caption mb-4">
                Connect your wallet to start creating and managing auctions on the platform.
              </p>
              <p className="text-sm text-caption">
                Once connected, you'll be able to set up auctions with custom tokens, durations, and minimum bids.
              </p>
            </div>
            <WalletConnect />
          </div>
        </div>
      </div>
    );

  if (session?.user !== undefined)
    return (
      <div className="max-w-2xl max-lg:mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="min-h-[400px] flex flex-col justify-between">
            <AnimatePresence mode="wait">
              {currentStep === 0 && (
                <motion.div
                  key="step-0"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <Input
                    label="Auction Title"
                    value={auctionTitle}
                    onChange={(value) => {
                      if (value.length <= 30) {
                        setAuctionTitle(value);
                      }
                    }}
                    placeholder="Enter a title for your auction (max 30 chars)"
                    required
                  />
                  <div className="text-xs text-gray-400 text-right">
                    {auctionTitle.length}/30 characters
                  </div>
                </motion.div>
              )}

              {currentStep === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <CurrencySearch
                    onSelect={handleCurrencySelect}
                    selectedCurrency={selectedCurrency}
                  />
                  {selectedCurrency && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-sm text-blue-700">
                        <strong>Selected Token:</strong> {selectedCurrency.name} ({selectedCurrency.symbol})
                      </div>
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
                  className="space-y-4"
                >
                  <Input
                    label="Minimum Bid Amount"
                    value={minBidAmount}
                    onChange={setMinBidAmount}
                    placeholder="Enter the minimum bid amount (default: 0)"
                    type="number"
                  />
                  {minBidAmount && tokenPrice !== null && !loadingPrice && (
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-sm text-green-700">
                        <strong>USD Value:</strong>{" "}
                        {formatUSDAmount(calculateUSDValue(parseFloat(minBidAmount), tokenPrice))}
                      </div>
                    </div>
                  )}
                  {loadingPrice && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="text-sm text-gray-700 flex items-center gap-2">
                        <RiLoader5Fill className="animate-spin" />
                        Fetching token price...
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <DateTimePicker
                    label="Auction End Time (Local Time)"
                    value={endTime}
                    onChange={setEndTime}
                    placeholder=""
                    required
                    minDate={new Date()}
                  />
                  {endTime && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-sm text-blue-700">
                        <strong>Auction Duration:</strong>{" "}
                        {(() => {
                          const now = new Date();
                          const diff = endTime.getTime() - now.getTime();
                          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                          const hours = Math.floor(
                            (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
                          );
                          const minutes = Math.floor(
                            (diff % (1000 * 60 * 60)) / (1000 * 60)
                          );

                          if (diff <= 0) return "Invalid time (must be in the future)";

                          const parts = [];
                          if (days > 0) parts.push(`${days} day${days > 1 ? "s" : ""}`);
                          if (hours > 0)
                            parts.push(`${hours} hour${hours > 1 ? "s" : ""}`);
                          if (minutes > 0 && days === 0)
                            parts.push(`${minutes} minute${minutes > 1 ? "s" : ""}`);

                          return parts.join(", ");
                        })()}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-8 space-y-4 absolute bottom-4 left-0 w-full px-6">
              <div className="flex justify-between items-center gap-4">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold transition-all hover:bg-gray-300 disabled:opacity-0 disabled:cursor-not-allowed"
                >
                  <FaChevronLeft />
                  Previous
                </button>

                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!canGoNext()}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-semibold transition-all hover:bg-primary/90 disabled:bg-disabled disabled:cursor-not-allowed disabled:text-gray-500"
                  >
                    Next
                    <FaChevronRight />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!isFormValid || isLoading}
                    className="px-4 py-2 bg-primary text-white rounded-lg font-semibold transition-all hover:bg-primary/90 disabled:bg-disabled disabled:cursor-not-allowed disabled:text-gray-500"
                  >
                    {isLoading ? (
                      <div className="flex items-center text-black/50 justify-center gap-2">
                        <RiLoader5Fill className="text-xl animate-spin"/>
                        Creating...
                      </div>
                    ) : (
                      "Create"
                    )}
                  </button>
                )}
              </div>

              {/* Progress Indicator */}
              <div className="flex justify-center gap-2">
                {[0, 1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={`h-2 w-12 rounded-full transition-all ${
                      step === currentStep
                        ? "bg-primary"
                        : step < currentStep
                        ? "bg-primary/50"
                        : "bg-primary/10"
                    }`}
                  />
                ))}
              </div>
            </div>
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
      </div>
    );
}
