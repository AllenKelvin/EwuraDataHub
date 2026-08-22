#!/usr/bin/env node

import mongoose from "mongoose";

// Database URLs
const SOURCE_DB = "mongodb+srv://Allendatahub:Debbieallen3223@allencluster.vxjsqwa.mongodb.net/?appName=AllenCluster";
const DEST_DB = "mongodb+srv://jenniferfredson175_db_user:mZOcXNKU4ytv93Nz@platform.nyeoonw.mongodb.net/?appName=platform";

// Create separate connections
const sourceConn = mongoose.createConnection(SOURCE_DB);
const destConn = mongoose.createConnection(DEST_DB);

// Define schemas
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

async function migrateFresh() {
  try {
    console.log("🔄 Starting FRESH database migration (clearing destination first)...\n");

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

    // STEP 2: Migrate Users in batches
    console.log("👥 Migrating Users...");
    const users = await SourceUser.find({}).lean();
    console.log(`  Found ${users.length} users in source DB`);
    
    if (users.length > 0) {
      const batchSize = 50;
      let totalInserted = 0;
      
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        try {
          const result = await DestUser.insertMany(batch);
          totalInserted += result.length;
          const progress = Math.floor((totalInserted / users.length) * 100);
          console.log(`  ✓ ${progress}% (${totalInserted}/${users.length})`);
        } catch (err) {
          console.error(`  ❌ Batch failed: ${err.message}`);
          throw err;
        }
      }
      
      console.log(`  ✅ Inserted ${totalInserted} users\n`);
    }

    // STEP 3: Migrate API Keys in batches
    console.log("🔑 Migrating API Keys...");
    const apiKeys = await SourceApiKey.find({}).lean();
    console.log(`  Found ${apiKeys.length} API keys in source DB`);
    
    if (apiKeys.length > 0) {
      const batchSize = 50;
      let totalInserted = 0;
      
      for (let i = 0; i < apiKeys.length; i += batchSize) {
        const batch = apiKeys.slice(i, i + batchSize);
        try {
          const result = await DestApiKey.insertMany(batch);
          totalInserted += result.length;
          const progress = Math.floor((totalInserted / apiKeys.length) * 100);
          console.log(`  ✓ ${progress}% (${totalInserted}/${apiKeys.length})`);
        } catch (err) {
          console.error(`  ❌ Batch failed: ${err.message}`);
          throw err;
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
    console.log(`   Users: ${destUserCount}/${users.length} ✅`);
    console.log(`   Products: ${destProductCount}/${products.length} ✅`);
    console.log(`   API Keys: ${destApiKeyCount}/${apiKeys.length} ✅`);

    if (destUserCount === users.length && destProductCount === products.length && destApiKeyCount === apiKeys.length) {
      console.log("\n✨ Migration completed successfully!\n");
      console.log("📝 Next step: Update your .env file with:");
      console.log("   DATABASE_URL=mongodb+srv://jenniferfredson175_db_user:mZOcXNKU4ytv93Nz@platform.nyeoonw.mongodb.net/?appName=platform");
    } else {
      console.log("\n⚠️  Migration complete but some counts don't match!");
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

migrateFresh();
