"use client";

import { ContactButton } from "@/components/profile/ContactButton";
import {
  HistoryEmpty,
  HistoryRow,
  HistorySkeleton,
  PartyRow,
} from "@/components/profile/HistoryParts";
import { formatAmount, formatDate, saleKindLabel, type SaleRecord } from "@/lib/profileHistory";

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
  if (loading) return <HistorySkeleton />;

  if (!sales || sales.length === 0) {
    return (
      <HistoryEmpty>
        {isOwnProfile
          ? "Nothing sold yet. Once one of your listings is bought or an auction of yours settles, the winner and what they paid show up here."
          : "This creator has not completed a sale yet."}
      </HistoryEmpty>
    );
  }

  return (
    <ul className="space-y-2">
      {sales.map((sale) => (
        <li key={sale.listingId}>
          <HistoryRow
            href={`/listings/${sale.listingId}`}
            title={sale.title}
            meta={`${saleKindLabel(sale)}${
              sale.settledAt ? ` · Settled ${formatDate(sale.settledAt)}` : ""
            }`}
            amount={formatAmount(sale.totalEarned, sale.currency)}
            amountTone="positive"
          >
            <ul className="space-y-2.5">
              {sale.counterparties.map((party, index) => (
                <li key={`${sale.listingId}-${party.wallet ?? party.name}-${index}`}>
                  <PartyRow
                    party={party}
                    action={
                      party.userId ? (
                        <ContactButton
                          userId={party.userId}
                          listingId={sale.listingId}
                          label="Message"
                          className="shrink-0"
                        />
                      ) : isOwnProfile ? (
                        <span className="shrink-0 text-[11px] text-caption">No account</span>
                      ) : null
                    }
                  />
                </li>
              ))}
            </ul>
          </HistoryRow>
        </li>
      ))}
    </ul>
  );
}
