"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { lightConfig } from "@/lib/wagmi-light";
import { ConnectIntentProvider } from "@/components/connect-intent";
import { SessionProvider } from "@/components/SessionProvider";
import { SetupUsernameDialog } from "@/components/SetupUsernameDialog";

type WalletTree = ComponentType<{ children: ReactNode }>;

function loadWalletProviders() {
  return import("@/components/WalletProviders").then((mod) => mod.WalletProviders);
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [WalletTree, setWalletTree] = useState<WalletTree | null>(null);

  useEffect(() => {
    let cancelled = false;

    const mount = () => {
      void loadWalletProviders().then((mod) => {
        if (!cancelled) setWalletTree(() => mod);
      });
    };

    const onInteract = () => mount();
    window.addEventListener("pointerdown", onInteract, { once: true, passive: true });

    let idleId: number | undefined;
    let timeoutId: number | undefined;
    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(mount, { timeout: 800 });
    } else {
      timeoutId = window.setTimeout(mount, 1);
    }

    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", onInteract);
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, []);

  const body = (
    <>
      <SpeedInsights />
      {children}
      <SetupUsernameDialog />
    </>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ConnectIntentProvider>
          {WalletTree ? (
            <WalletTree>{body}</WalletTree>
          ) : (
            <WagmiProvider config={lightConfig}>{body}</WagmiProvider>
          )}
        </ConnectIntentProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
