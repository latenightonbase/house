import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  baseAccount,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { base, baseSepolia } from "wagmi/chains";
import { robinhood } from "@/lib/chains";

export const config = getDefaultConfig({
  appName: "House Identity",
  projectId: process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || "demo-project-id",
  chains: [robinhood, base, baseSepolia],
  ssr: true,
  wallets: [
    {
      groupName: "Recommended",
      wallets: [metaMaskWallet, rainbowWallet, walletConnectWallet],
    },
    {
      groupName: "Other",
      wallets: [baseAccount],
    },
  ],
});
