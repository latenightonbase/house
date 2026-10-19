"use client";

import { ContactButton } from "@/components/profile/ContactButton";
import { ReviewButton } from "@/components/reviews/ReviewButton";
import {
  HistoryEmpty,
  HistoryRow,
  HistorySkeleton,
  PartyRow,
} from "@/components/profile/HistoryParts";
import { formatAmount, formatDate, type PurchaseRecord } from "@/lib/profileHistory";

/**
 * Listings bought and auctions won, each with the creator who sold it. Same
 * arrangement as the sales list: the contact button is driven by whether the
 * seller carries a `userId`, so the public view of this section is the private
 * one without the messaging affordance.
 */
export function PurchaseHistory({
  purchases,
  loading,
  isOwnProfile = false,
  onReviewed,
}: {
  purchases: PurchaseRecord[] | null;
  loading?: boolean;
  isOwnProfile?: boolean;
  /** Called after a seller is rated, so the page can refresh its review totals. */
  onReviewed?: () => void;
}) {
  if (loading) return <HistorySkeleton />;

  if (!purchases || purchases.length === 0) {
    return (
      <HistoryEmpty>
        {isOwnProfile
          ? "Nothing bought yet. Listings you buy and auctions you win will appear here, each with a way to reach the creator."
          : "This account has not bought or won anything yet."}
      </HistoryEmpty>
    );
  }

  return (
    <ul className="space-y-2">
      {purchases.map((purchase) => (
        <li key={`${purchase.listingId}-${purchase.via}-${purchase.at}`}>
          <HistoryRow
            href={`/listings/${purchase.listingId}`}
            title={purchase.title}
            posterUrl={purchase.posterUrl}
            meta={`${purchase.via === "AUCTION_WIN" ? "Auction won" : "Bought"} · ${formatDate(purchase.at)}`}
            amount={formatAmount(purchase.amount, purchase.currency)}
          >
            <PartyRow
              party={purchase.seller}
              caption="Listing creator"
              action={
                purchase.seller.userId ? (
                  <div className="flex shrink-0 items-start gap-2">
                    <ReviewButton
                      dealKey={purchase.dealKey}
                      name={purchase.seller.name}
                      role="SELLER"
                      listingTitle={purchase.title}
                      existing={purchase.myReview}
                      onSaved={onReviewed}
                    />
                    <ContactButton
                      userId={purchase.seller.userId}
                      listingId={purchase.listingId}
                      label="Message"
                    />
                  </div>
                ) : isOwnProfile ? (
                  <span className="shrink-0 text-[11px] text-caption">No account</span>
                ) : null
              }
            />
          </HistoryRow>
        </li>
      ))}
    </ul>
  );
}
