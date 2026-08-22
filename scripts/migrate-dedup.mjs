#!/usr/bin/env node

import mongoose from "mongoose";

// Database URLs
const SOURCE_DB = "mongodb+srv://Allendatahub:Debbieallen3223@allencluster.vxjsqwa.mongodb.net/?appName=AllenCluster";
const DEST_DB = "mongodb+srv://jenniferfredson175_db_user:mZOcXNKU4ytv93Nz@platform.nyeoonw.mongodb.net/?appName=platform";

// Create separate connections
const sourceConn = mongoose.createConnection(SOURCE_DB);
const destConn = mongoose.createConnection(DEST_DB);

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phoneNumber: { type: String, required: false, default: null },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "agent", "user"], default: "user" },
    isVerified: { type: Boolean, default: false },
    balance: { type: Number, default: 0 },
    totalOrdersToday: { type: Number, default: 0 },
    totalGBSentToday: { type: Number, default: 0 },
    totalSpentToday: { type: Number, default: 0 },
    totalGBPurchased: { type: Number, default: 0 },
    cart: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        quantity: { type: Number, default: 1 },
        phoneNumber: { type: String, required: false },
      },
    ],
  },
  { timestamps: true }
);

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    network: { type: String, required: true },
    dataAmount: { type: String, required: true },
    price: { type: Number, required: false },
    userPrice: { type: Number, required: false },
    agentPrice: { type: Number, required: false },
    description: { type: String, default: null },
  },
  { timestamps: true }
);

const ApiKeySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    prefix: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    label: { type: String, default: null },
    status: { type: String, enum: ["active", "revoked"], default: "active", index: true },
    lastUsedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Source models
const SourceUser = sourceConn.model("User", UserSchema);
const SourceProduct = sourceConn.model("Product", ProductSchema);
const SourceApiKey = sourceConn.model("ApiKey", ApiKeySchema);

// Destination models
const DestUser = destConn.model("User", UserSchema);
const DestProduct = destConn.model("Product", ProductSchema);
const DestApiKey = destConn.model("ApiKey", ApiKeySchema);

async function migrateWithDedup() {
  try {
    console.log("🔄 Starting database migration with deduplication...\n");

    // Wait for connections
    await sourceConn.asPromise();
    await destConn.asPromise();
    console.log("✅ Connected to both databases\n");

    // STEP 0: Clear destination collections
    console.log("🗑️  Clearing destination database...");
    await DestUser.deleteMany({});
    await DestProduct.deleteMany({});
    await DestApiKey.deleteMany({});
    console.log("✅ Destination database cleared\n");

    // STEP 1: Migrate Products
    console.log("📦 Migrating Products...");
    const products = await SourceProduct.find({}).lean();
    console.log(`  Found ${products.length} products in source DB`);
    
    if (products.length > 0) {
      const productResult = await DestProduct.insertMany(products);
      console.log(`  ✅ Inserted ${productResult.length} products\n`);
    }

    // STEP 2: Deduplicate and migrate Users
    console.log("👥 Deduplicating and migrating Users...");
    const sourceUsers = await SourceUser.find({}).lean().sort({ createdAt: -1 });
    console.log(`  Found ${sourceUsers.length} total users in source DB`);
    
    // Deduplicate: keep the LATEST version of each email/username
    const emailMap = new Map();
    const usernameMap = new Map();
    const dedupedUsers = [];

    for (const user of sourceUsers) {
      const emailLower = user.email.toLowerCase();
      const usernameLower = user.username.toLowerCase();

      // Keep only the first occurrence (which is the latest due to sort)
      if (!emailMap.has(emailLower) && !usernameMap.has(usernameLower)) {
        emailMap.set(emailLower, user._id);
        usernameMap.set(usernameLower, user._id);
        dedupedUsers.push(user);
      }
    }

    console.log(`  ✅ Deduplicated to ${dedupedUsers.length} unique users (removed ${sourceUsers.length - dedupedUsers.length} duplicates)\n`);

    if (dedupedUsers.length > 0) {
      const batchSize = 50;
      let totalInserted = 0;
      
      for (let i = 0; i < dedupedUsers.length; i += batchSize) {
        const batch = dedupedUsers.slice(i, i + batchSize);
        try {
          const result = await DestUser.insertMany(batch);
          totalInserted += result.length;
          const progress = Math.floor((totalInserted / dedupedUsers.length) * 100);
          console.log(`  ✓ ${progress}% (${totalInserted}/${dedupedUsers.length})`);
        } catch (err) {
          console.error(`  ❌ Batch failed: ${err.message}`);
          throw err;
        }
      }
      
      console.log(`  ✅ Inserted ${totalInserted} unique users\n`);
    }

    // STEP 3: Migrate API Keys (need to filter for users that were actually migrated)
    console.log("🔑 Migrating API Keys...");
    const allApiKeys = await SourceApiKey.find({}).lean();
    console.log(`  Found ${allApiKeys.length} total API keys in source DB`);

    // Get the migrated user IDs
    const migratedUserIds = new Set((await DestUser.find({}).select("_id").lean()).map(u => u._id.toString()));
    
    // Filter API keys to only those with migrated users
    const validApiKeys = allApiKeys.filter(key => migratedUserIds.has(key.userId.toString()));
    console.log(`  Filtered to ${validApiKeys.length} API keys (for migrated users)`);
    
    if (validApiKeys.length > 0) {
      const batchSize = 50;
      let totalInserted = 0;
      
      for (let i = 0; i < validApiKeys.length; i += batchSize) {
        const batch = validApiKeys.slice(i, i + batchSize);
        try {
          const result = await DestApiKey.insertMany(batch);
          totalInserted += result.length;
          const progress = Math.floor((totalInserted / validApiKeys.length) * 100);
          console.log(`  ✓ ${progress}% (${totalInserted}/${validApiKeys.length})`);
        } catch (err) {
          console.error(`  ❌ Batch failed: ${err.message}`);
          // Continue on API key errors
          console.log(`  ⚠️  Skipping this batch`);
        }
      }
      
      console.log(`  ✅ Inserted ${totalInserted} API keys\n`);
    }

    // STEP 4: Final verification
    console.log("🔍 Verifying migration...");
    const destUserCount = await DestUser.countDocuments({});
    const destProductCount = await DestProduct.countDocuments({});
    const destApiKeyCount = await DestApiKey.countDocuments({});

    console.log(`\n📊 Final Counts:`);
    console.log(`   Users: ${destUserCount}/${dedupedUsers.length} ✅`);
    console.log(`   Products: ${destProductCount}/${products.length} ✅`);
    console.log(`   API Keys: ${destApiKeyCount}/${validApiKeys.length} ✅`);

    console.log(`\n📝 Deduplication Summary:`);
    console.log(`   Original source users: ${sourceUsers.length}`);
    console.log(`   After deduplication: ${dedupedUsers.length}`);
    console.log(`   Duplicates removed: ${sourceUsers.length - dedupedUsers.length}`);

    if (destUserCount === dedupedUsers.length && destProductCount === products.length) {
      console.log("\n✨ Migration completed successfully!\n");
      console.log("📝 Next step: Update your .env file with:");
      console.log("   DATABASE_URL=mongodb+srv://jenniferfredson175_db_user:mZOcXNKU4ytv93Nz@platform.nyeoonw.mongodb.net/?appName=platform");
    }

  } catch (error) {
    console.error("\n❌ Migration failed:");
    console.error(error.message);
    process.exit(1);
  } finally {
    await sourceConn.close();
    await destConn.close();
    console.log("\n🔌 Connections closed");
  }
}

migrateWithDedup();
