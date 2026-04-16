/**
 * Migration: Add vendorProductId to existing packages
 * Run with: npx ts-node src/migrate-vendor-ids.ts
 */

import mongoose from "mongoose";
import { Package } from "./models/Package";
import { logger } from "./lib/logger";

const VENDOR_MAPPINGS: Record<string, string> = {
  "MTN 100MB": "prod_mtn_100mb",
  "MTN 500MB": "prod_mtn_500mb",
  "MTN 1 GB": "prod_mtn_1gb",
  "MTN 2 GB": "prod_mtn_2gb",
  "MTN 3 GB": "prod_mtn_3gb",
  "MTN 5 GB": "prod_mtn_5gb",
  "MTN 10 GB": "prod_mtn_10gb",
  "MTN 20 GB": "prod_mtn_20gb",
  "Telecel 100MB": "prod_telecel_100mb",
  "Telecel 500MB": "prod_telecel_500mb",
  "Telecel 1 GB": "prod_telecel_1gb",
  "Telecel 2 GB": "prod_telecel_2gb",
  "Telecel 3 GB": "prod_telecel_3gb",
  "Telecel 5 GB": "prod_telecel_5gb",
  "Telecel 10 GB": "prod_telecel_10gb",
  "AirtelTigo 100MB": "prod_airtel_100mb",
  "AirtelTigo 500MB": "prod_airtel_500mb",
  "AirtelTigo 1 GB": "prod_airtel_1gb",
  "AirtelTigo 2 GB": "prod_airtel_2gb",
  "AirtelTigo 3 GB": "prod_airtel_3gb",
  "AirtelTigo 5 GB": "prod_airtel_5gb",
  "AirtelTigo 10 GB": "prod_airtel_10gb",
};

async function migrate() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/ewura-hub";
    await mongoose.connect(mongoUri);
    logger.info("Connected to MongoDB");

    // Update each package with its vendor ID
    let updated = 0;
    for (const [packageName, vendorId] of Object.entries(VENDOR_MAPPINGS)) {
      const result = await Package.updateOne(
        { name: packageName },
        { $set: { vendorProductId: vendorId } }
      );

      if (result.modifiedCount > 0) {
        logger.info(`✓ Updated ${packageName} → ${vendorId}`);
        updated++;
      } else {
        logger.warn(`✗ Package not found: ${packageName}`);
      }
    }

    logger.info(`\n✅ Migration complete: ${updated} packages updated`);

    // Verify
    const withVendor = await Package.countDocuments({ vendorProductId: { $exists: true } });
    const total = await Package.countDocuments();
    logger.info(`Summary: ${withVendor}/${total} packages have vendorProductId`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    logger.error({ err }, "Migration failed");
    process.exit(1);
  }
}

migrate();
