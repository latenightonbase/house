"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Compass, UserRound } from "lucide-react";
import { SidebarAuthCard } from "@/components/SidebarAuthCard";
import { useSession } from "@/components/SessionProvider";

const NAV = [
  { href: "/", label: "Home", icon: Compass },
  { href: "/profile", label: "Profile", icon: UserRound, requiresAuth: true },
];

export function Header() {
  const pathname = usePathname();
  const { status } = useSession();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Mobile top bar */}
      <header className="fixed top-0 left-0 right-0 h-14 z-40 lg:hidden bg-background/95 backdrop-blur-md border-b border-line flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5" aria-label="House home">
          <Image src="/logo.svg" alt="" width={24} height={24} />
          <span className="flex flex-col items-start leading-none">
            <span className="text-white font-extrabold tracking-[0.16em] text-[13px]">
              HOUSE
            </span>
          </span>
        </Link>
        <ConnectButton
          showBalance={false}
          chainStatus="none"
          accountStatus={status === "authenticated" ? "avatar" : "address"}
          label="Connect"
        />
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[212px] z-50 flex-col bg-[#070a12] border-r border-line">
        <Link
          href="/"
          className="flex items-center gap-2.5 px-5 h-[76px] shrink-0"
          aria-label="House home"
        >
          <Image src="/logo.svg" alt="" width={30} height={30} />
          <span className="flex flex-col items-start leading-none">
            <span className="text-white font-extrabold tracking-[0.2em] text-[17px]">
              HOUSE
            </span>
            <span className="text-[8px] tracking-[0.32em] text-caption mt-1">
              IDENTITY
            </span>
          </span>
        </Link>

        <nav className="flex-1 overflow-y-auto px-3 space-y-0.5">
          {NAV.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            const locked =
              item.requiresAuth && status !== "authenticated" && status !== "loading";
            return (
              <Link
                key={item.href}
                href={locked ? "/?auth=required" : item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-primary text-white"
                    : "text-caption hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <Icon className="w-[17px] h-[17px] shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-4 shrink-0">
          <SidebarAuthCard />
        </div>
      </aside>

      {/* Mobile bottom tabs */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 z-50 lg:hidden bg-[#070a12]/97 backdrop-blur-md border-t border-line">
        <div className="h-full flex items-stretch px-1">
          {NAV.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            const locked =
              item.requiresAuth && status !== "authenticated" && status !== "loading";
            return (
              <Link
                key={item.href}
                href={locked ? "/?auth=required" : item.href}
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
