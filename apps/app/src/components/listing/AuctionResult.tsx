"use client";

import { Trophy } from "lucide-react";
import { ContactButton } from "@/components/profile/ContactButton";
import { Tile } from "@/components/ui";
import type { Listing, ListingBidder } from "@/lib/marketplace";
import type { ListingDeal } from "@/lib/profileHistory";
import { ReviewButton } from "@/components/reviews/ReviewButton";
import { formatListingAmount } from "@/lib/tokenPrices";
import { shortAddress } from "@/lib/utils";
import { RatingBadge } from "@/components/reviews/RatingBadge";
import { UserLink } from "@/components/UserLink";

/**
 * The outcome of a settled auction, in place of the bid form. The two people
 * who now have to talk — winner and seller — get a button straight into that
 * thread; everyone else just sees who won.
 *
 * The other side's user id only comes from the viewer's own deals (the public
 * listing payload never carries one), so the buttons appear once those load.
 * The same two people can also rate each other from here.
 */
export function AuctionResult({
  listing,
  bidders,
  viewerWallets,
  isOwner,
  deals,
  onReviewed,
}: {
  listing: Listing;
  bidders: ListingBidder[] | null;
  /** Lower-cased addresses of the signed-in user; empty when signed out. */
  viewerWallets: string[];
  isOwner: boolean;
  /** The viewer's own deals on this listing — see `useListingDeals`. */
  deals: ListingDeal[];
  onReviewed?: () => void;
}) {
  const winnerWallet = listing.winnerWallet!.toLowerCase();
  const isWinner = viewerWallets.includes(winnerWallet);
  const winningBid = bidders?.find((b) => b.wallet.toLowerCase() === winnerWallet) ?? null;
  const deal = deals.find((d) => d.dealKey === `auction:${listing.id}`) ?? null;
  const contactId = deal?.counterparty.userId ?? null;

  const winnerName = isWinner ? (
    "You"
  ) : (
    <UserLink handle={winningBid?.handle} className="underline-offset-2">
      {winningBid?.name ?? shortAddress(winnerWallet)}
    </UserLink>
  );
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
            ? <>
                Message{" "}
                <UserLink handle={listing.creator.handle} className="text-white">
                  {listing.creator.displayName}
                </UserLink>{" "}
                to arrange what you won.
              </>
            : isOwner
              ? "Message the winner to arrange delivery."
              : "Bidding has closed."}
        </p>
      </div>
      {deal && contactId && (
        <ReviewButton
          dealKey={deal.dealKey}
          name={deal.counterparty.name}
          role={isWinner ? "SELLER" : "BUYER"}
          listingTitle={listing.title}
          existing={deal.myReview}
          label={isWinner ? "Rate seller" : "Rate winner"}
          onSaved={onReviewed}
          size="md"
          variant="primary"
          className="shrink-0"
        />
      )}
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
