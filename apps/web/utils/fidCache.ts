import { getRedisClient } from './redisCache';

const CACHE_TTL = 6 * 60 * 60; // 6 hours in seconds

interface NeynarUser {
  fid: number;
  username?: string;
  display_name?: string;
  pfp_url?: string;
  profile?: {
    bio?: {
      text?: string;
    };
  };
  verified_accounts?: Array<{
    platform: string;
    username: string;
  }>;
  [key: string]: any;
}

export async function getCachedFids(fids: string[]): Promise<{
  cached: Record<string, NeynarUser>;
  missing: string[];
}> {
  const redis = getRedisClient();
  if (!redis) {
    return { cached: {}, missing: fids };
  }

  const cached: Record<string, NeynarUser> = {};
  const missing: string[] = [];

  try {
    await redis.connect().catch(() => {});
    const keys = fids.map(fid => `fid:${fid}`);
    const values = await redis.mget(...keys);

    fids.forEach((fid, index) => {
      const value = values[index];
      if (value) {
        try {
          cached[fid] = JSON.parse(value);
        } catch (err) {
          console.error(`Failed to parse cached FID ${fid}:`, err);
          missing.push(fid);
        }
      } else {
        missing.push(fid);
      }
    });
  } catch (error) {
    console.error('Redis getCachedFids error:', error);
    return { cached: {}, missing: fids };
  }

  return { cached, missing };
}

export async function cacheFids(users: NeynarUser[]): Promise<void> {
  const redis = getRedisClient();
  if (!redis || users.length === 0) {
    return;
  }

  try {
    await redis.connect().catch(() => {});
    const pipeline = redis.pipeline();
    
    users.forEach(user => {
      const key = `fid:${user.fid}`;
      pipeline.setex(key, CACHE_TTL, JSON.stringify(user));
    });

    await pipeline.exec();
  } catch (error) {
    console.error('Redis cacheFids error:', error);
  }
}

export async function getFidsWithCache(fids: string[]): Promise<Record<string, NeynarUser>> {
  if (fids.length === 0) {
    return {};
  }

  const { cached, missing } = await getCachedFids(fids);

  if (missing.length === 0) {
    return cached;
  }

  try {
    const res = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${missing.join(',')}`,
      {
        headers: {
          "x-api-key": process.env.NEYNAR_API_KEY as string,
        },
      }
    );

    if (res.ok) {
      const jsonRes = await res.json();
      if (jsonRes.users && Array.isArray(jsonRes.users)) {
        await cacheFids(jsonRes.users);
        
        jsonRes.users.forEach((user: NeynarUser) => {
          cached[user.fid.toString()] = user;
        });
      }
    }
  } catch (error) {
    console.error('Neynar API error:', error);
  }

  return cached;
}
