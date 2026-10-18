import { getDefaultConfig, type WalletList } from "@rainbow-me/rainbowkit";
import * as rainbowWallets from "@rainbow-me/rainbowkit/wallets";
import { base, baseSepolia } from "wagmi/chains";
import { robinhood } from "@/lib/chains";
import { allWalletsWallet, phantomWallet, rabbyWallet } from "@/lib/wallet-list";

type WalletFn = WalletList[number]["wallets"][number];

// Order matters: the connect modal lists these first, then "All Wallets".
const featuredWallets = [
  rainbowWallets.coinbaseWallet,
  phantomWallet,
  rabbyWallet,
  rainbowWallets.trustWallet,
  rainbowWallets.metaMaskWallet,
] as WalletFn[];

const featuredRefs = new Set([
  ...featuredWallets,
  rainbowWallets.phantomWallet,
  rainbowWallets.rabbyWallet,
] as WalletFn[]);

// Hidden by `WalletListToggle` until the viewer picks "All Wallets".
const otherWallets = Object.values(rainbowWallets).filter(
  (wallet) => typeof wallet === "function" && !featuredRefs.has(wallet as WalletFn),
) as WalletFn[];

export const config = getDefaultConfig({
  appName: "House Identity",
  projectId: process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || "demo-project-id",
  chains: [robinhood, base, baseSepolia],
  ssr: true,
  multiInjectedProviderDiscovery: false,
  wallets: [
    { groupName: "Popular", wallets: [...featuredWallets, allWalletsWallet] },
    { groupName: "More", wallets: otherWallets },
  ],
});
