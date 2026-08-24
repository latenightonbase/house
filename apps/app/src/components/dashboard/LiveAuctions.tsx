"use client";

import { BrandAvatar, Countdown, Panel, PanelHeader, ViewAllLink } from "@/components/ui";
import type { Auction } from "@/lib/marketplace";

interface LiveAuctionsProps {
  auctions: Auction[];
  loading?: boolean;
  onOpenAuction?: (auctionId: string) => void;
  onViewAll?: () => void;
}

/** Live auction rows: mark, title, current bid, countdown, and the action. */
export function LiveAuctions({
  auctions,
  loading = false,
  onOpenAuction,
  onViewAll,
}: LiveAuctionsProps) {
  return (
    <Panel padded={false} className="flex flex-col">
      <div className="p-4">
        <PanelHeader label="Live Auctions" action={<ViewAllLink onClick={onViewAll} />} />
      </div>

      {loading ? (
        <div className="px-4 pb-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : auctions.length === 0 ? (
        <p className="px-4 pb-6 text-sm text-caption">No auctions are live right now.</p>
      ) : (
        <ul className="border-t border-line">
          {auctions.map((auction) => (
            <li key={auction.id} className="border-b border-line last:border-0 row-hover">
              <div className="px-4 py-3 flex items-center gap-3 max-sm:flex-wrap">
                <BrandAvatar
                  src={auction.imageUrl}
                  alt={auction.title}
                  size={38}
                  shape="square"
                  fallbackSeed={auction.title}
                />

                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-white truncate">{auction.title}</p>
                  <p className="text-[11px] text-caption truncate">{auction.description}</p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="panel-label mb-0.5">Current Bid</p>
                  <p className="text-[13px] font-bold text-white numeric">
                    ${auction.highestBid.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-caption">{auction.bidCount} bids</p>
                </div>

                <div className="shrink-0 text-right min-w-[76px]">
                  <p className="panel-label mb-0.5">Ends In</p>
                  <Countdown endDate={auction.endDate} className="text-[13px]" />
                </div>

                <button
                  type="button"
                  onClick={() => onOpenAuction?.(auction.id)}
                  className="btn-accent-outline shrink-0 px-3 py-2 text-[10px] tracking-[0.08em] uppercase max-sm:w-full"
                >
                  View Auction
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
