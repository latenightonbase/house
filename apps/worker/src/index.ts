import 'dotenv/config';
import { Worker } from 'bullmq';
import mongoose from 'mongoose';
import { QUEUES, redisConnection, sendNotification, type AuctionReminderJobData } from '@repo/queue';

// ============ MongoDB Setup ============
const MONGO_URI = process.env.MONGO_URI || '';

async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;
  console.log('📦 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected');
}

// User model - reuse if already registered, cast to any to avoid complex union type
const User: any = mongoose.models['User'] || mongoose.model('User', new mongoose.Schema({
  notificationDetails: { url: String, token: String },
}));

// ============ Worker ============
console.log('🚀 Starting auction reminder worker...');

const auctionReminderWorker = new Worker<AuctionReminderJobData>(
  QUEUES.AUCTION_REMINDER,
  async (job) => {
    const { blockchainAuctionId, auctionName, reminderType } = job.data;
    console.log(`⏰ Processing ${reminderType} reminder for auction: ${blockchainAuctionId}`);

    await connectDB();

    // Fetch all users with notification details
    const users = await User.find({
      'notificationDetails.url': { $exists: true, $ne: null },
      'notificationDetails.token': { $exists: true, $ne: null },
    }).lean();

    console.log(`📤 Sending notifications to ${users.length} users`);

    const title =
      reminderType === 'halfway'
        ? `⏳ Auction halfway done!`
        : `🔥 Auction ending soon!`;

    const body =
      reminderType === 'halfway'
        ? `"${auctionName}" is 50% complete. Place your bid!`
        : `"${auctionName}" is almost over. Last chance to bid!`;

    const targetUrl = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/bid/${blockchainAuctionId}`;

    // Send all notifications in parallel
    const results = await Promise.allSettled(
      users.map((user: any) =>
        sendNotification(
          user.notificationDetails.url,
          user.notificationDetails.token,
          title,
          body,
          targetUrl
        )
      )
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled' && r.value.ok).length;
    const failed = results.length - succeeded;

    console.log(`✅ Sent: ${succeeded}, ❌ Failed: ${failed}`);

    return { sent: succeeded, failed };
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

auctionReminderWorker.on('completed', (job, result) => {
  console.log(`✅ Job ${job.id} completed:`, result);
});

auctionReminderWorker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});

console.log('✅ Worker started and listening for jobs');

