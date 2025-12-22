import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_CACHE_URL;

const redisConfig = REDIS_URL
  ? { url: REDIS_URL }
  : {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    };

let redisClient: Redis | null = null;
let connectionFailed = false;

export function getRedisClient(): Redis | null {
  if (connectionFailed) {
    return null;
  }

  if (!redisClient) {
    try {
      redisClient = REDIS_URL 
        ? new Redis(REDIS_URL, {
            maxRetriesPerRequest: 1,
            enableReadyCheck: false,
            lazyConnect: true,
          })
        : new Redis({
            host: redisConfig.host,
            port: redisConfig.port,
            maxRetriesPerRequest: 1,
            enableReadyCheck: false,
            lazyConnect: true,
          });
      
      redisClient.on('error', (err) => {
        console.warn('Redis unavailable, falling back to direct API calls:', err.message);
        connectionFailed = true;
      });

      redisClient.on('ready', () => {
        connectionFailed = false;
      });
    } catch (error) {
      console.warn('Failed to create Redis client, using direct API calls:', error);
      connectionFailed = true;
      return null;
    }
  }
  return redisClient;
}
