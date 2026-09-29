"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, ChevronDown, Gavel, Loader2, ShoppingBag, Wallet } from "lucide-react";
import { useOpenConnect } from "@/components/connect-intent";
import { EmailVerifyPrompt } from "@/components/EmailVerifyPrompt";
import { useSession } from "@/components/SessionProvider";
import { Tile } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  endsSoon,
  KindBadge,
  money,
  priceLine,
  Seller,
  TypeRow,
} from "@/components/home/listingParts";
import { fetchListingBidders, type Listing, type ListingBidder } from "@/lib/marketplace";
import { useMediaQuery } from "@/lib/useMediaQuery";
import {
  CHECKOUT_STEP_LABEL,
  minimumBidFor,
  useListingCheckout,
  type CheckoutStep,
} from "@/lib/useListingCheckout";
import { cn, relativeEndLabel } from "@/lib/utils";
import { BidHistory } from "./BidHistory";
import { CheckoutFields } from "./CheckoutFields";

/** Long enough that clamping it saves real height in a sheet. */
const LONG_DESCRIPTION = 180;

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="tile min-w-0 px-3 py-2.5">
      <p className="panel-label mb-1">{label}</p>
      <div className="truncate text-[14px] font-semibold text-white">{children}</div>
    </div>
  );
}

/**
 * Buy or bid on a listing without leaving the home screen: a centred modal on
 * a desktop, a bottom drawer on a phone, one body for both. The summary sits
 * above the fold, the action is pinned to the bottom, and the auction's bid
 * history folds away behind Details until someone asks for it.
 */
export function ListingCheckoutSheet({
  listing,
  open,
  onOpenChange,
  onSettled,
}: {
  listing: Listing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A purchase or bid landed — the caller refreshes its feed. */
  onSettled?: () => void;
}) {
  const desktop = useMediaQuery("(min-width: 640px)");
  const checkout = useListingCheckout(listing, {
    onPurchased: () => onSettled?.(),
    onBidPlaced: () => {
      onSettled?.();
      if (listing) {
        void fetchListingBidders(listing.id)
          .then(setBidders)
          .catch(() => {});
      }
    },
  });
  const { busy } = checkout;

  const [bidders, setBidders] = useState<ListingBidder[] | null>(null);
  /** The row that opened the sheet — it is opened from state, not a Trigger, so focus is returned by hand. */
  const returnFocus = useRef<HTMLElement | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [descriptionOpen, setDescriptionOpen] = useState(false);

  // Each open starts clean: a fresh minimum bid, USDG selected, no stale error.
  useEffect(() => {
    if (!open || !listing) return;
    checkout.reset(
      listing.pricingType === "AUCTION"
        ? minimumBidFor(listing, listing.highestBid ?? null)
        : undefined,
    );
    setBidders(null);
    setDetailsOpen(false);
    setDescriptionOpen(false);
    // Keyed on the listing, not its every refresh — a background poll must not
    // wipe a bid someone is typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, listing?.id]);

  // Bid history loads the first time Details opens, not on every sheet open.
  useEffect(() => {
    if (!detailsOpen || bidders !== null || !listing) return;
    let cancelled = false;
    fetchListingBidders(listing.id)
      .then((next) => !cancelled && setBidders(next))
      .catch(() => !cancelled && setBidders([]));
    return () => {
      cancelled = true;
    };
  }, [detailsOpen, bidders, listing]);

  /** A transaction in flight holds the sheet open — closing it loses the progress. */
  function handleOpenChange(next: boolean) {
    if (!next && busy) return;
    onOpenChange(next);
  }

  // Fires before focus moves into the sheet, while the row still holds it.
  function rememberFocus() {
    returnFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }

  function restoreFocus(event: Event) {
    if (!returnFocus.current?.isConnected) return;
    event.preventDefault();
    returnFocus.current.focus();
  }

  if (!listing) return null;

  const body = (
    <SheetBody
      listing={listing}
      checkout={checkout}
      bidders={bidders}
      detailsOpen={detailsOpen}
      onToggleDetails={() => setDetailsOpen((v) => !v)}
      descriptionOpen={descriptionOpen}
      onToggleDescription={() => setDescriptionOpen((v) => !v)}
      onClose={() => handleOpenChange(false)}
      Title={desktop ? DialogTitle : DrawerTitle}
      Description={desktop ? DialogDescription : DrawerDescription}
    />
  );

  if (desktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={!busy}
          className="max-h-[min(90dvh,48rem)]"
          onInteractOutside={(e) => busy && e.preventDefault()}
          onEscapeKeyDown={(e) => busy && e.preventDefault()}
          onOpenAutoFocus={rememberFocus}
          onCloseAutoFocus={restoreFocus}
        >
          {body}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} dismissible={!busy}>
      <DrawerContent onOpenAutoFocus={rememberFocus} onCloseAutoFocus={restoreFocus}>{body}</DrawerContent>
    </Drawer>
  );
}

function SheetBody({
  listing,
  checkout,
  bidders,
  detailsOpen,
  onToggleDetails,
  descriptionOpen,
  onToggleDescription,
  onClose,
  Title,
  Description,
}: {
  listing: Listing;
  checkout: ReturnType<typeof useListingCheckout>;
  bidders: ListingBidder[] | null;
  detailsOpen: boolean;
  onToggleDetails: () => void;
  descriptionOpen: boolean;
  onToggleDescription: () => void;
  onClose: () => void;
  Title: typeof DialogTitle | typeof DrawerTitle;
  Description: typeof DialogDescription | typeof DrawerDescription;
}) {
  const { status, user } = useSession();
  const openConnect = useOpenConnect();
  const detailsId = useId();

  const isAuction = listing.pricingType === "AUCTION";
  const price = priceLine(listing);
  const isOwner = Boolean(
    listing.creator.wallet &&
      user?.wallets.some(
        (w) => w.address.toLowerCase() === listing.creator.wallet!.toLowerCase(),
      ),
  );
  const ended = Boolean(listing.endDate && new Date(listing.endDate).getTime() <= Date.now());
  const unavailable = listing.status !== "ACTIVE" || price.soldOut || ended;
  const bidCount = listing.bidCount ?? 0;
  const description = listing.description?.trim();
  const longDescription = (description?.length ?? 0) > LONG_DESCRIPTION;

  /** The wallet modal lives outside this sheet, so the sheet steps aside for it. */
  function connect() {
    onClose();
    openConnect();
  }

  async function handleAction() {
    if (status !== "authenticated") {
      connect();
      return;
    }
    const ready = await checkout.checkout();
    if (!ready) connect();
  }

  if (checkout.step === "done") {
    return (
      <>
        <Title className="sr-only">{isAuction ? "Bid placed" : "Booking confirmed"}</Title>
        <div className="overflow-y-auto px-5 pb-[calc(1.5rem+var(--safe-bottom))] pt-8 text-center sm:px-6 sm:pb-8">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-positive/30 bg-positive/15">
            <Check className="h-6 w-6 text-positive" aria-hidden="true" />
          </span>
          <p className="mt-4 text-[18px] font-bold text-white">
            {isAuction ? "You're in the lead" : "Booking confirmed"}
          </p>
          <Description className="mx-auto mt-2 max-w-sm">
            {isAuction
              ? `Your $${money(checkout.bidNumber)} bid on ${listing.title} is on-chain. If you are outbid, it is returned to you.`
              : `${listing.title} is booked. Settlement ran through the AuctionHouse, and the seller has been notified.`}
          </Description>
          {isAuction && !user?.emailVerifiedAt ? (
            <EmailVerifyPrompt className="mt-6 border-t border-line pt-6 text-left" onSkip={onClose} />
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="gradient-button eyebrow mt-6 h-11 rounded-lg px-8 text-white"
            >
              Done
            </button>
          )}
        </div>
      </>
    );
  }

  const cta = ctaLabel({
    step: checkout.step,
    authenticated: status === "authenticated",
    pendingPersist: Boolean(checkout.pendingPersist),
    isAuction,
    amount: checkout.usdAmount,
  });
  const canAct = !isOwner && !unavailable;

  return (
    <>
      {/* ── Summary ─────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-4 sm:px-6 sm:pt-6">
        <div className="flex items-center gap-2 pr-10">
          <TypeRow listing={listing} />
          <KindBadge listing={listing} />
        </div>
        <Title className="mt-2 pr-10">{listing.title}</Title>
        <div className="mt-2.5">
          <Seller listing={listing} size={22} />
        </div>

        {description ? (
          <div className="mt-3">
            <Description
              className={cn("whitespace-pre-line", longDescription && !descriptionOpen && "line-clamp-3")}
            >
              {description}
            </Description>
            {longDescription && (
              <button
                type="button"
                onClick={onToggleDescription}
                className="mt-1 text-[12px] font-semibold text-primary-light hover:text-white"
              >
                {descriptionOpen ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        ) : (
          <Description className="sr-only">
            {isAuction ? "Place a bid on this auction." : "Book this listing."}
          </Description>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label={price.label}>
            <span className="numeric text-[15px] font-bold">${money(price.amount)}</span>
          </Stat>
          <Stat label="Ends">
            <span className={cn("text-[13px]", endsSoon(listing.endDate) && "text-warning")}>
              {listing.endDate ? relativeEndLabel(listing.endDate) : "No deadline"}
            </span>
          </Stat>
          <Stat label={isAuction ? "Bids" : "Slots"}>
            {isAuction ? bidCount : price.soldOut ? "Sold out" : listing.slotsAvailable}
          </Stat>
        </div>

        {/* ── Auction details ─────────────────────── */}
        {isAuction && (
          <div className="mt-3 tile overflow-hidden">
            <button
              type="button"
              onClick={onToggleDetails}
              aria-expanded={detailsOpen}
              aria-controls={detailsId}
              className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/45"
            >
              <Gavel className="h-4 w-4 shrink-0 text-primary-light" aria-hidden="true" />
              <span className="text-[13px] font-semibold text-white">Details</span>
              <span className="text-[12px] text-caption">
                {bidCount > 0
                  ? `${bidCount} previous ${bidCount === 1 ? "bid" : "bids"}`
                  : "No bids yet"}
              </span>
              <ChevronDown
                className={cn(
                  "ml-auto h-4 w-4 text-caption transition-transform",
                  detailsOpen && "rotate-180",
                )}
                aria-hidden="true"
              />
            </button>
            {detailsOpen && (
              <div id={detailsId} className="border-t border-line px-3.5">
                <BidHistory bidders={bidders} />
              </div>
            )}
          </div>
        )}

        {/* ── Payment ─────────────────────────────── */}
        <div className="mt-5 border-t border-line pt-5">
          {isOwner ? (
            <Tile className="px-4 py-3 text-[13px] text-caption">
              This is your listing — you cannot buy your own slot.
            </Tile>
          ) : unavailable ? (
            <Tile className="px-4 py-3 text-[13px] text-caption">
              {price.soldOut
                ? "This listing is sold out."
                : ended
                  ? "This listing has ended."
                  : "This listing is no longer available."}
            </Tile>
          ) : (
            <CheckoutFields
              checkout={checkout}
              isAuction={isAuction}
              authenticated={status === "authenticated"}
              onConnect={connect}
            />
          )}
        </div>
      </div>

      {/* ── Action, pinned ──────────────────────── */}
      <div className="shrink-0 space-y-2.5 border-t border-line bg-surface px-5 pb-[calc(1rem+var(--safe-bottom))] pt-4 sm:px-6 sm:pb-5">
        {checkout.busy && (
          <p className="flex items-center justify-center gap-2 text-[12px] text-caption" aria-live="polite">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            {CHECKOUT_STEP_LABEL[checkout.step as keyof typeof CHECKOUT_STEP_LABEL]}
          </p>
        )}
        {canAct && (
          <button
            type="button"
            onClick={() => void handleAction()}
            disabled={checkout.busy || (status === "authenticated" && checkout.bidInvalid)}
            aria-busy={checkout.busy}
            className="gradient-button inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg text-[14px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {checkout.busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : status !== "authenticated" ? (
              <Wallet className="h-4 w-4" aria-hidden="true" />
            ) : isAuction ? (
              <Gavel className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            )}
            {cta}
          </button>
        )}
        <Link
          href={`/listings/${listing.id}`}
          className={cn(
            "flex items-center justify-center gap-1 text-[12px] font-semibold text-caption transition-colors hover:text-white",
            checkout.busy && "pointer-events-none opacity-40",
          )}
          aria-disabled={checkout.busy || undefined}
          tabIndex={checkout.busy ? -1 : undefined}
        >
          View full listing
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </>
  );
}

function ctaLabel({
  step,
  authenticated,
  pendingPersist,
  isAuction,
  amount,
}: {
  step: CheckoutStep;
  authenticated: boolean;
  pendingPersist: boolean;
  isAuction: boolean;
  amount: number;
}) {
  if (step !== "idle" && step !== "done") return "Processing…";
  if (!authenticated) return "Connect wallet";
  if (pendingPersist) return "Retry recording booking";
  const total = amount > 0 ? ` · $${money(amount)}` : "";
  return isAuction ? `Place bid${total}` : `Buy now${total}`;
}
