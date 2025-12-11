import { Queue } from 'bullmq';

// ============ Notification Helper ============
export async function sendNotification(
  url: string,
  token: string,
  title: string,
  body: string,
  targetUrl: string
) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notificationId: crypto.randomUUID(),
        title,
        body,
        targetUrl,
        tokens: [token],
      }),
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    console.error('Error sending notification:', err);
    return { ok: false, status: 500, error: 'Internal server error' };
  }
}

// ============ Redis Connection ============
const REDIS_URL = process.env.REDIS_URL;
export const redisConnection = REDIS_URL
  ? { url: REDIS_URL }
  : {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    };

// Queue names
export const QUEUES = {
  AUCTION_REMINDER: 'auction-reminder',
} as const;

// Job data types
export interface AuctionReminderJobData {
  auctionId: string;
  blockchainAuctionId: number;
  auctionName: string;
  reminderType: 'halfway' | 'near-end'; // 50% or 10% of duration
}

// Queue instance
let _auctionReminderQueue: Queue<AuctionReminderJobData> | null = null;

export function getAuctionReminderQueue() {
  if (!_auctionReminderQueue) {
    _auctionReminderQueue = new Queue<AuctionReminderJobData>(QUEUES.AUCTION_REMINDER, {
      connection: redisConnection,
    });
  }
  return _auctionReminderQueue;
}

// Helper to schedule reminder jobs for an auction
const MIN_AUCTION_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export async function scheduleAuctionReminders(
  auctionId: string,
  blockchainAuctionId: number,
  auctionName: string,
  startTime: Date,
  endTime: Date
) {
  const now = Date.now();
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const duration = end - start;

  // Skip if auction is less than 30 mins
  if (duration < MIN_AUCTION_DURATION_MS) {
    console.log(`Auction ${blockchainAuctionId} is < 30 mins, skipping reminders`);
    return { scheduled: false, reason: 'duration_too_short' };
  }

  const queue = getAuctionReminderQueue();
  const jobs: Promise<any>[] = [];

  // 50% mark (halfway through auction)
  const halfwayTime = end - duration * 0.5;
  const halfwayDelay = Math.max(0, halfwayTime - now);

  if (halfwayDelay > 0) {
    jobs.push(
      queue.add(
        `reminder-halfway-${blockchainAuctionId}`,
        { auctionId, blockchainAuctionId, auctionName, reminderType: 'halfway' },
        { delay: halfwayDelay, removeOnComplete: true, attempts: 3 }
      )
    );
  }

  // 10% mark (near the end)
  const nearEndTime = end - duration * 0.1;
  const nearEndDelay = Math.max(0, nearEndTime - now);

  if (nearEndDelay > 0) {
    jobs.push(
      queue.add(
        `reminder-near-end-${blockchainAuctionId}`,
        { auctionId, blockchainAuctionId, auctionName, reminderType: 'near-end' },
        { delay: nearEndDelay, removeOnComplete: true, attempts: 3 }
      )
    );
  }

  await Promise.all(jobs);

  return {
    scheduled: true,
    halfwayIn: halfwayDelay > 0 ? Math.round(halfwayDelay / 1000 / 60) + ' mins' : 'skipped',
    nearEndIn: nearEndDelay > 0 ? Math.round(nearEndDelay / 1000 / 60) + ' mins' : 'skipped',
  };
}

