import { getDefaultConfig, type WalletList } from "@rainbow-me/rainbowkit";
import * as rainbowWallets from "@rainbow-me/rainbowkit/wallets";
import { base, baseSepolia } from "wagmi/chains";
import { robinhood } from "@/lib/chains";

type WalletFn = WalletList[number]["wallets"][number];

const popularWallets = [
  rainbowWallets.metaMaskWallet,
  rainbowWallets.coinbaseWallet,
  rainbowWallets.trustWallet,
  rainbowWallets.rainbowWallet,
  rainbowWallets.phantomWallet,
  rainbowWallets.base,
] as WalletFn[];

const popularRefs = new Set(popularWallets);

const moreWallets = Object.values(rainbowWallets).filter(
  (wallet) => typeof wallet === "function" && !popularRefs.has(wallet as WalletFn),
) as WalletFn[];

export const config = getDefaultConfig({
  appName: "House Identity",
  projectId: process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || "demo-project-id",
  chains: [robinhood, base, baseSepolia],
  ssr: true,
  multiInjectedProviderDiscovery: false,
  wallets: [
    { groupName: "Popular", wallets: popularWallets },
    { groupName: "More", wallets: moreWallets },
  ],
});
