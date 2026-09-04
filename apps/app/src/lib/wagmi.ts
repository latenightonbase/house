import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  base as baseWallet,
  coinbaseWallet,
  metaMaskWallet,
  phantomWallet,
  rainbowWallet,
  trustWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { base, baseSepolia } from "wagmi/chains";
import { robinhood } from "@/lib/chains";

export const config = getDefaultConfig({
  appName: "House Identity",
  projectId: process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || "demo-project-id",
  chains: [robinhood, base, baseSepolia],
  ssr: true,
  multiInjectedProviderDiscovery: false,
  wallets: [
    {
      groupName: "Popular",
      wallets: [
        metaMaskWallet,
        coinbaseWallet,
        trustWallet,
        rainbowWallet,
        phantomWallet,
        baseWallet,
      ],
    },
  ],
});
