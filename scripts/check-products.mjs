#!/usr/bin/env node
/**
 * Debug: Check all products and their vendor IDs
 * Run with: cd backend/api-server && NODE_PATH=node_modules MONGODB_URI='mongodb+srv://...' node ../../scripts/check-products.mjs
 */

import mongoose from "mongoose";

async function checkProducts() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not set.");
    }

    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB\n");

    // Get Package model
    const PackageSchema = new mongoose.Schema({
      _id: mongoose.Schema.Types.ObjectId,
      name: String,
      network: String,
      type: String,
      dataAmount: String,
      vendorProductId: String,
    });
    const Package = mongoose.model("Package", PackageSchema, "packages");

    // Find all products with incorrect vendor IDs
    const allProducts = await Package.find({ type: "data" }).select(
      "name network dataAmount vendorProductId"
    );

    console.log("📦 All Data Products in Database:\n");
    console.log("ID | Name | Network | DataAmount | VendorProductId");
    console.log("─".repeat(100));

    for (const product of allProducts) {
      const id = product._id.toString().slice(0, 8);
      const name = (product.name || "").substring(0, 30).padEnd(30);
      const network = (product.network || "").padEnd(10);
      const dataAmount = (product.dataAmount || "").padEnd(10);
      const vendorId = product.vendorProductId || "❌ MISSING";

      console.log(`${id} | ${name} | ${network} | ${dataAmount} | ${vendorId}`);
    }

    console.log("\n\n🔍 Products with INCORRECT vendor IDs:");
    const incorrectProducts = allProducts.filter(
      (p) =>
        !p.vendorProductId ||
        p.vendorProductId.includes("prod_") ||
        p.vendorProductId.includes("master_") ||
        p.vendorProductId.includes("Portal-")
    );

    if (incorrectProducts.length === 0) {
      console.log("✅ All products have correct vendor IDs!");
    } else {
      console.log(`\n❌ Found ${incorrectProducts.length} products with issues:\n`);
      for (const product of incorrectProducts) {
        console.log(`- ${product.name} (${product.network} ${product.dataAmount})`);
        console.log(`  Current vendorProductId: ${product.vendorProductId || "EMPTY"}`);
        console.log(`  MongoDB ID: ${product._id}`);
      }
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Error:", err);
    process.exit(1);
  }
}

checkProducts();
