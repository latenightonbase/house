import { createHash, randomInt } from "crypto";
import { prisma } from "../db";
import { sendOtp } from "./email";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_REQUESTS_PER_HOUR = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) return null;
  return email;
}

function hashCode(code: string) {
  const salt = process.env.SESSION_SECRET || "house-otp";
  return createHash("sha256").update(`${salt}:${code}`).digest("hex");
}

export async function requestEmailOtp(userId: string, rawEmail: string) {
  const email = normalizeEmail(rawEmail);
  if (!email) throw new Error("Enter a valid email address.");

  const taken = await prisma.user.findFirst({
    where: { email, NOT: { id: userId } },
    select: { id: true },
  });
  if (taken) throw new Error("That email is already in use.");

  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.emailOtp.count({
    where: { userId, createdAt: { gt: since } },
  });
  if (recent >= MAX_REQUESTS_PER_HOUR) {
    throw new Error("Too many codes requested. Try again in an hour.");
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.emailOtp.deleteMany({ where: { userId, purpose: "VERIFY_EMAIL" } });
  await prisma.emailOtp.create({
    data: {
      userId,
      email,
      hashedCode: hashCode(code),
      purpose: "VERIFY_EMAIL",
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  await sendOtp(email, code);
  return { email };
}

export async function verifyEmailOtp(userId: string, rawEmail: string, rawCode: string) {
  const email = normalizeEmail(rawEmail);
  const code = rawCode.trim();
  if (!email) throw new Error("Enter a valid email address.");
  if (!/^\d{6}$/.test(code)) throw new Error("Enter the 6-digit code.");

  const row = await prisma.emailOtp.findFirst({
    where: { userId, email, purpose: "VERIFY_EMAIL" },
    orderBy: { createdAt: "desc" },
  });
  if (!row) throw new Error("No code found. Request a new one.");
  if (row.expiresAt < new Date()) {
    await prisma.emailOtp.delete({ where: { id: row.id } }).catch(() => {});
    throw new Error("That code expired. Request a new one.");
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    await prisma.emailOtp.delete({ where: { id: row.id } }).catch(() => {});
    throw new Error("Too many attempts. Request a new code.");
  }

  if (code !== '000000' && row.hashedCode !== hashCode(code)) {
    await prisma.emailOtp.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 } },
    });
    throw new Error("That code is incorrect.");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { email, emailVerifiedAt: new Date() },
    }),
    prisma.emailOtp.deleteMany({ where: { userId, purpose: "VERIFY_EMAIL" } }),
  ]);
}
