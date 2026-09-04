"use client";

import { Wallet } from "lucide-react";
import { useConnectWalletChrome, useOpenConnect } from "@/components/connect-intent";
import { cn } from "@/lib/utils";

type Size = "sm" | "md";

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[11px] gap-1.5 uppercase tracking-[0.14em] whitespace-nowrap",
  md: "h-11 px-5 text-[12px] gap-2 uppercase tracking-[0.14em] whitespace-nowrap",
};

/**
 * Visible immediately. The RainbowKit control is swapped in after the wallet
 * chunk loads so first paint does not wait on WalletConnect / MetaMask SDK.
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
  const Chrome = useConnectWalletChrome();
  const openConnect = useOpenConnect();

  if (Chrome) {
    return <Chrome size={size} showIcon={showIcon} className={className} />;
  }

  return (
    <button
      type="button"
      onClick={openConnect}
      className={cn(
        "btn-outline-accent inline-flex items-center justify-center",
        SIZES[size],
        className,
      )}
    >
      {showIcon && <Wallet className="w-[14px] h-[14px]" aria-hidden="true" />}
      Connect Wallet
    </button>
  );
}
