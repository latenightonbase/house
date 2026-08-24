"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { BrandAvatar, Card, Panel } from "@/components/ui";
import { fetchCreatorTokens, type CreatorToken } from "@/lib/marketplace";

const compact = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
};

/**
 * A creator's own economy. Shows audience and revenue share — the terms of
 * the relationship between a creator and their holders — and deliberately
 * no market price or chart: the unit here is attention, not speculation.
 */
function TokenCard({
  token,
  onOpenCreator,
}: {
  token: CreatorToken;
  onOpenCreator?: (id: string) => void;
}) {
  return (
    <Card className="p-5 flex h-full flex-col gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <BrandAvatar
          src={token.creator.avatarUrl}
          alt={token.creator.displayName}
          size={44}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-foreground truncate flex items-center gap-1">
            {token.creator.displayName}
            {token.creator.verified && (
              <BadgeCheck className="w-3.5 h-3.5 text-primary shrink-0" />
            )}
          </p>
          <p className="text-[12px] text-caption truncate">
            ${token.symbol} · {token.creator.reach} reach
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="tile px-3 py-2.5">
          <p className="panel-label mb-1">Holders</p>
          <p className="text-[15px] font-bold text-white numeric">
            {token.holders.toLocaleString()}
          </p>
        </div>
        <div className="tile px-3 py-2.5">
          <p className="panel-label mb-1">Supply</p>
          <p className="text-[15px] font-bold text-white numeric">{compact(token.supply)}</p>
        </div>
        <div className="tile px-3 py-2.5">
          <p className="panel-label mb-1">Rev share</p>
          <p className="text-[15px] font-bold text-positive numeric">
            {token.revenueSharePct != null ? `${token.revenueSharePct}%` : "—"}
          </p>
        </div>
      </div>

      <p className="text-[12px] text-caption leading-relaxed">
        {token.revenueSharePct != null
          ? `${token.revenueSharePct}% of media revenue routes to holders.`
          : "No revenue share configured."}
      </p>

      <button
        type="button"
        onClick={() => onOpenCreator?.(token.creator.id)}
        className="mt-auto text-[12px] font-medium text-primary-light hover:text-white transition-colors text-left"
      >
        View creator →
      </button>
    </Card>
  );
}

export default function StudioPage() {
  const router = useRouter();
  const [tokens, setTokens] = useState<CreatorToken[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchCreatorTokens(50)
      .then((data) => !cancelled && setTokens(data))
      .catch(() => !cancelled && setTokens([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const totalHolders = tokens.reduce((sum, t) => sum + t.holders, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Creator Studio"
        subtitle="Tools for running your own economy — share media revenue with the audience that earned it."
        action={
          <div className="text-right">
            <p className="panel-label">Total holders</p>
            <p className="text-xl font-bold text-white numeric">
              {totalHolders.toLocaleString()}
            </p>
          </div>
        }
      />

      <Panel>
        <span className="panel-label">
          {loading ? "Loading" : `${tokens.length} creator econom${tokens.length === 1 ? "y" : "ies"}`}
        </span>

        {loading ? (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[260px] rounded-lg bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : tokens.length === 0 ? (
          <p className="mt-4 text-sm text-caption">No creator economies set up yet.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {tokens.map((token) => (
              <TokenCard
                key={token.id}
                token={token}
                onOpenCreator={(id) => router.push(`/creators/${id}`)}
              />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
