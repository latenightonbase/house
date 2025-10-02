"use client";

import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { ReactNode } from "react";
import { base } from "wagmi/chains";
import Rainbow from "./rainbow";
import { GlobalProvider } from "./globalContext";

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
        <GlobalProvider>
        <Rainbow>{children}</Rainbow>

        </GlobalProvider>
      </MiniKitProvider>
    // </MiniAppProvider>
  );
}
