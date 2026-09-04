"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import {
  RainbowKitAuthenticationProvider,
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { SpeedInsights } from "@vercel/speed-insights/next"


import { config } from "@/lib/wagmi";
import { authenticationAdapter } from "@/lib/auth-adapter";
import { SessionProvider, useSession } from "@/components/SessionProvider";
import { SetupUsernameDialog } from "@/components/SetupUsernameDialog";

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
        {children}
      </RainbowKitProvider>
    </RainbowKitAuthenticationProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <RainbowKitAuthBridge>
            <SpeedInsights />
            {children}
            <SetupUsernameDialog />
          </RainbowKitAuthBridge>
        </SessionProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
