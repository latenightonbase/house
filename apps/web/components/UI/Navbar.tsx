"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Compass,
  Users,
  Store,
  Megaphone,
  Gavel,
  Zap,
  Wallet,
  LayoutDashboard,
  Plus,
  ChevronDown,
  Bell,
} from "lucide-react";
import { useNavigateWithLoader } from "@/utils/useNavigateWithLoader";
import Avatar from "@/components/UI/Avatar";
import Badge from "@/components/UI/Badge";
import { DEMO_VIEWER } from "@/utils/demo/mockData";

interface NavItem {
  label: string;
  href: string;
  icon: typeof Compass;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Discover", href: "/", icon: Compass },
  { label: "Creators", href: "/leaderboard", icon: Users },
  { label: "Marketplace", href: "/marketplace", icon: Store },
  { label: "Campaigns", href: "/campaigns", icon: Megaphone },
  { label: "Auctions", href: "/auctions", icon: Gavel },
  { label: "Activate", href: "/activate", icon: Zap, badge: "NEW" },
  { label: "Vaults", href: "/vaults", icon: Wallet },
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
];

/**
 * Mobile tab bar, split either side of the centred "List" action so the
 * primary action sits under the thumb.
 */
const MOBILE_LEFT: NavItem[] = [
  { label: "Discover", href: "/", icon: Compass },
  { label: "Creators", href: "/leaderboard", icon: Users },
];

const MOBILE_RIGHT: NavItem[] = [
  { label: "Auctions", href: "/auctions", icon: Gavel },
  { label: "Vaults", href: "/vaults", icon: Wallet },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const navigate = useNavigateWithLoader();
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  const viewer = DEMO_VIEWER;

  const go = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    navigate(href);
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const renderMobileItem = (item: NavItem) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    return (
      <a
        key={item.href}
        href={item.href}
        onClick={(e) => go(e, item.href)}
        className="flex-1 flex flex-col items-center justify-center gap-1"
      >
        <span
          className={`flex items-center justify-center w-10 h-6 rounded-md transition-colors ${
            active ? "bg-primary/20" : ""
          }`}
        >
          <Icon
            className={`w-[18px] h-[18px] ${
              active ? "text-primary-light" : "text-caption"
            }`}
          />
        </span>
        <span
          className={`text-[10px] font-medium ${
            active ? "text-primary-light" : "text-caption"
          }`}
        >
          {item.label}
        </span>
      </a>
    );
  };

  return (
    <>
      {/* ── Mobile top header ─────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 h-14 z-40 lg:hidden bg-background/95 backdrop-blur-md border-b border-line flex items-center justify-between px-4">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2.5"
          aria-label="House home"
        >
          <Image src="/logo.svg" alt="" width={24} height={24} />
          <span className="flex flex-col items-start leading-none">
            <span className="text-white font-extrabold tracking-[0.16em] text-[13px]">
              HOUSE
            </span>
          </span>
        </button>

        <div className="flex items-center gap-2">
          <button
            className="relative w-9 h-9 rounded-lg border border-line bg-surface text-caption flex items-center justify-center"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              2
            </span>
          </button>
          <button onClick={() => navigate("/profile")} aria-label="Profile">
            <Avatar src={viewer.pfp_url} alt={viewer.display_name} size={34} />
          </button>
        </div>
      </header>

      {/* ── Mobile bottom tab bar ─────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 z-50 lg:hidden bg-[#070a12]/97 backdrop-blur-md border-t border-line">
        <div className="h-full flex items-stretch px-1">
          {MOBILE_LEFT.map(renderMobileItem)}

          {/* List — the primary action, centred under the thumb */}
          <a
            href="/create"
            onClick={(e) => go(e, "/create")}
            className="flex-1 flex flex-col items-center justify-center gap-1"
          >
            <span className="flex items-center justify-center w-11 h-7 rounded-lg bg-primary shadow-lg shadow-primary/30">
              <Plus className="w-[19px] h-[19px] text-white" />
            </span>
            <span className="text-[10px] font-semibold text-primary-light">
              List
            </span>
          </a>

          {MOBILE_RIGHT.map(renderMobileItem)}
        </div>
      </nav>

      {/* ── Desktop sidebar ───────────────────────────────────── */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[212px] z-50 flex-col bg-[#070a12] border-r border-line">
        {/* Brand */}
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2.5 px-5 h-[76px] shrink-0"
          aria-label="House home"
        >
          <Image src="/logo.svg" alt="" width={30} height={30} />
          <span className="flex flex-col items-start leading-none">
            <span className="text-white font-extrabold tracking-[0.2em] text-[17px]">
              HOUSE
            </span>
            <span className="text-[8px] tracking-[0.32em] text-caption mt-1">
              AUCTIONS
            </span>
          </span>
        </button>

        {/* Primary nav */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => go(e, item.href)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-primary text-white"
                    : "text-caption hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <Icon className="w-[17px] h-[17px] shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <Badge
                    tone={active ? "neutral" : "accent"}
                    className="ml-auto py-0 px-1 text-[8px]"
                  >
                    {item.badge}
                  </Badge>
                )}
              </a>
            );
          })}
        </nav>

        {/* Promo — list your own inventory */}
        <div className="px-3 pb-3 shrink-0">
          <div className="card p-3.5">
            <p className="text-[13px] font-bold text-white leading-snug">
              List Your Media
            </p>
            <p className="text-[11px] text-caption mt-1 leading-snug">
              Earn with your audience.
            </p>
            <a
              href="/create"
              onClick={(e) => go(e, "/create")}
              className="btn-primary mt-3 w-full flex items-center justify-center gap-1.5 py-2 text-[11px] tracking-[0.06em] uppercase"
            >
              <Plus className="w-3.5 h-3.5" />
              List Media
            </a>
          </div>
        </div>

        {/* Account */}
        <div className="px-3 pb-3 shrink-0 border-t border-line pt-3">
          <button
            onClick={() => navigate("/profile")}
            className="w-full flex items-center gap-2.5 px-1.5 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors"
          >
            <Avatar
              src={viewer.pfp_url}
              alt={viewer.display_name}
              size={34}
              verified
            />
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-[13px] font-semibold text-white truncate">
                {viewer.display_name}
              </span>
              <span className="block text-[10px] text-caption truncate">
                {viewer.role}
              </span>
            </span>
            <ChevronDown className="w-4 h-4 text-caption shrink-0" />
          </button>
        </div>

        {/* Theme toggle */}
        <div className="px-3 pb-4 shrink-0">
          <div
            className="flex p-0.5 rounded-lg bg-surface-2 border border-line"
            role="group"
            aria-label="Colour theme"
          >
            {(["light", "dark"] as const).map((option) => (
              <button
                key={option}
                onClick={() => setTheme(option)}
                aria-pressed={theme === option}
                className={`flex-1 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                  theme === option
                    ? "bg-primary text-white"
                    : "text-caption hover:text-white"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
