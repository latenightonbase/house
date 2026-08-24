"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { ListingCard } from "@/components/ListingCard";
import { BrandAvatar, Card, Panel, PlatformIcons } from "@/components/ui";
import {
  fetchCreator,
  formatMoney,
  type CreatorToken,
  type Earner,
  type Listing,
} from "@/lib/marketplace";

export default function CreatorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<{
    creator: Earner;
    listings: Listing[];
    token: CreatorToken | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchCreator(id)
      .then((res) => !cancelled && setData(res))
      .catch(() => !cancelled && setNotFound(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <div className="card h-40 animate-pulse bg-white/[0.03]" />;
  }

  if (notFound || !data) {
    return (
      <Card className="p-6">
        <p className="text-[14px] font-semibold text-foreground">Creator not found</p>
        <button
          type="button"
          onClick={() => router.push("/creators")}
          className="mt-2 text-[13px] text-primary-light hover:text-white transition-colors"
        >
          ← Back to creators
        </button>
      </Card>
    );
  }

  const { creator, listings, token } = data;

  return (
    <div className="space-y-4 max-w-5xl">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-5">
          <BrandAvatar
            src={creator.avatarUrl}
            alt={creator.displayName}
            size={72}
            className="mx-auto sm:mx-0"
          />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center justify-center sm:justify-start gap-1.5">
              <span className="truncate">{creator.displayName}</span>
              {creator.verified && (
                <BadgeCheck className="w-5 h-5 text-primary shrink-0" aria-label="Verified" />
              )}
            </h1>
            {creator.username && (
              <p className="mt-0.5 text-[13px] text-caption">@{creator.username}</p>
            )}
            <div className="mt-2 flex justify-center sm:justify-start">
              <PlatformIcons platforms={creator.platforms} />
            </div>
            {creator.tags.length > 0 && (
              <p className="mt-2 text-[12px] text-caption">{creator.tags.join(" · ")}</p>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="tile px-3.5 py-3">
            <p className="panel-label mb-1">Reach</p>
            <p className="text-[17px] font-bold text-white numeric">{creator.reach ?? "—"}</p>
          </div>
          <div className="tile px-3.5 py-3">
            <p className="panel-label mb-1">Engagement</p>
            <p className="text-[17px] font-bold text-positive numeric">
              {creator.engagement ?? "—"}
            </p>
          </div>
          <div className="tile px-3.5 py-3">
            <p className="panel-label mb-1">Booked</p>
            <p className="text-[17px] font-bold text-white numeric">
              {formatMoney(creator.totalRevenue)}
            </p>
          </div>
          <div className="tile px-3.5 py-3">
            <p className="panel-label mb-1">From</p>
            <p className="text-[17px] font-bold text-white numeric">
              {creator.fromPrice ? `$${creator.fromPrice.toLocaleString()}` : "—"}
            </p>
          </div>
        </div>
      </Card>

      <Panel>
        <span className="panel-label">Inventory</span>
        {listings.length === 0 ? (
          <p className="mt-4 text-sm text-caption">
            No fixed-price inventory listed right now.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </Panel>

      {token && (
        <Panel>
          <span className="panel-label">Creator economy</span>
          <div className="mt-4 grid grid-cols-3 gap-2 max-w-md">
            <div className="tile px-3 py-2.5">
              <p className="panel-label mb-1">Token</p>
              <p className="text-[15px] font-bold text-white">${token.symbol}</p>
            </div>
            <div className="tile px-3 py-2.5">
              <p className="panel-label mb-1">Holders</p>
              <p className="text-[15px] font-bold text-white numeric">
                {token.holders.toLocaleString()}
              </p>
            </div>
            <div className="tile px-3 py-2.5">
              <p className="panel-label mb-1">Rev share</p>
              <p className="text-[15px] font-bold text-positive numeric">
                {token.revenueSharePct != null ? `${token.revenueSharePct}%` : "—"}
              </p>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
