"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  Badge,
  BrandAvatar,
  Button,
  Card,
  Panel,
  PlatformIcons,
} from "@/components/ui";
import { fetchCampaigns, formatMoney, type Campaign } from "@/lib/marketplace";

const STATUS_VARIANT = {
  OPEN: "positive",
  IN_REVIEW: "warning",
  CLOSED: "neutral",
} as const;

const STATUS_LABEL = {
  OPEN: "Open",
  IN_REVIEW: "In review",
  CLOSED: "Closed",
} as const;

function CampaignCard({ campaign }: { campaign: Campaign }) {
  return (
    <Card className="p-4 flex h-full flex-col gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <BrandAvatar
          src={campaign.markUrl}
          alt={campaign.brandName || campaign.name}
          size={40}
          shape="square"
          fallbackSeed={campaign.brandName || campaign.name}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-foreground truncate">
            {campaign.name}
          </p>
          {campaign.brandName && (
            <p className="text-[12px] text-caption truncate">{campaign.brandName}</p>
          )}
        </div>
        <Badge variant={STATUS_VARIANT[campaign.status]} className="shrink-0">
          {STATUS_LABEL[campaign.status]}
        </Badge>
      </div>

      {campaign.brief && (
        <p className="text-[12px] text-caption leading-relaxed line-clamp-3">
          {campaign.brief}
        </p>
      )}

      <div className="flex items-center gap-3 text-[12px] text-caption">
        <PlatformIcons platforms={campaign.platforms} />
        <span className="truncate">{campaign.lookingFor}</span>
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 pt-1">
        <div>
          <p className="text-[11px] text-caption">Budget</p>
          <p className="text-lg font-bold text-white numeric">
            {formatMoney(campaign.budget)}
          </p>
          <p className="text-[11px] text-caption mt-0.5">
            {campaign.minReach
              ? `${(campaign.minReach / 1000).toFixed(0)}K+ reach required`
              : "Open to all creators"}
          </p>
        </div>
        <Button size="sm" disabled={campaign.status !== "OPEN"} className="shrink-0">
          {campaign.status === "OPEN" ? "Apply" : STATUS_LABEL[campaign.status]}
        </Button>
      </div>
    </Card>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchCampaigns(50)
      .then((data) => !cancelled && setCampaigns(data))
      .catch(() => !cancelled && setCampaigns([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const openBudget = campaigns
    .filter((c) => c.status === "OPEN")
    .reduce((sum, c) => sum + c.budget, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Campaigns"
        subtitle="What brands are buying. Post a budget and brief, and creators apply to fill it."
        action={
          <div className="text-right">
            <p className="panel-label">Open budget</p>
            <p className="text-xl font-bold text-white numeric">{formatMoney(openBudget)}</p>
          </div>
        }
      />

      <Panel>
        <span className="panel-label">
          {loading ? "Loading" : `${campaigns.length} campaign${campaigns.length === 1 ? "" : "s"}`}
        </span>

        {loading ? (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[230px] rounded-lg bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <p className="mt-4 text-sm text-caption">No campaigns posted yet.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
