"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/SessionProvider";
import { BrandAvatar } from "@/components/ui";
import type { PlatformAnalytics } from "@/lib/marketplace";

interface TopbarProps {
  stats: PlatformAnalytics | null;
  notificationCount?: number;
}

const compact = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${n}`;
};

/** Desktop topbar: search, the platform stat strip, notifications and the viewer's avatar. */
export function Topbar({ stats, notificationCount = 0 }: TopbarProps) {
  const router = useRouter();
  const { status, user } = useSession();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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
    { label: "Volume", value: stats ? `$${compact(Math.round(stats.totalEarnings))}` : "—" },
    { label: "Bidders", value: stats ? compact(stats.uniqueBidders) : "—" },
  ];

  const primaryWallet = user?.wallets.find((w) => w.isPrimary) || user?.wallets[0];
  const primarySocial = user?.socials.find((s) => s.avatarUrl);

  return (
    <div className="max-lg:hidden flex items-center gap-4 mb-6">
      <form
        onSubmit={(e) => e.preventDefault()}
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

      <div className="flex items-stretch card divide-x divide-line ml-auto">
        {items.map((item) => (
          <div key={item.label} className="px-4 py-2 min-w-[104px]">
            <p className="panel-label mb-1">{item.label}</p>
            <p className="text-base font-bold text-white leading-none numeric">{item.value}</p>
          </div>
        ))}
      </div>

      <button
        type="button"
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

      {status === "authenticated" && primaryWallet ? (
        <button
          type="button"
          onClick={() => router.push("/profile")}
          className="shrink-0 rounded-full"
          aria-label="Open profile"
        >
          <BrandAvatar
            src={primarySocial?.avatarUrl}
            alt={primarySocial?.displayName || primaryWallet.address}
            fallbackSeed={primaryWallet.address}
            size={40}
          />
        </button>
      ) : null}
    </div>
  );
}
