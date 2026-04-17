/**
 * Migration: Update products with correct vendor product IDs
 * Run with: npm run migrate-vendor-products
 */

import mongoose from "mongoose";
import { Package } from "./models/Package.js";

const VENDOR_PRODUCT_IDS = {
  MTN: {
    "1 GB": "69815ba90771ff415dd64020",
    "2 GB": "69815d9f0771ff415dd6409b",
    "3 GB": "69820a5754e39934a4d35a48",
    "4 GB": "69820a8f54e39934a4d35a7d",
    "5 GB": "69820ad754e39934a4d35ab2",
    "6 GB": "69820b3854e39934a4d35ae7",
    "8 GB": "69820bc754e39934a4d35b51",
    "10 GB": "69820c4154e39934a4d35b86",
    "15 GB": "69820e1a54e39934a4d35bbb",
    "20 GB": "69820e6854e39934a4d35bf0",
    "25 GB": "69820ebb54e39934a4d35c25",
    "30 GB": "698a6db5d576f0db22b69329",
    "40 GB": "698a6e71d576f0db22b6932a",
  },
  Telecel: {
    "5 GB": "69820fa454e39934a4d35c5a",
    "10 GB": "6982103e54e39934a4d35c8f",
    "15 GB": "698210ab54e39934a4d35cc4",
    "20 GB": "698210f554e39934a4d35cf9",
    "25 GB": "698a70afd576f0db22b69330",
    "30 GB": "698a7105d576f0db22b69331",
    "40 GB": "698a7140d576f0db22b69332",
  },
  AirtelTigo: {
    "1 GB": "6982144b54e39934a4d35d2e",
    "2 GB": "6982149554e39934a4d35d63",
    "3 GB": "698214e154e39934a4d35d98",
    "4 GB": "6982151f54e39934a4d35dcd",
    "5 GB": "698a6f72d576f0db22b6932c",
    "6 GB": "698a6fddd576f0db22b6932d",
    "7 GB": "698a700bd576f0db22b6932e",
    "8 GB": "698a7042d576f0db22b6932f",
  },
};

async function migrate() {
  try {
    console.log("🔄 Starting vendor product ID migration...\n");

    let updated = 0;
    let notFound = 0;
    let errors = 0;

    for (const [network, products] of Object.entries(VENDOR_PRODUCT_IDS)) {
      console.log(`\n📱 Network: ${network}`);

      for (const [dataAmount, vendorProductId] of Object.entries(products)) {
        try {
          const product = await Package.findOneAndUpdate(
            { network, dataAmount, type: "data" },
            { vendorProductId },
            { new: true }
          );

          if (product) {
            console.log(`  ✅ ${dataAmount}: Updated with vendor ID ${vendorProductId}`);
            updated++;
          } else {
            console.log(
              `  ⚠️  ${dataAmount}: No product found (network: ${network}, dataAmount: ${dataAmount})`
            );
            notFound++;
          }
        } catch (err) {
          console.error(
            `  ❌ ${dataAmount}: Error - ${err instanceof Error ? err.message : String(err)}`
          );
          errors++;
        }
      }
    }

    console.log(`\n
📊 Migration Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Updated:    ${updated}
⚠️  Not Found: ${notFound}
❌ Errors:     ${errors}
✨ Total:      ${updated + notFound + errors}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    // Verify
    const allProducts = await Package.find({ type: "data" });
    const withVendorId = allProducts.filter((p) => p.vendorProductId);
    const withoutVendorId = allProducts.filter((p) => !p.vendorProductId);

    console.log(`
📈 Database Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Products:      ${allProducts.length}
With Vendor ID:      ${withVendorId.length}
Without Vendor ID:   ${withoutVendorId.length}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    if (withoutVendorId.length > 0) {
      console.log("⚠️  Products still without vendor IDs:");
      withoutVendorId.forEach((p) => {
        console.log(`   - ${p.network} ${p.dataAmount}`);
      });
    }

    process.exit(0);
  } catch (err) {
    console.error("\n❌ Migration failed:", err);
    process.exit(1);
  }
}

// Run migration
migrate();
