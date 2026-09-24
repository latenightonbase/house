"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Inbox, XCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge, BrandAvatar, Button, Card, Panel, TextArea, Tile } from "@/components/ui";
import { categoryMeta } from "@/lib/listingCategories";
import {
  approveListing,
  fetchPendingListings,
  rejectListing,
  type Listing,
} from "@/lib/marketplace";
import { relativeEndLabel, walletFallbackAvatar } from "@/lib/utils";

type Decision = "approve" | "reject";

export default function AdminListingsClient() {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  /** Per-listing note, so reviewing several in a row never crosses them over. */
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [working, setWorking] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    fetchPendingListings()
      .then(setListings)
      .catch((err) =>
        setLoadError(err instanceof Error ? err.message : "Could not load the review queue."),
      );
  }, []);

  useEffect(load, [load]);

  async function decide(listing: Listing, decision: Decision) {
    const note = notes[listing.id]?.trim() || undefined;
    if (decision === "reject" && !note) {
      setRowError((e) => ({ ...e, [listing.id]: "Say why — the seller gets this in an email." }));
      return;
    }

    setWorking(listing.id);
    setRowError((e) => ({ ...e, [listing.id]: "" }));
    try {
      if (decision === "approve") await approveListing(listing.id, note);
      else await rejectListing(listing.id, note);
      // The row leaves the queue either way, so drop it rather than refetching.
      setListings((current) => current?.filter((l) => l.id !== listing.id) ?? null);
    } catch (err) {
      setRowError((e) => ({
        ...e,
        [listing.id]: err instanceof Error ? err.message : "Could not save that decision.",
      }));
    } finally {
      setWorking(null);
    }
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <PageHeader
        title="Review queue"
        subtitle="Seller listings waiting to go live. Approving one clears it to go on-chain — the seller signs the transaction that publishes it."
        action={
          listings ? (
            <Badge variant={listings.length ? "warning" : "neutral"}>
              {listings.length} waiting
            </Badge>
          ) : undefined
        }
      />

      {loadError && (
        <Tile className="border-negative/30 bg-negative/10 px-4 py-3 text-[12px] text-negative">
          {loadError}
        </Tile>
      )}

      {listings === null && !loadError ? (
        <div className="card h-40 animate-pulse bg-white/[0.03]" />
      ) : listings?.length === 0 ? (
        <Panel className="flex flex-col items-center gap-2 py-12 text-center">
          <Inbox className="w-7 h-7 text-caption" aria-hidden="true" />
          <p className="text-[14px] font-semibold text-white">Nothing to review</p>
          <p className="text-[12px] text-caption max-w-sm">
            New seller listings land here. They stay invisible on the marketplace until you
            approve them.
          </p>
        </Panel>
      ) : (
        listings?.map((listing) => {
          const meta = categoryMeta(listing.category);
          const busy = working === listing.id;
          return (
            <Card key={listing.id} className="p-4 sm:p-5 space-y-4">
              <div className="flex items-start gap-3">
                <BrandAvatar
                  src={listing.creator.avatarUrl || walletFallbackAvatar(listing.creator.wallet)}
                  alt={listing.creator.displayName}
                  fallbackSeed={listing.creator.wallet}
                  size={44}
                />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/listings/${listing.id}`}
                    className="text-[15px] font-semibold text-white hover:text-primary-light transition-colors"
                  >
                    {listing.title}
                  </Link>
                  <p className="mt-0.5 text-[12px] text-caption truncate">
                    {listing.creator.displayName} · {listing.creator.reach} reach
                  </p>
                </div>
                <Badge variant={listing.pricingType === "AUCTION" ? "accent" : "neutral"}>
                  {listing.pricingType === "AUCTION" ? "Auction" : "Flat price"}
                </Badge>
              </div>

              {listing.description && (
                <p className="text-[13px] text-caption leading-relaxed whitespace-pre-wrap">
                  {listing.description}
                </p>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Stat label={listing.pricingType === "AUCTION" ? "Minimum bid" : "Price"}>
                  ${listing.price.toLocaleString()}
                </Stat>
                <Stat label="Category">{meta.label}</Stat>
                <Stat label="Closes">
                  {listing.endDate ? relativeEndLabel(listing.endDate) : "Open"}
                </Stat>
                <Stat label={listing.pricingType === "AUCTION" ? "Slot" : "Slots"}>
                  {listing.slotsAvailable}
                </Stat>
              </div>

              <TextArea
                aria-label={`Note to the seller about ${listing.title}`}
                value={notes[listing.id] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [listing.id]: e.target.value }))}
                placeholder="Note to the seller — required when turning a listing down."
                rows={2}
                maxLength={600}
                disabled={busy}
              />

              {rowError[listing.id] && (
                <p className="text-[12px] text-negative">{rowError[listing.id]}</p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void decide(listing, "approve")} disabled={busy}>
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  Approve
                </Button>
                <Button
                  variant="accent-outline"
                  onClick={() => void decide(listing, "reject")}
                  disabled={busy}
                >
                  <XCircle className="w-4 h-4" aria-hidden="true" />
                  Reject
                </Button>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="tile min-w-0 px-3 py-2.5">
      <p className="panel-label mb-1">{label}</p>
      <p className="text-[14px] font-semibold text-white truncate">{children}</p>
    </div>
  );
}
