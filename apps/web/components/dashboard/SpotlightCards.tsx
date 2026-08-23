"use client";

import { ReactNode } from "react";
import Avatar from "@/components/UI/Avatar";
import Sparkline from "@/components/UI/Sparkline";
import Countdown from "@/components/UI/Countdown";
import { cn } from "@/lib/utils";
import type { Auction, Campaign, Earner } from "@/utils/types";

/**
 * SPOTLIGHT CARD
 * ==============
 * One layout shared by all four spotlights. They sit together in a 2x2 grid,
 * where any difference in internal structure reads as misalignment rather
 * than variety — so every card is the same three bands:
 *
 *   label     — one line, always
 *   identity  — optional mark beside a title and one supporting line
 *   footer    — a single figure, pinned to the bottom so all four align
 *
 * Titles truncate rather than wrap: in a half-width column, wrapped headings
 * were what made the previous version look unsettled.
 */
interface SpotlightCardProps {
  label: string;
  title: string;
  subtitle?: string;
  /** Omit entirely to render a card with no mark (e.g. a campaign). */
  avatarSrc?: string | null;
  showAvatar?: boolean;
  avatarShape?: "circle" | "square";
  /** Bottom-left figure — the one number this card exists to show. */
  metric: ReactNode;
  metricCaption?: string;
  /** Optional trend line, small and flush right in the footer. */
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
      onClick={onClick}
      className={cn(
        "card p-3.5 xl:p-4 h-full w-full flex flex-col text-left transition-colors",
        onClick && "hover:border-line-strong"
      )}
    >
      {/* Label — uniform and muted, never competing with the content */}
      <span className="panel-label block truncate">{label}</span>

      {/* Identity */}
      <div className="mt-3 flex items-center gap-2.5 min-w-0">
        {showAvatar && (
          <Avatar
            src={avatarSrc}
            alt={title}
            size={30}
            shape={avatarShape}
            fallbackSeed={title}
          />
        )}
        <div className="min-w-0 flex-1">
          {/* Two lines max: enough to keep names like "Robinhood Crypto"
              intact, capped so a long title cannot ladder down the card.
              The pinned footer keeps every card aligned regardless. */}
          <p className="text-[13px] font-semibold text-white leading-tight line-clamp-2">
            {title}
          </p>
          {subtitle && (
            <p className="text-[11px] text-caption truncate leading-tight mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Footer — pinned so every card's figure shares one baseline */}
      <div className="mt-auto pt-4 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[15px] font-bold text-white leading-none numeric truncate">
            {metric}
          </div>
          {metricCaption && (
            <p className="text-[10px] text-caption mt-1.5 truncate">
              {metricCaption}
            </p>
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

/** Creator whose reach is climbing fastest. */
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
      title={creator.display_name || `@${creator.username}`}
      subtitle={`${creator.reach} reach`}
      avatarSrc={creator.pfp_url}
      metric={creator.engagement ?? "—"}
      metricCaption="engagement"
      trend={creator.trend}
      onClick={onOpen ? () => onOpen(creator._id) : undefined}
    />
  );
}

/** Most-booked creator this month. */
export function MostBookedCard({
  creator,
  bookings,
  onOpen,
}: {
  creator: Earner;
  bookings: number;
  onOpen?: (id: string) => void;
}) {
  return (
    <SpotlightCard
      label="Most Booked"
      title={creator.display_name || `@${creator.username}`}
      subtitle={`${creator.reach} reach`}
      avatarSrc={creator.pfp_url}
      avatarShape="square"
      metric={bookings}
      metricCaption="bookings this month"
      onClick={onOpen ? () => onOpen(creator._id) : undefined}
    />
  );
}

/** Auction closing soonest — the countdown is its figure. */
export function EndingSoonCard({
  auction,
  onOpen,
}: {
  auction: Auction;
  onOpen?: (blockchainAuctionId: string) => void;
}) {
  return (
    <SpotlightCard
      label="Ending Soon"
      title={auction.auctionName}
      subtitle={`${auction.bidCount} bids · top $${auction.highestBid.toLocaleString()}`}
      avatarSrc={auction.markUrl || auction.imageUrl}
      avatarShape="square"
      metric={
        <Countdown endDate={auction.endDate} className="text-[15px] font-bold" />
      }
      metricCaption="remaining"
      onClick={onOpen ? () => onOpen(auction.blockchainAuctionId) : undefined}
    />
  );
}

/** Inbound brand campaign seeking creators. */
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
