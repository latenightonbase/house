"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Bell } from "lucide-react";
import Avatar from "@/components/UI/Avatar";
import type { PlatformAnalytics, Viewer } from "@/utils/types";

interface TopbarProps {
  stats: PlatformAnalytics | null;
  viewer?: Viewer | null;
  notificationCount?: number;
  onSearch?: (query: string) => void;
  onOpenProfile?: () => void;
}

const compact = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${n}`;
};

/**
 * Desktop topbar: search, the platform stat strip, notifications and the
 * viewer's avatar. Hidden on mobile, where the compact header takes over.
 */
export default function Topbar({
  stats,
  viewer,
  notificationCount = 0,
  onSearch,
  onOpenProfile,
}: TopbarProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K focuses search, matching the hint shown in the field.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const items = [
    { label: "Auctions", value: stats ? compact(stats.totalAuctions) : "—" },
    { label: "With Bids", value: stats ? compact(stats.auctionsWithBids) : "—" },
    {
      label: "Volume",
      value: stats ? `$${compact(Math.round(stats.totalEarnings))}` : "—",
    },
    { label: "Bidders", value: stats ? compact(stats.uniqueBidders) : "—" },
  ];

  return (
    <div className="max-lg:hidden flex items-center gap-4 mb-6">
      {/* Search */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSearch?.(query);
        }}
        className="relative flex-1 max-w-[420px]"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-caption pointer-events-none" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search creators, auctions, inventory..."
          aria-label="Search"
          className="w-full h-11 pl-9 pr-14 rounded-xl bg-surface border border-line text-sm text-foreground placeholder:text-caption outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-caption pointer-events-none">
          ⌘K
        </kbd>
      </form>

      {/* Stat strip */}
      <div className="flex items-stretch card divide-x divide-line ml-auto">
        {items.map((item) => (
          <div key={item.label} className="px-4 py-2 min-w-[104px]">
            <p className="panel-label mb-1">{item.label}</p>
            <p className="text-base font-bold text-white leading-none numeric">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Notifications */}
      <button
        className="relative w-11 h-11 shrink-0 rounded-xl border border-line bg-surface text-caption hover:text-white hover:border-line-strong transition-colors flex items-center justify-center"
        aria-label={`Notifications${notificationCount ? `, ${notificationCount} unread` : ""}`}
      >
        <Bell className="w-[18px] h-[18px]" />
        {notificationCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {notificationCount}
          </span>
        )}
      </button>

      {/* Viewer */}
      <button
        onClick={onOpenProfile}
        className="shrink-0 rounded-full"
        aria-label="Open profile"
      >
        <Avatar
          src={viewer?.pfp_url}
          alt={viewer?.display_name || "Profile"}
          size={40}
        />
      </button>
    </div>
  );
}
