import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
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

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "agent", "admin"], default: "user" },
  isVerified: { type: Boolean, default: false },
  walletBalance: { type: Number, default: 0 },
  totalFunded: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
}, { timestamps: true });

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcryptjs.hash(this.password, 10);
});

const User = mongoose.model("User", UserSchema);

const ADMIN_ACCOUNTS = [
  { username: "@Admin001", email: "admin001@allendatahub.com", phone: "0200000001", password: "Admin@2024", role: "admin" },
  { username: "@Admin002", email: "admin002@allendatahub.com", phone: "0200000002", password: "Admin@2024", role: "admin" },
];

async function seedAdmins() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    for (const admin of ADMIN_ACCOUNTS) {
      // Delete by either email or username to ensure clean data
      await User.deleteOne({ $or: [{ email: admin.email }, { username: admin.username }] });
      
      // Create new admin
      const user = new User(admin);
      await user.save();
      console.log(`✅ Created new admin: ${admin.email}`);
      console.log(`   Username: ${admin.username}`);
      console.log(`   Password: ${admin.password}\n`);
    }

    console.log("✅ Admin seeding complete!");
    console.log("\n📝 Login credentials:");
    console.log("   Email: admin001@allendatahub.com");
    console.log("   Password: Admin@2024\n");
    console.log("   Or:");
    console.log("   Email: admin002@allendatahub.com");
    console.log("   Password: Admin@2024");

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

seedAdmins();
