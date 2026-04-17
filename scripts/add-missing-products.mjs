#!/usr/bin/env node
/**
 * Migration: Add missing products to database
 * Run with: cd backend/api-server && NODE_PATH=node_modules MONGODB_URI='mongodb+srv://...' node ../../scripts/add-missing-products.mjs
 */

import mongoose from "mongoose";

const MISSING_PRODUCTS = [
  // MTN missing
  {
    name: "MTN 1 GB",
    network: "MTN",
    type: "data",
    dataAmount: "1 GB",
    userPrice: 6,
    agentPrice: 5,
    description: "1 GB data for MTN Ghana",
    vendorProductId: "69815ba90771ff415dd64020",
  },
  {
    name: "MTN 2 GB",
    network: "MTN",
    type: "data",
    dataAmount: "2 GB",
    userPrice: 12,
    agentPrice: 9,
    description: "2 GB data for MTN Ghana",
    vendorProductId: "69815d9f0771ff415dd6409b",
  },
  {
    name: "MTN 20 GB",
    network: "MTN",
    type: "data",
    dataAmount: "20 GB",
    userPrice: 100,
    agentPrice: 90,
    description: "20 GB data for MTN Ghana",
    vendorProductId: "69820e6854e39934a4d35bf0",
  },
  {
    name: "MTN 25 GB",
    network: "MTN",
    type: "data",
    dataAmount: "25 GB",
    userPrice: 120,
    agentPrice: 108,
    description: "25 GB data for MTN Ghana",
    vendorProductId: "69820ebb54e39934a4d35c25",
  },
  
  // Telecel missing
  {
    name: "Telecel 5 GB",
    network: "Telecel",
    type: "data",
    dataAmount: "5 GB",
    userPrice: 30,
    agentPrice: 25,
    description: "5 GB data for Telecel Ghana",
    vendorProductId: "69820fa454e39934a4d35c5a",
  },
  {
    name: "Telecel 10 GB",
    network: "Telecel",
    type: "data",
    dataAmount: "10 GB",
    userPrice: 50,
    agentPrice: 45,
    description: "10 GB data for Telecel Ghana",
    vendorProductId: "6982103e54e39934a4d35c8f",
  },

  // AirtelTigo missing
  {
    name: "AirtelTigo 1 GB",
    network: "AirtelTigo",
    type: "data",
    dataAmount: "1 GB",
    userPrice: 6,
    agentPrice: 5,
    description: "1 GB data for AirtelTigo Ghana",
    vendorProductId: "6982144b54e39934a4d35d2e",
  },
  {
    name: "AirtelTigo 2 GB",
    network: "AirtelTigo",
    type: "data",
    dataAmount: "2 GB",
    userPrice: 12,
    agentPrice: 9,
    description: "2 GB data for AirtelTigo Ghana",
    vendorProductId: "6982149554e39934a4d35d63",
  },
 
];

async function addMissingProducts() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error(
        "MONGODB_URI environment variable is not set. Please set it before running migration."
      );
    }

    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB\n");

    // Get Package model
    const PackageSchema = new mongoose.Schema({
      name: String,
      network: String,
      type: String,
      dataAmount: String,
      userPrice: Number,
      agentPrice: Number,
      description: String,
      vendorProductId: String,
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    });
    const Package = mongoose.model(
      "Package",
      PackageSchema,
      "packages"
    );

    console.log("🔄 Adding missing products...\n");

    let added = 0;
    let skipped = 0;
    let errors = 0;

    for (const product of MISSING_PRODUCTS) {
      try {
        // Check if product already exists
        const existing = await Package.findOne({
          network: product.network,
          dataAmount: product.dataAmount,
          type: "data",
        });

        if (existing) {
          console.log(
            `  ⏭️  ${product.name}: Already exists, skipping`
          );
          skipped++;
          continue;
        }

        // Insert new product
        const newProduct = await Package.create(product);
        console.log(
          `  ✅ ${product.name}: Created (User: GHS${product.userPrice}, Agent: GHS${product.agentPrice})`
        );
        added++;
      } catch (err) {
        console.error(
          `  ❌ ${product.name}: Error - ${err instanceof Error ? err.message : String(err)}`
        );
        errors++;
      }
    }

    console.log(`\n
📊 Addition Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Added:      ${added}
⏭️  Skipped:   ${skipped}
❌ Errors:     ${errors}
✨ Total:      ${added + skipped + errors}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    // Verify
    const allProducts = await Package.find({ type: "data" });
    const byNetwork = {};
    for (const p of allProducts) {
      byNetwork[p.network] = (byNetwork[p.network] || 0) + 1;
    }

    console.log(`
📈 Products by Network
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Products:  ${allProducts.length}
MTN:             ${byNetwork.MTN || 0}
Telecel:         ${byNetwork.Telecel || 0}
AirtelTigo:      ${byNetwork.AirtelTigo || 0}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    await mongoose.disconnect();
    console.log("✅ Done!");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Failed:", err);
    process.exit(1);
  }
}

addMissingProducts();
