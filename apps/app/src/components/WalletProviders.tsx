"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { getAccount } from "wagmi/actions";
import {
  RainbowKitAuthenticationProvider,
  RainbowKitProvider,
  darkTheme,
  useConnectModal,
} from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";

import { config } from "@/lib/wagmi";
import { authenticationAdapter } from "@/lib/auth-adapter";
import { shouldRevokeSession } from "@/lib/wallet-session";
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
  const { status, user, refresh, setUnauthenticated } = useSession();

  /**
   * RainbowKit calls `signOut` from connector events, long after the render it
   * was built in — so the session is read through a ref rather than closed over.
   */
  const userRef = useRef(user);
  userRef.current = user;

  const adapter = useMemo(
    () => ({
      ...authenticationAdapter,
      verify: async (args: Parameters<typeof authenticationAdapter.verify>[0]) => {
        const ok = await authenticationAdapter.verify(args);
        if (ok) await refresh();
        return ok;
      },
      /**
       * `POST /auth/logout` deletes the session row outright, so a sign-out
       * fired by a wallet re-announcing the account already signed in is not a
       * cosmetic glitch — it strands whatever transaction is in flight. See
       * `shouldRevokeSession` for which of RainbowKit's triggers are real.
       */
      signOut: async () => {
        const revoke = await shouldRevokeSession({
          user: userRef.current,
          readAddress: () => getAccount(config).address,
        });
        if (!revoke) return;
        await authenticationAdapter.signOut();
        setUnauthenticated();
      },
    }),
    [refresh, setUnauthenticated],
  );

  return (
    <RainbowKitAuthenticationProvider adapter={adapter} status={status}>
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
