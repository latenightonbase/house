"use client";
import { PrivyProvider } from '@privy-io/react-auth';
import { SessionProvider } from "next-auth/react";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { base } from "viem/chains";
import { ReactNode } from "react";
import { GlobalProvider } from './globalContext';
import { createConfig, http } from '@wagmi/core';

const queryClient = new QueryClient();

export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
});

const Rainbow = ({ children }: { children: ReactNode }) => {
  return (
    <PrivyProvider
      appId="cmggt86he00kmjy0crv42kfso"
      config={{
        appearance: {
          loginMethods: ['farcaster'],
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      <WagmiProvider config={config}>
        <SessionProvider refetchInterval={0}>
          <GlobalProvider>
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
          </GlobalProvider>
        </SessionProvider>
      </WagmiProvider>
    </PrivyProvider>
  );
};

export default Rainbow;
