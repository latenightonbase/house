"use client";

import { ContactButton } from "@/components/profile/ContactButton";
import { PartyRow } from "@/components/profile/HistoryParts";
import { ReviewButton } from "@/components/reviews/ReviewButton";
import { Tile } from "@/components/ui";
import type { Listing } from "@/lib/marketplace";
import type { ListingDeal } from "@/lib/profileHistory";

/**
 * On a fixed-price listing the viewer bought or sold: who was on the other
 * side, with "Rate" and "Message" right there. Ratings were otherwise only
 * reachable from the profile's history tabs, which nobody thinks to open
 * after a sale. Auctions show the same through `AuctionResult`.
 */
export function ListingDeals({
  listing,
  deals,
  onReviewed,
}: {
  listing: Listing;
  deals: ListingDeal[];
  onReviewed?: () => void;
}) {
  if (deals.length === 0) return null;
  const selling = deals[0].side === "SELLER";
  const unrated = deals.some((deal) => !deal.myReview);

  return (
    <Tile className="space-y-3 px-4 py-3.5">
      <div className="space-y-0.5">
        <p className="text-[13px] font-semibold text-white">
          {selling
            ? deals.length === 1
              ? "You sold this"
              : `You sold this ${deals.length} times`
            : "You bought this"}
        </p>
        <p className="text-[12px] leading-relaxed text-caption">
          {unrated
            ? `How did it go? Rate the ${selling ? "buyer" : "seller"} — it shows on their public profile.`
            : "Thanks for rating. You can change it any time."}
        </p>
      </div>
      <ul className="space-y-2.5">
        {deals.map((deal) => (
          <li key={deal.dealKey}>
            <PartyRow
              party={{ ...deal.counterparty, amount: deal.amount, currency: deal.currency, at: deal.at }}
              action={
                <div className="flex items-start gap-2">
                  {deal.counterparty.userId && (
                    <ReviewButton
                      dealKey={deal.dealKey}
                      name={deal.counterparty.name}
                      role={selling ? "BUYER" : "SELLER"}
                      listingTitle={listing.title}
                      existing={deal.myReview}
                      label={selling ? "Rate buyer" : "Rate seller"}
                      variant="primary"
                      onSaved={onReviewed}
                    />
                  )}
                  {deal.counterparty.userId && (
                    <ContactButton
                      userId={deal.counterparty.userId}
                      listingId={listing.id}
                      label="Message"
                    />
                  )}
                </div>
              }
            />
          </li>
        ))}
      </ul>
    </Tile>
  );
}
