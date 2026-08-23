"use client";

import { createAuthenticationAdapter } from "@rainbow-me/rainbowkit";
import { createSiweMessage } from "viem/siwe";

export const authenticationAdapter = createAuthenticationAdapter({
  getNonce: async () => {
    const res = await fetch("/backend/auth/nonce", { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch nonce");
    const data = (await res.json()) as { nonce: string };
    return data.nonce;
  },
  createMessage: ({ nonce, address, chainId }) => {
    return createSiweMessage({
      domain: window.location.host,
      address,
      statement: "Sign in to House Identity with your wallet.",
      uri: window.location.origin,
      version: "1",
      chainId,
      nonce,
    });
  },
  verify: async ({ message, signature }) => {
    const res = await fetch("/backend/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ message, signature }),
    });
    return Boolean(res.ok);
  },
  signOut: async () => {
    await fetch("/backend/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  },
});
