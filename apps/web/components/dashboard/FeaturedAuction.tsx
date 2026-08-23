"use client";

import Image from "next/image";
import { ArrowRight, BadgeCheck } from "lucide-react";
import StatTile from "@/components/UI/StatTile";
import { PlatformIcon } from "@/components/UI/PlatformIcons";
import { Panel } from "@/components/UI/Panel";
import { brandMarkDataUri } from "@/utils/brandMark";
import type { Auction } from "@/utils/types";

interface FeaturedAuctionProps {
  auction: Auction;
  onView?: (blockchainAuctionId: string) => void;
}

const CHART_W = 720;
const CHART_H = 130;

/** Evenly spaced date ticks along the chart's x-axis. */
function tickLabels(count: number): string[] {
  const labels: string[] = [];
  const now = Date.now();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now - i * 7 * 86_400_000);
    labels.push(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
  }
  return labels;
}

/**
 * The dashboard's anchor panel: a spotlit auction with its host, reach
 * figures, headline stats and a reach-over-time chart.
 */
export default function FeaturedAuction({ auction, onView }: FeaturedAuctionProps) {
  const series = auction.trend ?? [];
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;

  const points = series.map((value, i) => {
    const x = (i / Math.max(series.length - 1, 1)) * CHART_W;
    const y = CHART_H - ((value - min) / span) * (CHART_H - 16) - 8;
    return [x, y] as const;
  });

  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `0,${CHART_H} ${line} ${CHART_W},${CHART_H}`;
  const ticks = tickLabels(5);

  // Axis ceiling rounded up to a clean number for the gridline labels.
  const axisTop = Math.ceil(max / 10) * 10;

  // Falls back to a generated monogram so the panel never renders an empty
  // image element when neither the auction nor the host has artwork.
  const cover =
    auction.imageUrl ||
    auction.hostedBy.pfp_url ||
    brandMarkDataUri(auction.hostedBy.display_name || auction.auctionName);

  return (
    <Panel padded={false} className="flex flex-col">
      <div className="p-5 max-lg:p-4 flex gap-4 lg:gap-5">
        {/* Cover art — stays a compact thumbnail on phones so the details,
            not the artwork, lead the panel. */}
        <div className="shrink-0 w-20 sm:w-28 lg:w-[150px]">
          <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-line">
            <Image
              unoptimized
              src={cover}
              alt={auction.auctionName}
              width={300}
              height={300}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1 flex flex-col">
          <span className="panel-label">Featured Creator</span>

          <h2 className="mt-2 text-2xl max-lg:text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span className="truncate">{auction.hostedBy.display_name}</span>
            {auction.hostedBy.verified && (
              <BadgeCheck className="w-5 h-5 text-primary shrink-0" aria-label="Verified" />
            )}
          </h2>

          {/* Reach across platforms, each keyed by its own logo */}
          {auction.reach && (
            <div className="mt-2.5 flex items-center flex-wrap gap-x-2 gap-y-2 text-sm">
              {auction.reach.map((r, i) => (
                <span key={r.platform} className="flex items-center gap-2">
                  {i > 0 && (
                    <span className="text-line-strong select-none" aria-hidden="true">
                      |
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <PlatformIcon platform={r.platform} className="w-4 h-4 text-caption" />
                    <span className="text-white font-semibold numeric">{r.value}</span>
                  </span>
                </span>
              ))}
            </div>
          )}

          {/* Topic tags — detail that earns its space only on wider screens */}
          {auction.tags && (
            <div className="max-md:hidden mt-2 flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-caption">
              {auction.tags.map((tag, i) => (
                <span key={tag} className="flex items-center gap-2">
                  {i > 0 && <span className="text-line-strong">•</span>}
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Headline stats. Phones get the two that matter for a booking
              decision; the rest appear once there is room for them. */}
          <div className="mt-3 md:mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            <StatTile label="Avg Views" value={auction.avgViews ?? "—"} />
            <StatTile
              label="Engagement"
              value={auction.engagement ?? "—"}
              tone="positive"
            />
            <StatTile
              label="Inventory"
              value={`${auction.bidCount} Available`}
              className="max-md:hidden"
            />
            <StatTile
              label="Next Availability"
              value={new Date(auction.endDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
              className="max-md:hidden"
            />
          </div>
        </div>
      </div>

      {/* Reach chart. Hidden on phones, where it would push everything else
          below the fold — the CTA is promoted in its place. */}
      <div className="relative px-5 max-lg:px-4 pb-5 max-lg:pb-4 mt-auto">
        <div className="relative">
          {/* Plot area — the axis overlay is scoped to exactly this box so it
              cannot drift over content that follows the chart. */}
          <div className="relative max-md:hidden">
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            className="w-full h-[130px] max-lg:h-[100px] block"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="featured-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.5" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Horizontal gridlines */}
            {[0, 0.5, 1].map((t) => (
              <line
                key={t}
                x1="0"
                x2={CHART_W}
                y1={CHART_H * t}
                y2={CHART_H * t}
                stroke="var(--line)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <polygon points={area} fill="url(#featured-area)" />
            <polyline
              points={line}
              fill="none"
              stroke="var(--primary-light)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

            {/* Y-axis labels, overlaid so the chart keeps full width */}
            <div className="absolute inset-y-0 left-0 flex flex-col justify-between pointer-events-none text-[10px] text-caption numeric">
              <span>{axisTop}K</span>
              <span>{Math.round(axisTop / 2)}K</span>
              <span>0</span>
            </div>
          </div>

          {/* Call to action. Floats over the chart on wide screens as in the
              reference; drops below it on phones, where it would otherwise
              cover the plot. */}
          <button
            onClick={() => onView?.(auction.blockchainAuctionId)}
            className="btn-primary px-4 py-2.5 text-xs tracking-wide uppercase flex items-center justify-center gap-2 lg:absolute lg:bottom-6 lg:right-0 max-lg:w-full max-lg:mt-3"
          >
            View Inventory
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* X-axis ticks */}
        <div className="max-md:hidden flex justify-between mt-1.5 text-[10px] text-caption">
          {ticks.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </div>
    </Panel>
  );
}
