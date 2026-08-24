"use client";

import { BrandAvatar, Panel, PanelHeader, ViewAllLink } from "@/components/ui";
import { relativeEndLabel } from "@/lib/utils";
import type { Auction } from "@/lib/marketplace";

interface LiveAuctionsProps {
  auctions: Auction[];
  loading?: boolean;
  onOpenAuction?: (auctionId: string) => void;
  onViewAll?: () => void;
}

/** Open bookings: mark, title, starting price, and a calm relative close date. */
export function LiveAuctions({
  auctions,
  loading = false,
  onOpenAuction,
  onViewAll,
}: LiveAuctionsProps) {
  return (
    <Panel padded={false} className="flex flex-col">
      <div className="p-4">
        <PanelHeader label="Open auctions" action={<ViewAllLink onClick={onViewAll} />} />
      </div>

      {loading ? (
        <div className="px-4 pb-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : auctions.length === 0 ? (
        <p className="px-4 pb-6 text-sm text-caption">Nothing open for booking right now.</p>
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
                  <p className="text-[11px] text-caption truncate">
                    {relativeEndLabel(auction.endDate)}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-[11px] text-caption">Starting at</p>
                  <p className="text-[13px] font-bold text-white numeric">
                    ${auction.minimumBid.toLocaleString()}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenAuction?.(auction.id)}
                  className="btn-accent-outline shrink-0 px-3 py-2 text-[12px] font-medium max-sm:w-full"
                >
                  View
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
