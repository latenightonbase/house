"use client";

import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { ReactNode } from "react";
import { base } from "wagmi/chains";
import { GlobalProvider } from "./globalContext";
import { SessionProvider } from "next-auth/react";
import { PrivyProvider } from "@privy-io/react-auth";

export function MiniKitContextProvider({ children }: { children: ReactNode }) {
  return (
    // <MiniAppProvider>
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
        appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID as string}
        config={{
          // Only Twitter for authentication - wallets are connectors
          loginMethods: ['twitter', 'farcaster'],
          appearance: {
            theme: 'dark',
            accentColor: '#676FFF',
          },
          embeddedWallets: {
            ethereum: {
              createOnLogin: 'off',
            },
          },
          // Allow external wallet connections without affecting authentication
          
        }}
      >
        <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
          <GlobalProvider>
            {children}
          </GlobalProvider>
        </SessionProvider>
      </PrivyProvider>
    </MiniKitProvider>
    // </MiniAppProvider>
  );
}
