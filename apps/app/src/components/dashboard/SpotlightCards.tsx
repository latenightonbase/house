"use client";

import type { ReactNode } from "react";
import { BrandAvatar, Countdown, Sparkline } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Auction, Campaign, Earner } from "@/lib/marketplace";

/**
 * One layout shared by all four spotlights: a label, an identity row, and a
 * footer figure pinned to the bottom so all four cards align in the 2x2 grid.
 */
interface SpotlightCardProps {
  label: string;
  title: string;
  subtitle?: string;
  avatarSrc?: string | null;
  showAvatar?: boolean;
  avatarShape?: "circle" | "square";
  metric: ReactNode;
  metricCaption?: string;
  trend?: number[];
  onClick?: () => void;
}

function SpotlightCard({
  label,
  title,
  subtitle,
  avatarSrc,
  showAvatar = true,
  avatarShape = "circle",
  metric,
  metricCaption,
  trend,
  onClick,
}: SpotlightCardProps) {
  const Root = onClick ? "button" : "div";

  return (
    <Root
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "card p-3.5 xl:p-4 h-full w-full flex flex-col text-left transition-colors",
        onClick && "hover:border-line-strong",
      )}
    >
      <span className="panel-label block truncate">{label}</span>

      <div className="mt-3 flex items-center gap-2.5 min-w-0">
        {showAvatar && (
          <BrandAvatar src={avatarSrc} alt={title} size={30} shape={avatarShape} fallbackSeed={title} />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-white leading-tight line-clamp-2">
            {title}
          </p>
          {subtitle && (
            <p className="text-[11px] text-caption truncate leading-tight mt-1">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="mt-auto pt-4 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[15px] font-bold text-white leading-none numeric truncate">
            {metric}
          </div>
          {metricCaption && (
            <p className="text-[10px] text-caption mt-1.5 truncate">{metricCaption}</p>
          )}
        </div>

        {trend && trend.length > 1 && (
          <Sparkline
            data={trend}
            width={72}
            height={22}
            filled={false}
            strokeWidth={1.5}
            className="shrink-0 opacity-60"
          />
        )}
      </div>
    </Root>
  );
}

export function TrendingCreatorCard({
  creator,
  onOpen,
}: {
  creator: Earner;
  onOpen?: (id: string) => void;
}) {
  return (
    <SpotlightCard
      label="Trending"
      title={creator.displayName || `@${creator.username}`}
      subtitle={`${creator.reach ?? "—"} reach`}
      avatarSrc={creator.avatarUrl}
      metric={creator.engagement ?? "—"}
      metricCaption="engagement"
      trend={creator.trend}
      onClick={onOpen ? () => onOpen(creator.id) : undefined}
    />
  );
}

export function MostBookedCard({
  creator,
  onOpen,
}: {
  creator: Earner;
  onOpen?: (id: string) => void;
}) {
  return (
    <SpotlightCard
      label="Most Booked"
      title={creator.displayName || `@${creator.username}`}
      subtitle={`${creator.reach ?? "—"} reach`}
      avatarSrc={creator.avatarUrl}
      avatarShape="square"
      metric={creator.bookingsThisMonth}
      metricCaption="bookings this month"
      onClick={onOpen ? () => onOpen(creator.id) : undefined}
    />
  );
}

export function EndingSoonCard({
  auction,
  onOpen,
}: {
  auction: Auction;
  onOpen?: (auctionId: string) => void;
}) {
  return (
    <SpotlightCard
      label="Ending Soon"
      title={auction.title}
      subtitle={`${auction.bidCount} bids · top $${auction.highestBid.toLocaleString()}`}
      avatarSrc={auction.imageUrl}
      avatarShape="square"
      metric={<Countdown endDate={auction.endDate} className="text-[15px] font-bold" />}
      metricCaption="remaining"
      onClick={onOpen ? () => onOpen(auction.id) : undefined}
    />
  );
}

export function NewCampaignCard({ campaign }: { campaign: Campaign }) {
  return (
    <SpotlightCard
      label="New Campaign"
      title={campaign.name}
      subtitle={campaign.lookingFor}
      avatarSrc={null}
      avatarShape="square"
      metric={`$${campaign.budget.toLocaleString()}`}
      metricCaption="budget"
    />
  );
}
