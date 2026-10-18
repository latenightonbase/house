"use client";

import { useEffect, useState } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";

import { ALL_WALLETS_ID, FEATURED_WALLET_IDS } from "@/lib/all-wallets";

/** Where RainbowKit keeps the wallets it pins to the top as "Recent". */
const RECENT_WALLETS_KEY = "rk-recent";
const MAX_RECENT_WALLETS = 3;

function readRecentWalletIds(): string[] {
  try {
    const ids = JSON.parse(window.localStorage.getItem(RECENT_WALLETS_KEY) ?? "[]");
    return Array.isArray(ids) ? ids.slice(0, MAX_RECENT_WALLETS) : [];
  } catch {
    return [];
  }
}

/**
 * RainbowKit has no "show more", so the connect modal's long tail is hidden
 * with CSS until the viewer clicks the "All Wallets" row, which is caught here
 * before RainbowKit treats it as a wallet. Each row's button carries
 * `data-testid="rk-wallet-option-<id>"`; hiding its parent removes the whole
 * row on desktop and the whole tile on mobile. On desktop a group heading is
 * the sibling just before its list of rows.
 */
export function WalletListToggle() {
  const { connectModalOpen } = useConnectModal();
  const [expanded, setExpanded] = useState(false);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    if (!connectModalOpen) {
      setExpanded(false);
      return;
    }
    setRecentIds(readRecentWalletIds());

    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest(`[data-testid="rk-wallet-option-${ALL_WALLETS_ID}"]`)) return;
      event.preventDefault();
      event.stopPropagation();
      setExpanded(true);
    };
    // Capture on document runs before React's listeners on the portal root.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [connectModalOpen]);

  if (!connectModalOpen) return null;

  const option = (id: string) => `[data-testid="rk-wallet-option-${CSS.escape(id)}"]`;
  const anyOption = '[data-testid^="rk-wallet-option-"]';
  const shownIds = [...FEATURED_WALLET_IDS, ...recentIds, ALL_WALLETS_ID];
  const dialog = '[data-rk] [role="dialog"]';

  const css = expanded
    ? `${dialog} div:has(> ${option(ALL_WALLETS_ID)}) { display: none !important; }`
    : // Every row that isn't shown, then any group heading left with no rows under it.
      `${dialog} div:has(> ${anyOption}${shownIds.map((id) => `:not(${option(id)})`).join("")}),
       ${dialog} div:has(+ div > div > ${anyOption}):not(:has(+ div > div > :is(${shownIds
         .map(option)
         .join(", ")}))) { display: none !important; }`;

  return <style>{css}</style>;
}
