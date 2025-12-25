import mongoose from 'mongoose';
import Whitelist from '../apps/web/utils/schemas/Whitelist';

// Hardcoded whitelist addresses from whitelist.ts
const BETA_ACCESS_WALLETS = [
  "0x9814ee514ba5ac237955f13ce97b084369e8e49d", // Limi
  "0xe47ee99de90cd4b865386a602ca0286153643415", // Lost Midas
  "0x17e738d9056cf0926ffdb0ff15da4fe64661c867", // Captain
  "0xeffdc3b00bd81cec05a5965846831333ef81c308", // Thosmur
  "0xb451db3a6420a44c8042dde989e93e36439d7639", // Griff
  "0x604ffe727bc6108ad1ad482ef4fb1d5172b2c0f6", // OxF0rce
  "0x9f2f31d1d4cba2d61f457378efd9f082307949ed", // NFT Kid
  "0x4c3b573643a32a419c516c666be1095d58817a7e", // Gist
  "0x8c4cf2ed871f71a2e4fe1aab7dfe52f873b62904", // Simon
  "0x9f03621ddba9936c479e0ba845c3521caa0a4e23", // Bill
  "0x9857d2cbd8430f4802da7cca440e66238bc8e28d",
  "0x530ea625a4cad0f0e5b62cc60e4e69a303582141",
  "0x1c3e54735d30912d391ecdf34b049d3e3743ebbb",
  "0x96127abba054403920090c65d54e5dcfb8360aa9",
  "0x755dc65333c16f388d2054513b9d013d7035f230",
  "0x04b90165090c7e6f4798e1d7e76d214fd31d3262",
  "0x1ce256752fba067675f09291d12a1f069f34f5e8",
  "0x2e6bce51adcf88e58fe8276a210508d6c4085121",
  "0xa67862e7C011C3f4F3C74082AB81c52ED4d089bE",
  "0x6771686cBffaaEc8DAc7E59c4D8c031Da0C49458",
  "0x592C4C98341f99f4e88919B259fa331e44AED053",
  "0x7632BD8E72767ED67a724C564c42Ceea98E81180",
  "0x5dFdCc10d7Dee5064204C99d76B0012a5DE93a47",
  "0x93A26241df0274f01b17d4f7466547a77a8fDEc5",
  "0xF634e9e501fE94C88f1DA991f551394eA680d88c",
  "0xd56137158b00932f28d4d3020ba764fde218e980",
  "0x5a52D4B820Ae7F02880d270562950918ACb14aA2",
  "0xbf90E450A9e5EeDe22fc1ad297070281c26FAb64",
  "0xAe8BdF7f6eE772061AF9E82d7C1C2f93e8A68687",
  "0xc67Aa95B4AD61b6435d10567EC192e125aF7A0a0",
  "0x1c3e54735D30912d391EcdF34B049d3e3743EbbB",
  "0xb353B448CCE6aDD7Db81ce7023E8ba5A394B5296",
  "0x8b46690c2812287Dd9a5B093399a987CeE2511eA",
  "0xfe378EebA78cD0551B637DD409914BB172d8FDB1",
  "0xDdfe22862Fa207503baA6d87Faa6A2bBeB38b251",
  "0xbC6b6652F244Ff6B1C584503F558d3a152EB5a0E",
  "0xB1B21884afE6581F3C4997b0320465F18E9682C0",
  "0xC07f465Cb788De0088E33C03814E2c550dBe33db",
  "0xBFe8923B45eF4C7B37A5d12f1f5cA538eb6884Bc",
  "0xda0F9f916dB23D3C8C097376F60196483550869B",
  "0xcb79fdA62bF05a63Bb48758A7da3C072D0BA929b",
  "0x86b6F263D072e8c79e15141BE3B785b374ea5D7c",
  "0xaFB95aCDde9A144A0F031E17BDEA68d05986f79F",
  "0xa702eD4E6a82c8148Cc6B1DC7E22f19E4339fC68",
  "0xa0E1FEff0BECF12E479Ca2AAf4896734dDDe5E8A",
  "0xB7b3bDf2E53b9C877EfAbc99a74BaDfc03299823"
];

// Optional nicknames mapping (from comments in original file)
const NICKNAMES: Record<string, string> = {
  "0x9814ee514ba5ac237955f13ce97b084369e8e49d": "Limi",
  "0xe47ee99de90cd4b865386a602ca0286153643415": "Lost Midas",
  "0x17e738d9056cf0926ffdb0ff15da4fe64661c867": "Captain",
  "0xeffdc3b00bd81cec05a5965846831333ef81c308": "Thosmur",
  "0xb451db3a6420a44c8042dde989e93e36439d7639": "Griff",
  "0x604ffe727bc6108ad1ad482ef4fb1d5172b2c0f6": "OxF0rce",
  "0x9f2f31d1d4cba2d61f457378efd9f082307949ed": "NFT Kid",
  "0x4c3b573643a32a419c516c666be1095d58817a7e": "Gist",
  "0x8c4cf2ed871f71a2e4fe1aab7dfe52f873b62904": "Simon",
  "0x9f03621ddba9936c479e0ba845c3521caa0a4e23": "Bill",
};

async function migrateWhitelistToDb() {
  try {
    const MONGODB_URI = "mongodb+srv://3xbuilds_db_user:sDNJ3fZz335TjIpw@cluster0.fomlbfn.mongodb.net/";
    if (!MONGODB_URI) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing whitelist entries (optional, comment out if you want to preserve existing data)
    // await Whitelist.deleteMany({});
    // console.log('Cleared existing whitelist entries');

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const wallet of BETA_ACCESS_WALLETS) {
      try {
        const normalizedWallet = wallet.toLowerCase();
        
        // Check if already exists
        const existing = await Whitelist.findOne({ walletAddress: normalizedWallet });
        
        if (existing) {
          console.log(`Skipped (already exists): ${normalizedWallet}`);
          skippedCount++;
          continue;
        }

        const newWhitelist = new Whitelist({
          walletAddress: normalizedWallet,
          nickname: NICKNAMES[normalizedWallet] || undefined,
          addedBy: 'migration-script',
          status: 'ACTIVE',
        });

        await newWhitelist.save();
        console.log(`Added: ${normalizedWallet}${NICKNAMES[normalizedWallet] ? ` (${NICKNAMES[normalizedWallet]})` : ''}`);
        successCount++;
      } catch (error) {
        console.error(`Error adding ${wallet}:`, error);
        errorCount++;
      }
    }

    console.log('\n=== Migration Complete ===');
    console.log(`Total addresses: ${BETA_ACCESS_WALLETS.length}`);
    console.log(`Successfully added: ${successCount}`);
    console.log(`Skipped (already exists): ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);

    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the migration
migrateWhitelistToDb();
