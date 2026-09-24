import { getAddress, type Address } from "viem";
import type { Role } from "@prisma/client";
import { prisma } from "../db";

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

/**
 * Who to notify when something needs an admin. Every SUPERADMIN with a verified
 * address, plus ADMIN_EMAIL — which is the escape hatch for a fresh deployment
 * where the operator has a wallet but has not verified an email yet.
 */
export async function adminRecipients(): Promise<string[]> {
  const admins = await prisma.user.findMany({
    where: { role: "SUPERADMIN", email: { not: null }, emailVerifiedAt: { not: null } },
    select: { email: true },
  });

  const fallback = process.env.ADMIN_EMAIL?.trim();
  const all = admins.map((a) => a.email!).concat(fallback ? [fallback] : []);
  return [...new Set(all.map((email) => email.toLowerCase()))];
}
