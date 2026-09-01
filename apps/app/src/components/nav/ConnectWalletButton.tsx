"use client";

import { ConnectButton, useConnectModal } from "@rainbow-me/rainbowkit";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

type Size = "sm" | "md";

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[11px] gap-1.5",
  md: "h-11 px-5 text-[12px] gap-2",
};

/**
 * The outlined violet wallet control from the reference — one component for the
 * top bar, the sidebar, and the mobile header. Once connected it collapses to
 * the account chip rather than staying an action.
 */
export function ConnectWalletButton({
  size = "md",
  showIcon = true,
  className,
}: {
  size?: Size;
  showIcon?: boolean;
  className?: string;
}) {
  const { openConnectModal } = useConnectModal();
  const shell = cn(
    "btn-outline-accent inline-flex items-center justify-center uppercase tracking-[0.14em] whitespace-nowrap",
    SIZES[size],
    className,
  );

  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, mounted }) => {
        if (!mounted || !account || !chain) {
          return (
            <button type="button" onClick={() => openConnectModal?.()} className={shell}>
              {showIcon && <Wallet className="w-[14px] h-[14px]" aria-hidden="true" />}
              Connect Wallet
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
                "border-negative/50 text-negative hover:bg-negative/10 hover:border-negative",
              )}
            >
              Wrong network
            </button>
          );
        }

        return (
          <button
            type="button"
            onClick={openAccountModal}
            className={cn(shell, "normal-case tracking-normal font-medium numeric")}
            aria-label="Open wallet"
          >
            {account.displayName}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
