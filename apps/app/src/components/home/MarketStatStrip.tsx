import { Gavel, Store, TrendingUp, Users } from "lucide-react";
import type { AttentionMetrics } from "@/lib/dailyAuction";
import { formatMoney, type Listing } from "@/lib/marketplace";

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 bg-surface px-4 py-3 sm:px-5">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary-light"
      >
        {icon}
      </span>
      <div className="min-w-0">
        {/* Wraps rather than truncates — "Attention volume" loses its meaning
            the moment it is cut, and two phone-width lines cost nothing. */}
        <p className="panel-label leading-tight">{label}</p>
        <p className="numeric mt-0.5 text-[17px] font-bold leading-none text-white">{value}</p>
      </div>
    </div>
  );
}

/**
 * The market's vital signs, above everything else. It exists so the page opens
 * with proof that there is more here than one auction — the listing and auction
 * counts come straight off the feed rendered below them.
 */
export function MarketStatStrip({
  listings,
  metrics,
  dailyAuctionLive,
}: {
  listings: Listing[];
  metrics: AttentionMetrics | null;
  /** The show's own lot counts toward open auctions, but is not in the feed. */
  dailyAuctionLive: boolean;
}) {
  const auctions =
    listings.filter((l) => l.pricingType === "AUCTION").length + (dailyAuctionLive ? 1 : 0);
  const sellers = new Set(listings.map((l) => l.creator.id)).size;

  return (
    // The hairlines are grid gaps over a line-coloured base, so they land
    // between cells at both column counts without per-cell edge classes.
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4">
      <Stat
        icon={<Store className="h-[15px] w-[15px]" />}
        label="Live listings"
        value={String(listings.length)}
      />
      <Stat
        icon={<Gavel className="h-[15px] w-[15px]" />}
        label="Open auctions"
        value={String(auctions)}
      />
      <Stat
        icon={<Users className="h-[15px] w-[15px]" />}
        label={sellers === 1 ? "Seller" : "Sellers"}
        value={String(sellers)}
      />
      <Stat
        icon={<TrendingUp className="h-[15px] w-[15px]" />}
        label="Attention volume"
        value={formatMoney(metrics?.totalVolume ?? 0)}
      />
    </div>
  );
}
