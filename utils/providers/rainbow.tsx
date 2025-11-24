"use client";
import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { base } from "wagmi/chains";
import { ReactNode } from "react";

const queryClient = new QueryClient();

// Privy will handle wallet connections - simple Wagmi config for chain support
export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
});

const PrivyWagmiProvider = ({ children }: { children: ReactNode }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default PrivyWagmiProvider;