import { describe, expect, test } from "bun:test";
import type { PublicUser } from "@/lib/api";
import { sessionOwnsAddress, shouldRevokeSession } from "./wallet-session";

const WALLET = "0x1111111111111111111111111111111111111111";
const OTHER = "0x2222222222222222222222222222222222222222";

function user(...addresses: string[]): PublicUser {
  return {
    wallets: addresses.map((address) => ({
      address,
      chainId: 1,
      isPrimary: true,
      verifiedAt: new Date().toISOString(),
    })),
  } as unknown as PublicUser;
}

/** Fast timings so the grace-window tests do not sit on real seconds. */
const FAST = { graceMs: 30, pollMs: 5 };

describe("sessionOwnsAddress", () => {
  test("matches regardless of checksum casing", () => {
    expect(sessionOwnsAddress(user(WALLET), WALLET.toUpperCase())).toBe(true);
  });

  test("rejects an address the session does not hold", () => {
    expect(sessionOwnsAddress(user(WALLET), OTHER)).toBe(false);
  });

  test("rejects when there is no session or no address", () => {
    expect(sessionOwnsAddress(null, WALLET)).toBe(false);
    expect(sessionOwnsAddress(user(WALLET), undefined)).toBe(false);
  });
});

describe("shouldRevokeSession", () => {
  test("keeps the session when the same wallet re-announces itself", async () => {
    // The mobile deep-link case: WalletConnect re-emits accountsChanged with
    // the account already signed in.
    const revoke = await shouldRevokeSession({
      user: user(WALLET),
      readAddress: () => WALLET,
      ...FAST,
    });
    expect(revoke).toBe(false);
  });

  test("revokes when the wallet switched to an account the session lacks", async () => {
    const revoke = await shouldRevokeSession({
      user: user(WALLET),
      readAddress: () => OTHER,
      ...FAST,
    });
    expect(revoke).toBe(true);
  });

  test("keeps the session when a dropped wallet returns inside the grace window", async () => {
    let calls = 0;
    const revoke = await shouldRevokeSession({
      user: user(WALLET),
      readAddress: () => (++calls > 2 ? WALLET : undefined),
      ...FAST,
    });
    expect(revoke).toBe(false);
  });

  test("revokes when the wallet stays gone — an explicit disconnect", async () => {
    const revoke = await shouldRevokeSession({
      user: user(WALLET),
      readAddress: () => undefined,
      ...FAST,
    });
    expect(revoke).toBe(true);
  });

  test("leaves an unknown session alone while a wallet is connected", async () => {
    const revoke = await shouldRevokeSession({
      user: null,
      readAddress: () => WALLET,
      ...FAST,
    });
    expect(revoke).toBe(false);
  });
});
