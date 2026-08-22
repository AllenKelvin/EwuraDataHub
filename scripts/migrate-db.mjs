#!/usr/bin/env node

import mongoose from "mongoose";

// Database URLs
const SOURCE_DB = "mongodb+srv://Allendatahub:Debbieallen3223@allencluster.vxjsqwa.mongodb.net/?appName=AllenCluster";
const DEST_DB = "mongodb+srv://jenniferfredson175_db_user:mZOcXNKU4ytv93Nz@platform.nyeoonw.mongodb.net/?appName=platform";

// Create separate connections
const sourceConn = mongoose.createConnection(SOURCE_DB);
const destConn = mongoose.createConnection(DEST_DB);

// Define schemas for both connections
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

// Create models for source
const SourceUser = sourceConn.model("User", UserSchema);
const SourceProduct = sourceConn.model("Product", ProductSchema);
const SourceApiKey = sourceConn.model("ApiKey", ApiKeySchema);

// Create models for destination
const DestUser = destConn.model("User", UserSchema);
const DestProduct = destConn.model("Product", ProductSchema);
const DestApiKey = destConn.model("ApiKey", ApiKeySchema);

async function migrateData() {
  try {
    console.log("🔄 Starting database migration...\n");

    // Wait for connections
    await sourceConn.asPromise();
    await destConn.asPromise();
    console.log("✅ Connected to both databases\n");

    // Step 1: Migrate Products (no dependencies)
    console.log("📦 Migrating Products...");
    const products = await SourceProduct.find({}).lean();
    console.log(`  Found ${products.length} products in source DB`);
    
    if (products.length > 0) {
      await DestProduct.deleteMany({});
      await DestProduct.insertMany(products);
      console.log(`  ✅ Inserted ${products.length} products to destination DB\n`);
    } else {
      console.log("  ⚠️  No products found in source DB\n");
    }

    // Step 2: Migrate Users in batches (handles cart ObjectId references)
    console.log("👥 Migrating Users...");
    const users = await SourceUser.find({}).lean();
    console.log(`  Found ${users.length} users in source DB`);
    
    if (users.length > 0) {
      await DestUser.deleteMany({});
      
      // Insert in batches of 100
      const batchSize = 100;
      let successCount = 0;
      let failureCount = 0;
      const failedUsers = [];
      
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        try {
          const result = await DestUser.insertMany(batch, { ordered: false });
          successCount += result.length;
          console.log(`  ✓ Batch ${Math.floor(i / batchSize) + 1}: ${result.length} users inserted (${successCount}/${users.length})`);
        } catch (batchError) {
          // Some documents may have failed, continue with next batch
          if (batchError.insertedDocs) {
            successCount += batchError.insertedDocs.length;
          }
          failureCount += batch.length - (batchError.insertedDocs?.length || 0);
          
          // Log details of failed users
          if (batchError.writeErrors) {
            batchError.writeErrors.forEach(err => {
              const failedUser = batch[err.index];
              failedUsers.push({
                email: failedUser?.email,
                reason: err.errmsg
              });
            });
          }
          
          console.log(`  ⚠️  Batch ${Math.floor(i / batchSize) + 1}: Some documents failed`);
        }
      }
      
      console.log(`  ✅ Inserted ${successCount}/${users.length} users to destination DB`);
      
      if (failureCount > 0) {
        console.log(`  ❌ ${failureCount} users failed to migrate:`);
        failedUsers.slice(0, 10).forEach(u => {
          console.log(`     - ${u.email}: ${u.reason}`);
        });
        if (failedUsers.length > 10) {
          console.log(`     ... and ${failedUsers.length - 10} more`);
        }
      }
      console.log();
    } else {
      console.log("  ⚠️  No users found in source DB\n");
    }

    // Step 3: Migrate API Keys (depends on users)
    console.log("🔑 Migrating API Keys...");
    const apiKeys = await SourceApiKey.find({}).lean();
    console.log(`  Found ${apiKeys.length} API keys in source DB`);
    
    if (apiKeys.length > 0) {
      await DestApiKey.deleteMany({});
      
      // Insert in batches
      const batchSize = 100;
      let successCount = 0;
      for (let i = 0; i < apiKeys.length; i += batchSize) {
        const batch = apiKeys.slice(i, i + batchSize);
        try {
          const result = await DestApiKey.insertMany(batch, { ordered: false });
          successCount += result.length;
        } catch (batchError) {
          if (batchError.insertedDocs) {
            successCount += batchError.insertedDocs.length;
          }
        }
      }
      
      console.log(`  ✅ Inserted ${successCount}/${apiKeys.length} API keys to destination DB\n`);
    } else {
      console.log("  ⚠️  No API keys found in source DB\n");
    }

    // Step 4: Verification
    console.log("🔍 Verifying migration...");
    const destUserCount = await DestUser.countDocuments({});
    const destProductCount = await DestProduct.countDocuments({});
    const destApiKeyCount = await DestApiKey.countDocuments({});

    console.log(`  Users in destination: ${destUserCount}/${users.length}`);
    console.log(`  Products in destination: ${destProductCount}/${products.length}`);
    console.log(`  API Keys in destination: ${destApiKeyCount}/${apiKeys.length}`);

    console.log("\n✨ Migration completed!\n");
    console.log("📋 Summary:");
    console.log(`   • Users: ${destUserCount}/${users.length}`);
    console.log(`   • Products: ${destProductCount}/${products.length}`);
    console.log(`   • API Keys: ${destApiKeyCount}/${apiKeys.length}`);
    
    if (destUserCount < users.length) {
      console.log(`\n⚠️  Only ${destUserCount} out of ${users.length} users were migrated.`);
      console.log("   This may be due to duplicate unique keys (email/username).");
      console.log("   Check the destination database for existing data.");
    }
    
    console.log("\n⚠️  Remember to update your .env file with the new database URL");

  } catch (error) {
    console.error("\n❌ Migration failed:");
    console.error(error);
    process.exit(1);
  } finally {
    await sourceConn.close();
    await destConn.close();
    console.log("\n🔌 Connections closed");
  }
}

// Run migration
migrateData();
