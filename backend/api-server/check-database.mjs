import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnv(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const env = {};
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      env[key] = valueParts.join('=');
    }
  }
  
  return env;
}

const envVars = loadEnv(`${__dirname}/.env`);
const MONGODB_URI = envVars.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ Error: MONGODB_URI not found in .env file");
  process.exit(1);
}

async function checkDatabase() {
  try {
    console.log("🔗 Connecting to MongoDB...\n");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // Check collections
    console.log("📊 Database Collections:");
    const collections = await db.listCollections().toArray();
    console.log(`   Total: ${collections.length}\n`);
    
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`   • ${col.name}: ${count} documents`);
    }

    // Check users
    console.log("\n👥 Users Summary:");
    const usersCollection = db.collection('users');
    const userCount = await usersCollection.countDocuments();
    console.log(`   Total Users: ${userCount}`);
    
    const users = await usersCollection.find({}).project({
      _id: 1,
      username: 1,
      email: 1,
      role: 1,
      walletBalance: 1,
      isVerified: 1,
      createdAt: 1
    }).limit(5).toArray();
    
    if (users.length > 0) {
      console.log(`   First 5 users:`);
      for (const user of users) {
        console.log(`     - ${user.email || user.username} (${user.role}) - Wallet: ${user.walletBalance || 0}`);
      }
    }

    // Check packages
    console.log("\n📦 Packages Summary:");
    const packagesCollection = db.collection('packages');
    const packageCount = await packagesCollection.countDocuments();
    console.log(`   Total Packages: ${packageCount}`);
    
    const packages = await packagesCollection.find({}).project({
      name: 1,
      network: 1,
      userPrice: 1,
      vendorProductId: 1
    }).limit(10).toArray();
    
    if (packages.length > 0) {
      console.log(`   Sample packages:`);
      for (const pkg of packages) {
        console.log(`     - ${pkg.name} (${pkg.network}) - Price: ${pkg.userPrice}, Vendor: ${pkg.vendorProductId || 'N/A'}`);
      }
    } else {
      console.log(`   ❌ NO PACKAGES FOUND - Need to seed!`);
    }

    // Check orders
    console.log("\n📋 Orders Summary:");
    const ordersCollection = db.collection('orders');
    const orderCount = await ordersCollection.countDocuments();
    console.log(`   Total Orders: ${orderCount}`);
    
    const recentOrders = await ordersCollection.find({}).sort({ createdAt: -1 }).project({
      userId: 1,
      productName: 1,
      status: 1,
      createdAt: 1
    }).limit(5).toArray();
    
    if (recentOrders.length > 0) {
      console.log(`   Recent orders:`);
      for (const order of recentOrders) {
        console.log(`     - ${order.productName} (${order.status})`);
      }
    }

    // Check wallet transactions
    console.log("\n💳 Wallet Transactions Summary:");
    const transactionsCollection = db.collection('wallettransactions');
    const txCount = await transactionsCollection.countDocuments();
    console.log(`   Total Transactions: ${txCount}`);

    console.log("\n✅ Database check complete!\n");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

checkDatabase();
