"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useSession } from "@/components/SessionProvider";

/**
 * Sidebar footer CTA:
 * - SIWE authenticated → open profile
 * - Otherwise → ConnectButton (RainbowKit SIWE is the only auth)
 * Social linking is never treated as authentication.
 */
export function SidebarAuthCard() {
  const { status } = useSession();

  if (status === "loading") {
    return (
      <div className="card p-3.5 space-y-3">
        <div className="h-3 w-24 rounded bg-white/[0.04] animate-pulse" />
        <div className="h-8 w-full rounded-lg bg-white/[0.04] animate-pulse" />
      </div>
    );
  }

  if (status === "authenticated") {
    return (
      <div className="space-y-3">
        <div className="card p-3.5">
          <p className="text-[13px] font-bold text-white leading-snug">
            Verify Reach
          </p>
          <p className="text-[11px] text-caption mt-1 leading-snug">
            Link socials anytime — they refresh data, they are not sign-in.
          </p>
          <Link
            href="/profile"
            className="btn-primary mt-3 flex h-8 items-center justify-center text-[12px]"
          >
            Open profile
          </Link>
        </div>
        <div className="flex justify-center [&_button]:!text-[12px]">
          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus="address"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="card p-3.5">
      <p className="text-[13px] font-bold text-white leading-snug">
        Connect wallet
      </p>
      <p className="text-[11px] text-caption mt-1 leading-snug">
        Sign in with Ethereum (RainbowKit SIWE) to access your profile.
      </p>
      <div className="mt-3 flex w-full justify-stretch [&_button]:!w-full [&_button]:!justify-center">
        <ConnectButton
          label="Connect wallet"
          showBalance={false}
          chainStatus="none"
          accountStatus="address"
        />
      </div>
    </div>
  );
}
