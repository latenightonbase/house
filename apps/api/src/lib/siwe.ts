import {
  parseSiweMessage,
  validateSiweMessage,
  generateSiweNonce,
} from "viem/siwe";
import {
  createPublicClient,
  http,
  getAddress,
  type Address,
  type Hex,
} from "viem";
import { base, baseSepolia } from "viem/chains";
import { prisma } from "../db";

const NONCE_TTL_MS = 1000 * 60 * 10; // 10 minutes

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

const publicClientSepolia = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

function clientForChain(chainId: number) {
  if (chainId === baseSepolia.id) return publicClientSepolia;
  return publicClient;
}

export async function issueNonce(): Promise<string> {
  const nonce = generateSiweNonce();
  await prisma.siweNonce.create({
    data: {
      nonce,
      expiresAt: new Date(Date.now() + NONCE_TTL_MS),
    },
  });
  return nonce;
}

export async function consumeNonce(nonce: string): Promise<boolean> {
  const row = await prisma.siweNonce.findUnique({ where: { nonce } });
  if (!row || row.expiresAt < new Date()) {
    if (row) await prisma.siweNonce.delete({ where: { id: row.id } }).catch(() => {});
    return false;
  }
  await prisma.siweNonce.delete({ where: { id: row.id } });
  return true;
}

export async function verifyAndUpsertUser(message: string, signature: Hex) {
  const parsed = parseSiweMessage(message);
  if (!parsed?.address || !parsed.nonce || parsed.chainId == null) {
    throw new Error("Invalid SIWE message");
  }

  const appOrigin = process.env.APP_ORIGIN || "http://localhost:3002";
  const expectedDomain = new URL(appOrigin).host;

  const fieldsValid = validateSiweMessage({
    message: parsed,
    domain: expectedDomain,
    nonce: parsed.nonce,
    address: parsed.address,
  });
  if (!fieldsValid) {
    throw new Error(`SIWE validation failed (expected domain ${expectedDomain})`);
  }

  const nonceOk = await consumeNonce(parsed.nonce);
  if (!nonceOk) {
    throw new Error("Invalid or expired nonce");
  }

  const client = clientForChain(Number(parsed.chainId));
  const valid = await client.verifySiweMessage({
    message,
    signature,
    domain: expectedDomain,
    nonce: parsed.nonce,
    address: parsed.address,
  });

  if (!valid) {
    throw new Error("Invalid SIWE signature");
  }

  const address = getAddress(parsed.address as Address).toLowerCase();
  const chainId = Number(parsed.chainId);

  const existingWallet = await prisma.wallet.findUnique({
    where: { address },
    include: { user: true },
  });

  if (existingWallet) {
    await prisma.wallet.update({
      where: { id: existingWallet.id },
      data: { chainId, verifiedAt: new Date(), isPrimary: true },
    });
    return existingWallet.user;
  }

  const user = await prisma.user.create({
    data: {
      wallets: {
        create: {
          address,
          chainId,
          isPrimary: true,
          verifiedAt: new Date(),
        },
      },
    },
  });

  return user;
}
