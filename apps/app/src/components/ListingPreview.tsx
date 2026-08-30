"use client";

import type { ReactNode } from "react";
import { Eye } from "lucide-react";
import { ListingCard } from "@/components/ListingCard";
import { Tile } from "@/components/ui";
import type { Listing } from "@/lib/marketplace";

interface Row {
  label: string;
  value: string;
}

/**
 * The card as buyers will meet it, rendered from the same component the
 * marketplace uses — so the preview cannot drift from the real thing.
 */
export function ListingPreview({
  listing,
  rows,
  action,
}: {
  listing: Listing;
  rows: Row[];
  action?: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Eye className="w-3.5 h-3.5 text-caption" />
        <span className="panel-label">Preview</span>
        {action ? <div className="ml-auto shrink-0">{action}</div> : null}
      </div>

      <ListingCard listing={listing} />

      <Tile className="divide-y divide-line">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-3 px-3 py-2"
          >
            <span className="text-[11px] text-caption shrink-0">{row.label}</span>
            <span className="text-[11px] font-medium text-white text-right">
              {row.value}
            </span>
          </div>
        ))}
      </Tile>

      <p className="text-[11px] text-caption leading-relaxed">
        This is how the listing appears on Discover and in the marketplace.
      </p>
    </div>
  );
}
