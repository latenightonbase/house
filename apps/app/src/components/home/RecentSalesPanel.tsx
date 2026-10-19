"use client";

import Link from "next/link";
import { ArrowRight, Gavel, ImageIcon, ShoppingBag } from "lucide-react";
import { PosterThumb } from "@/components/listing/ListingPoster";
import { Avatar } from "@/components/ui";
import type { RecentSale, SaleParty } from "@/lib/marketplace";
import { formatTokenAmount } from "@/lib/tokenPrices";
import { RatingBadge } from "@/components/reviews/RatingBadge";

/**
 * "now", "12m", "3h", "2d" — kept to a few characters so the two names beside
 * it get the width. The row's icon and title say what kind of sale it was.
 */
function soldAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function Party({ party, role }: { party: SaleParty; role: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5" title={`${role}: ${party.name}`}>
      <Avatar
        src={party.avatarUrl}
        alt=""
        fallbackSeed={party.wallet ?? party.name}
        fallback={party.name.slice(0, 1).toUpperCase()}
        size={18}
      />
      <span className="sr-only">{role}:</span>
      <span className="truncate text-white/85">{party.name}</span>
      <RatingBadge rating={party.rating} size="xs" />
    </span>
  );
}

/**
 * One sale on one line pair: what sold and for how much, then who sold it to
 * whom. Shaped like the closing-soon rows above it, so the rail reads as one
 * ledger — what is about to sell, then what just did.
 */
function SaleRow({ sale }: { sale: RecentSale }) {
  const won = sale.via === "AUCTION_WIN";
  const Icon = won ? Gavel : ShoppingBag;
  const kind = won ? "Auction" : "Bought";

  return (
    <Link
      href={`/listings/${sale.listingId}`}
      className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-2.5 py-3 transition-colors hover:border-line-strong hover:bg-white/[0.03] focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
    >
      <PosterThumb
        src={sale.posterUrl}
        alt=""
        size={38}
        placeholder={<ImageIcon className="h-4 w-4 opacity-60" />}
        fallbackSeed={sale.listingId}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground transition-colors group-hover:text-primary-bright">
            {sale.title}
          </p>
          <p className="numeric shrink-0 whitespace-nowrap text-[13px] font-bold text-white">
            {formatTokenAmount(sale.amount, sale.tokenName || sale.currency)}
          </p>
        </div>

        <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[11px]">
          <Party party={sale.seller} role="Creator" />
          <ArrowRight className="h-3 w-3 shrink-0 text-caption" aria-hidden="true" />
          <Party party={sale.buyer} role={won ? "Winner" : "Buyer"} />
          {/* Server and client can land either side of a minute boundary. */}
          <span
            className="numeric ml-auto flex shrink-0 items-center gap-1 pl-1 text-caption"
            title={`${kind}, ${new Date(sale.at).toLocaleString()}`}
            suppressHydrationWarning
          >
            <Icon className="h-3 w-3" aria-hidden="true" />
            <span className="sr-only">{kind},</span>
            {soldAgo(sale.at)}
            <span className="sr-only"> ago</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

/**
 * The market's receipts: the last few listings that sold or auctions that
 * closed with a winner, each linking back to its listing. Hidden until the
 * first sale, since an empty ledger says nothing worth the space.
 */
export function RecentSalesPanel({ sales }: { sales: RecentSale[] }) {
  if (sales.length === 0) return null;

  return (
    <section className="card min-w-0 p-4 sm:p-5">
      <header className="flex items-center gap-2">
        <ShoppingBag className="h-[15px] w-[15px] shrink-0 text-positive" aria-hidden="true" />
        <h2 className="panel-label text-primary-light">Recently sold</h2>
      </header>

      <div className="-mx-1 mt-2 flex flex-col divide-y divide-line/70">
        {sales.map((sale) => (
          <SaleRow key={`${sale.via}:${sale.listingId}:${sale.at}`} sale={sale} />
        ))}
      </div>
    </section>
  );
}
