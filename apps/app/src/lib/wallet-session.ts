import type { PublicUser } from "@/lib/api";

/** True when `address` is one of the wallets the signed-in session owns. */
export function sessionOwnsAddress(
  user: PublicUser | null | undefined,
  address: string | null | undefined,
): boolean {
  if (!user?.wallets.length || !address) return false;
  const target = address.toLowerCase();
  return user.wallets.some((wallet) => wallet.address.toLowerCase() === target);
}

export interface RevokeCheckOptions {
  /** The signed-in user, read fresh at the moment the event fires. */
  user: PublicUser | null | undefined;
  /** The wallet address wagmi currently holds, or undefined when disconnected. */
  readAddress: () => string | null | undefined;
  /** How long a vanished wallet gets to come back before the session goes. */
  graceMs?: number;
  pollMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const DEFAULT_GRACE_MS = 3_000;
const DEFAULT_POLL_MS = 200;

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Whether a RainbowKit sign-out should actually revoke the server session.
 *
 * RainbowKit asks for a sign-out on *any* connector `change` event carrying an
 * `accounts` array — it never compares the addresses — and on any `disconnect`.
 * A WalletConnect wallet re-emits `accountsChanged` with the same account every
 * time the session re-syncs, which is exactly what a mobile deep link does on
 * the way to the wallet and back. That turned every "Book" tap on a phone into
 * a logout: the transaction still reached the wallet over the live relay, but
 * `POST /auth/logout` had already deleted the session row, so approving it
 * landed nowhere.
 *
 * So a sign-out only stands when the wallet is genuinely no longer the
 * signed-in one. A wallet that comes back inside the grace window was a round
 * trip, not a sign-out.
 */
export async function shouldRevokeSession({
  user,
  readAddress,
  graceMs = DEFAULT_GRACE_MS,
  pollMs = DEFAULT_POLL_MS,
  sleep = defaultSleep,
}: RevokeCheckOptions): Promise<boolean> {
  const connected = readAddress();
  if (connected) {
    // Still connected. Without a known session there is nothing to compare
    // against, and destroying one we cannot see is the worse guess.
    if (!user) return false;
    return !sessionOwnsAddress(user, connected);
  }

  // Disconnected — which on a phone may only mean the OS backgrounded the tab
  // while the wallet app was in front. Give the relay a chance to come back.
  const deadline = Date.now() + graceMs;
  while (Date.now() < deadline) {
    await sleep(pollMs);
    const next = readAddress();
    if (next) return user ? !sessionOwnsAddress(user, next) : false;
  }
  return true;
}
