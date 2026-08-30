"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  Compass,
  Users,
  Store,
  Megaphone,
  Gavel,
  Sparkles,
  Wand2,
  LayoutDashboard,
} from "lucide-react";
import { CreateListingButton } from "@/components/CreateListingButton";
import { SidebarAuthCard } from "@/components/SidebarAuthCard";
import { useSession } from "@/components/SessionProvider";

/**
 * The verticals of the marketplace, ordered by how a visitor meets them:
 * browse the market, then its two sides (creators selling, brands buying),
 * then the tools layered on top.
 *
 * Vaults are deliberately not a nav item — they are Pantheon infrastructure
 * surfaced inside Activate, so nobody has to understand the plumbing before
 * they understand what they're accomplishing.
 */
const NAV = [
  { href: "/", label: "Discover", icon: Compass },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, requiresAuth: true },
  { href: "/creators", label: "Creators", icon: Users },
  { href: "/marketplace", label: "Marketplace", icon: Store },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/auctions", label: "Auctions", icon: Gavel },
  // { href: "/activate", label: "Activate", icon: Sparkles },
  // { href: "/studio", label: "Creator Studio", icon: Wand2 },
];

/** Mobile tab bar carries only the highest-traffic destinations. */
const MOBILE_NAV = [NAV[0], NAV[1], NAV[2], NAV[3]];

function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <>
      <Image src="/logo.svg" alt="" width={compact ? 24 : 30} height={compact ? 24 : 30} />
      <span className="flex flex-col items-start leading-none">
        <span
          className={`text-white font-extrabold ${
            compact ? "tracking-[0.16em] text-[13px]" : "tracking-[0.2em] text-[17px]"
          }`}
        >
          LNOC
        </span>
        {!compact && (
          <span className="text-[7px] tracking-[0.22em] text-caption mt-1">
            ATTENTION MARKETPLACE
          </span>
        )}
      </span>
    </>
  );
}

export function Header() {
  const pathname = usePathname();
  const { status } = useSession();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const hrefFor = (item: (typeof NAV)[number]) =>
    item.requiresAuth && status !== "authenticated" && status !== "loading"
      ? "/?auth=required"
      : item.href;

  return (
    <>
      {/* Mobile top bar */}
      <header className="fixed top-0 left-0 right-0 h-14 z-40 lg:hidden bg-background/95 backdrop-blur-md border-b border-line flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5" aria-label="LNOC home">
          <Wordmark compact />
        </Link>
        <div className="flex items-center gap-2">
          <CreateListingButton size="sm" label="Create" />
          <ConnectButton
            showBalance={false}
            chainStatus="none"
            accountStatus={status === "authenticated" ? "avatar" : "address"}
            label="Connect"
          />
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[212px] z-50 flex-col bg-[#070a12] border-r border-line">
        <Link
          href="/"
          className="flex items-center gap-2.5 px-5 h-[76px] shrink-0"
          aria-label="LNOC home"
        >
          <Wordmark />
        </Link>

        <nav className="flex-1 overflow-y-auto px-3 space-y-0.5">
          {NAV.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={hrefFor(item)}
                className={`flex items-center gap-3 px-3 py-2.5 transition-all duration-200 rounded-lg text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-primary/20 font-bold text-white"
                    : "text-caption hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <Icon className="w-[17px] h-[17px] shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-4 shrink-0 space-y-3">
          <CreateListingButton size="sm" className="w-full" />
          <SidebarAuthCard />
        </div>
      </aside>

      {/* Mobile bottom tabs */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 z-50 lg:hidden bg-[#070a12]/97 backdrop-blur-md border-t border-line">
        <div className="h-full flex items-stretch px-1">
          {MOBILE_NAV.map((item) => { if (!item) return null;
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={hrefFor(item)}
                className="flex-1 flex flex-col items-center justify-center gap-1"
              >
                <span
                  className={`flex items-center justify-center w-10 h-7 rounded-lg ${
                    active ? "bg-primary/20 text-primary-light" : "text-caption"
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                </span>
                <span
                  className={`text-[10px] font-semibold ${
                    active ? "text-primary-light" : "text-caption"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
