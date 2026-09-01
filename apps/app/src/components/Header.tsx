"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton, useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import {
  Compass,
  Users,
  Store,
  Megaphone,
  Gavel,
  LayoutDashboard,
} from "lucide-react";
import { CreateListingButton } from "@/components/CreateListingButton";
import { SidebarAuthCard } from "@/components/SidebarAuthCard";
import { useSession } from "@/components/SessionProvider";
import { isSuperadmin } from "@/lib/api";

/**
 * v1 only ships Discover and Dashboard. Other verticals stay visible so the
 * product map is obvious, but they are disabled until they go live.
 */
const NAV = [
  { href: "/", label: "Discover", icon: Compass },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, requiresAuth: true },
  { href: "/creators", label: "Creators", icon: Users, comingSoon: true },
  { href: "/marketplace", label: "Marketplace", icon: Store, comingSoon: true },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone, comingSoon: true },
  { href: "/auctions", label: "Auctions", icon: Gavel, comingSoon: true },
];

const MOBILE_NAV = NAV.filter((item) => !item.comingSoon);

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
  const { status, user } = useSession();
  const canCreate = isSuperadmin(user);
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const hrefFor = (item: (typeof NAV)[number]) =>
    item.requiresAuth && status !== "authenticated" && status !== "loading"
      ? "/?auth=required"
      : item.href;

  return (
    <>
      {/* Mobile top bar */}
      <header className="fixed top-0 left-0 right-0 z-40 lg:hidden bg-background/95 backdrop-blur-md border-b border-line pt-[var(--safe-top)]">
        <div className="h-14 flex items-center justify-between gap-2 px-3.5">
          <Link href="/" className="flex items-center gap-2 min-w-0" aria-label="LNOC home">
            <Wordmark compact />
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            {canCreate ? <CreateListingButton size="sm" label="Create" /> : null}
            <MobileConnectButton />
          </div>
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
            if (item.comingSoon) {
              return (
                <span
                  key={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-caption/60 cursor-not-allowed"
                  aria-disabled="true"
                >
                  <Icon className="w-[17px] h-[17px] shrink-0" />
                  <span className="truncate">{item.label}</span>
                  <span className="ml-auto text-[9px] uppercase tracking-wider font-semibold text-caption/80">
                    Soon
                  </span>
                </span>
              );
            }
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
          {canCreate ? <CreateListingButton size="sm" className="w-full" /> : null}
          <SidebarAuthCard />
        </div>
      </aside>

      {/* Mobile bottom tabs */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-[#070a12]/97 backdrop-blur-md border-t border-line pb-[var(--safe-bottom)]">
        <div className="h-16 flex items-stretch px-1">
          {MOBILE_NAV.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={hrefFor(item)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0"
              >
                <span
                  className={`flex items-center justify-center w-11 h-8 rounded-lg ${
                    active ? "bg-primary/20 text-primary-light" : "text-caption"
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                </span>
                <span
                  className={`text-[10px] font-semibold truncate max-w-full px-1 ${
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

function MobileConnectButton() {
  const { openConnectModal } = useConnectModal();
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <button
        type="button"
        onClick={() => openConnectModal?.()}
        className="btn-primary h-8 px-3 text-[12px] font-semibold"
      >
        Connect
      </button>
    );
  }

  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, mounted }) => {
        if (!mounted || !account || !chain) {
          return (
            <button
              type="button"
              onClick={() => openConnectModal?.()}
              className="btn-primary h-8 px-3 text-[12px] font-semibold"
            >
              Connect
            </button>
          );
        }

        if (chain.unsupported) {
          return (
            <button
              type="button"
              onClick={openChainModal}
              className="h-8 px-2.5 text-[12px] font-semibold rounded-lg bg-negative/15 text-negative border border-negative/40"
            >
              Network
            </button>
          );
        }

        return (
          <button
            type="button"
            onClick={openAccountModal}
            className="tile h-8 px-2.5 text-[12px] font-medium text-white numeric max-w-[7.5rem] truncate"
            aria-label="Open wallet"
          >
            {account.displayName}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
