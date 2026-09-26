"use client";

import Link from "next/link";
import { Badge, Tile, Avatar } from "@/components/ui";
import { ContactButton } from "@/components/profile/ContactButton";
import {
  formatAmount,
  formatDate,
  saleKindLabel,
  type SaleRecord,
} from "@/lib/profileHistory";

/**
 * Past listings and who won them. One component serves both profile pages: the
 * contact button appears only when a counterparty carries a `userId`, which the
 * public endpoint strips. So the public page renders this same history minus
 * the ability to message people from it, with no separate component to drift.
 */
export function SalesHistory({
  sales,
  loading,
  /** Changes the empty state — "You have not…" versus "They have not…". */
  isOwnProfile = false,
}: {
  sales: SaleRecord[] | null;
  loading?: boolean;
  isOwnProfile?: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2" aria-busy="true">
        {[0, 1].map((i) => (
          <div key={i} className="card h-24 animate-pulse bg-white/[0.03]" />
        ))}
      </div>
    );
  }

  if (!sales || sales.length === 0) {
    return (
      <div className="tile border-dashed px-5 py-8 text-center">
        <p className="text-[13px] text-caption leading-relaxed max-w-md mx-auto">
          {isOwnProfile
            ? "Nothing sold yet. Once one of your listings is bought or an auction of yours settles, the winner and what they paid show up here."
            : "This creator has not completed a sale yet."}
        </p>
      </div>
    );
  }

  const totalEarned = sales.reduce((sum, sale) => sum + sale.totalEarned, 0);
  const currency = sales[0]?.currency ?? "USDC";

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-4 flex-wrap">
        <p className="text-[12px] text-caption">
          <span className="text-white font-semibold">{sales.length}</span>{" "}
          {sales.length === 1 ? "listing" : "listings"} sold
        </p>
        <p className="text-[12px] text-caption">
          <span className="text-primary-bright font-semibold">
            {formatAmount(totalEarned, currency)}
          </span>{" "}
          earned
        </p>
      </div>

      <ul className="space-y-2">
        {sales.map((sale) => (
          <li key={sale.listingId}>
            <Tile className="px-4 py-3.5">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/listings/${sale.listingId}`}
                    className="text-[13px] font-semibold text-white hover:text-primary-bright transition-colors"
                  >
                    {sale.title}
                  </Link>
                  <p className="mt-0.5 text-[11px] text-caption">
                    {saleKindLabel(sale)}
                    {sale.settledAt ? ` · Settled ${formatDate(sale.settledAt)}` : ""}
                  </p>
                </div>
                <Badge variant="positive" className="shrink-0">
                  {formatAmount(sale.totalEarned, sale.currency)}
                </Badge>
              </div>

              <ul className="mt-3 space-y-2 border-t border-line pt-3">
                {sale.counterparties.map((party, index) => (
                  <li
                    key={`${sale.listingId}-${party.wallet ?? party.name}-${index}`}
                    className="flex items-center gap-3"
                  >
                    <Avatar
                      src={party.avatarUrl}
                      fallbackSeed={party.wallet ?? party.userId ?? party.name}
                      fallback={party.name.slice(0, 2).toUpperCase()}
                      size={28}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] text-white truncate">
                        {party.username ? (
                          <Link
                            href={`/user/${party.username}`}
                            className="hover:text-primary-bright transition-colors"
                          >
                            {party.name}
                          </Link>
                        ) : (
                          party.name
                        )}
                      </p>
                      <p className="text-[11px] text-caption">
                        Won {formatAmount(party.amount, party.currency)} · {formatDate(party.at)}
                      </p>
                    </div>
                    {party.userId ? (
                      <ContactButton
                        userId={party.userId}
                        listingId={sale.listingId}
                        label="Contact winner"
                        className="shrink-0"
                      />
                    ) : isOwnProfile ? (
                      <span className="shrink-0 text-[11px] text-caption">No account linked</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Tile>
          </li>
        ))}
      </ul>
    </div>
  );
}
