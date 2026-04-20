#!/usr/bin/env node

/**
 * Webhook Verification Test
 * Tests the webhook implementation against actual Portal-02 behavior
 */

const baseUrl = process.env.BACKEND_URL || "http://localhost:5000";
const webhookUrl = `${baseUrl}/api/vendor/webhook`;

// Simulate different Portal-02 webhook payloads based on documentation
const testPayloads = [
  {
    name: "Standard webhook with data wrapper",
    payload: {
      data: {
        event: "order.status.updated",
        orderId: "portal02_txn_12345",
        reference: "order_ref_123",
        status: "delivered",
        recipient: "233241234567",
        volume: 10,
        timestamp: new Date().toISOString(),
      },
    },
  },
  {
    name: "Flat webhook structure",
    payload: {
      event: "order.status.updated",
      orderId: "portal02_txn_12345",
      reference: "order_ref_123",
      status: "processing",
      recipient: "233241234567",
      volume: 10,
      timestamp: new Date().toISOString(),
    },
  },
  {
    name: "Alternative field names",
    payload: {
      event_type: "order.status_update",
      order_id: "portal02_txn_12345",
      clientReference: "order_ref_123",
      status: "failed",
      recipient: "233241234567",
      volume: 10,
      timestamp: new Date().toISOString(),
    },
  },
];

async function testWebhook(testCase) {
  console.log(`\n📨 Testing: ${testCase.name}`);
  console.log("Payload:", JSON.stringify(testCase.payload, null, 2));

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testCase.payload),
    });

    const result = await response.json();
    console.log(`✅ Response (${response.status}):`, result);
    return { success: true, status: response.status, result };
  } catch (err) {
    console.error(`❌ Error:`, err.message);
    return { success: false, error: err.message };
  }
}

async function runTests() {
  console.log(`\n🔍 Webhook Implementation Verification`);
  console.log(`Webhook URL: ${webhookUrl}`);
  console.log(`============================================`);

  for (const testCase of testPayloads) {
    await testWebhook(testCase);
  }

  console.log(`\n\n📋 DIAGNOSTIC CHECKLIST:`);
  console.log(`1. ✓ Webhook URL is being called`);
  console.log(`2. ? Order lookup is finding orders with vendorOrderId`);
  console.log(`3. ? Fallback lookup methods are being tried`);
  console.log(`4. ? Order status is being updated in database`);
  console.log(`5. ? Multiple lookup strategies are implemented`);
  
  console.log(`\n📊 Check logs to verify:`);
  console.log(`   - "Portal-02 webhook received" log entries`);
  console.log(`   - "No local order found" warnings (indicates lookup issue)`);
  console.log(`   - "Order updated:" success logs`);
}

runTests().catch(console.error);
