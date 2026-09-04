"use client";

import { useEffect, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import {
  RainbowKitAuthenticationProvider,
  RainbowKitProvider,
  darkTheme,
  useConnectModal,
} from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";

import { config } from "@/lib/wagmi";
import { authenticationAdapter } from "@/lib/auth-adapter";
import { useSession } from "@/components/SessionProvider";
import {
  useBindConnectModal,
  useSetConnectWalletChrome,
} from "@/components/connect-intent";
import { ConnectedWalletButton } from "@/components/nav/ConnectedWalletButton";

function BindConnectModal() {
  const { openConnectModal } = useConnectModal();
  const bind = useBindConnectModal();

  useEffect(() => {
    if (!openConnectModal) return;
    bind(openConnectModal);
    return () => bind(null);
  }, [bind, openConnectModal]);

  return null;
}

function BindWalletChrome() {
  const setChrome = useSetConnectWalletChrome();

  useEffect(() => {
    setChrome(ConnectedWalletButton);
    return () => setChrome(null);
  }, [setChrome]);

  return null;
}

function RainbowKitAuthBridge({ children }: { children: ReactNode }) {
  const { status, refresh, setUnauthenticated } = useSession();

  return (
    <RainbowKitAuthenticationProvider
      adapter={{
        ...authenticationAdapter,
        verify: async (args) => {
          const ok = await authenticationAdapter.verify(args);
          if (ok) await refresh();
          return ok;
        },
        signOut: async () => {
          await authenticationAdapter.signOut();
          setUnauthenticated();
        },
      }}
      status={status}
    >
      <RainbowKitProvider
        theme={darkTheme({
          accentColor: "#2f6bff",
          accentColorForeground: "white",
          borderRadius: "medium",
          overlayBlur: "small",
        })}
      >
        <BindConnectModal />
        <BindWalletChrome />
        {children}
      </RainbowKitProvider>
    </RainbowKitAuthenticationProvider>
  );
}

export function WalletProviders({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <RainbowKitAuthBridge>{children}</RainbowKitAuthBridge>
    </WagmiProvider>
  );
}
