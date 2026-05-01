import { User } from "../models/User";
import { Product } from "../models/Product";
import { logger } from "./logger";

const ADMIN_ACCOUNTS = [
  { username: "@Admin001", email: "admin001@allendatahub.com", phone: "0200000001", password: "Password100'", role: "admin" as const },
  { username: "@Admin002", email: "admin002@allendatahub.com", phone: "0200000002", password: "Password200", role: "admin" as const },
];

// Products are now managed via MongoDB only - no more auto-seeding
// To add products: use admin dashboard or insert directly into MongoDB

export async function seedAdminAccounts() {
  try {
    // Set a 10 second timeout for seeding
    const seedPromise = Promise.all([
      // Seed admin accounts
      ...ADMIN_ACCOUNTS.map(async (admin) => {
        const existing = await User.findOne({ username: admin.username });
        if (!existing) {
          const user = new User({
            username: admin.username,
            email: admin.email,
            phone: admin.phone,
            password: admin.password,
            role: admin.role,
            isVerified: true,
          });
          await user.save();
          logger.info(`Admin account created: ${admin.username}`);
        }
      }),
      // Seed packages - DISABLED: Products should only come from MongoDB, not auto-seeded
      // To add products, use the admin dashboard or direct MongoDB insertion
      (async () => {
        try {
          const count = await Product.countDocuments();
          if (count === 0) {
            logger.info("No products in database - please add products via admin dashboard or MongoDB");
            // Don't auto-seed - let admin add products manually
          } else {
            logger.info(`Database has ${count} products - using database products only`);
          }
        } catch (err: any) {
          logger.warn({ err }, "Product check failed - this is OK without MongoDB");
        }
      })(),
    ]);

    await Promise.race([
      seedPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Seeding timeout")), 10000)
      ),
    ]);
  } catch (err) {
    logger.warn({ err }, "Admin seeding skipped or timed out - this is OK without MongoDB");
  }
}

/**
 * Add vendorProductId to existing packages that don't have it
 */
async function updatePackageVendorIds() {
  const vendorMappings: Record<string, string> = {
    "MTN 1GB": "master_beneficiary_data_bundle",
    "MTN 2GB": "master_beneficiary_data_bundle",
    "MTN 3GB": "master_beneficiary_data_bundle",
    "MTN 5GB": "master_beneficiary_data_bundle",
    "MTN 10GB": "master_beneficiary_data_bundle",
    "Telecel 1GB": "telecel_expiry_bundle",
    "Telecel 2GB": "telecel_expiry_bundle",
    "Telecel 3GB": "telecel_expiry_bundle",
    "Telecel 5GB": "telecel_expiry_bundle",
    "Telecel 10GB": "telecel_expiry_bundle",
    "AirtelTigo 1GB": "ishare_data_bundle",
    "AirtelTigo 2GB": "ishare_data_bundle",
    "AirtelTigo 3GB": "ishare_data_bundle",
    "AirtelTigo 5GB": "ishare_data_bundle",
    "AirtelTigo 10GB": "ishare_data_bundle",
  };

  let updated = 0;
  for (const [packageName, vendorId] of Object.entries(vendorMappings)) {
    const result = await Product.updateOne(
      { name: packageName, vendorProductId: { $exists: false } },
      { $set: { vendorProductId: vendorId } }
    );
    if (result.modifiedCount > 0) {
      updated++;
    }
  }

  if (updated > 0) {
    logger.info(`✓ Added vendorProductId to ${updated} packages`);
  }
}
