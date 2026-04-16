import { User } from "../models/User";
import { Package } from "../models/Package";
import { logger } from "./logger";

const ADMIN_ACCOUNTS = [
  { username: "@Admin001", email: "admin001@ewurahub.com", phone: "0200000001", password: "Password100'", role: "admin" as const },
  { username: "@Admin002", email: "admin002@ewurahub.com", phone: "0200000002", password: "Password200", role: "admin" as const },
];

const PACKAGES = [
  // ─── MTN Data ───
  { name: "MTN 100MB", network: "MTN", type: "data", dataAmount: "100MB", price: 0, userPrice: 0.50, agentPrice: 0.44, description: "1 Day" },
  { name: "MTN 500MB", network: "MTN", type: "data", dataAmount: "500MB", price: 0, userPrice: 1.80, agentPrice: 1.60, description: "3 Days" },
  { name: "MTN 1 GB", network: "MTN", type: "data", dataAmount: "1 GB", price: 0, userPrice: 4.20, agentPrice: 3.80, description: "7 Days" },
  { name: "MTN 2 GB", network: "MTN", type: "data", dataAmount: "2 GB", price: 0, userPrice: 7.50, agentPrice: 6.75, description: "14 Days" },
  { name: "MTN 3 GB", network: "MTN", type: "data", dataAmount: "3 GB", price: 0, userPrice: 10.00, agentPrice: 9.00, description: "30 Days" },
  { name: "MTN 5 GB", network: "MTN", type: "data", dataAmount: "5 GB", price: 0, userPrice: 16.00, agentPrice: 14.40, description: "30 Days" },
  { name: "MTN 10 GB", network: "MTN", type: "data", dataAmount: "10 GB", price: 0, userPrice: 30.00, agentPrice: 27.00, description: "30 Days" },
  { name: "MTN 20 GB", network: "MTN", type: "data", dataAmount: "20 GB", price: 0, userPrice: 55.00, agentPrice: 49.50, description: "30 Days" },

  // ─── Telecel Data ───
  { name: "Telecel 100MB", network: "Telecel", type: "data", dataAmount: "100MB", price: 0, userPrice: 0.50, agentPrice: 0.44, description: "1 Day" },
  { name: "Telecel 500MB", network: "Telecel", type: "data", dataAmount: "500MB", price: 0, userPrice: 1.80, agentPrice: 1.60, description: "3 Days" },
  { name: "Telecel 1 GB", network: "Telecel", type: "data", dataAmount: "1 GB", price: 0, userPrice: 4.00, agentPrice: 3.60, description: "7 Days" },
  { name: "Telecel 2 GB", network: "Telecel", type: "data", dataAmount: "2 GB", price: 0, userPrice: 7.00, agentPrice: 6.30, description: "14 Days" },
  { name: "Telecel 3 GB", network: "Telecel", type: "data", dataAmount: "3 GB", price: 0, userPrice: 9.50, agentPrice: 8.55, description: "30 Days" },
  { name: "Telecel 5 GB", network: "Telecel", type: "data", dataAmount: "5 GB", price: 0, userPrice: 15.00, agentPrice: 13.50, description: "30 Days" },
  { name: "Telecel 10 GB", network: "Telecel", type: "data", dataAmount: "10 GB", price: 0, userPrice: 28.00, agentPrice: 25.20, description: "30 Days" },

  // ─── AirtelTigo Data ───
  { name: "AirtelTigo 100MB", network: "AirtelTigo", type: "data", dataAmount: "100MB", price: 0, userPrice: 0.50, agentPrice: 0.44, description: "1 Day" },
  { name: "AirtelTigo 500MB", network: "AirtelTigo", type: "data", dataAmount: "500MB", price: 0, userPrice: 1.80, agentPrice: 1.60, description: "3 Days" },
  { name: "AirtelTigo 1 GB", network: "AirtelTigo", type: "data", dataAmount: "1 GB", price: 0, userPrice: 4.50, agentPrice: 4.05, description: "7 Days" },
  { name: "AirtelTigo 2 GB", network: "AirtelTigo", type: "data", dataAmount: "2 GB", price: 0, userPrice: 8.00, agentPrice: 7.20, description: "14 Days" },
  { name: "AirtelTigo 3 GB", network: "AirtelTigo", type: "data", dataAmount: "3 GB", price: 0, userPrice: 11.00, agentPrice: 9.90, description: "30 Days" },
  { name: "AirtelTigo 5 GB", network: "AirtelTigo", type: "data", dataAmount: "5 GB", price: 0, userPrice: 17.00, agentPrice: 15.30, description: "30 Days" },
  { name: "AirtelTigo 10 GB", network: "AirtelTigo", type: "data", dataAmount: "10 GB", price: 0, userPrice: 32.00, agentPrice: 28.80, description: "30 Days" },
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
          const count = await Package.countDocuments();
          if (count === 0) {
            // Only seed on first run, never overwrite existing packages
            await Package.insertMany(PACKAGES);
            logger.info(`Seeded ${PACKAGES.length} packages`);
          } else {
            logger.info(`Database already has ${count} packages - skipping seed (preserving custom prices)`);
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
