# Vendor Status (Portal-02) Update Fix

## Problem
Vendor status was not updating because the code was trying to use a non-existent `vendorClient` and the webhook URL was misconfigured.

## Issues Found & Fixed

### 1. **Broken vendorClient Reference**
- **Files Affected**: 
  - `backend/api-server/src/routes/vendor.ts` (line 119)
  - `backend/api-server/src/routes/orders.ts` (sync endpoint)
- **Problem**: Code was calling `vendorClient.getOrderDetails()` which doesn't exist
- **Fix**: 
  - Removed `vendorClient` references
  - Updated `GET /api/vendor/orders/:vendorOrderId` to query database instead
  - Updated `POST /api/orders/:id/sync` to just return current status

### 2. **Incorrect Webhook URL**
- **File**: `backend/api-server/src/lib/portal02.ts`
- **Problem**: 
  - Webhook URL was set to `/api/webhooks/portal02` 
  - Actual endpoint was at `/api/vendor/webhook`
  - This meant Portal-02 was sending updates to the wrong endpoint
- **Fix**: Updated webhook URL to `/api/vendor/webhook`

### 3. **Webhook Payload Processing**
- **File**: `backend/api-server/src/routes/vendor.ts`
- **Problem**: Webhook handler expected flat payload structure but Portal-02 might send nested data
- **Fix**: Now uses `portal02Service.processWebhookPayload()` to properly parse and validate Portal-02 webhook payloads

## How Vendor Status Updates Work

### Correct Flow
```
1. User places order with Paystack/Wallet payment
   ↓
2. Portal-02 receives order with webhook URL: {BACKEND_URL}/api/vendor/webhook
   ↓
3. Portal-02 processes data bundle and updates status
   ↓
4. Portal-02 sends webhook to: POST /api/vendor/webhook
   ↓
5. Webhook handler processes payload using portal02Service.processWebhookPayload()
   ↓
6. Order vendorStatus is updated in database (pending → processing → completed/failed)
   ↓
7. Order status is synced accordingly (processing/completed/failed)
```

### Status Mapping
| Portal-02 Status | Order Status | Order Vendor Status |
|------------------|--------------|-------------------|
| pending | processing | pending |
| processing | processing | processing |
| delivered | completed | delivered |
| completed | completed | completed |
| failed | failed | failed |
| cancelled | failed | cancelled |
| refunded | failed | refunded |

## Files Changed
1. `backend/api-server/src/lib/portal02.ts`
   - Fixed webhook URL from `/api/webhooks/portal02` to `/api/vendor/webhook`

2. `backend/api-server/src/routes/vendor.ts`
   - Fixed `GET /api/vendor/orders/:vendorOrderId` to query database
   - Fixed webhook handler to use `portal02Service.processWebhookPayload()`

3. `backend/api-server/src/routes/orders.ts`
   - Fixed `POST /api/orders/:id/sync` endpoint to just return current status

## Endpoints Reference

### Query Vendor Order
```
GET /api/vendor/orders/:vendorOrderId
```
Returns order with current vendor status from database.

### Webhook (Portal-02 → Backend)
```
POST /api/vendor/webhook
```
Public endpoint for Portal-02 to send status updates. No authentication required.

## Testing Portal-02 Webhook

### Manual Test
```bash
curl -X POST http://localhost:5000/api/vendor/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "event": "order.status.updated",
      "orderId": "portal02_txn_123",
      "status": "delivered"
    }
  }'
```

### Expected Response
```json
{ "received": true }
```

## Next Steps
1. Verify Portal-02 webhook is being called when orders are processed
2. Monitor logs for webhook receipt and order updates
3. Check database for updated `vendorStatus` field on orders
