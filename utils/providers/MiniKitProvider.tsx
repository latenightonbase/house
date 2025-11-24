"use client";

import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { ReactNode } from "react";
import { base } from "wagmi/chains";
import PrivyWagmiProvider from "./rainbow";
import { GlobalProvider } from "./globalContext";
import { PrivyProvider } from "@privy-io/react-auth";

export function MiniKitContextProvider({ children }: { children: ReactNode }) {
  return (
    <MiniKitProvider
      apiKey={process.env.NEXT_PUBLIC_CDP_CLIENT_API_KEY}
      chain={base}
      notificationProxyUrl="/api/notification"
      config={{
        appearance: {
          mode: "auto",
          theme: "mini-app-theme",
          name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
          logo: process.env.NEXT_PUBLIC_ICON_URL,
        },
      }}
    >
      <PrivyProvider 
        appId={`cmggt86he00kmjy0crv42kfso`}
        config={{
          loginMethods: ['farcaster', 'twitter', 'wallet'],
          appearance: {
            theme: 'dark',
            accentColor: '#676FFF',
          },
          // Embedded wallet auto-creation disabled for Farcaster Mini Apps
          // Wallets will be created manually or use injected wallets from Farcaster/Base App
          // External wallet connections handled by Privy
        }}
      >
        <GlobalProvider>
          <PrivyWagmiProvider>{children}</PrivyWagmiProvider>
        </GlobalProvider>
      </PrivyProvider>
    </MiniKitProvider>
  );
}
