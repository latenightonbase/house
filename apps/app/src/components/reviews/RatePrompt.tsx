"use client";

import { ReviewButton } from "@/components/reviews/ReviewButton";
import type { Listing } from "@/lib/marketplace";
import { cn } from "@/lib/utils";

/**
 * Shown on the confirmation screen right after a purchase: the moment the
 * buyer is most likely to rate, so the ask is made there rather than left in
 * the profile's history tabs. Rating now is optional — the same button lives
 * on the listing page and in their history to come back to after delivery.
 */
export function RatePrompt({
  listing,
  dealKey,
  className,
}: {
  listing: Listing;
  dealKey: string | null;
  className?: string;
}) {
  if (!dealKey) return null;
  return (
    <div className={cn("rounded-xl border border-line bg-surface-2 px-4 py-3.5 text-left", className)}>
      <p className="text-[13px] font-semibold text-white">How was {listing.creator.displayName}?</p>
      <p className="mt-0.5 text-[12px] leading-relaxed text-caption">
        Rate the seller now or once it&apos;s delivered — it builds trust for the next buyer, and
        you can change it any time from the listing or your profile.
      </p>
      <ReviewButton
        dealKey={dealKey}
        name={listing.creator.displayName}
        role="SELLER"
        listingTitle={listing.title}
        existing={null}
        label="Rate the seller"
        className="mt-3"
      />
    </div>
  );
}
