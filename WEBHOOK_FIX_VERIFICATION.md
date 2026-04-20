/**
 * Webhook Implementation Verification Summary
 * 
 * ISSUES FIXED:
 * 1. ✅ Limited Order Lookup - Now uses multiple fallback strategies
 * 2. ✅ Missing Reference Storage - Added vendorReference field to Order model
 * 3. ✅ No Webhook History - Added webhookHistory array to track all updates
 * 4. ✅ Status Mapping Improved - Properly maps all Portal-02 statuses
 */

// ============================================================================
// MULTI-STRATEGY ORDER LOOKUP
// ============================================================================

// The webhook handler now tries these lookup strategies in order:
const lookupStrategies = [
  { vendorOrderId: orderId },                    // Primary: by vendor order ID
  { vendorReference: reference },               // Secondary: by vendor reference
  { paymentReference: reference },              // Tertiary: by payment reference
  { vendorOrderId: reference },                 // Fallback: reference might be orderId
];

/*
Flow:
1. Portal-02 sends webhook with orderId and reference
2. processWebhookPayload() extracts both from various possible fields
3. Webhook handler tries strategies in sequence until order is found
4. All webhook details are logged in webhookHistory array
5. Order status is updated and saved
*/

// ============================================================================
// FIELD CHANGES IN ORDER MODEL
// ============================================================================

// ADDED:
// - vendorReference: { type: String, index: true }
//   └─ Stores Portal-02 reference for webhook lookups
//
// - webhookHistory: Array of webhook updates
//   └─ Tracks every webhook received with timestamp and raw payload
//   └─ Format: { status, timestamp, rawPayload }

// ============================================================================
// UPDATED WEBHOOK HANDLER LOGIC
// ============================================================================

// Before: Single lookup by vendorOrderId only
// After: Multi-strategy lookup with fallbacks

// Status Mapping:
// "delivered" OR "resolved"              → "completed"
// "failed" OR "cancelled" OR "refunded"  → "failed"  
// "processing"                           → "processing"
// "pending"                              → "processing" (mapped for better UX)

// ============================================================================
// PLACES WHERE VENDORORDERID IS STORED
// ============================================================================

// 1. routes/vendor.ts (Direct Portal-02 purchase)
//    - Sets: vendorOrderId, vendorReference
//
// 2. routes/payments.ts (Paystack webhook → Portal-02 purchase)
//    - Sets: vendorOrderId, vendorReference
//
// 3. routes/paystack.ts (Paystack webhook)
//    - Sets: vendorOrderId, vendorReference
//
// 4. routes/orders.ts (Wallet payment → Portal-02 purchase)
//    - Sets: vendorOrderId, vendorReference

// ============================================================================
// HOW TO VERIFY THE FIX
// ============================================================================

console.log(`
🔍 VERIFICATION CHECKLIST:

1. DATABASE MIGRATION REQUIRED:
   - The Order model schema changed (added vendorReference and webhookHistory)
   - Existing orders will not have these fields populated
   - Next webhook for an order will add the fields

2. TEST WEBHOOK WITH MULTIPLE FORMATS:
   
   // Standard format (data wrapper)
   POST /api/vendor/webhook
   {
     "data": {
       "event": "order.status.updated",
       "orderId": "portal02_txn_12345",
       "reference": "order_ref_123",
       "status": "delivered"
     }
   }
   
   // Alternative format (flat)
   POST /api/vendor/webhook
   {
     "event": "order.status.updated",
     "order_id": "portal02_txn_12345",
     "clientReference": "order_ref_123",
     "status": "processing"
   }

3. CHECK LOGS FOR:
   ✓ "Portal-02 webhook received (raw)" - Webhook is being received
   ✓ "Order found using strategy:" - Lookup succeeded (check which strategy)
   ✓ "Order updated: pending → completed" - Status change applied
   ✓ "No local order found" - If order not found (debug info provided)

4. DATABASE QUERIES:
   // Find order with webhookHistory
   db.orders.findOne({ vendorOrderId: "portal02_txn_123" })
   // Result should show: webhookHistory array with all updates
   
   // Check if vendorReference is populated
   db.orders.find({ vendorReference: { $exists: true, $ne: null } }).count()

5. TEST EDGE CASES:
   - Webhook arrives before order is found in DB (might retry)
   - Multiple webhooks for same order (should append to history)
   - Different webhook payload formats from Portal-02
   - Missing fields in webhook payload
`);
