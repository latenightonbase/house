import type { Wallet } from "@rainbow-me/rainbowkit";
import { createConnector } from "wagmi";

/**
 * The connect modal lists only these wallets until the viewer picks "All".
 * Ids are RainbowKit's wallet ids, in the order the modal shows them.
 */
export const FEATURED_WALLET_IDS = ["coinbase", "phantom", "rabby", "trust", "metaMask"];

export const ALL_WALLETS_ID = "allWallets";

const ALL_WALLETS_ICON = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><rect width="28" height="28" fill="#2f6bff"/><g fill="#fff"><rect x="7" y="7" width="6" height="6" rx="1.5"/><rect x="15" y="7" width="6" height="6" rx="1.5"/><rect x="7" y="15" width="6" height="6" rx="1.5"/><rect x="15" y="15" width="6" height="6" rx="1.5"/></g></svg>',
)}`;

/**
 * Not a wallet: a row in RainbowKit's list that `WalletListToggle` intercepts
 * to reveal the rest. Its connector exists only because RainbowKit requires
 * one, and refuses to connect if it is ever reached.
 */
export const allWalletsWallet = (): Wallet => ({
  id: ALL_WALLETS_ID,
  name: "All Wallets",
  iconUrl: ALL_WALLETS_ICON,
  iconBackground: "#2f6bff",
  installed: true,
  createConnector: (walletDetails) =>
    createConnector(() => ({
      ...walletDetails,
      id: ALL_WALLETS_ID,
      name: "All Wallets",
      type: ALL_WALLETS_ID,
      async connect() {
        throw new Error("All Wallets is not a wallet");
      },
      async disconnect() {},
      async getAccounts() {
        return [];
      },
      async getChainId() {
        return 0;
      },
      async getProvider() {
        return undefined;
      },
      async isAuthorized() {
        return false;
      },
      onAccountsChanged() {},
      onChainChanged() {},
      onDisconnect() {},
    })),
});
