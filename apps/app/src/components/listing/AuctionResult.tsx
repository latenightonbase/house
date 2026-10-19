"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { ContactButton } from "@/components/profile/ContactButton";
import { Tile } from "@/components/ui";
import type { Listing, ListingBidder } from "@/lib/marketplace";
import { fetchMyProfileOverview } from "@/lib/profileHistory";
import { formatListingAmount } from "@/lib/tokenPrices";
import { shortAddress } from "@/lib/utils";
import { RatingBadge } from "@/components/reviews/RatingBadge";

/**
 * The outcome of a settled auction, in place of the bid form. The two people
 * who now have to talk — winner and seller — get a button straight into that
 * thread; everyone else just sees who won.
 *
 * The other side's user id only comes from the viewer's own history (the public
 * listing payload never carries one), so it is read from there and the button
 * appears once it resolves.
 */
export function AuctionResult({
  listing,
  bidders,
  viewerWallets,
  isOwner,
}: {
  listing: Listing;
  bidders: ListingBidder[] | null;
  /** Lower-cased addresses of the signed-in user; empty when signed out. */
  viewerWallets: string[];
  isOwner: boolean;
}) {
  const winnerWallet = listing.winnerWallet!.toLowerCase();
  const isWinner = viewerWallets.includes(winnerWallet);
  const winningBid = bidders?.find((b) => b.wallet.toLowerCase() === winnerWallet) ?? null;
  const [contactId, setContactId] = useState<string | null>(null);

  useEffect(() => {
    if (!isWinner && !isOwner) return;
    let cancelled = false;
    fetchMyProfileOverview()
      .then((overview) => {
        if (cancelled) return;
        const id = isWinner
          ? overview.purchases.find((p) => p.listingId === listing.id)?.seller.userId
          : overview.sales
              .find((s) => s.listingId === listing.id)
              ?.counterparties.find((c) => c.wallet?.toLowerCase() === winnerWallet)?.userId;
        setContactId(id ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isWinner, isOwner, listing.id, winnerWallet]);

  const winnerName = isWinner ? "You" : (winningBid?.name ?? shortAddress(winnerWallet));
  const amount = winningBid ? ` for ${formatListingAmount(listing, winningBid.amount)}` : "";

  return (
    <Tile className="flex flex-col gap-3 border-warning/35 bg-warning/[0.07] px-4 py-3.5 sm:flex-row sm:items-center">
      <Trophy className="hidden h-5 w-5 shrink-0 text-warning sm:block" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="flex flex-wrap items-center gap-x-1.5 text-[14px] font-semibold text-white">
          <span>
            {winnerName} won this auction{amount}
          </span>
          {!isWinner && <RatingBadge rating={winningBid?.rating} />}
        </p>
        <p className="text-[12px] leading-relaxed text-caption">
          {isWinner
            ? `Message ${listing.creator.displayName} to arrange what you won.`
            : isOwner
              ? "Message the winner to arrange delivery."
              : "Bidding has closed."}
        </p>
      </div>
      {contactId && (
        <ContactButton
          userId={contactId}
          listingId={listing.id}
          label={isWinner ? "Message creator" : "Message winner"}
          size="md"
          className="shrink-0"
        />
      )}
    </Tile>
  );
}
