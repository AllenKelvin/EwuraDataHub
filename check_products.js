import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI || "mongodb://localhost:27017/ewura-hub");

try {
  await client.connect();
  const db = client.db("ewura-hub");
  const packages = await db.collection("packages").find({}).limit(5).toArray();
  
  console.log("Sample Products:");
  packages.forEach(pkg => {
    console.log(`\n📦 ${pkg.name} (${pkg.network})`);
    console.log(`   vendorProductId: ${pkg.vendorProductId || "❌ NOT SET"}`);
  });
  
  const withoutVendor = await db.collection("packages").countDocuments({ vendorProductId: { $exists: false } });
  const withVendor = await db.collection("packages").countDocuments({ vendorProductId: { $exists: true } });
  
  console.log(`\n\n📊 Summary:`);
  console.log(`   Products WITH vendorProductId: ${withVendor}`);
  console.log(`   Products WITHOUT vendorProductId: ${withoutVendor}`);
  
} finally {
  await client.close();
}
