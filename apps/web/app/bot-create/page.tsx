"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSendCalls } from "wagmi";
import {
  auctionAbi,
  contractAdds,
  erc20Abi,
  readContractSetup,
  writeNewContractSetup,
} from "@repo/contracts";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { encodeFunctionData, numberToHex } from "viem";
import {
  base,
  createBaseAccountSDK,
  getCryptoKeyAccount,
} from "@base-org/account";
import { RiLoader5Fill } from "react-icons/ri";
import toast, { Toaster } from "react-hot-toast";
import { checkStatus } from "@/utils/checkStatus";
import { useGlobalContext } from "@/utils/providers/globalContext";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import AggregateConnector from "@/components/utils/aggregateConnector";
import { base as baseChain } from "viem/chains";
import { ethers } from "ethers";
import sdk from "@farcaster/frame-sdk";

// Known tokens mapping
const KNOWN_TOKENS: Record<string, { name: string; symbol: string; decimals: number }> = {
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": { name: "USD Coin", symbol: "USDC", decimals: 6 },
  "0x4200000000000000000000000000000000000006": { name: "Wrapped Ether", symbol: "WETH", decimals: 18 },
};

function BotCreateContent() {
  const searchParams = useSearchParams();
  const { wallets } = useWallets();
  const externalWallets = wallets.filter(
    (wallet) => wallet.walletClientType !== "privy"
  );

  const { user } = useGlobalContext();
  const address = externalWallets.length > 0 ? externalWallets[0].address : null;
  const { getAccessToken } = usePrivy();
  const { sendCalls, status } = useSendCalls();
  const { context } = useMiniKit();

  // Transaction state
  const [isLoading, setIsLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [genAuctionId, setGenAuctionId] = useState("");
  const [loadingToastId, setLoadingToastId] = useState<string | null>(null);
  const [storedDurationHours, setStoredDurationHours] = useState<number>(0);
  const [storedMinBidAmountWei, setStoredMinBidAmountWei] = useState<bigint>(BigInt(0));
  const hasInitiated = useRef(false);

  // Get params from URL
  const auctionName = searchParams.get("name") || "";
  const tokenAddress = searchParams.get("token") || "";
  const minBidStr = searchParams.get("minBid") || "0";
  const durationStr = searchParams.get("duration") || "24";

  const tokenInfo = KNOWN_TOKENS[tokenAddress.toLowerCase()] || {
    name: "Token",
    symbol: "TOKEN",
    decimals: 18,
  };

  // Get token decimals
  const getTokenDecimals = async (tokenAddr: string): Promise<number> => {
    const known = KNOWN_TOKENS[tokenAddr.toLowerCase()];
    if (known) return known.decimals;

    try {
      const contract = await readContractSetup(tokenAddr, erc20Abi);
      if (!contract) return 18;
      const decimals = await contract.decimals();
      return Number(decimals) || 18;
    } catch {
      return 18;
    }
  };

  // Convert bid to wei
  const convertBidAmountToWei = (bidAmount: number, decimals: number): bigint => {
    return ethers.parseUnits(bidAmount.toString(), decimals);
  };

  // Process success
  const processSuccess = async (auctionId: string) => {
    const saveToastId = toast.loading("Saving auction...");

    try {
      const now = new Date();
      const durationHours = parseInt(durationStr);
      const endDate = new Date();
      endDate.setHours(endDate.getHours() + durationHours);

      const accessToken = await getAccessToken();

      const formData = new FormData();
      formData.append("auctionName", auctionName);
      formData.append("blockchainAuctionId", auctionId);
      formData.append("tokenAddress", tokenAddress);
      formData.append("endDate", endDate.toISOString());
      formData.append("currency", tokenInfo.symbol);
      formData.append("startDate", now.toISOString());
      formData.append("hostedBy", user?.socialId || "");
      formData.append("startingWallet", address || "");
      formData.append("minimumBid", minBidStr);

      const response = await fetch("/api/protected/auctions/create", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to save auction");
      }

      toast.success("Auction created! 🎉", { id: saveToastId });
      setTxStatus("success");

      // Prompt to share
      try {
        const url = `https://farcaster.xyz/miniapps/0d5aS3cWVprk/house/bid/${auctionId}`;
        const text = `I just created "${auctionName}" on House! Check it out and place your bid!`;
        await sdk.actions.composeCast({
          text,
          embeds: [url],
        });
      } catch (e) {
        console.log("Compose cast skipped");
      }
    } catch (error) {
      console.error("Error saving auction:", error);
      toast.error("Failed to save auction", { id: saveToastId });
      setTxStatus("error");
    }
  };

  // Fallback transaction for external wallets
  const handleFallbackTransaction = async (
    auctionId: string,
    durationHours: number,
    minBidAmountWei: bigint,
    toastId: string
  ) => {
    if (!address || externalWallets.length === 0) {
      toast.error("Wallet not connected", { id: toastId });
      setIsLoading(false);
      return;
    }

    try {
      await externalWallets[0].switchChain(baseChain.id);

      const contract = await writeNewContractSetup(
        contractAdds.auctions,
        auctionAbi,
        externalWallets[0]
      );

      toast.loading("Confirm in wallet...", { id: toastId });

      const txHash = await contract?.startAuction(
        auctionId,
        tokenAddress as `0x${string}`,
        auctionName,
        BigInt(Math.round(durationHours)),
        minBidAmountWei
      );

      await txHash?.wait();

      if (!txHash) {
        toast.error("Transaction failed", { id: toastId });
        setIsLoading(false);
        setTxStatus("error");
        return;
      }

      toast.success("Transaction confirmed!", { id: toastId });
      await processSuccess(auctionId);
    } catch (error) {
      console.error("Fallback transaction failed:", error);
      toast.error("Transaction failed", { id: toastId });
      setIsLoading(false);
      setTxStatus("error");
    }
  };

  // Watch sendCalls status
  useEffect(() => {
    if (status === "success" && genAuctionId) {
      if (loadingToastId) {
        toast.success("Transaction confirmed!", { id: loadingToastId });
      }
      processSuccess(genAuctionId);
    } else if (status === "error" && genAuctionId && loadingToastId && storedDurationHours > 0) {
      console.log("sendCalls failed, attempting fallback...");
      handleFallbackTransaction(
        genAuctionId,
        storedDurationHours,
        storedMinBidAmountWei,
        loadingToastId
      );
    }
  }, [status]);

  // Auto-initiate transaction when wallet is connected
  useEffect(() => {
    if (!address || hasInitiated.current || !auctionName || !tokenAddress) {
      return;
    }

    // Small delay to ensure everything is ready
    const timer = setTimeout(() => {
      initiateTransaction();
    }, 500);

    return () => clearTimeout(timer);
  }, [address, auctionName, tokenAddress]);

  const initiateTransaction = async () => {
    if (hasInitiated.current) return;
    hasInitiated.current = true;

    setIsLoading(true);
    setTxStatus("pending");

    const toastId = toast.loading("Preparing transaction...");
    setLoadingToastId(toastId);

    try {
      const durationHours = parseInt(durationStr);
      const tokenDecimals = await getTokenDecimals(tokenAddress);
      const minBidFloat = parseFloat(minBidStr);
      const minBidAmountWei = convertBidAmountToWei(minBidFloat, tokenDecimals);

      const auctionId = String(Date.now());
      setGenAuctionId(auctionId);
      setStoredDurationHours(durationHours);
      setStoredMinBidAmountWei(minBidAmountWei);

      const startAuctionArgs: [string, `0x${string}`, string, bigint, bigint] = [
        auctionId,
        tokenAddress as `0x${string}`,
        tokenInfo.symbol,
        BigInt(durationHours),
        minBidAmountWei,
      ];

      const encodedData = encodeFunctionData({
        abi: auctionAbi,
        functionName: "startAuction",
        args: startAuctionArgs,
      });

      // PC/Browser Wallet flow
      if (!context) {
        toast.loading("Confirm in wallet...", { id: toastId });
        const wallet = externalWallets[0];
        await wallet.switchChain(baseChain.id);
        const provider = await wallet.getEthereumProvider();

        const callsRequest = {
          version: "1.0",
          chainId: numberToHex(baseChain.id),
          atomicRequired: true,
          from: wallet.address,
          calls: [
            {
              to: contractAdds.auctions as `0x${string}`,
              data: encodedData,
              value: "0x0",
              capabilities: {
                gasLimitOverride: "0x7A120",
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
              : (callsResponse as any)?.callsId ?? (callsResponse as any)?.id;

          if (!callsId) throw new Error("No callsId");

          toast.loading("Confirming...", { id: toastId });
          const confirmed = await checkStatus(callsId);

          if (!confirmed) {
            toast.error("Transaction failed", { id: toastId });
            setIsLoading(false);
            setTxStatus("error");
            return;
          }

          await processSuccess(auctionId);
        } catch (e) {
          console.log("wallet_sendCalls failed, falling back:", e);
          await handleFallbackTransaction(auctionId, durationHours, minBidAmountWei, toastId);
        }
      }
      // Farcaster/Base App Flow
      else {
        const calls = [
          {
            to: contractAdds.auctions,
            value: context?.client.clientFid === 309857 ? "0x0" : BigInt(0),
            data: encodedData,
          },
        ];

        if (context?.client.clientFid === 309857) {
          toast.loading("Connecting...", { id: toastId });

          const provider = createBaseAccountSDK({
            appName: "House",
            appLogoUrl: "https://www.houseproto.fun/pfp.jpg",
            appChainIds: [base.constants.CHAIN_IDS.base],
          }).getProvider();

          const cryptoAccount = await getCryptoKeyAccount();
          const fromAddress = cryptoAccount?.account?.address;

          toast.loading("Confirm transaction...", { id: toastId });

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

          toast.loading("Confirming...", { id: toastId });
          const result = await checkStatus(callsId);

          if (result) {
            await processSuccess(auctionId);
          } else {
            toast.error("Transaction failed", { id: toastId });
            setIsLoading(false);
            setTxStatus("error");
          }
        } else {
          toast.loading("Confirm in wallet...", { id: toastId });
          sendCalls({
            account: address as `0x${string}`,
            // @ts-ignore
            calls: calls,
          });
        }
      }
    } catch (error: any) {
      console.error("Error creating auction:", error);
      let errorMessage = "Transaction failed";

      if (error?.message?.includes("user rejected")) {
        errorMessage = "Transaction cancelled";
      } else if (error?.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient funds";
      }

      toast.error(errorMessage, { id: toastId });
      setIsLoading(false);
      setTxStatus("error");
      hasInitiated.current = false; // Allow retry
    }
  };

  // Show connect wallet if not connected
  if (!address) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <Toaster position="top-center" />
        <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">Create Auction</h1>
          <p className="text-gray-400 mb-6">Connect your wallet to continue</p>

          <div className="bg-white/5 rounded-xl p-4 mb-6 text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Name:</span>
              <span className="font-medium">{auctionName || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Min Bid:</span>
              <span className="font-medium">{minBidStr} {tokenInfo.symbol}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Duration:</span>
              <span className="font-medium">{durationStr} hours</span>
            </div>
          </div>

          <AggregateConnector />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <Toaster position="top-center" />
      <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">
            {txStatus === "success" ? "🎉 Auction Created!" : "Creating Auction"}
          </h1>
          <p className="text-gray-400">
            {txStatus === "idle" && "Preparing..."}
            {txStatus === "pending" && "Please confirm the transaction in your wallet"}
            {txStatus === "success" && "Your auction is now live!"}
            {txStatus === "error" && "Something went wrong"}
          </p>
        </div>

        {/* Auction Details */}
        <div className="bg-white/5 rounded-xl p-4 mb-6 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Auction Name</span>
            <span className="font-semibold text-lg">{auctionName}</span>
          </div>
          <div className="border-t border-white/10" />
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Minimum Bid</span>
            <span className="font-semibold">{minBidStr} {tokenInfo.symbol}</span>
          </div>
          <div className="border-t border-white/10" />
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Duration</span>
            <span className="font-semibold">{durationStr} hours</span>
          </div>
          <div className="border-t border-white/10" />
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Token</span>
            <span className="font-semibold text-sm font-mono">
              {tokenAddress.slice(0, 6)}...{tokenAddress.slice(-4)}
            </span>
          </div>
        </div>

        {/* Status */}
        <div className="flex flex-col items-center gap-4">
          {(txStatus === "idle" || txStatus === "pending") && (
            <>
              <div className="flex items-center gap-3 text-yellow-400">
                <RiLoader5Fill className="text-3xl animate-spin" />
                <span className="text-lg font-medium">
                  {txStatus === "idle" ? "Initializing..." : "Waiting for confirmation..."}
                </span>
              </div>
              <p className="text-sm text-gray-500 text-center">
                A transaction request should appear in your wallet
              </p>
            </>
          )}

          {txStatus === "success" && (
            <div className="text-center space-y-4">
              <div className="text-6xl">✅</div>
              <p className="text-green-400 font-medium">
                Your auction is now live on House!
              </p>
              <button
                onClick={() => {
                  window.location.href = "https://farcaster.xyz/miniapps/0d5aS3cWVprk/house/my-auctions";
                }}
                className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-semibold transition-colors"
              >
                View My Auctions
              </button>
            </div>
          )}

          {txStatus === "error" && (
            <div className="text-center space-y-4">
              <div className="text-6xl">❌</div>
              <p className="text-red-400 font-medium">Transaction failed or was cancelled</p>
              <button
                onClick={() => {
                  hasInitiated.current = false;
                  setTxStatus("idle");
                  initiateTransaction();
                }}
                className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-semibold transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BotCreatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <RiLoader5Fill className="text-4xl animate-spin" />
        </div>
      }
    >
      <BotCreateContent />
    </Suspense>
  );
}

