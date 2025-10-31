"use client";
import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitSiweNextAuthProvider } from "@rainbow-me/rainbowkit-siwe-next-auth";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { AppProps } from "next/app";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { base } from "viem/chains";
import { ReactNode } from "react";
import {
  GetSiweMessageOptions,
} from '@rainbow-me/rainbowkit-siwe-next-auth';
import { GlobalProvider } from './globalContext';

const getSiweMessageOptions: GetSiweMessageOptions = () => ({
  statement: "Sign in to Auction House",
});

const queryClient = new QueryClient();

export const config = getDefaultConfig({
  appName: "My RainbowKit App",
  projectId: "5d10af3027c340310f3a3da64cbcedac",
  chains: [base],
  ssr: true, // If your dApp uses server side rendering (SSR)
});

const Rainbow = ({ children }: { children: ReactNode }) => {
  return (
    <WagmiProvider config={config}>
      <SessionProvider refetchInterval={0}>
        <GlobalProvider>

        
        <QueryClientProvider client={queryClient}>
          <RainbowKitSiweNextAuthProvider getSiweMessageOptions={getSiweMessageOptions}>
            <RainbowKitProvider>{children}</RainbowKitProvider>
          </RainbowKitSiweNextAuthProvider>
        </QueryClientProvider>
        </GlobalProvider>
      </SessionProvider>
    </WagmiProvider>
  );
};

export default Rainbow;
