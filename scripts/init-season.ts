/**
 * Script to initialize Season 1 for the XP system
 * Run this once to create the first season starting Feb 1, 2026
 * 
 * Usage: node --loader ts-node/esm scripts/init-season.ts
 * or: npx tsx scripts/init-season.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });
dotenv.config({ path: join(__dirname, '../.env') });

// Import schemas
import Season from '../apps/web/utils/schemas/Season.js';

const MONGO_URI = "mongodb+srv://3xbuilds_db_user:sDNJ3fZz335TjIpw@cluster0.fomlbfn.mongodb.net/";

if (!MONGO_URI) {
  console.error('❌ MONGO_URI environment variable is not set');
  process.exit(1);
}

async function initializeSeason() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    if (!MONGO_URI) {
      throw new Error('MONGO_URI is not defined');
    }
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Check if Season 1 already exists
    const existingSeason = await Season.findOne({ seasonNumber: 1 });
    
    if (existingSeason) {
      console.log('⚠️  Season 1 already exists:');
      console.log('   Season Number:', existingSeason.seasonNumber);
      console.log('   Start Date:', existingSeason.startDate);
      console.log('   End Date:', existingSeason.endDate);
      console.log('   Active:', existingSeason.active);
      console.log('\n✅ No changes made');
      return;
    }

    // Create Season 1: Feb 1, 2026 - Feb 28, 2026
    const season1Start = new Date('2026-02-01T00:00:00.000Z');
    const season1End = new Date('2026-02-28T23:59:59.999Z');

    console.log('\n📅 Creating Season 1...');
    console.log('   Start Date:', season1Start.toISOString());
    console.log('   End Date:', season1End.toISOString());

    const season1 = await Season.create({
      seasonNumber: 1,
      startDate: season1Start,
      endDate: season1End,
      active: true,
      totalXPAwarded: 0,
      totalParticipants: 0,
    });

    console.log('✅ Season 1 created successfully!');
    console.log('   ID:', season1._id);

    console.log('\n🎉 Season initialization complete!');
    console.log('\n📊 Summary:');
    console.log('   - Season 1 created and active');
    console.log('   - Duration: 28 days (Feb 1-28, 2026)');
    console.log('   - Users will start earning XP immediately');
    console.log('\n⚠️  Next Step: Start the worker to enable automatic season rollover');
    console.log('   Command: cd apps/worker && npm run dev');

  } catch (error) {
    console.error('\n❌ Error initializing season:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
initializeSeason()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
