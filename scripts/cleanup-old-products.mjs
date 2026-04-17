#!/usr/bin/env node
/**
 * Cleanup: Remove old products with incorrect vendor IDs
 * These have been replaced by new products with correct vendor IDs
 * Run with: cd backend/api-server && NODE_PATH=node_modules MONGODB_URI='mongodb+srv://...' node ../../scripts/cleanup-old-products.mjs
 */

import mongoose from "mongoose";

const OLD_PRODUCTS_TO_DELETE = [
  // Old MTN products with master_beneficiary_data_bundle
  { network: "MTN", dataAmount: "1GB", vendorProductId: "master_beneficiary_data_bundle" },
  { network: "MTN", dataAmount: "2GB", vendorProductId: "master_beneficiary_data_bundle" },
  // Old Telecel products with telecel_expiry_bundle
  { network: "Telecel", dataAmount: "5GMB", vendorProductId: "telecel_expiry_bundle" },
  { network: "Telecel", dataAmount: "10GB", vendorProductId: "telecel_expiry_bundle" },
  // Old AirtelTigo products with ishare_data_bundle
  { network: "AirtelTigo", dataAmount: "1GB", vendorProductId: "ishare_data_bundle" },
  { network: "AirtelTigo", dataAmount: "2GB", vendorProductId: "ishare_data_bundle" },
];

async function cleanup() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not set.");
    }

    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB\n");

    const PackageSchema = new mongoose.Schema({
      network: String,
      dataAmount: String,
      vendorProductId: String,
    });
    const Package = mongoose.model("Package", PackageSchema, "packages");

    console.log("🗑️  Removing old products with incorrect vendor IDs...\n");

    let deleted = 0;
    for (const product of OLD_PRODUCTS_TO_DELETE) {
      try {
        const result = await Package.deleteMany({
          network: product.network,
          dataAmount: product.dataAmount,
          vendorProductId: product.vendorProductId,
        });

        if (result.deletedCount > 0) {
          console.log(
            `✅ Deleted ${result.deletedCount}x ${product.network} ${product.dataAmount} (vendorId: ${product.vendorProductId})`
          );
          deleted += result.deletedCount;
        }
      } catch (err) {
        console.error(
          `❌ Error deleting ${product.network} ${product.dataAmount}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    console.log(`\n📊 Cleanup Summary`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Deleted: ${deleted} old products`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Verify
    const remaining = await Package.find({ type: "data" }).countDocuments();
    console.log(`📈 Products remaining: ${remaining}`);

    await mongoose.disconnect();
    console.log("\n✅ Cleanup complete!");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Error:", err);
    process.exit(1);
  }
}

cleanup();
