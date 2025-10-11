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


interface CurrencyOption {
  name: string;
  contractAddress: string;
  symbol: string;
}

type CurrencySelectionMode = "search" | "contract";

export default function CreateAuction() {
  const { address, isConnected } = useAccount();
  const [auctionTitle, setAuctionTitle] = useState("");
  // const [currencyMode, setCurrencyMode] = useState<CurrencySelectionMode>('search')
  const [selectedCurrency, setSelectedCurrency] =
    useState<CurrencyOption | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [minBidAmount, setMinBidAmount] = useState("0"); // Made the minimum bid amount optional and default to 0
  const [isLoading, setIsLoading] = useState(false);
  const { data: session } = useSession();
  const [genAuctionId, setGenAuctionId] = useState("");
  const [loadingToastId, setLoadingToastId] = useState<string | null>(null);
  const { sendCalls, isSuccess, status } = useSendCalls();

  const { context } = useMiniKit();

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

  const processSuccess = async (auctionId: string) => {
    try {
      // Call the API to save auction details in the database

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

    // Validation
    if (!auctionTitle || !selectedCurrency || !endTime) {
      toast.error("Please fill in all required fields with valid values");
      return;
    }

    if (!isConnected || !address) {
      toast.error("Please connect your wallet to create an auction");
      return;
    }

    // Ensure auction ends in the future
    const now = new Date();
    if (endTime <= now) {
      toast.error("Auction end time must be in the future");
      return;
    }

    setIsLoading(true);
    
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

        toast.loading("Waiting for transaction confirmation...", { id: toastId });
        
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
                numberToHex(BigInt(durationHours)),
                numberToHex(minBidAmountWei),
              ],
            }),
          },
        ];

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

          toast.loading("Processing transaction...", { id: toastId });
          
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
    } finally {
      setIsLoading(false);
      setLoadingToastId(null);
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
    minBidAmount.trim();

  if (!session)
    return (
      <div className="max-w-2xl max-lg:mx-auto">
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
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Auction Title */}
          <Input
            label="Auction Title"
            value={auctionTitle}
            onChange={setAuctionTitle}
            placeholder="Enter a title for your auction"
            required
          />

          {/* Currency Selection Mode */}
          <div>
            {/*<label className="block text-sm font-medium text-foreground mb-3">
                        How would you like to specify the currency? *
                    </label>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => handleCurrencyModeChange('search')}
                            className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all font-medium ${
                                currencyMode === 'search'
                                    ? 'border-primary text-primary bg-primary/10'
                                    : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
                            }`}
                        >
                            🔍 Search Coin
                            <div className="text-xs mt-1 opacity-75">Search popular tokens</div>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleCurrencyModeChange('contract')}
                            className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all font-medium ${
                                currencyMode === 'contract'
                                    ? 'border-primary text-primary bg-primary/10'
                                    : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
                            }`}
                        >
                            📝 Contract Address
                            <div className="text-xs mt-1 opacity-75">Enter token address</div>
                        </button>
                    </div>*/}
          </div>

          {/* Currency Search/Input */}
          <CurrencySearch
            // mode={currencyMode}
            onSelect={handleCurrencySelect}
            selectedCurrency={selectedCurrency}
          />

          {/* Minimum Bid Amount */}
          <Input
            label="Minimum Bid Amount (Optional)"
            value={minBidAmount}
            onChange={setMinBidAmount}
            placeholder="Enter the minimum bid amount (default: 0)"
            type="number"
          />

          {/* End Time Picker */}
          <DateTimePicker
            label="Auction End Time (Local Time)"
            value={endTime}
            onChange={setEndTime}
            placeholder=""
            required
            minDate={new Date()} // Prevent selecting past dates
          />

          {/* Time Remaining Display */}
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

          {/* Submit Button */}
          <button
            type="submit" // This ensures the form submission triggers handleSubmit
            disabled={!isFormValid || isLoading}
            className="w-full py-4 px-6 bg-primary text-white rounded-lg font-semibold text-lg transition-all hover:bg-primary/90 disabled:bg-disabled disabled:cursor-not-allowed disabled:text-gray-500 shadow-lg hover:shadow-xl"
          >
            {isLoading ? (
              <div className="flex items-center text-black/50 justify-center gap-2">
                <RiLoader5Fill className="text-xl animate-spin"/>
                Creating Auction...
              </div>
            ) : !isConnected ? (
              "Login to Create"
            ) : (
              "Create Auction"
            )}
          </button>

          {/* Form Validation Helper */}
          {!isConnected && (
            <div className="text-sm text-red-500 text-center">
              Please connect your wallet to create an auction
            </div>
          )}
          {isConnected && !isFormValid && (
            <div className="text-sm text-gray-500 text-center">
              Please fill in all required fields to create your auction
            </div>
          )}
        </form>
      </div>
    );
}
