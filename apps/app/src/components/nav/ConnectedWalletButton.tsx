"use client";

import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Wallet } from "lucide-react";
import { useAccount } from "wagmi";
import { useSession } from "@/components/SessionProvider";
import {
  fetchWalletIdentity,
  type PublicUser,
  type WalletIdentity,
} from "@/lib/api";
import { BrandAvatar } from "@/components/ui";
import { cn, walletFallbackAvatar } from "@/lib/utils";

type Size = "sm" | "md";

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[11px] gap-1.5 uppercase tracking-[0.14em] whitespace-nowrap",
  md: "h-11 px-5 text-[12px] gap-2 uppercase tracking-[0.14em] whitespace-nowrap",
};

const CONNECTED_SIZES: Record<Size, string> = {
  sm: "h-8 pl-1 pr-2.5 text-[11px] gap-1.5 max-w-[168px]",
  md: "min-h-11 pl-1.5 pr-3 py-1.5 text-[12px] gap-2",
};

const AVATAR_SIZES: Record<Size, number> = {
  sm: 22,
  md: 32,
};

function profileUsername(user: PublicUser | null, lookup: WalletIdentity | null) {
  if (user?.username) return user.username;
  const social = user?.socials.find((s) => s.username)?.username;
  if (social) return social;
  return lookup?.username ?? null;
}

function profileAvatar(user: PublicUser | null, lookup: WalletIdentity | null, wallet?: string) {
  return (
    user?.avatarUrl ||
    user?.socials.find((s) => s.avatarUrl)?.avatarUrl ||
    lookup?.avatarUrl ||
    walletFallbackAvatar(wallet)
  );
}

/**
 * RainbowKit-backed wallet control. Loaded after first paint so MetaMask /
 * WalletConnect clients are not on the homepage critical path.
 */
export function ConnectedWalletButton({
  size = "md",
  showIcon = true,
  className,
}: {
  size?: Size;
  showIcon?: boolean;
  className?: string;
}) {
  const { user } = useSession();
  const { address } = useAccount();
  const [lookup, setLookup] = useState<WalletIdentity | null>(null);
  const shell = cn("btn-outline-accent inline-flex items-center justify-center", className);

  useEffect(() => {
    if (!address) {
      setLookup(null);
      return;
    }
    if (user?.username || user?.socials.some((s) => s.username)) return;
    let cancelled = false;
    void fetchWalletIdentity(address).then((data) => {
      if (!cancelled) setLookup(data);
    });
    return () => {
      cancelled = true;
    };
  }, [address, user]);

  const username = profileUsername(user, lookup);
  const avatarSrc = profileAvatar(user, lookup, address);

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const signedIn =
          ready &&
          !!account &&
          !!chain &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        if (!signedIn || !account || !chain) {
          const needsSignature = ready && !!account && authenticationStatus === "unauthenticated";
          return (
            <button
              type="button"
              onClick={openConnectModal}
              className={cn(shell, SIZES[size])}
              aria-hidden={!ready}
              tabIndex={ready ? undefined : -1}
              style={ready ? undefined : { opacity: 0, pointerEvents: "none", userSelect: "none" }}
            >
              {showIcon && <Wallet className="w-[14px] h-[14px]" aria-hidden="true" />}
              {needsSignature ? "Sign in" : "Connect Wallet"}
            </button>
          );
        }

        if (chain.unsupported) {
          return (
            <button
              type="button"
              onClick={openChainModal}
              className={cn(
                shell,
                SIZES[size],
                "border-negative/50 text-negative hover:bg-negative/10 hover:border-negative",
              )}
            >
              Wrong network
            </button>
          );
        }

        const label = username ? `@${username}` : account.displayName;

        return (
          <button
            type="button"
            onClick={openAccountModal}
            className={cn(shell, CONNECTED_SIZES[size], "font-medium")}
            aria-label="Open wallet"
          >
            <BrandAvatar
              src={avatarSrc}
              alt={label}
              shape="square"
              fallbackSeed={account.address}
              size={AVATAR_SIZES[size]}
            />
            <span className="min-w-0 flex-1 text-left leading-tight">
              <span className="block truncate">{label}</span>
              {username && size === "md" ? (
                <span className="block truncate text-[10px] text-caption font-normal numeric">
                  {account.displayName}
                </span>
              ) : null}
            </span>
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
