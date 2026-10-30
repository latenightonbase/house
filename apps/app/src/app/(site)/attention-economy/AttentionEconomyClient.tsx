"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Clock, Flame, RefreshCw, Users } from "lucide-react";
import { Section } from "@/components/PageShell";
import {
  fetchAttentionAnalytics,
  type AttentionAnalytics,
} from "@/lib/dailyAuction";

const METRICS = [
  {
    key: "totalVolume",
    icon: Flame,
    label: "Total volume",
    hint: "Committed across every settled auction",
    currency: true,
  },
  {
    key: "auctionsSettled",
    icon: Clock,
    label: "Auctions settled",
    hint: "24-hour slots sold to date",
    currency: false,
  },
  {
    key: "uniqueBidders",
    icon: Users,
    label: "Unique bidders",
    hint: "Wallets that have bid at least once",
    currency: false,
  },
  {
    key: "averageClearingPrice",
    icon: BarChart3,
    label: "Average clearing price",
    hint: "What a day typically costs",
    currency: true,
  },
] as const;

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function MetricsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading market metrics">
      {METRICS.map((metric) => (
        <section key={metric.key} className="card p-5">
          <div className="h-9 w-9 animate-pulse rounded-lg bg-white/[0.06]" />
          <div className="mt-4 h-3 w-24 animate-pulse rounded bg-white/[0.06]" />
          <div className="mt-3 h-8 w-28 animate-pulse rounded bg-white/[0.08]" />
          <div className="mt-3 h-3 w-40 max-w-full animate-pulse rounded bg-white/[0.05]" />
        </section>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <Section
      title="Clearing price over time"
      description="What each day's billboard sold for, auction by auction."
    >
      <div className="h-64 animate-pulse rounded-xl bg-white/[0.03]" aria-label="Loading price history" />
    </Section>
  );
}

function PriceChart({ history }: { history: AttentionAnalytics["history"] }) {
  if (history.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-line px-5 text-center">
        <p className="max-w-sm text-[13px] leading-relaxed text-caption">
          Price history will appear after the first daily auction settles.
        </p>
      </div>
    );
  }

  const width = 800;
  const height = 240;
  const insetX = 20;
  const insetY = 24;
  const prices = history.map((auction) => auction.clearingPrice);
  const max = Math.max(...prices);
  const min = Math.min(...prices);
  const range = max - min || Math.max(max, 1);
  const points = history.map((auction, index) => {
    const x =
      history.length === 1
        ? width / 2
        : insetX + (index / (history.length - 1)) * (width - insetX * 2);
    const y = insetY + ((max - auction.clearingPrice) / range) * (height - insetY * 2);
    return { ...auction, x, y };
  });
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${insetX},${height - insetY} ${line} ${width - insetX},${height - insetY}`;
  const firstDate = new Date(history[0].settledAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const lastDate = new Date(history.at(-1)!.settledAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="panel-label">Highest clearing price</p>
          <p className="mt-1 text-xl font-bold text-white numeric">{money.format(max)}</p>
        </div>
        <p className="text-right text-[11px] text-caption">
          {history.length} auction{history.length === 1 ? "" : "s"}
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-background/35 p-3 sm:p-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-56 w-full overflow-visible"
          role="img"
          aria-label={`Clearing prices from ${firstDate} to ${lastDate}`}
        >
          {[0, 0.5, 1].map((position) => (
            <line
              key={position}
              x1={insetX}
              x2={width - insetX}
              y1={insetY + position * (height - insetY * 2)}
              y2={insetY + position * (height - insetY * 2)}
              stroke="currentColor"
              className="text-white/10"
              strokeDasharray="4 6"
            />
          ))}
          <polygon points={area} className="fill-primary/10" />
          <polyline
            points={line}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinejoin="round"
            strokeLinecap="round"
            className="text-primary-bright"
          />
          {points.length <= 30 &&
            points.map((point) => (
              <circle
                key={point.listingId}
                cx={point.x}
                cy={point.y}
                r="5"
                fill="currentColor"
                className="text-primary-light"
              >
                <title>
                  {new Date(point.settledAt).toLocaleDateString()}:{" "}
                  {money.format(point.clearingPrice)}
                </title>
              </circle>
            ))}
        </svg>
        <div className="mt-1 flex justify-between gap-4 text-[10px] uppercase tracking-[0.1em] text-caption">
          <span>{firstDate}</span>
          {history.length > 1 && <span className="text-right">{lastDate}</span>}
        </div>
      </div>
    </div>
  );
}

export function AttentionEconomyClient() {
  const [data, setData] = useState<AttentionAnalytics | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setData(null);
    setFailed(false);
    fetchAttentionAnalytics()
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (failed) {
    return (
      <Section>
        <div className="py-8 text-center">
          <h2 className="text-[17px] font-bold text-white">Market data is unavailable</h2>
          <p className="mt-2 text-[13px] text-caption">The page is public. The data request failed.</p>
          <button type="button" onClick={load} className="btn-primary mt-5 h-10 px-4 text-[12px]">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Try again
          </button>
        </div>
      </Section>
    );
  }

  if (!data) {
    return (
      <>
        <MetricsSkeleton />
        <ChartSkeleton />
      </>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map((metric) => {
          const value = data.metrics[metric.key];
          return (
            <section key={metric.key} className="card p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
                <metric.icon className="h-4 w-4 text-primary-light" aria-hidden="true" />
              </span>
              <p className="mt-4 panel-label">{metric.label}</p>
              <p className="mt-1.5 text-[26px] font-bold text-white numeric">
                {metric.currency ? money.format(value) : value.toLocaleString()}
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-caption">{metric.hint}</p>
            </section>
          );
        })}
      </div>

      <Section
        title="Clearing price over time"
        description="What each day's billboard sold for, auction by auction."
      >
        <PriceChart history={data.history} />
      </Section>
    </>
  );
}
