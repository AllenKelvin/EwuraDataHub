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

const SourceUser = sourceConn.model("User", UserSchema);
const DestUser = destConn.model("User", UserSchema);

async function checkDatabases() {
  try {
    console.log("🔍 Checking databases...\n");

    // Wait for connections
    await sourceConn.asPromise();
    await destConn.asPromise();
    console.log("✅ Connected to both databases\n");

    // Count users
    const sourceCount = await SourceUser.countDocuments({});
    const destCount = await DestUser.countDocuments({});

    console.log(`📊 Database Statistics:`);
    console.log(`   Source DB Users: ${sourceCount}`);
    console.log(`   Destination DB Users: ${destCount}`);
    console.log(`   Missing: ${sourceCount - destCount}\n`);

    if (sourceCount === destCount) {
      console.log("✅ All users have been migrated!");
      process.exit(0);
    }

    // Get source emails
    const sourceUsers = await SourceUser.find({}).select("email username").lean();
    const sourceEmails = new Set(sourceUsers.map(u => u.email.toLowerCase()));
    const sourceUsernames = new Set(sourceUsers.map(u => u.username.toLowerCase()));

    console.log(`📝 Source users: ${sourceUsers.length}\n`);

    // Get destination emails
    const destUsers = await DestUser.find({}).select("email username").lean();
    const destEmails = new Set(destUsers.map(u => u.email.toLowerCase()));
    const destUsernames = new Set(destUsers.map(u => u.username.toLowerCase()));

    console.log(`📝 Destination users: ${destUsers.length}\n`);

    // Find conflicts
    const emailConflicts = [];
    const usernameConflicts = [];
    const missingEmails = [];

    sourceUsers.forEach(user => {
      if (destEmails.has(user.email.toLowerCase())) {
        emailConflicts.push(user.email);
      } else {
        missingEmails.push(user.email);
      }

      if (destUsernames.has(user.username.toLowerCase())) {
        usernameConflicts.push(user.username);
      }
    });

    console.log(`⚠️  Conflict Analysis:`);
    console.log(`   Duplicate Emails: ${emailConflicts.length}`);
    console.log(`   Duplicate Usernames: ${usernameConflicts.length}`);
    console.log(`   Missing Users: ${missingEmails.length}\n`);

    if (emailConflicts.length > 0) {
      console.log(`📋 Sample email conflicts (first 10):`);
      emailConflicts.slice(0, 10).forEach(email => {
        console.log(`   - ${email}`);
      });
      if (emailConflicts.length > 10) {
        console.log(`   ... and ${emailConflicts.length - 10} more`);
      }
      console.log();
    }

    if (missingEmails.length > 0) {
      console.log(`📋 Missing users (first 10):`);
      missingEmails.slice(0, 10).forEach(email => {
        console.log(`   - ${email}`);
      });
      if (missingEmails.length > 10) {
        console.log(`   ... and ${missingEmails.length - 10} more`);
      }
      console.log();
    }

    console.log(`\n💡 Recommendation:`);
    if (emailConflicts.length > 0) {
      console.log(`   Clear destination DB and re-migrate to avoid conflicts.`);
      console.log(`   Or use 'migrate-upsert.mjs' to update existing users.`);
    }

  } catch (error) {
    console.error("\n❌ Error checking databases:");
    console.error(error.message);
    process.exit(1);
  } finally {
    await sourceConn.close();
    await destConn.close();
    console.log("\n🔌 Connections closed");
  }
}

checkDatabases();
