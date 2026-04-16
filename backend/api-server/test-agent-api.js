#!/usr/bin/env node

/**
 * Agent API v2.0 - Complete Test Suite
 * Tests all endpoints to ensure the API works correctly
 */

const API_BASE = process.env.API_URL || "http://localhost:3000";
const API_KEY = process.env.AGENT_API_KEY || "test_key_12345";

interface TestResult {
  name: string;
  status: "✅" | "❌";
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, status: "✅" });
    console.log(`✅ ${name}`);
  } catch (err) {
    results.push({
      name,
      status: "❌",
      error: err instanceof Error ? err.message : String(err),
    });
    console.error(`❌ ${name}`);
    console.error(`   Error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function request(
  method: string,
  path: string,
  body?: any,
  headers?: Record<string, string>
) {
  const url = `${API_BASE}${path}`;

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  return {
    status: response.status,
    headers: response.headers,
    data,
  };
}

// ============================================================================
// TEST SUITE
// ============================================================================

async function runTests() {
  console.log("🚀 Agent API v2.0 - Test Suite\n");
  console.log(`API Base: ${API_BASE}`);
  console.log(`API Key: ${API_KEY.slice(0, 5)}...${API_KEY.slice(-5)}\n`);

  // Test 1: Health Check (No Auth)
  await test("Health Check (No Auth)", async () => {
    const { status, data } = await request("GET", "/agent-api/health");

    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
    if (!data.success) throw new Error(`Expected success: true`);
    if (data.service !== "AllenDataHub Agent API") {
      throw new Error(`Expected AllenDataHub Agent API, got ${data.service}`);
    }
    if (data.version !== "2.0.0") throw new Error(`Expected version 2.0.0, got ${data.version}`);
  });

  // Test 2: Missing API Key
  await test("Missing API Key - Should Return 401", async () => {
    const { status, data } = await request("GET", "/agent-api/products");

    if (status !== 401) throw new Error(`Expected 401, got ${status}`);
    if (data.error !== "MISSING_API_KEY") {
      throw new Error(`Expected MISSING_API_KEY error, got ${data.error}`);
    }
  });

  // Test 3: Invalid API Key
  await test("Invalid API Key - Should Return 401", async () => {
    const { status, data } = await request("GET", "/agent-api/products", undefined, {
      "X-API-Key": "invalid_key_12345",
    });

    if (status !== 401) throw new Error(`Expected 401, got ${status}`);
    if (data.error !== "INVALID_API_KEY") {
      throw new Error(`Expected INVALID_API_KEY error, got ${data.error}`);
    }
  });

  // Test 4: Get Products
  let productId: string | null = null;
  await test("Get Products", async () => {
    const { status, data } = await request("GET", "/agent-api/products", undefined, {
      "X-API-Key": API_KEY,
    });

    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
    if (!data.success) throw new Error(`Expected success: true`);
    if (!Array.isArray(data.products)) throw new Error(`Expected products array`);
    if (data.products.length === 0) throw new Error(`No products found`);

    // Save first product ID for later tests
    productId = data.products[0].id;
    console.log(`   Found ${data.products.length} products`);
    console.log(`   First product: ${data.products[0].name} (${productId})`);
  });

  // Test 5: Get Account Balance
  await test("Get Account Balance", async () => {
    const { status, data } = await request(
      "GET",
      "/agent-api/account/balance",
      undefined,
      { "X-API-Key": API_KEY }
    );

    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
    if (!data.success) throw new Error(`Expected success: true`);
    if (typeof data.account.balance !== "number") {
      throw new Error(`Expected balance to be number`);
    }
    console.log(`   Balance: ₵${data.account.balance.toFixed(2)}`);
  });

  // Test 6: Invalid Phone Number
  if (productId) {
    await test("Invalid Phone Number - Should Return 400", async () => {
      const { status, data } = await request(
        "POST",
        "/agent-api/orders/create",
        {
          productId,
          phoneNumber: "invalid_phone",
          quantity: 1,
        },
        { "X-API-Key": API_KEY }
      );

      if (status !== 400) throw new Error(`Expected 400, got ${status}`);
      if (data.error !== "INVALID_PHONE") {
        throw new Error(`Expected INVALID_PHONE error, got ${data.error}`);
      }
    });
  }

  // Test 7: Valid Phone Number Formats
  if (productId) {
    const phoneFormats = [
      "0541234567",
      "+233541234567",
      "541234567", 
      "233541234567",
      "0541 234 567",
    ];

    for (const phone of phoneFormats) {
      await test(`Create Order with Phone Format: "${phone}"`, async () => {
        const { status, data } = await request(
          "POST",
          "/agent-api/orders/create",
          {
            productId,
            phoneNumber: phone,
            quantity: 1,
          },
          { "X-API-Key": API_KEY }
        );

        if (status !== 201 && status !== 400) {
          throw new Error(`Expected 201 or 400, got ${status}`);
        }

        if (status === 201) {
          if (!data.success) throw new Error(`Expected success: true`);
          if (!data.order.id) throw new Error(`Expected order ID`);
          if (!data.order.orderId) throw new Error(`Expected orderId`);
          console.log(`   Order created: ${data.order.id}`);
        } else {
          // Might fail if balance is insufficient, that's ok
          if (data.error === "INSUFFICIENT_BALANCE") {
            console.log(`   (Balance insufficient - expected behavior)`);
          } else {
            throw new Error(`Got error: ${data.error}`);
          }
        }
      });
    }
  }

  // Test 8: List Orders
  await test("List Orders with Pagination", async () => {
    const { status, data } = await request(
      "GET",
      "/agent-api/orders?page=1&limit=10",
      undefined,
      { "X-API-Key": API_KEY }
    );

    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
    if (!data.success) throw new Error(`Expected success: true`);
    if (!Array.isArray(data.orders)) throw new Error(`Expected orders array`);
    if (!data.pagination) throw new Error(`Expected pagination`);
    console.log(`   Total orders: ${data.pagination.total}`);
    console.log(`   Showing: ${data.orders.length}/${data.pagination.limit}`);
  });

  // Test 9: Get Single Order (if any exist)
  let orderId: string | null = null;
  await test("List Orders to Get Order ID", async () => {
    const { status, data } = await request(
      "GET",
      "/agent-api/orders?page=1&limit=1",
      undefined,
      { "X-API-Key": API_KEY }
    );

    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
    if (data.orders.length > 0) {
      orderId = data.orders[0].id;
      console.log(`   Found order: ${orderId}`);
    } else {
      console.log(`   No orders yet (expected if this is first test run)`);
    }
  });

  // Test 10: Get Order Details
  if (orderId) {
    await test("Get Order Details", async () => {
      const { status, data } = await request(
        "GET",
        `/agent-api/orders/${orderId}`,
        undefined,
        { "X-API-Key": API_KEY }
      );

      if (status !== 200) throw new Error(`Expected 200, got ${status}`);
      if (!data.success) throw new Error(`Expected success: true`);
      if (!data.order) throw new Error(`Expected order object`);
      console.log(`   Order status: ${data.order.status}`);
      console.log(`   Phone: ${data.order.phoneNumber}`);
    });
  }

  // Test 11: Invalid Order ID Format
  await test("Invalid Order ID Format - Should Return 400", async () => {
    const { status, data } = await request(
      "GET",
      "/agent-api/orders/invalid_id",
      undefined,
      { "X-API-Key": API_KEY }
    );

    if (status !== 400) throw new Error(`Expected 400, got ${status}`);
    if (data.error !== "INVALID_ORDER_ID") {
      throw new Error(`Expected INVALID_ORDER_ID error, got ${data.error}`);
    }
  });

  // Test 12: Non-existent Order ID
  await test("Non-existent Order ID - Should Return 404", async () => {
    const fakeId = "507f1f77bcf86cd799439999"; // Valid ObjectId, doesn't exist
    const { status, data } = await request(
      "GET",
      `/agent-api/orders/${fakeId}`,
      undefined,
      { "X-API-Key": API_KEY }
    );

    if (status !== 404) throw new Error(`Expected 404, got ${status}`);
    if (data.error !== "ORDER_NOT_FOUND") {
      throw new Error(`Expected ORDER_NOT_FOUND error, got ${data.error}`);
    }
  });

  // Test 13: Request ID Headers
  await test("Request ID in Response Headers", async () => {
    const { headers, data } = await request("GET", "/agent-api/health");

    if (!headers.get("x-request-id")) throw new Error(`Expected X-Request-ID header`);
    console.log(`   Request ID: ${headers.get("x-request-id")}`);
  });

  // Print Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST RESULTS");
  console.log("=".repeat(60));

  const passed = results.filter((r) => r.status === "✅").length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);

  console.log(`\nTotal: ${passed}/${total} tests passed (${percentage}%)\n`);

  // Print failed tests
  const failed = results.filter((r) => r.status === "❌");
  if (failed.length > 0) {
    console.log("❌ Failed Tests:");
    failed.forEach((r) => {
      console.log(`  - ${r.name}`);
      if (r.error) console.log(`    ${r.error}`);
    });
  }

  // Exit code
  process.exit(failed.length > 0 ? 1 : 0);
}

// Run tests
runTests().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
