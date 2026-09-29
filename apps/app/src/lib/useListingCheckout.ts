"use client";

import { useMemo, useState } from "react";
import { BaseError, UserRejectedRequestError } from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { useSession } from "@/components/SessionProvider";
import {
  auctionHouseAbi,
  auctionHouseAddress,
  paymentTokens,
  toUsdE8,
  USDG,
} from "@/lib/contracts/auctionHouse";
import { erc20Abi } from "@/lib/contracts/erc20";
import { robinhood } from "@/lib/chains";
import {
  bookListing,
  recordListingBid,
  type Listing,
} from "@/lib/marketplace";

export type CheckoutStep =
  | "idle"
  | "switching"
  | "approving"
  | "signing"
  | "confirming"
  | "publishing"
  | "done";

export const CHECKOUT_STEP_LABEL: Record<Exclude<CheckoutStep, "idle" | "done">, string> = {
  switching: "Switch your wallet to Robinhood Chain…",
  approving: "Approve the token spend in your wallet…",
  signing: "Confirm the transaction in your wallet…",
  confirming: "Waiting for the transaction to confirm…",
  publishing: "Recording the booking…",
};

/**
 * A floating token's rate can move between the quote and the confirmation, so
 * the buyer approves a little headroom and the contract still charges only
 * what the listing is worth. A pegged stable needs none.
 */
function withSlippage(amount: bigint, pegged: boolean) {
  return pegged ? amount : (amount * BigInt(101)) / BigInt(100);
}

export function writeError(err: unknown, fallback: string): string {
  if (err instanceof UserRejectedRequestError) {
    return "You rejected the transaction in your wallet.";
  }
  if (err instanceof BaseError) {
    if (err.walk((e) => e instanceof UserRejectedRequestError)) {
      return "You rejected the transaction in your wallet.";
    }
    const msg = err.shortMessage || err.message;
    if (/Account type|smart/i.test(msg)) {
      return "This wallet can't sign on Robinhood Chain. Connect MetaMask or Rainbow and try again.";
    }
    if (/chain/i.test(msg) && /mismatch|supported|unrecognized|switch/i.test(msg)) {
      return "Switch your wallet to Robinhood Chain and try again.";
    }
    if (/own listing/i.test(msg)) {
      return "You cannot book your own listing.";
    }
    return msg;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

/** The contract rejects a bid that only matches the leader, so the floor sits a cent above it. */
export function minimumBidFor(listing: Pick<Listing, "price">, currentBid?: number | null) {
  return currentBid != null ? Math.round((currentBid + 0.01) * 100) / 100 : listing.price;
}

interface Options {
  /** The leading bid, when the caller knows it better than the listing does. */
  currentBid?: number | null;
  onPurchased?: (updated: Listing) => void;
  onBidPlaced?: (updated: Listing | null) => void;
}

/**
 * Buying or bidding on a marketplace listing, from token choice through the
 * on-chain transaction to the API record. Shared by the listing page and the
 * home-screen checkout sheet so both settle exactly the same way.
 */
export function useListingCheckout(listing: Listing | null, options: Options = {}) {
  const { user } = useSession();
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const chainForListing = listing?.chainId ?? robinhood.id;
  const publicClient = usePublicClient({ chainId: chainForListing });
  const isAuction = listing?.pricingType === "AUCTION";

  const [payTokenAddress, setPayTokenAddress] = useState<string>(USDG.address);
  const [bidAmount, setBidAmount] = useState("");
  const [step, setStep] = useState<CheckoutStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pendingPersist, setPendingPersist] = useState<string | null>(null);

  // Listings are priced in USD and the buyer picks what to settle in, so the
  // token is chosen here rather than read off the listing.
  const tokens = paymentTokens(chainForListing);
  const token = useMemo(
    () =>
      tokens.find((t) => t.address.toLowerCase() === payTokenAddress.toLowerCase()) ??
      tokens[0] ??
      USDG,
    [tokens, payTokenAddress],
  );

  const contractAddress =
    (listing?.contractAddress as `0x${string}` | undefined) ??
    auctionHouseAddress(chainForListing);
  const chainSupported = chainId === chainForListing;
  const busy = step !== "idle" && step !== "done";

  const minimumBid = listing
    ? minimumBidFor(listing, options.currentBid ?? listing.highestBid ?? null)
    : 0;
  const bidNumber = Number(bidAmount);
  const bidInvalid = isAuction && (!Number.isFinite(bidNumber) || bidNumber < minimumBid);

  /** What the buyer pays, in USD — the bid for an auction, the price otherwise. */
  const usdAmount = isAuction ? (Number.isFinite(bidNumber) ? bidNumber : 0) : (listing?.price ?? 0);

  // What the chosen amount costs in the chosen token, at the rate the contract
  // publishes. Shown before signing so nobody is surprised by the conversion.
  const { data: quotedAmount } = useReadContract({
    address: contractAddress,
    abi: auctionHouseAbi,
    functionName: "quoteUsd",
    args: [token.address, toUsdE8(usdAmount)],
    chainId: chainForListing,
    query: {
      enabled: Boolean(
        contractAddress && !token.pegged && usdAmount > 0 && listing?.status === "ACTIVE",
      ),
    },
  });

  async function persistPurchase(txHash: string | null, current: Listing) {
    setStep("publishing");
    const updated = await bookListing(current.id, txHash);
    setPendingPersist(null);
    options.onPurchased?.(updated);
    setStep("done");
  }

  /** Clears a previous attempt — called when a checkout surface opens. */
  function reset(initialBid?: number) {
    setStep("idle");
    setError(null);
    setPendingPersist(null);
    setPayTokenAddress(USDG.address);
    setBidAmount(initialBid != null ? String(initialBid) : "");
  }

  /** Returns false when a wallet connection is needed first. */
  async function checkout(): Promise<boolean> {
    if (!listing || busy) return true;
    if (!contractAddress) {
      setError("AuctionHouse is not configured for this listing.");
      return true;
    }
    if (!address) return false;
    if (bidInvalid) {
      setError(`Bid at least $${minimumBid.toLocaleString()}.`);
      return true;
    }
    setError(null);

    if (pendingPersist && !isAuction) {
      try {
        await persistPurchase(pendingPersist, listing);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "On-chain purchase succeeded — retry to record it on the marketplace.",
        );
        setStep("idle");
      }
      return true;
    }

    try {
      if (!chainSupported) {
        setStep("switching");
        if (!switchChainAsync) {
          throw new Error("Switch your wallet to Robinhood Chain and try again.");
        }
        await switchChainAsync({ chainId: chainForListing });
      }

      if (!publicClient) throw new Error("Could not reach Robinhood Chain.");

      // The contract is the authority on whether this is still for sale, and it
      // can disagree with the marketplace: a purchase that settled on-chain but
      // never reached the API — what a dropped session leaves behind — keeps the
      // listing looking live here while `buyListing` reverts with "Already
      // sold". Ask first, so nobody pays gas to be told no.
      const meta = await publicClient.readContract({
        address: contractAddress,
        abi: auctionHouseAbi,
        functionName: "getAuctionMeta",
        args: [listing.id],
      });
      if (meta.settled) {
        const isBuyer = meta.highestBidder.toLowerCase() === address.toLowerCase();
        if (!isAuction && isBuyer) {
          // Already paid for by this wallet, just never recorded — a session
          // that died between the transaction and the callback leaves exactly
          // this. Finish the half that is missing instead of sending a second
          // transaction the contract would reject.
          await persistPurchase(null, listing);
          return true;
        }
        throw new Error(
          isAuction
            ? "This auction has already been settled on-chain."
            : "This listing has already sold on-chain.",
        );
      }

      // The USD price is fixed; how much of the chosen token covers it is not,
      // so ask the contract rather than converting here.
      const amount = await publicClient.readContract({
        address: contractAddress,
        abi: auctionHouseAbi,
        functionName: "quoteUsd",
        args: [token.address, toUsdE8(isAuction ? bidNumber : listing.price)],
      });
      const limit = withSlippage(amount, token.pegged);

      const allowance = await publicClient.readContract({
        address: token.address,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address, contractAddress],
      });

      if (allowance < limit) {
        setStep("approving");
        const approveHash = await writeContractAsync({
          address: token.address,
          abi: erc20Abi,
          functionName: "approve",
          args: [contractAddress, limit],
          account: address,
        });
        const approveReceipt = await publicClient.waitForTransactionReceipt({
          hash: approveHash,
        });
        if (approveReceipt.status === "reverted") {
          throw new Error("The approval transaction reverted.");
        }
      }

      setStep("signing");
      const fid = user?.username ?? address;
      const hash = isAuction
        ? await writeContractAsync({
            address: contractAddress,
            abi: auctionHouseAbi,
            functionName: "placeBid",
            args: [listing.id, token.address, amount, fid],
            account: address,
          })
        : await writeContractAsync({
            address: contractAddress,
            abi: auctionHouseAbi,
            functionName: "buyListing",
            args: [listing.id, token.address, limit, fid],
            account: address,
          });

      setStep("confirming");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === "reverted") {
        throw new Error("The transaction reverted.");
      }

      if (isAuction) {
        let updated: Listing | null = null;
        try {
          updated = await recordListingBid(listing.id, bidNumber, hash);
        } catch (err) {
          console.error("Failed to persist bid:", err);
        }
        options.onBidPlaced?.(updated);
        setStep("done");
        return true;
      }

      try {
        await persistPurchase(hash, listing);
      } catch (err) {
        setPendingPersist(hash);
        setError(
          err instanceof Error
            ? `${err.message} The purchase is on-chain — retry to save it to the marketplace.`
            : "On-chain purchase succeeded — retry to record it on the marketplace.",
        );
        setStep("idle");
      }
    } catch (err) {
      setError(
        writeError(err, isAuction ? "Could not place the bid." : "Could not book this listing."),
      );
      setStep("idle");
    }
    return true;
  }

  return {
    address,
    chainForListing,
    chainSupported,
    tokens,
    token,
    setPayTokenAddress,
    bidAmount,
    setBidAmount,
    bidNumber,
    minimumBid,
    bidInvalid,
    usdAmount,
    quotedAmount,
    step,
    busy,
    error,
    pendingPersist,
    checkout,
    reset,
  };
}

export type ListingCheckout = ReturnType<typeof useListingCheckout>;
