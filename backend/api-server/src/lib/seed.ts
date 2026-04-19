import { User } from "../models/User";
import { Product } from "../models/Product";
import { logger } from "./logger";

const ADMIN_ACCOUNTS = [
  { username: "@Admin001", email: "admin001@allendatahub.com", phone: "0200000001", password: "Password100'", role: "admin" as const },
  { username: "@Admin002", email: "admin002@allendatahub.com", phone: "0200000002", password: "Password200", role: "admin" as const },
];

const PACKAGES = [
  // ─── MTN Data Bundles ───
  { name: "MTN 1GB", network: "MTN", type: "data", dataAmount: "1GB", price: 0, userPrice: 5.00, agentPrice: 4.50, description: "(Non-Expiry)", vendorProductId: "master_beneficiary_data_bundle" },
  { name: "MTN 2GB", network: "MTN", type: "data", dataAmount: "2GB", price: 0, userPrice: 9.00, agentPrice: 8.10, description: "(Non-Expiry)", vendorProductId: "master_beneficiary_data_bundle" },
  { name: "MTN 3GB", network: "MTN", type: "data", dataAmount: "3GB", price: 0, userPrice: 13.00, agentPrice: 11.70, description: "(Non-Expiry)", vendorProductId: "master_beneficiary_data_bundle" },
  { name: "MTN 5GB", network: "MTN", type: "data", dataAmount: "5GB", price: 0, userPrice: 21.00, agentPrice: 18.90, description: "(Non-Expiry)", vendorProductId: "master_beneficiary_data_bundle" },
  { name: "MTN 10GB", network: "MTN", type: "data", dataAmount: "10GB", price: 0, userPrice: 39.99, agentPrice: 35.99, description: "(Non-Expiry)", vendorProductId: "master_beneficiary_data_bundle" },

  // ─── Telecel Data Bundles ───
  { name: "Telecel 1GB", network: "Telecel", type: "data", dataAmount: "1GB", price: 0, userPrice: 4.99, agentPrice: 4.49, description: "Data bundle (Expiry Bundle (60 days))", vendorProductId: "telecel_expiry_bundle" },
  { name: "Telecel 2GB", network: "Telecel", type: "data", dataAmount: "2GB", price: 0, userPrice: 8.99, agentPrice: 8.09, description: "Data bundle (Expiry Bundle (60 days))", vendorProductId: "telecel_expiry_bundle" },
  { name: "Telecel 3GB", network: "Telecel", type: "data", dataAmount: "3GB", price: 0, userPrice: 12.99, agentPrice: 11.69, description: "Data bundle (Expiry Bundle (60 days))", vendorProductId: "telecel_expiry_bundle" },
  { name: "Telecel 5GB", network: "Telecel", type: "data", dataAmount: "5GB", price: 0, userPrice: 20.99, agentPrice: 18.89, description: "Data bundle (Expiry Bundle (60 days))", vendorProductId: "telecel_expiry_bundle" },
  { name: "Telecel 10GB", network: "Telecel", type: "data", dataAmount: "10GB", price: 0, userPrice: 39.99, agentPrice: 35.99, description: "Data bundle (Expiry Bundle (60 days))", vendorProductId: "telecel_expiry_bundle" },

  // ─── AirtelTigo Data Bundles ───
  { name: "AirtelTigo 1GB", network: "AirtelTigo", type: "data", dataAmount: "1GB", price: 0, userPrice: 6.00, agentPrice: 5.50, description: "iShare bundle (60 days)", vendorProductId: "ishare_data_bundle" },
  { name: "AirtelTigo 2GB", network: "AirtelTigo", type: "data", dataAmount: "2GB", price: 0, userPrice: 10.99, agentPrice: 9.89, description: "iShare bundle (60 days)", vendorProductId: "ishare_data_bundle" },
  { name: "AirtelTigo 3GB", network: "AirtelTigo", type: "data", dataAmount: "3GB", price: 0, userPrice: 15.99, agentPrice: 14.39, description: "iShare bundle (60 days)", vendorProductId: "ishare_data_bundle" },
  { name: "AirtelTigo 5GB", network: "AirtelTigo", type: "data", dataAmount: "5GB", price: 0, userPrice: 24.99, agentPrice: 22.49, description: "iShare bundle (60 days)", vendorProductId: "ishare_data_bundle" },
  { name: "AirtelTigo 10GB", network: "AirtelTigo", type: "data", dataAmount: "10GB", price: 0, userPrice: 45.99, agentPrice: 41.39, description: "iShare bundle (60 days)", vendorProductId: "ishare_data_bundle" },
];

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
      // Seed packages (only add if not exists - preserve custom prices)
      (async () => {
        try {
          const count = await Product.countDocuments();
          if (count === 0) {
            // Only seed on first run, never overwrite existing packages
            await Product.insertMany(PACKAGES);
            logger.info(`Seeded ${PACKAGES.length} packages`);
          } else {
            logger.info(`Database already has ${count} packages - skipping seed (preserving custom prices)`);
            
            // But do add vendorProductId to existing packages if missing
            await updatePackageVendorIds();
          }
        } catch (err: any) {
          logger.warn({ err }, "Package seeding failed - this is OK without MongoDB");
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
