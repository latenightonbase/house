"use client";

import Link from "next/link";
import { ArrowDown, Gavel, ImageIcon, ShoppingBag } from "lucide-react";
import { PosterThumb } from "@/components/listing/ListingPoster";
import { Avatar } from "@/components/ui";
import type { RecentSale, SaleParty } from "@/lib/marketplace";
import { formatTokenAmount } from "@/lib/tokenPrices";

/** "Just now", "12m ago", "3h ago", "2d ago" — sales are recent by definition. */
function soldAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function Party({ party, role }: { party: SaleParty; role: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar
        src={party.avatarUrl}
        alt=""
        fallbackSeed={party.wallet ?? party.name}
        fallback={party.name.slice(0, 2).toUpperCase()}
        size={24}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium leading-tight text-white">{party.name}</p>
        <p className="text-[10px] uppercase tracking-[0.1em] text-caption">{role}</p>
      </div>
    </div>
  );
}

function SaleTile({ sale }: { sale: RecentSale }) {
  const won = sale.via === "AUCTION_WIN";
  const kind = won ? (sale.isDaily ? "Daily auction" : "Auction") : "Bought";
  const Icon = won ? Gavel : ShoppingBag;

  return (
    <Link
      href={`/listings/${sale.listingId}`}
      className="group flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface-2 p-3.5 transition-colors hover:border-line-strong hover:bg-white/[0.03] focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
    >
      <div className="flex items-start gap-3">
        <PosterThumb
          src={sale.posterUrl}
          alt=""
          size={40}
          placeholder={<ImageIcon className="h-4 w-4 opacity-60" />}
        />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground transition-colors group-hover:text-primary-bright">
            {sale.title}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-caption">
            <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
            {/* Server and client can land either side of a minute boundary. */}
            <span className="truncate" suppressHydrationWarning>
              {kind} · {soldAgo(sale.at)}
            </span>
          </p>
        </div>
      </div>

      <p className="numeric text-[15px] font-bold leading-tight text-white">
        {formatTokenAmount(sale.amount, sale.tokenName || sale.currency)}
      </p>

      {/* Who sold it, then who got it — the direction the money didn't go. */}
      <div className="mt-auto space-y-1.5 border-t border-line pt-3">
        <Party party={sale.seller} role="Creator" />
        <ArrowDown className="ml-[7px] h-2.5 w-2.5 text-caption" aria-hidden="true" />
        <Party party={sale.buyer} role={won ? "Winner" : "Buyer"} />
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
    <section className="card p-4 sm:p-5">
      <header className="flex items-center gap-2">
        <ShoppingBag className="h-[15px] w-[15px] shrink-0 text-primary-light" aria-hidden="true" />
        <h2 className="panel-label text-primary-light">Recently sold</h2>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {sales.map((sale) => (
          <SaleTile key={`${sale.via}:${sale.listingId}:${sale.at}`} sale={sale} />
        ))}
      </div>
    </section>
  );
}
