"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BaseError, UserRejectedRequestError, parseUnits } from "viem";
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { useOpenConnect } from "@/components/connect-intent";
import { BadgeCheck, CheckCircle2, Gavel, Info } from "lucide-react";
import { EmailVerifyPrompt } from "@/components/EmailVerifyPrompt";
import { AuctionBidders } from "@/components/listing/AuctionBidders";
import { PageHeader } from "@/components/PageHeader";
import { useSession } from "@/components/SessionProvider";
import {
  Badge,
  BrandAvatar,
  Button,
  Card,
  Field,
  InputAddon,
  Panel,
  TextInput,
  Tile,
} from "@/components/ui";
import {
  bookListing,
  fetchListing,
  fetchListingBidders,
  recordListingBid,
  type Listing,
  type ListingBidder,
} from "@/lib/marketplace";
import {
  auctionHouseAbi,
  auctionHouseAddress,
  CHAIN_LABELS,
  paymentTokens,
  USDG,
} from "@/lib/contracts/auctionHouse";
import { erc20Abi } from "@/lib/contracts/erc20";
import { robinhood } from "@/lib/chains";
import { categoryMeta } from "@/lib/listingCategories";
import { relativeEndLabel, walletFallbackAvatar } from "@/lib/utils";

type Step = "idle" | "switching" | "approving" | "signing" | "confirming" | "publishing" | "done";

const STEP_LABEL: Record<Exclude<Step, "idle" | "done">, string> = {
  switching: "Switch your wallet to Robinhood Chain…",
  approving: "Approve the token spend in your wallet…",
  signing: "Confirm the transaction in your wallet…",
  confirming: "Waiting for the transaction to confirm…",
  publishing: "Recording the booking…",
};

function writeError(err: unknown, fallback: string): string {
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

export default function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { status, user } = useSession();
  const openConnect = useOpenConnect();
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [listing, setListing] = useState<Listing | null>(null);
  const [bidders, setBidders] = useState<ListingBidder[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [bidAmount, setBidAmount] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pendingPersist, setPendingPersist] = useState<string | null>(null);

  const chainForListing = listing?.chainId ?? robinhood.id;
  const publicClient = usePublicClient({ chainId: chainForListing });

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchListing(id), fetchListingBidders(id).catch(() => [] as ListingBidder[])])
      .then(([data, nextBidders]) => {
        if (cancelled) return;
        setListing(data);
        setBidders(nextBidders);
        if (data.pricingType === "AUCTION") {
          setBidAmount(String(data.price));
        }
      })
      .catch(() => !cancelled && setNotFound(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const isOwner = Boolean(
    listing?.creator.wallet &&
      user?.wallets.some(
        (w) => w.address.toLowerCase() === listing.creator.wallet!.toLowerCase(),
      ),
  );

  const ended = Boolean(
    listing?.endDate && new Date(listing.endDate).getTime() <= Date.now(),
  );
  const soldOut = Boolean(listing && listing.slotsAvailable <= 0);
  const unavailable = Boolean(
    listing && (listing.status !== "ACTIVE" || soldOut || ended),
  );

  const tokens = paymentTokens(chainForListing);
  const token = useMemo(() => {
    if (!listing) return tokens[0] ?? USDG;
    return (
      tokens.find(
        (t) => t.address.toLowerCase() === listing.tokenAddress?.toLowerCase(),
      ) ??
      tokens[0] ??
      USDG
    );
  }, [listing, tokens]);

  const contractAddress =
    (listing?.contractAddress as `0x${string}` | undefined) ??
    auctionHouseAddress(chainForListing);
  const chainSupported = chainId === chainForListing;
  const busy = step !== "idle" && step !== "done";
  const isAuction = listing?.pricingType === "AUCTION";
  const bidNumber = Number(bidAmount);
  const bidInvalid =
    isAuction && (!Number.isFinite(bidNumber) || bidNumber < (listing?.price ?? 0));

  async function persistPurchase(txHash: string, current: Listing) {
    setStep("publishing");
    const updated = await bookListing(current.id, txHash);
    setPendingPersist(null);
    setListing(updated);
    setStep("done");
  }

  async function handleCheckout() {
    if (!listing || unavailable || isOwner) return;
    if (!contractAddress) {
      setError("AuctionHouse is not configured for this listing.");
      return;
    }
    if (!address) {
      openConnect();
      return;
    }
    if (isAuction && bidInvalid) {
      setError(`Bid at least $${listing.price.toLocaleString()}.`);
      return;
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
      return;
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

      const amount = parseUnits(
        String(isAuction ? bidNumber : listing.price),
        token.decimals,
      );

      const allowance = await publicClient.readContract({
        address: token.address,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address, contractAddress],
      });

      if (allowance < amount) {
        setStep("approving");
        const approveHash = await writeContractAsync({
          address: token.address,
          abi: erc20Abi,
          functionName: "approve",
          args: [contractAddress, amount],
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
            args: [listing.id, amount, fid],
            account: address,
          })
        : await writeContractAsync({
            address: contractAddress,
            abi: auctionHouseAbi,
            functionName: "buyListing",
            args: [listing.id, fid],
            account: address,
          });

      setStep("confirming");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === "reverted") {
        throw new Error("The transaction reverted.");
      }

      if (isAuction) {
        try {
          const [updated, nextBidders] = await Promise.all([
            recordListingBid(listing.id, bidNumber, hash),
            fetchListingBidders(listing.id).catch(() => null),
          ]);
          setListing(updated);
          if (nextBidders) setBidders(nextBidders);
        } catch (err) {
          console.error("Failed to persist bid:", err);
        }
        setStep("done");
        return;
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
      setError(writeError(err, isAuction ? "Could not place the bid." : "Could not book this listing."));
      setStep("idle");
    }
  }

  if (loading) {
    return <div className="card h-40 animate-pulse bg-white/[0.03]" />;
  }

  if (notFound || !listing) {
    return (
      <Card className="p-6">
        <p className="text-[14px] font-semibold text-foreground">Listing not found</p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-2 text-[13px] text-primary-light hover:text-white transition-colors"
        >
          ← Back to Discover
        </button>
      </Card>
    );
  }

  const meta = categoryMeta(listing.category);
  const avatarSrc =
    listing.creator.avatarUrl || walletFallbackAvatar(listing.creator.wallet);

  if (step === "done") {
    return (
      <div className="space-y-4 max-w-2xl">
        <Panel className="space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-positive shrink-0" />
            <div>
              <h1 className="text-lg font-bold text-foreground">
                {isAuction ? "Bid placed" : "Booking confirmed"}
              </h1>
              <p className="text-[13px] text-caption">
                {isAuction
                  ? `Your bid on ${listing.title} is on-chain.`
                  : `${listing.title} is booked. Settlement ran through the AuctionHouse.`}
              </p>
            </div>
          </div>
          {isAuction && !user?.emailVerifiedAt ? (
            <EmailVerifyPrompt className="pt-2" />
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => router.push("/")}>Back to Discover</Button>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <PageHeader
        title={listing.title}
        subtitle={
          listing.description ||
          (isAuction
            ? "Open to bids — highest bid when it closes wins the slot."
            : "Flat price. First to pay books the slot.")
        }
        action={
          isAuction ? (
            <Badge variant="accent">
              <Gavel className="w-2.5 h-2.5 mr-1" />
              Auction
            </Badge>
          ) : undefined
        }
      />

      <Card className="p-4 sm:p-6 space-y-5">
        <div className="flex items-center gap-3 text-left">
          <BrandAvatar
            src={avatarSrc}
            alt={listing.creator.displayName}
            fallbackSeed={listing.creator.wallet}
            size={48}
          />
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-white truncate flex items-center gap-1">
              {listing.creator.displayName}
              {listing.creator.verified && (
                <BadgeCheck className="w-3.5 h-3.5 text-primary shrink-0" />
              )}
            </p>
            <p className="text-[12px] text-caption truncate">
              {listing.creator.reach} reach · {meta.label}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div className="tile min-w-0 px-3 sm:px-3.5 py-3">
            <p className="panel-label mb-1">
              {isAuction ? (bidders?.[0] ? "Current bid" : "Minimum bid") : "Price"}
            </p>
            <p className="text-[16px] sm:text-[17px] font-bold text-white numeric truncate">
              ${(bidders?.[0]?.amount ?? listing.price).toLocaleString()}
            </p>
          </div>
          <div className="tile min-w-0 px-3 sm:px-3.5 py-3">
            <p className="panel-label mb-1">Closes</p>
            <p className="text-[14px] sm:text-[15px] font-semibold text-white truncate">
              {listing.endDate ? relativeEndLabel(listing.endDate) : "Open"}
            </p>
          </div>
          <div className="tile min-w-0 px-3 sm:px-3.5 py-3 col-span-2 sm:col-span-1">
            <p className="panel-label mb-1">{isAuction ? "Settlement" : "Slots"}</p>
            <p className="text-[14px] sm:text-[15px] font-semibold text-white truncate">
              {isAuction
                ? `${listing.tokenName ?? listing.currency} · ${CHAIN_LABELS[chainForListing] ?? "on-chain"}`
                : soldOut
                  ? "Sold out"
                  : `${listing.slotsAvailable} left`}
            </p>
          </div>
        </div>

        {listing.placement && (
          <p className="text-[13px] text-caption">{listing.placement}</p>
        )}

        {isOwner ? (
          <Tile className="px-4 py-3 text-[13px] text-caption">
            This is your listing. Buyers book it from Discover — you cannot buy your own slot.
          </Tile>
        ) : status !== "authenticated" ? (
          <Panel className="flex flex-col items-start gap-3">
            <p className="text-sm text-caption">
              Connect and sign in with your wallet to {isAuction ? "place a bid" : "book this slot"}.
            </p>
            <Button onClick={() => openConnect()} className="w-full sm:w-auto">
              Connect wallet
            </Button>
          </Panel>
        ) : unavailable ? (
          <Tile className="px-4 py-3 text-[13px] text-caption">
            {soldOut
              ? "This listing is sold out."
              : ended
                ? "This listing has ended."
                : "This listing is no longer available."}
          </Tile>
        ) : (
          <div className="space-y-3">
            {isAuction && (
              <Field
                label="Your bid"
                htmlFor="bid"
                hint={`Minimum $${listing.price.toLocaleString()} ${token.symbol}`}
                error={bidInvalid ? `Bid at least $${listing.price.toLocaleString()}.` : undefined}
              >
                <InputAddon prefix="$" suffix={token.symbol}>
                  <TextInput
                    id="bid"
                    type="number"
                    min={listing.price}
                    step={1}
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    disabled={busy}
                    className="pl-7 pr-16"
                  />
                </InputAddon>
              </Field>
            )}

            {!address && (
              <Tile className="border-warning/30 bg-warning/10 px-4 py-3 flex gap-2.5">
                <Info className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-[12px] text-warning leading-relaxed">
                    Your session is signed in, but the wallet is disconnected. Reconnect
                    it to confirm the transaction.
                  </p>
                  <Button size="sm" variant="accent-outline" onClick={openConnect}>
                    Reconnect wallet
                  </Button>
                </div>
              </Tile>
            )}

            {address && !chainSupported && (
              <Tile className="border-warning/30 bg-warning/10 px-4 py-3 flex gap-2.5">
                <Info className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <p className="text-[12px] text-warning leading-relaxed">
                  Settlement runs on {CHAIN_LABELS[chainForListing] ?? "Robinhood Chain"}. Your
                  wallet will be asked to switch before the transaction.
                </p>
              </Tile>
            )}

            {error && (
              <Tile className="border-negative/30 bg-negative/10 px-4 py-3 text-[12px] text-negative">
                {error}
              </Tile>
            )}

            <Button
              onClick={() => void handleCheckout()}
              disabled={busy || bidInvalid}
              className="w-full"
            >
              {busy
                ? STEP_LABEL[step]
                : pendingPersist
                  ? "Retry recording booking"
                  : isAuction
                    ? "Place bid"
                    : "Book"}
            </Button>
          </div>
        )}
      </Card>

      {isAuction ? <AuctionBidders bidders={bidders} loading={bidders === null} /> : null}
    </div>
  );
}
