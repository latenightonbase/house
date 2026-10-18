import type { Wallet, WalletDetailsParams, WalletList } from "@rainbow-me/rainbowkit";
import * as rainbowWallets from "@rainbow-me/rainbowkit/wallets";
import { createConnector } from "wagmi";

type WalletFn = WalletList[number]["wallets"][number];

/**
 * The connect modal lists only these wallets until the viewer picks "All".
 * Ids are RainbowKit's wallet ids, in the order the modal shows them.
 */
export const FEATURED_WALLET_IDS = ["coinbase", "phantom", "rabby", "trust", "metaMask"];

export const ALL_WALLETS_ID = "allWallets";

const ALL_WALLETS_ICON = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><rect width="28" height="28" fill="#2f6bff"/><g fill="#fff"><rect x="7" y="7" width="6" height="6" rx="1.5"/><rect x="15" y="7" width="6" height="6" rx="1.5"/><rect x="7" y="15" width="6" height="6" rx="1.5"/><rect x="15" y="15" width="6" height="6" rx="1.5"/></g></svg>',
)}`;

/** RainbowKit's own test, which decides whether the modal uses its phone layout. */
function isMobile() {
  if (typeof navigator === "undefined") return false;
  return (
    /android|iPhone|iPod|iPad/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * A connector that never connects: `connect` runs `onConnect` and then fails,
 * so wagmi and RainbowKit go back to where they were.
 */
function inertConnector(
  walletDetails: WalletDetailsParams,
  { id, name, onConnect }: { id: string; name: string; onConnect: () => void },
) {
  return createConnector(() => ({
    ...walletDetails,
    id,
    name,
    type: id,
    async connect() {
      onConnect();
      throw new Error(`${name} does not connect from here`);
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
  }));
}

/**
 * Not a wallet: a row in RainbowKit's list that `WalletListToggle` intercepts
 * to reveal the rest. Its connector exists only because RainbowKit requires one.
 */
export const allWalletsWallet = (): Wallet => ({
  id: ALL_WALLETS_ID,
  name: "All Wallets",
  iconUrl: ALL_WALLETS_ICON,
  iconBackground: "#2f6bff",
  installed: true,
  createConnector: (walletDetails) =>
    inertConnector(walletDetails, { id: ALL_WALLETS_ID, name: "All Wallets", onConnect: () => {} }),
});

/*
 * RainbowKit's Rabby and Phantom are browser-extension wallets only, so a phone
 * browser, which has no extension, leaves them out of the modal. The wrappers
 * below keep RainbowKit's wallet wherever its extension or in-app browser is
 * present, and on a phone without it reach the mobile app instead.
 */

/** Rabby's mobile app takes WalletConnect sessions at `rabby://` (per the WalletConnect registry). */
export const rabbyWallet: WalletFn = (params) => {
  const wallet = rainbowWallets.rabbyWallet();
  if (wallet.installed || !isMobile()) return wallet;

  const walletConnect = rainbowWallets.walletConnectWallet({
    projectId: params.projectId,
    options: params.walletConnectParameters,
  });
  return {
    ...wallet,
    installed: undefined,
    mobile: { getUri: (uri: string) => `rabby://wc?uri=${encodeURIComponent(uri)}` },
    createConnector: walletConnect.createConnector,
  };
};

/**
 * Phantom doesn't support WalletConnect, so on a phone it reopens this page in
 * Phantom's in-app browser, where its injected provider connects as usual.
 * https://docs.phantom.com/phantom-deeplinks/other-methods/browse
 */
export const phantomWallet: WalletFn = () => {
  const wallet = rainbowWallets.phantomWallet();
  if (wallet.installed || !isMobile()) return wallet;

  return {
    ...wallet,
    installed: undefined,
    createConnector: (walletDetails) =>
      inertConnector(walletDetails, {
        id: wallet.id,
        name: wallet.name,
        onConnect: () => {
          const url = encodeURIComponent(window.location.href);
          const ref = encodeURIComponent(window.location.origin);
          window.location.href = `https://phantom.com/ul/browse/${url}?ref=${ref}`;
        },
      }),
  };
};
