"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Badge, BrandAvatar, Button, Card, Panel } from "@/components/ui";
import { relativeEndLabel } from "@/lib/utils";
import { fetchActivations, formatMoney, type Activation } from "@/lib/marketplace";

const STATUS_VARIANT = {
  LIVE: "positive",
  UPCOMING: "accent",
  ENDED: "neutral",
} as const;

const STATUS_LABEL = {
  LIVE: "Live",
  UPCOMING: "Upcoming",
  ENDED: "Ended",
} as const;

/**
 * An activation and its reward pool. The vault is rendered as a progress
 * bar inside the activation rather than as its own destination — the
 * participant cares that rewards are flowing, not where they're custodied.
 */
function ActivationCard({ activation }: { activation: Activation }) {
  const vault = activation.vault;
  const pct = vault && vault.totalRewards > 0
    ? Math.min(100, Math.round((vault.distributed / vault.totalRewards) * 100))
    : 0;

  return (
    <Card className="p-5 flex h-full flex-col gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <BrandAvatar
          src={activation.brandMarkUrl}
          alt={activation.brandName}
          size={44}
          shape="square"
          fallbackSeed={activation.brandName}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-foreground leading-snug">
            {activation.name}
          </p>
          <p className="text-[12px] text-caption truncate">{activation.brandName}</p>
        </div>
        <Badge variant={STATUS_VARIANT[activation.status]} className="shrink-0">
          {STATUS_LABEL[activation.status]}
        </Badge>
      </div>

      {activation.description && (
        <p className="text-[13px] text-caption leading-relaxed">{activation.description}</p>
      )}

      {vault && (
        <div className="tile p-3.5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="panel-label">{vault.name}</p>
            <p className="text-[11px] text-caption">
              {formatMoney(vault.distributed)} of {formatMoney(vault.totalRewards)} paid out
            </p>
          </div>
          <div
            className="mt-2 h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${vault.name} rewards distributed`}
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-[10px] text-caption">Rewards powered by Pantheon</p>
        </div>
      )}

      <div className="mt-auto flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] text-caption">Participants</p>
          <p className="text-lg font-bold text-white numeric">
            {activation.participantCount.toLocaleString()}
          </p>
          {activation.endDate && activation.status !== "ENDED" && (
            <p className="text-[11px] text-caption mt-0.5">
              {relativeEndLabel(activation.endDate)}
            </p>
          )}
        </div>
        <Button size="sm" disabled={activation.status !== "LIVE"} className="shrink-0">
          {activation.status === "LIVE" ? "Join" : STATUS_LABEL[activation.status]}
        </Button>
      </div>
    </Card>
  );
}

export default function ActivatePage() {
  const [activations, setActivations] = useState<Activation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchActivations(50)
      .then((data) => !cancelled && setActivations(data))
      .catch(() => !cancelled && setActivations([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const totalRewards = activations.reduce(
    (sum, a) => sum + (a.vault?.totalRewards ?? 0),
    0,
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Activate"
        subtitle="Brand and community activations. Audiences take part, and rewards flow from each activation's vault."
        action={
          <div className="text-right">
            <p className="panel-label">Rewards committed</p>
            <p className="text-xl font-bold text-white numeric">
              {formatMoney(totalRewards)}
            </p>
          </div>
        }
      />

      <Panel>
        <span className="panel-label">
          {loading
            ? "Loading"
            : `${activations.length} activation${activations.length === 1 ? "" : "s"}`}
        </span>

        {loading ? (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[300px] rounded-lg bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : activations.length === 0 ? (
          <p className="mt-4 text-sm text-caption">No activations running right now.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {activations.map((activation) => (
              <ActivationCard key={activation.id} activation={activation} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
