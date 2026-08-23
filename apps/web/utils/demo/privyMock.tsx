"use client";

/**
 * DEMO-MODE AUTH STUB
 * ===================
 * Stands in for `@privy-io/react-auth` so the UI can be run and reviewed
 * without live Privy credentials. It is wired up by the path alias in
 * `tsconfig.json` — no import sites were changed.
 *
 * To restore real Privy auth, delete these two entries from
 * `compilerOptions.paths` in tsconfig.json:
 *
 *   "@privy-io/react-auth":           ["./utils/demo/privyMock.tsx"]
 *   "@privy-io/react-auth/farcaster": ["./utils/demo/privyMock.tsx"]
 *
 * Nothing else needs to change. Everything here returns a signed-in demo
 * user; no network calls are made and no real credentials are involved.
 * Transaction paths intentionally throw — this stub is for design review,
 * not for exercising on-chain flows.
 */

import { ReactNode } from "react";
import { DEMO_VIEWER } from "./mockData";

export const DEMO_MODE = true;

// ── Types mirroring the parts of the Privy API this app touches ───────

export interface DemoWallet {
  address: string;
  walletClientType: string;
  chainId: string;
  switchChain: (chainId: number) => Promise<void>;
  getEthereumProvider: () => Promise<{ request: (args: any) => Promise<any> }>;
  disconnect: () => void;
  sign: (message: string) => Promise<string>;
  sendTransaction: (tx: unknown) => Promise<unknown>;
}

export interface DemoPrivyUser {
  id: string;
  twitter: {
    subject: string;
    username: string;
    profilePictureUrl: string;
    name: string;
  } | null;
  farcaster: { fid: number } | null;
  wallet: { address: string } | null;
}

// ── Provider ──────────────────────────────────────────────────────────

export function PrivyProvider({
  children,
}: {
  children: ReactNode;
  [key: string]: any;
}) {
  return <>{children}</>;
}

// ── Fixtures ──────────────────────────────────────────────────────────

const demoWallet: DemoWallet = {
  address: DEMO_VIEWER.wallet,
  walletClientType: "demo",
  chainId: "eip155:8453",
  switchChain: async () => {},
  getEthereumProvider: async () => ({
    request: async () => {
      throw new Error("Demo mode: on-chain requests are disabled.");
    },
  }),
  disconnect: () => {},
  sign: async () => "0xdemo",
  sendTransaction: async () => {
    throw new Error("Demo mode: transactions are disabled.");
  },
};

const demoPrivyUser: DemoPrivyUser = {
  id: "demo-privy-user",
  twitter: {
    subject: DEMO_VIEWER.socialId,
    username: DEMO_VIEWER.username,
    profilePictureUrl: DEMO_VIEWER.pfp_url ?? "",
    name: DEMO_VIEWER.display_name,
  },
  farcaster: null,
  wallet: { address: DEMO_VIEWER.wallet },
};

// ── Standalone helpers ────────────────────────────────────────────────

export async function getAccessToken(): Promise<string> {
  return "demo-access-token";
}

// ── Hooks ─────────────────────────────────────────────────────────────

export function usePrivy() {
  return {
    ready: true,
    authenticated: true,
    user: demoPrivyUser,
    getAccessToken,
    login: () => {},
    logout: async () => {},
    connectWallet: () => {},
    linkWallet: () => {},
  };
}

export function useWallets(): { wallets: DemoWallet[]; ready: boolean } {
  return { wallets: [demoWallet], ready: true };
}

interface OAuthCallbacks {
  onComplete?: (args: {
    user: DemoPrivyUser;
    isNewUser: boolean;
    wasAlreadyAuthenticated: boolean;
    loginMethod: string | null;
    loginAccount: unknown;
  }) => void;
  onError?: (error: unknown) => void;
}

export function useLogin(callbacks?: OAuthCallbacks) {
  return {
    login: (_opts?: { loginMethods?: string[] }) => {
      callbacks?.onComplete?.({
        user: demoPrivyUser,
        isNewUser: false,
        wasAlreadyAuthenticated: true,
        loginMethod: "twitter",
        loginAccount: demoPrivyUser.twitter,
      });
    },
  };
}

export function useLogout() {
  return { logout: async () => {} };
}

export function useLoginWithOAuth(callbacks?: OAuthCallbacks) {
  return {
    initOAuth: async (_opts?: { provider?: string }) => {
      callbacks?.onComplete?.({
        user: demoPrivyUser,
        isNewUser: false,
        wasAlreadyAuthenticated: true,
        loginMethod: "twitter",
        loginAccount: demoPrivyUser.twitter,
      });
    },
    loading: false,
    state: { status: "done" as const },
  };
}

interface ConnectWalletCallbacks {
  onSuccess?: (args: { wallet: DemoWallet }) => void;
  onError?: (error: unknown) => void;
}

export function useConnectWallet(callbacks?: ConnectWalletCallbacks) {
  return {
    connectWallet: () => {
      callbacks?.onSuccess?.({ wallet: demoWallet });
    },
  };
}

// ── `@privy-io/react-auth/farcaster` surface ──────────────────────────

export function useLoginToMiniApp() {
  return {
    initLoginToMiniApp: async () => ({ nonce: "demo-nonce" }),
    loginToMiniApp: async (_args?: unknown) => ({ user: demoPrivyUser }),
  };
}
