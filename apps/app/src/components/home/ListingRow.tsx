import Link from "next/link";
import type { Listing } from "@/lib/marketplace";
import { cn } from "@/lib/utils";
import { EndLabel, KindBadge, money, priceLine, Seller, TypeRow } from "./listingParts";

/** The column rule the header and every row share, so the two stay aligned. */
const COLUMNS =
  "grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,2.6fr)_minmax(0,1.2fr)_6.5rem_6.5rem]";

/** Column captions — desktop only, where the row actually reads as a table. */
export function ListingRowHeader() {
  return (
    <div
      className={cn(
        "hidden items-center gap-x-4 px-4 pb-2 lg:grid",
        COLUMNS,
        "panel-label border-b border-line",
      )}
    >
      <span>Listing</span>
      <span>Seller</span>
      <span className="text-right">Price</span>
      <span className="text-right">Ends</span>
    </div>
  );
}

/**
 * One piece of seller inventory, dense enough that a screenful of the market
 * fits beside the daily auction rather than below it. The whole row is the
 * link — the pill at the end is decoration, so nothing interactive nests.
 */
export function ListingRow({ listing }: { listing: Listing }) {
  const price = priceLine(listing);

  return (
    <Link
      href={`/listings/${listing.id}`}
      className={cn(
        "group grid items-center gap-x-4 gap-y-2 rounded-xl border border-transparent px-4 py-3 transition-colors",
        "hover:border-line-strong hover:bg-white/[0.03]",
        "focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45",
        COLUMNS,
      )}
    >
      <div className="min-w-0">
        {/* Kind rides in the listing cell rather than taking a column of its
            own — in a two-thirds panel the width is better spent on the title. */}
        <div className="flex min-w-0 items-center gap-2">
          <TypeRow listing={listing} />
          <span className="hidden lg:block">
            <KindBadge listing={listing} />
          </span>
        </div>
        <p className="mt-1 truncate text-[13px] font-semibold text-foreground">{listing.title}</p>
      </div>

      {/* The seller belongs next to the price on a phone, not in a column of
          its own — so below lg it rides along the row's second line. */}
      <div className="hidden min-w-0 lg:block">
        <Seller listing={listing} />
      </div>

      <div className="text-right">
        <p className="numeric text-[15px] font-bold leading-tight text-white">
          ${money(price.amount)}
        </p>
        <p className="text-[10px] text-caption">{price.note}</p>
      </div>

      <div className="hidden items-center justify-end gap-3 lg:flex">
        <EndLabel listing={listing} />
      </div>

      <div className="col-span-2 flex items-center justify-between gap-3 lg:hidden">
        <Seller listing={listing} size={20} showReach={false} />
        <div className="flex shrink-0 items-center gap-2.5">
          <EndLabel listing={listing} />
          <KindBadge listing={listing} />
        </div>
      </div>
    </Link>
  );
}
