"use client";

import { BrandAvatar } from "@/components/ui";
import { cn, relativeEndLabel } from "@/lib/utils";
import type { Auction, Campaign, Earner } from "@/lib/marketplace";

/**
 * One layout shared by all four spotlights: a label, an identity row, and a
 * single figure — no sparkline, no ticking clock, just the one number that
 * matters for this card.
 */
interface SpotlightCardProps {
  label: string;
  title: string;
  subtitle?: string;
  avatarSrc?: string | null;
  showAvatar?: boolean;
  avatarShape?: "circle" | "square";
  metric: string;
  metricCaption?: string;
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
  onClick,
}: SpotlightCardProps) {
  const Root = onClick ? "button" : "div";

  return (
    <Root
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "card p-4 h-full w-full flex flex-col gap-3 text-left transition-colors",
        onClick && "hover:border-line-strong",
      )}
    >
      <span className="panel-label block truncate">{label}</span>

      <div className="flex items-center gap-2.5 min-w-0">
        {showAvatar && (
          <BrandAvatar src={avatarSrc} alt={title} size={36} shape={avatarShape} fallbackSeed={title} />
        )}
        <p className="min-w-0 flex-1 text-[13px] font-semibold text-white leading-tight line-clamp-2">
          {title}
        </p>
      </div>

      <div className="mt-auto">
        <div className="text-lg font-bold text-white numeric truncate">{metric}</div>
        {(subtitle || metricCaption) && (
          <p className="text-[11px] text-caption mt-0.5 truncate">
            {metricCaption || subtitle}
          </p>
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
      avatarSrc={creator.avatarUrl}
      metric={creator.engagement ?? "—"}
      metricCaption={`${creator.reach ?? "—"} reach`}
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
      label="Most booked"
      title={creator.displayName || `@${creator.username}`}
      avatarSrc={creator.avatarUrl}
      avatarShape="square"
      metric={`${creator.bookingsThisMonth}`}
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
      label="Ending soon"
      title={auction.title}
      avatarSrc={auction.imageUrl}
      avatarShape="square"
      metric={relativeEndLabel(auction.endDate)}
      metricCaption={`from $${auction.minimumBid.toLocaleString()}`}
      onClick={onOpen ? () => onOpen(auction.id) : undefined}
    />
  );
}

export function NewCampaignCard({ campaign }: { campaign: Campaign }) {
  return (
    <SpotlightCard
      label="New campaign"
      title={campaign.name}
      avatarSrc={campaign.markUrl}
      avatarShape="square"
      metric={`$${campaign.budget.toLocaleString()}`}
      metricCaption={campaign.lookingFor}
    />
  );
}
