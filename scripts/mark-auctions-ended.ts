require('dotenv').config();
import mongoose from 'mongoose';

const AuctionSchema = new mongoose.Schema({
  auctionName: String,
  status: String,
}, { collection: 'auctions' });

const Auction = mongoose.models.Auction || mongoose.model('Auction', AuctionSchema);

async function markAuctionsEnded() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI not found in environment variables');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const excludedNames = [
      "Short chat about anything",
      "Glazed Donut Pass - $200 Value",
      "Jsjsj"
    ];

    const result = await Auction.updateMany(
      {
        auctionName: { $nin: excludedNames }
      },
      {
        $set: { status: 'ended' }
      }
    );

    console.log('\n✅ Update completed!');
    console.log(`Modified ${result.modifiedCount} auctions to status 'ended'`);
    console.log(`Matched ${result.matchedCount} auctions`);

    // Show some sample updated auctions
    const updated = await Auction.find({
      auctionName: { $nin: excludedNames },
      status: 'ended'
    }).limit(5);

    console.log('\nSample updated auctions:');
    updated.forEach((auction: any) => {
      console.log(`- ${auction.auctionName} (${auction.status})`);
    });

    // Show excluded auctions
    const excluded = await Auction.find({
      auctionName: { $in: excludedNames }
    });

    console.log(`\nExcluded auctions (kept original status):`);
    excluded.forEach((auction: any) => {
      console.log(`- ${auction.auctionName} (${auction.status})`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating auctions:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

markAuctionsEnded();
