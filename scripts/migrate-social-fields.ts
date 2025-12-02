import mongoose from 'mongoose';
import User from '../utils/schemas/User';

async function migrateSocialFields() {
  try {
    const MONGODB_URI = "mongodb+srv://3xbuilds_db_user:sDNJ3fZz335TjIpw@cluster0.fomlbfn.mongodb.net/";
    await mongoose.connect(MONGODB_URI as string);
    console.log('Connected to MongoDB');

    const users = await User.find({});
    console.log(`Found ${users.length} users to migrate`);

    let updatedCount = 0;

    for (const user of users) {
      const updates: any = {};

      // Set socialId and socialPlatform
      if (user.twitterProfile?.id) {
        updates.socialId = user.twitterProfile.id;
        updates.socialPlatform = 'TWITTER';
      } else if (user.fid && !user.fid.startsWith('none')) {
        updates.socialId = user.fid;
        updates.socialPlatform = 'FARCASTER';
      } else {
        updates.socialId = null;
        updates.socialPlatform = null;
      }

      // Set wallets array
      if (user.wallet) {
        updates.wallets = [user.wallet];
      }

      await User.updateOne({ _id: user._id }, { $set: updates });
      updatedCount++;

      if (updatedCount % 100 === 0) {
        console.log(`Updated ${updatedCount} users...`);
      }
    }

    console.log(`Migration complete! Updated ${updatedCount} users`);
    await mongoose.connection.close();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateSocialFields();
