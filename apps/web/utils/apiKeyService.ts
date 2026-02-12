import crypto from 'crypto';
import { ethers } from 'ethers';
import dbConnect from './db';
import ApiKey from './schemas/ApiKey';
import BotWallet from './schemas/BotWallet';
import User from './schemas/User';
import { encryptPrivateKey } from './walletEncryption';

/**
 * Generate a random API key with prefix
 * Format: ak_<32 random hex chars>
 */
function generateRawApiKey(): string {
  return `ak_${crypto.randomBytes(32).toString('hex')}`;
}

/**
 * Hash an API key for storage (we never store the raw key)
 */
function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

/**
 * Create a new API key + bot wallet for a user.
 * Returns the raw API key (shown once) and the wallet address.
 */
export async function createApiKeyAndWallet(
  userId: string,
  keyName: string = 'Default'
): Promise<{
  apiKey: string;
  keyPrefix: string;
  walletAddress: string;
  keyId: string;
}> {
  await dbConnect();

  // Verify user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Check if user already has a bot wallet, reuse it
  let botWallet = await BotWallet.findOne({ userId });

  if (!botWallet) {
    // Generate a new wallet
    const wallet = ethers.Wallet.createRandom();
    const { encrypted, iv, authTag } = encryptPrivateKey(wallet.privateKey);

    botWallet = await BotWallet.create({
      userId,
      address: wallet.address.toLowerCase(),
      encryptedPrivateKey: encrypted,
      iv,
      authTag,
    });

    // Add bot wallet address to user's wallets array
    if (!user.wallets.includes(wallet.address.toLowerCase())) {
      user.wallets.push(wallet.address.toLowerCase());
      await user.save();
    }
  }

  // Generate the API key
  const rawApiKey = generateRawApiKey();
  const keyHash = hashApiKey(rawApiKey);
  const keyPrefix = rawApiKey.slice(0, 10) + '...';

  const apiKeyDoc = await ApiKey.create({
    keyHash,
    keyPrefix,
    userId,
    botWallet: botWallet._id,
    name: keyName,
  });

  return {
    apiKey: rawApiKey,
    keyPrefix,
    walletAddress: botWallet.address,
    keyId: apiKeyDoc._id.toString(),
  };
}

/**
 * Validate an API key and return the associated user + bot wallet.
 * Updates lastUsedAt timestamp.
 */
export async function validateApiKey(
  rawKey: string
): Promise<{
  user: InstanceType<typeof User>;
  botWallet: InstanceType<typeof BotWallet>;
  apiKeyId: string;
} | null> {
  if (!rawKey || !rawKey.startsWith('ak_')) {
    return null;
  }

  await dbConnect();

  const keyHash = hashApiKey(rawKey);

  const apiKey = await ApiKey.findOne({ keyHash, active: true });
  if (!apiKey) {
    return null;
  }

  // Update lastUsedAt (fire and forget)
  ApiKey.updateOne({ _id: apiKey._id }, { lastUsedAt: new Date() }).catch(() => {});

  const [user, botWallet] = await Promise.all([
    User.findById(apiKey.userId),
    BotWallet.findById(apiKey.botWallet),
  ]);

  if (!user || !botWallet) {
    return null;
  }

  return {
    user,
    botWallet,
    apiKeyId: apiKey._id.toString(),
  };
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(keyId: string, userId: string): Promise<boolean> {
  await dbConnect();

  const result = await ApiKey.findOneAndUpdate(
    { _id: keyId, userId },
    { active: false },
    { new: true }
  );

  return !!result;
}

/**
 * List API keys for a user (never returns the actual key, only prefix/metadata)
 */
export async function listApiKeys(userId: string) {
  await dbConnect();

  const keys = await ApiKey.find({ userId })
    .populate('botWallet', 'address')
    .select('keyPrefix name active lastUsedAt createdAt botWallet')
    .sort({ createdAt: -1 });

  return keys.map((key) => ({
    id: key._id.toString(),
    keyPrefix: key.keyPrefix,
    name: key.name,
    active: key.active,
    lastUsedAt: key.lastUsedAt,
    createdAt: key.createdAt,
    walletAddress: (key.botWallet as any)?.address || null,
  }));
}
