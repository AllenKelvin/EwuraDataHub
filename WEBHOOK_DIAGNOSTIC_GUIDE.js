#!/usr/bin/env node

/**
 * Portal-02 Webhook Status Update - Diagnostic Guide
 * 
 * Use this guide to verify the webhook implementation is working correctly
 */

// ============================================================================
// STEP 1: VERIFY DATABASE SCHEMA
// ============================================================================

const mongoVerification = `
db.orders.findOne({ vendorOrderId: { $exists: true } }, { projection: { vendorOrderId: 1, vendorReference: 1, vendorStatus: 1, webhookHistory: 1 } })

Expected output should include:
{
  _id: ObjectId(...),
  vendorOrderId: "portal02_txn_...",
  vendorReference: "reference_...",
  vendorStatus: "completed",
  webhookHistory: [
    {
      status: "processing",
      timestamp: ISODate(...),
      rawPayload: { ... }
    },
    {
      status: "completed", 
      timestamp: ISODate(...),
      rawPayload: { ... }
    }
  ]
}
`;

// ============================================================================
// STEP 2: TEST WEBHOOK PAYLOADS
// ============================================================================

const testPayloads = {
  // Format 1: Data wrapper (most likely Portal-02 format)
  "standard-data-wrapper": {
    payload: {
      data: {
        event: "order.status.updated",
        orderId: "portal02_txn_abc123",
        reference: "order_ref_xyz789",
        status: "delivered",
        recipient: "233241234567",
        volume: 10,
        timestamp: new Date().toISOString()
      }
    },
    expectedLookups: [
      "vendorOrderId: portal02_txn_abc123",
      "vendorReference: order_ref_xyz789"
    ]
  },

  // Format 2: Alternative field names
  "alternative-fields": {
    payload: {
      event_type: "order.status_update",
      order_id: "portal02_txn_def456",
      clientReference: "order_ref_uvw012",
      status: "processing",
      recipient: "233241234567",
      volume: 10,
      timestamp: new Date().toISOString()
    },
    expectedLookups: [
      "vendorOrderId: portal02_txn_def456",
      "vendorReference: order_ref_uvw012"
    ]
  },

  // Format 3: Flat structure
  "flat-structure": {
    payload: {
      event: "order.status.updated",
      orderId: "portal02_txn_ghi789",
      reference: "order_ref_rst345",
      status: "failed",
      recipient: "233241234567",
      volume: 10,
      timestamp: new Date().toISOString()
    },
    expectedLookups: [
      "vendorOrderId: portal02_txn_ghi789",
      "vendorReference: order_ref_rst345"
    ]
  }
};

// ============================================================================
// STEP 3: TEST WITH CURL
// ============================================================================

const curlTests = `
# Test 1: Standard webhook
curl -X POST http://localhost:5000/api/vendor/webhook \\
  -H "Content-Type: application/json" \\
  -d '{
    "data": {
      "event": "order.status.updated",
      "orderId": "portal02_txn_test123",
      "reference": "ref_test123",
      "status": "delivered",
      "recipient": "233241234567",
      "volume": 10
    }
  }'

# Test 2: Alternative format
curl -X POST http://localhost:5000/api/vendor/webhook \\
  -H "Content-Type: application/json" \\
  -d '{
    "event_type": "order.status_update",
    "order_id": "portal02_txn_test456",
    "clientReference": "ref_test456",
    "status": "processing"
  }'

# Test 3: Check server logs
tail -f logs/app.log | grep "Portal-02 webhook"
`;

// ============================================================================
// STEP 4: WHAT THE LOGS SHOULD SHOW
// ============================================================================

const expectedLogs = `
✅ SUCCESS SCENARIO:
  [INFO] 🔔 Portal-02 webhook received (raw): { data: { ... } }
  [INFO] [Portal-02 Webhook] Order found using strategy: {"vendorOrderId":"portal02_txn_abc123"}
  [INFO] ✅ [Portal-02 Webhook] Order 5f7e3d8c9b1a2e4f5g6h7i8j completed. Vendor ID: portal02_txn_abc123
  [INFO] [Portal-02 Webhook] Order 5f7e3d8c9b1a2e4f5g6h7i8j updated: pending → completed

❌ FAILURE SCENARIOS:

  1. Order not found:
     [WARN] [Portal-02 Webhook] ⚠️ No local order found for vendor order: portal02_txn_abc123. Reference: order_ref_xyz789. Tried lookups: [...]
     [WARN] [Portal-02 Webhook] Webhook payload for debugging: { ... }
     → ACTION: Check if vendorOrderId matches what was stored in database
     
  2. Invalid payload:
     [WARN] [Portal-02 Webhook] Invalid payload: Unknown event: undefined
     → ACTION: Check payload format matches expected schema
     
  3. Event type not recognized:
     [WARN] [Portal-02 Webhook] Unknown event type: custom.event.type
     → ACTION: Add support for new event type or check Portal-02 documentation
`;

// ============================================================================
// STEP 5: DEBUGGING CHECKLIST
// ============================================================================

const debugChecklist = `
DEBUGGING CHECKLIST:

□ Database Schema
  - Run: db.orders.getCollection().getIndexes()
  - Verify: vendorOrderId and vendorReference are indexed

□ Test Order Creation
  - Create a test order through API
  - Check logs: "✅ [Portal-02] Order created successfully"
  - Verify database: vendorOrderId, vendorReference are populated

□ Test Webhook Reception
  - Send test webhook payload using curl
  - Check logs: "🔔 Portal-02 webhook received"
  - Verify: Response status 200 with {"received": true}

□ Test Order Lookup
  - Check logs: "Order found using strategy:"
  - If not found, check which lookup strategy would work
  - Run manual MongoDB query with that strategy

□ Test Status Update
  - After webhook, check logs: "Order updated: X → Y"
  - Verify database: order.status and webhookHistory changed

□ Multiple Webhook Formats
  - Test with data wrapper format
  - Test with alternative field names (order_id vs orderId)
  - Test with flat structure

□ Edge Cases
  - Multiple webhooks for same order (should add to history)
  - Webhook for non-existent order (should warn but not crash)
  - Missing fields in webhook payload
  - Null/undefined values
`;

// ============================================================================
// STEP 6: MANUAL DATABASE CHECKS
// ============================================================================

const databaseChecks = `
# Find orders with vendor information
db.orders.find(
  { vendorOrderId: { $exists: true } },
  { vendorOrderId: 1, vendorReference: 1, status: 1, vendorStatus: 1, webhookHistory: 1 }
).pretty()

# Count orders with webhook history
db.orders.find( { webhookHistory: { $exists: true, $ne: [] } } ).count()

# Find orders where lookup might fail
db.orders.find(
  { vendorOrderId: { $exists: true }, vendorReference: { $exists: false } }
).count()
# Should be 0 after fix is applied

# Check for completed orders (status should be updated by webhook)
db.orders.find(
  { vendorStatus: "completed", status: "completed" }
).count()
`;

// ============================================================================
// EXPORT DIAGNOSTICS
// ============================================================================

console.log("📋 PORTAL-02 WEBHOOK VERIFICATION GUIDE");
console.log("==========================================\n");

console.log("1️⃣  DATABASE SCHEMA VERIFICATION:");
console.log(mongoVerification);
console.log("\n");

console.log("2️⃣  TEST PAYLOADS:");
Object.entries(testPayloads).forEach(([name, test]) => {
  console.log(`\n${name}:`);
  console.log(JSON.stringify(test.payload, null, 2));
});
console.log("\n");

console.log("3️⃣  CURL TESTS:");
console.log(curlTests);
console.log("\n");

console.log("4️⃣  EXPECTED LOGS:");
console.log(expectedLogs);
console.log("\n");

console.log("5️⃣  DEBUGGING CHECKLIST:");
console.log(debugChecklist);
console.log("\n");

console.log("6️⃣  DATABASE QUERIES:");
console.log(databaseChecks);
console.log("\n");

console.log("📞 KEY CONTACT POINTS:");
console.log(`
- Webhook Endpoint: POST /api/vendor/webhook (no auth required)
- Service: portal02Service.processWebhookPayload()
- Handler: routes/vendor.ts (line 158)
- Model: models/Order.ts
`);
