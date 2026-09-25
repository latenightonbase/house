"use client";

import Link from "next/link";
import { Badge, Tile, Avatar } from "@/components/ui";
import { ContactButton } from "@/components/profile/ContactButton";
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
}: {
  purchases: PurchaseRecord[] | null;
  loading?: boolean;
  isOwnProfile?: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2" aria-busy="true">
        {[0, 1].map((i) => (
          <div key={i} className="card h-20 animate-pulse bg-white/[0.03]" />
        ))}
      </div>
    );
  }

  if (!purchases || purchases.length === 0) {
    return (
      <div className="tile border-dashed px-5 py-8 text-center">
        <p className="text-[13px] text-caption leading-relaxed max-w-md mx-auto">
          {isOwnProfile
            ? "Nothing bought yet. Listings you buy and auctions you win will appear here, each with a way to reach the creator."
            : "This account has not bought or won anything yet."}
        </p>
      </div>
    );
  }

  const totalSpent = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);
  const currency = purchases[0]?.currency ?? "USDC";

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-4 flex-wrap">
        <p className="text-[12px] text-caption">
          <span className="text-white font-semibold">{purchases.length}</span>{" "}
          {purchases.length === 1 ? "acquisition" : "acquisitions"}
        </p>
        <p className="text-[12px] text-caption">
          <span className="text-primary-bright font-semibold">
            {formatAmount(totalSpent, currency)}
          </span>{" "}
          spent
        </p>
      </div>

      <ul className="space-y-2">
        {purchases.map((purchase) => (
          <li key={`${purchase.listingId}-${purchase.via}-${purchase.at}`}>
            <Tile className="px-4 py-3.5">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/listings/${purchase.listingId}`}
                    className="text-[13px] font-semibold text-white hover:text-primary-bright transition-colors"
                  >
                    {purchase.title}
                  </Link>
                  <p className="mt-0.5 text-[11px] text-caption">
                    {purchase.via === "AUCTION_WIN" ? "Auction won" : "Bought"}
                    {purchase.isDaily ? " · Daily auction" : ""} · {formatDate(purchase.at)}
                  </p>
                </div>
                <Badge variant="accent" className="shrink-0">
                  {formatAmount(purchase.amount, purchase.currency)}
                </Badge>
              </div>

              <div className="mt-3 flex items-center gap-3 border-t border-line pt-3">
                <Avatar
                  src={purchase.seller.avatarUrl}
                  fallback={purchase.seller.name.slice(0, 2).toUpperCase()}
                  size={28}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-white truncate">
                    {purchase.seller.username ? (
                      <Link
                        href={`/user/${purchase.seller.username}`}
                        className="hover:text-primary-bright transition-colors"
                      >
                        {purchase.seller.name}
                      </Link>
                    ) : (
                      purchase.seller.name
                    )}
                  </p>
                  <p className="text-[11px] text-caption">Listing creator</p>
                </div>
                {purchase.seller.userId ? (
                  <ContactButton
                    userId={purchase.seller.userId}
                    listingId={purchase.listingId}
                    label="Contact creator"
                    className="shrink-0"
                  />
                ) : isOwnProfile ? (
                  <span className="shrink-0 text-[11px] text-caption">No account linked</span>
                ) : null}
              </div>
            </Tile>
          </li>
        ))}
      </ul>
    </div>
  );
}
