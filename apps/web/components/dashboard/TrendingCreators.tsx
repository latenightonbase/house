"use client";

import { useMemo, useState } from "react";
import { BadgeCheck } from "lucide-react";
import Avatar from "@/components/UI/Avatar";
import Tabs, { TabItem } from "@/components/UI/Tabs";
import PlatformIcons from "@/components/UI/PlatformIcons";
import { Panel, PanelHeader, ViewAllLink } from "@/components/UI/Panel";
import type { Earner, Platform } from "@/utils/types";

type Filter = "all" | Platform;

const FILTERS: TabItem<Filter>[] = [
  { value: "all", label: "All" },
  { value: "x", label: "X" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "podcast", label: "Podcast" },
];

interface TrendingCreatorsProps {
  creators: Earner[];
  loading?: boolean;
  onOpenCreator?: (id: string) => void;
  onViewAll?: () => void;
}

/**
 * Ranked creator table. Collapses to stacked cards on small screens rather
 * than forcing a six-column table into a phone viewport.
 */
export default function TrendingCreators({
  creators,
  loading = false,
  onOpenCreator,
  onViewAll,
}: TrendingCreatorsProps) {
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo(() => {
    if (filter === "all") return creators;
    return creators.filter((c) => c.platforms?.includes(filter));
  }, [creators, filter]);

  return (
    <Panel padded={false} className="flex flex-col">
      <div className="p-4 flex items-center justify-between gap-3 flex-wrap">
        <span className="panel-label">Trending Creators</span>
        <div className="flex items-center gap-3">
          <Tabs items={FILTERS} value={filter} onChange={setFilter} />
          <ViewAllLink onClick={onViewAll} />
        </div>
      </div>

      {loading ? (
        <div className="px-4 pb-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="px-4 pb-6 text-sm text-caption">
          No creators match this platform yet.
        </p>
      ) : (
        <>
          {/* Table — medium screens and up */}
          <div className="max-md:hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-line">
                  <th className="panel-label text-left font-semibold px-4 py-2">Creator</th>
                  <th className="panel-label text-left font-semibold px-3 py-2">Platforms</th>
                  <th className="panel-label text-right font-semibold px-3 py-2">Reach</th>
                  <th className="panel-label text-right font-semibold px-3 py-2">Engagement</th>
                  <th className="panel-label text-right font-semibold px-3 py-2">Inventory</th>
                  <th className="panel-label text-right font-semibold px-4 py-2">From</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((creator) => (
                  <tr
                    key={creator._id}
                    onClick={() => onOpenCreator?.(creator._id)}
                    className="border-b border-line last:border-0 row-hover cursor-pointer"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar
                          src={creator.pfp_url}
                          alt={creator.display_name || creator.username || "Creator"}
                          size={32}
                        />
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-white truncate flex items-center gap-1">
                            {creator.display_name || `@${creator.username}`}
                            {creator.verified && (
                              <BadgeCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                            )}
                          </p>
                          {creator.tags && (
                            <p className="text-[11px] text-caption truncate">
                              {creator.tags.join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <PlatformIcons platforms={creator.platforms ?? []} />
                    </td>
                    <td className="px-3 py-2.5 text-right text-white numeric">
                      {creator.reach}
                    </td>
                    <td className="px-3 py-2.5 text-right text-positive font-semibold numeric">
                      {creator.engagement}
                    </td>
                    <td className="px-3 py-2.5 text-right text-white numeric">
                      {creator.inventory}
                    </td>
                    <td className="px-4 py-2.5 text-right text-white font-semibold numeric">
                      ${creator.fromPrice?.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Stacked cards — small screens */}
          <div className="md:hidden px-4 pb-4 space-y-2">
            {rows.map((creator) => (
              <button
                key={creator._id}
                onClick={() => onOpenCreator?.(creator._id)}
                className="tile w-full p-3 text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar
                    src={creator.pfp_url}
                    alt={creator.display_name || "Creator"}
                    size={34}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-white truncate flex items-center gap-1">
                      {creator.display_name || `@${creator.username}`}
                      {creator.verified && (
                        <BadgeCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                      )}
                    </p>
                    <PlatformIcons
                      platforms={creator.platforms ?? []}
                      className="mt-1"
                    />
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-bold text-white numeric">
                      ${creator.fromPrice?.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-caption">from</p>
                  </div>
                </div>
                <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="panel-label mb-0.5">Reach</p>
                    <p className="text-xs text-white numeric">{creator.reach}</p>
                  </div>
                  <div>
                    <p className="panel-label mb-0.5">Engmt</p>
                    <p className="text-xs text-positive font-semibold numeric">
                      {creator.engagement}
                    </p>
                  </div>
                  <div>
                    <p className="panel-label mb-0.5">Inv</p>
                    <p className="text-xs text-white numeric">{creator.inventory}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}
