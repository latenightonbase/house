"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ChevronDown } from "lucide-react";
import { useAccount } from "wagmi";
import { useSession } from "@/components/SessionProvider";
import { Badge, BrandAvatar, Card, LinkButton } from "@/components/ui";
import { shortAddress, walletFallbackAvatar } from "@/lib/utils";

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
    const primarySocial = user?.socials.find((s) => s.avatarUrl);
    const displayName = user?.username
      ? `@${user.username}`
      : primarySocial?.displayName;
    const avatarUrl = user?.avatarUrl || primarySocial?.avatarUrl;

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
          <WalletButton
            avatarUrl={avatarUrl}
            avatarAlt={displayName || primary?.address}
            fallbackSeed={primary?.address}
            displayName={displayName}
          />
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
      <div className="mt-3">
        <WalletButton label="Connect wallet" />
      </div>
    </Card>
  );
}

function WalletButton({
  label = "Connect wallet",
  avatarUrl,
  avatarAlt,
  fallbackSeed,
  displayName,
}: {
  label?: string;
  avatarUrl?: string | null;
  avatarAlt?: string;
  fallbackSeed?: string;
  displayName?: string | null;
}) {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        if (!mounted) {
          return (
            <div
              aria-hidden
              className="h-9 w-full rounded-lg bg-white/[0.04] animate-pulse"
            />
          );
        }

        if (!account || !chain) {
          return (
            <button
              type="button"
              onClick={openConnectModal}
              className="btn-primary h-8 w-full px-3 text-[12px] font-semibold"
            >
              {label}
            </button>
          );
        }

        if (chain.unsupported) {
          return (
            <button
              type="button"
              onClick={openChainModal}
              className="h-8 w-full px-3 text-[12px] font-semibold rounded-lg bg-negative/15 text-negative border border-negative/40"
            >
              Wrong network
            </button>
          );
        }

        const seed = fallbackSeed || account.address;
        return (
          <button
            type="button"
            onClick={openAccountModal}
            className="tile group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left outline-none transition-colors hover:border-line-strong hover:bg-white/[0.03] focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/25"
            aria-label="Open wallet"
          >
            <BrandAvatar
              src={avatarUrl || walletFallbackAvatar(seed)}
              alt={avatarAlt || account.displayName}
              shape="square"
              fallbackSeed={seed}
              size={28}
            />
            <span className="min-w-0 flex-1">
              {displayName ? (
                <>
                  <span className="block truncate text-[12px] font-semibold leading-tight text-white">
                    {displayName}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] leading-tight text-caption numeric">
                    {account.displayName}
                  </span>
                </>
              ) : (
                <span className="block truncate text-[12px] font-medium text-white numeric">
                  {account.displayName}
                </span>
              )}
            </span>
            <ChevronDown className="w-3.5 h-3.5 shrink-0 text-caption/60 transition-colors group-hover:text-caption" />
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
