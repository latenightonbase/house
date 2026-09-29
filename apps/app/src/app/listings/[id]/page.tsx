"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { useOpenConnect } from "@/components/connect-intent";
import { BadgeCheck, CheckCircle2, Clock, Gavel } from "lucide-react";
import { EmailVerifyPrompt } from "@/components/EmailVerifyPrompt";
import { AuctionBidders } from "@/components/listing/AuctionBidders";
import { CheckoutFields } from "@/components/listing/CheckoutFields";
import { PageHeader } from "@/components/PageHeader";
import { useSession } from "@/components/SessionProvider";
import { Badge, BrandAvatar, Button, Card, Panel, Tile } from "@/components/ui";
import {
  activateListing,
  fetchListing,
  fetchListingBidders,
  type Listing,
  type ListingBidder,
} from "@/lib/marketplace";
import {
  auctionHouseAddress,
  auctionHouseAbi,
  CHAIN_LABELS,
  durationHoursUntil,
  toUsdE8,
} from "@/lib/contracts/auctionHouse";
import { robinhood } from "@/lib/chains";
import { categoryMeta } from "@/lib/listingCategories";
import {
  CHECKOUT_STEP_LABEL,
  minimumBidFor,
  useListingCheckout,
  writeError,
} from "@/lib/useListingCheckout";
import { relativeEndLabel, walletFallbackAvatar } from "@/lib/utils";

type PublishStep = "idle" | "switching" | "signing" | "confirming" | "publishing";

const PUBLISH_STEP_LABEL: Record<Exclude<PublishStep, "idle">, string> = {
  switching: CHECKOUT_STEP_LABEL.switching,
  signing: CHECKOUT_STEP_LABEL.signing,
  confirming: CHECKOUT_STEP_LABEL.confirming,
  publishing: "Publishing the listing…",
};

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
  const [publishStep, setPublishStep] = useState<PublishStep>("idle");
  const [publishError, setPublishError] = useState<string | null>(null);

  const chainForListing = listing?.chainId ?? robinhood.id;
  const publicClient = usePublicClient({ chainId: chainForListing });

  // Buying and bidding run through the same hook as the home-screen checkout
  // sheet, so the two surfaces cannot drift apart.
  const checkout = useListingCheckout(listing, {
    currentBid: bidders?.[0]?.amount ?? null,
    onPurchased: setListing,
    onBidPlaced: (updated) => {
      if (updated) setListing(updated);
      void fetchListingBidders(id)
        .then(setBidders)
        .catch(() => {});
    },
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchListing(id), fetchListingBidders(id).catch(() => [] as ListingBidder[])])
      .then(([data, nextBidders]) => {
        if (cancelled) return;
        setListing(data);
        setBidders(nextBidders);
        if (data.pricingType === "AUCTION") {
          checkout.setBidAmount(String(minimumBidFor(data, nextBidders[0]?.amount ?? null)));
        }
      })
      .catch(() => !cancelled && setNotFound(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // `checkout` is a fresh object each render; only the listing id drives a load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const chainSupported = chainId === chainForListing;
  const publishing = publishStep !== "idle";
  const isAuction = listing?.pricingType === "AUCTION";
  const tokens = checkout.tokens;

  /**
   * Approved under the old flow and never published — only its owner can finish
   * that. Sellers now sign at submission, so nothing new arrives in this state;
   * the publish button below is here for the rows that were already in it.
   */
  const awaitingPublish = listing?.status === "DRAFT";
  const pendingReview = listing?.status === "PENDING_REVIEW";
  const rejected = listing?.status === "REJECTED";

  /**
   * Publishes a listing left over from the old flow, where the seller's
   * AuctionHouse transaction came after approval rather than at submission.
   * Until it lands such a listing is approved but invisible.
   */
  async function handlePublish() {
    if (!listing || !listing.endDate) return;
    const house = auctionHouseAddress(chainForListing);
    if (!house) {
      setPublishError("AuctionHouse is not configured for this chain.");
      return;
    }
    if (!address) {
      openConnect();
      return;
    }
    setPublishError(null);

    try {
      if (!chainSupported) {
        setPublishStep("switching");
        if (!switchChainAsync) {
          throw new Error("Switch your wallet to Robinhood Chain and try again.");
        }
        await switchChainAsync({ chainId: chainForListing });
      }
      if (!publicClient) throw new Error("Could not reach Robinhood Chain.");

      setPublishStep("signing");
      const hours = BigInt(durationHoursUntil(new Date(listing.endDate)));
      const args = [listing.id, hours, toUsdE8(listing.price)] as const;
      const hash = await writeContractAsync({
        address: house,
        abi: auctionHouseAbi,
        args,
        account: address,
        functionName:
          listing.pricingType === "AUCTION" ? "startAuction" : "startFixedPriceListing",
      });

      setPublishStep("confirming");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === "reverted") throw new Error("The transaction reverted.");

      setPublishStep("publishing");
      const updated = await activateListing(listing.id, {
        txHash: hash,
        chainId: chainForListing,
        contractAddress: house,
      });
      setListing(updated);
      setPublishStep("idle");
    } catch (err) {
      setPublishError(writeError(err, "Could not publish the listing."));
      setPublishStep("idle");
    }
  }

  async function handleCheckout() {
    if (!listing || unavailable || isOwner) return;
    const ready = await checkout.checkout();
    if (!ready) openConnect();
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

  if (checkout.step === "done") {
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
                ? `${tokens.map((t) => t.symbol).join("/") || "on-chain"} · ${CHAIN_LABELS[chainForListing] ?? "on-chain"}`
                : soldOut
                  ? "Sold out"
                  : `${listing.slotsAvailable} left`}
            </p>
          </div>
        </div>

        {listing.placement && (
          <p className="text-[13px] text-caption">{listing.placement}</p>
        )}

        {isOwner && awaitingPublish ? (
          <div className="space-y-3">
            <Tile className="border-positive/30 bg-positive/10 px-4 py-3 flex gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-positive shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[13px] font-semibold text-white">Approved — one step left</p>
                <p className="text-[12px] text-caption leading-relaxed">
                  Sign the AuctionHouse transaction to put this on-chain. It goes live on the
                  marketplace the moment the transaction confirms.
                </p>
                {listing.reviewNote && (
                  <p className="text-[12px] text-caption leading-relaxed">
                    Note from the team: {listing.reviewNote}
                  </p>
                )}
              </div>
            </Tile>

            {publishError && (
              <Tile className="border-negative/30 bg-negative/10 px-4 py-3 text-[12px] text-negative">
                {publishError}
              </Tile>
            )}

            <Button onClick={() => void handlePublish()} disabled={publishing} className="w-full">
              {publishStep !== "idle" ? PUBLISH_STEP_LABEL[publishStep] : "Publish listing"}
            </Button>
          </div>
        ) : isOwner && pendingReview ? (
          <Tile className="border-warning/30 bg-warning/10 px-4 py-3 flex gap-2.5">
            <Clock className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p className="text-[12px] text-warning leading-relaxed">
              Waiting on review. It is already signed on-chain, so there is nothing more for
              you to do — it goes live the moment the team approves it, whether or not you are
              here. Nobody else can see it until then.
            </p>
          </Tile>
        ) : isOwner && rejected ? (
          <Tile className="border-negative/30 bg-negative/10 px-4 py-3 space-y-1">
            <p className="text-[13px] font-semibold text-negative">Not approved</p>
            <p className="text-[12px] text-caption leading-relaxed">
              {listing.reviewNote ||
                "This listing was turned down. You can adjust it and submit a new one."}
            </p>
            <p className="text-[12px] text-caption leading-relaxed">
              {`The AuctionHouse entry you signed stays on-chain until it closes${
                listing.endDate
                  ? ` on ${new Date(listing.endDate).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}`
                  : ""
              }, and counts against your three open listings until then. Nobody can reach it from LNOC.`}
            </p>
          </Tile>
        ) : isOwner ? (
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
            <CheckoutFields
              checkout={checkout}
              isAuction={isAuction}
              authenticated={status === "authenticated"}
              onConnect={openConnect}
            />

            <Button
              onClick={() => void handleCheckout()}
              disabled={checkout.busy || checkout.bidInvalid}
              className="w-full"
            >
              {checkout.busy
                ? CHECKOUT_STEP_LABEL[checkout.step as keyof typeof CHECKOUT_STEP_LABEL]
                : checkout.pendingPersist
                  ? "Retry recording booking"
                  : isAuction
                    ? "Place bid"
                    : "Buy now"}
            </Button>
          </div>
        )}
      </Card>

      {isAuction ? <AuctionBidders bidders={bidders} loading={bidders === null} /> : null}
    </div>
  );
}
