"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Gavel, ImageOff, Inbox, Search, Trash2 } from "lucide-react";
import { ListingPoster } from "@/components/listing/ListingPoster";
import { PageHeader } from "@/components/PageHeader";
import { Badge, BrandAvatar, Button, Card, Panel, TextInput, Tile } from "@/components/ui";
import { deleteListingAsAdmin, fetchAdminListings, type Listing } from "@/lib/marketplace";
import { relativeEndLabel, walletFallbackAvatar } from "@/lib/utils";
import { formatListingAmount } from "@/lib/tokenPrices";
import { AdminTabs } from "../AdminTabs";

/**
 * Moderation for live listings. Anyone can list without review, so this is
 * where an admin takes down anything offensive — as long as nobody has bid on
 * it yet. A listing with bids stays: those bidders have funds escrowed on-chain
 * and the row is what settles and refunds them.
 */
export default function AdminListingsClient() {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [working, setWorking] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    fetchAdminListings()
      .then(setListings)
      .catch((err: unknown) =>
        setLoadError(err instanceof Error ? err.message : "Could not load listings."),
      );
  }, []);

  useEffect(load, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!listings || !q) return listings;
    return listings.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.creator.displayName.toLowerCase().includes(q) ||
        l.creator.username?.toLowerCase().includes(q) ||
        l.creator.wallet?.toLowerCase().includes(q),
    );
  }, [listings, query]);

  async function remove(listing: Listing) {
    if (
      !window.confirm(
        `Delete "${listing.title}"? It comes off the marketplace for good and cannot be restored.`,
      )
    ) {
      return;
    }

    setWorking(listing.id);
    setRowError((e) => ({ ...e, [listing.id]: "" }));
    try {
      await deleteListingAsAdmin(listing.id);
      setListings((current) => current?.filter((l) => l.id !== listing.id) ?? null);
    } catch (err) {
      setRowError((e) => ({
        ...e,
        [listing.id]: err instanceof Error ? err.message : "Could not delete the listing.",
      }));
      // A refusal usually means a bid landed since the page loaded — refresh
      // the counts so the row says so.
      load();
    } finally {
      setWorking(null);
    }
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <PageHeader
        title="Admin · Listings"
        subtitle="Every live listing on the marketplace. Delete anything offensive — a listing can only be deleted while nobody has bid on it."
        action={
          <div className="flex items-center gap-2">
            {listings ? <Badge variant="neutral">{listings.length} live</Badge> : null}
            <AdminTabs />
          </div>
        }
      />

      {loadError && (
        <Tile className="border-negative/30 bg-negative/10 px-4 py-3 text-[12px] text-negative">
          {loadError}
        </Tile>
      )}

      {listings && listings.length > 0 && (
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-caption"
            aria-hidden="true"
          />
          <TextInput
            aria-label="Search listings"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, seller or wallet"
            className="pl-9"
          />
        </div>
      )}

      {listings === null && !loadError ? (
        <div className="card h-40 animate-pulse bg-white/[0.03]" />
      ) : visible?.length === 0 ? (
        <Panel className="flex flex-col items-center gap-2 py-12 text-center">
          <Inbox className="w-7 h-7 text-caption" aria-hidden="true" />
          <p className="text-[14px] font-semibold text-white">
            {query.trim() ? "No listings match" : "No live listings"}
          </p>
          <p className="text-[12px] text-caption max-w-sm">
            {query.trim()
              ? "Try a different title, seller name or wallet."
              : "Listings go live as soon as a seller signs for them, and show up here."}
          </p>
        </Panel>
      ) : (
        visible?.map((listing) => {
          const busy = working === listing.id;
          const bids = listing.bidCount ?? 0;
          return (
            <Card key={listing.id} className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-2">
                  {listing.posterUrl ? (
                    <ListingPoster
                      src={listing.posterUrl}
                      alt={`Poster for ${listing.title}`}
                      fit="cover"
                      sizes="64px"
                      className="h-full w-full"
                      fallback={<PosterPlaceholder />}
                    />
                  ) : (
                    <PosterPlaceholder />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/listings/${listing.id}`}
                    className="block truncate text-[15px] font-semibold text-white hover:text-primary-light transition-colors"
                  >
                    {listing.title}
                  </Link>
                  <div className="mt-1 flex items-center gap-1.5 text-[12px] text-caption min-w-0">
                    <BrandAvatar
                      src={listing.creator.avatarUrl || walletFallbackAvatar(listing.creator.wallet)}
                      alt={listing.creator.displayName}
                      fallbackSeed={listing.creator.wallet}
                      size={16}
                    />
                    <span className="truncate">{listing.creator.displayName}</span>
                  </div>
                  <p className="mt-1 text-[12px] text-caption">
                    {formatListingAmount(listing, listing.price)}
                    {" · "}
                    {listing.pricingType === "AUCTION" ? "Auction" : "Flat price"}
                    {listing.endDate ? ` · ${relativeEndLabel(listing.endDate)}` : ""}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="accent-outline"
                  onClick={() => void remove(listing)}
                  disabled={busy || bids > 0}
                  aria-describedby={bids > 0 ? `bids-${listing.id}` : undefined}
                  className="shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  {busy ? "Deleting…" : "Delete"}
                </Button>
              </div>

              {listing.description && (
                <p className="text-[13px] text-caption leading-relaxed whitespace-pre-wrap line-clamp-3">
                  {listing.description}
                </p>
              )}

              {bids > 0 && (
                <p
                  id={`bids-${listing.id}`}
                  className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-[12px] text-warning"
                >
                  <Gavel className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  This listing has {bids} {bids === 1 ? "bid" : "bids"}, so it can&apos;t be
                  deleted.
                </p>
              )}

              {rowError[listing.id] && (
                <p className="text-[12px] text-negative">{rowError[listing.id]}</p>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}

function PosterPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center text-caption">
      <ImageOff className="w-4 h-4" aria-hidden="true" />
    </div>
  );
}
