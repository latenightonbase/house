"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useSession } from "@/components/SessionProvider";
import { Badge, Card, LinkButton } from "@/components/ui";
import { shortAddress } from "@/lib/utils";

/**
 * SIWE is the only auth. Social linking (below, once signed in) just
 * refreshes follower data and must never be mistaken for sign-in.
 *
 * The SIWE session (cookie) and wagmi's wallet-connector state are tracked
 * independently, so a session can outlive the wallet connection (extension
 * disconnected, storage cleared). Showing RainbowKit's own "Connect Wallet"
 * button in that state would contradict the "signed in" card above it, so
 * it only renders once wagmi confirms the wallet is actually connected.
 */
export function SidebarAuthCard() {
  const { status, user } = useSession();
  const { isConnected } = useAccount();

  if (status === "loading") {
    return (
      <div className="card p-3.5 space-y-3">
        <div className="h-3 w-24 rounded bg-white/[0.04] animate-pulse" />
        <div className="h-8 w-full rounded-lg bg-white/[0.04] animate-pulse" />
      </div>
    );
  }

  if (status === "authenticated") {
    const primary = user?.wallets.find((w) => w.isPrimary) || user?.wallets[0];

    return (
      <div className="space-y-3">
        <Card className="p-3.5">
          <p className="text-[13px] font-bold text-white leading-snug">
            Verify Reach
          </p>
          <p className="text-[11px] text-caption mt-1 leading-snug">
            Add socials to show verified reach.
          </p>
          <LinkButton href="/dashboard" size="sm" className="mt-3 w-full">
            Open profile
          </LinkButton>
        </Card>
        {isConnected ? (
          <div className="flex justify-center [&_button]:!text-[12px]">
            <ConnectButton
              showBalance={false}
              chainStatus="icon"
              accountStatus="address"
            />
          </div>
        ) : primary ? (
          <div className="tile flex items-center justify-between gap-2 px-3 py-2.5">
            <span className="text-[11px] text-caption truncate">
              {shortAddress(primary.address)}
            </span>
            <Badge variant="positive" className="shrink-0">
              Signed in
            </Badge>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Card className="p-3.5">
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
    </Card>
  );
}
