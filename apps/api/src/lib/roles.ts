import { getAddress, type Address } from "viem";
import type { Role } from "@prisma/client";

export function superadminWallet(): string | null {
  const raw = process.env.SUPERADMIN_WALLET?.trim();
  if (!raw || !/^0x[a-fA-F0-9]{40}$/.test(raw)) return null;
  return getAddress(raw as Address).toLowerCase();
}

export function isSuperadminWallet(address: string) {
  const expected = superadminWallet();
  return Boolean(expected && address.toLowerCase() === expected);
}

export function isSuperadmin(user: { role: Role } | null | undefined) {
  return user?.role === "SUPERADMIN";
}
