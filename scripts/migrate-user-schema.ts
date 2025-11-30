import mongoose from 'mongoose';
import User from '../utils/schemas/User';

// Old User interface for reference
interface OldUser {
  token: string;
  fid?: string;
  wallet?: string;
  username?: string;
  whitelisted?: boolean;
  hostedAuctions: mongoose.Types.ObjectId[];
  bidsWon: mongoose.Types.ObjectId[];
  participatedAuctions: mongoose.Types.ObjectId[];
  twitterProfile?: {
    id: string;
    username: string;
    name: string;
    profileImageUrl?: string;
  };
  notificationDetails?: {
    url: string;
    token: string;
    appFid?: string;
  };
}

async function migrateUserSchema() {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGO_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all users using the raw collection to avoid schema validation
    const usersCollection = mongoose.connection.collection('users');
    const oldUsers = await usersCollection.find({}).toArray();

    console.log(`Found ${oldUsers.length} users to migrate`);

    let successCount = 0;
    let errorCount = 0;

    for (const oldUser of oldUsers) {
      try {
        const updateData: any = {};

        // Determine socialConnected and socialId
        if (oldUser.twitterProfile && oldUser.twitterProfile.id) {
          updateData.socialConnected = 'twitter';
          updateData.socialId = oldUser.twitterProfile.id;
        } else if (oldUser.fid) {
          updateData.socialConnected = 'farcaster';
          updateData.socialId = oldUser.fid;
        } else {
          updateData.socialConnected = 'none';
          updateData.socialId = '';
        }

        // Convert wallet to wallets array
        if (oldUser.wallet) {
          updateData.wallets = [oldUser.wallet];
        } else {
          updateData.wallets = [];
        }

        // Remove old fields
        const unsetFields: any = {
          fid: '',
          wallet: '',
          whitelisted: ''
        };

        // Update the user
        await usersCollection.updateOne(
          { _id: oldUser._id },
          {
            $set: updateData,
            $unset: unsetFields
          }
        );

        successCount++;
        console.log(`✓ Migrated user ${oldUser._id} (${oldUser.username || 'no username'})`);
      } catch (error) {
        errorCount++;
        console.error(`✗ Error migrating user ${oldUser._id}:`, error);
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total users: ${oldUsers.length}`);
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Errors: ${errorCount}`);

    // Close the connection
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateUserSchema()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
