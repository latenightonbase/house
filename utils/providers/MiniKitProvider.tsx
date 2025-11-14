"use client";

import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { ReactNode } from "react";
import { base } from "wagmi/chains";
import Rainbow from "./rainbow";
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
        appId={`cmggt86he00kmjy0crv42kfso`}
        config={{
          loginMethods: ['twitter'],
          appearance: {
            theme: 'dark',
            accentColor: '#676FFF',
          },
          embeddedWallets: {
            ethereum: {
              createOnLogin: 'users-without-wallets',
            },
          },
        }}
      >
        <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
          <GlobalProvider>
            <Rainbow>{children}</Rainbow>
          </GlobalProvider>
        </SessionProvider>
      </PrivyProvider>
    </MiniKitProvider>
    // </MiniAppProvider>
  );
}
