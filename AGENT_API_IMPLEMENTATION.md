# Agent API v2.0 - Implementation Guide

This guide explains the new Agent API v2.0 implementation.

---

## Overview

The Agent API v2.0 is a simplified REST API for partner integrations. It provides endpoints for creating orders, checking balance, and listing products.

**Base URL:** `http://localhost:3000/agent-api` (development)

---

## Environment Variables

Add these to your `.env` file:

```
# Agent API Configuration
AGENT_API_KEY=test_key_12345
TEST_AGENT_ID=test_agent_id

# Vendor API Integration
VENDOR_API_KEY=adh_your_vendor_key
VENDOR_API_URL=https://api.allendatahub.com
```

---

## Endpoints

### 1. Health Check (Public - No Auth)
```
GET /agent-api/health
```

**Response:**
```json
{
  "success": true,
  "service": "AllenDataHub Agent API",
  "version": "2.0.0",
  "status": "ok",
  "timestamp": "2026-04-16T12:00:00.000Z"
}
```

---

### 2. Get Products
```
GET /agent-api/products
Header: X-API-Key: your_api_key
```

**Response:**
```json
{
  "success": true,
  "products": [
    {
      "id": "507f1f77bcf86cd799439011",
      "productId": "507f1f77bcf86cd799439011",
      "name": "MTN 1GB",
      "network": "MTN",
      "dataAmount": "1",
      "price": 2.50,
      "description": "1GB valid for 30 days"
    }
  ],
  "requestId": "req_1626023045123_abc"
}
```

---

### 3. Create Order
```
POST /agent-api/orders/create
Header: X-API-Key: your_api_key
Content-Type: application/json

Body:
{
  "productId": "507f1f77bcf86cd799439011",
  "phoneNumber": "0541234567",
  "quantity": 1
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "order": {
    "id": "65a4c2e8f123456789abcdef",
    "orderId": "65a4c2e8f123456789abcdef",
    "status": "pending",
    "phoneNumber": "0541234567",
    "product": {
      "name": "MTN 1GB",
      "network": "MTN",
      "dataAmount": "1",
      "price": 2.50
    },
    "quantity": 1,
    "totalPrice": 2.50,
    "vendorOrderId": "txn_abc123",
    "createdAt": "2026-04-16T12:00:00.000Z"
  },
  "requestId": "req_1626023045123_abc"
}
```

**Error Response (400 - Insufficient Balance):**
```json
{
  "success": false,
  "error": "INSUFFICIENT_BALANCE",
  "message": "Not enough wallet balance",
  "required": 2.50,
  "available": 1.00,
  "shortfall": 1.50,
  "help": "Topup your wallet or reduce quantity"
}
```

---

### 4. Get Order Details
```
GET /agent-api/orders/:orderId
Header: X-API-Key: your_api_key
```

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "65a4c2e8f123456789abcdef",
    "orderId": "65a4c2e8f123456789abcdef",
    "status": "pending",
    "phoneNumber": "0541234567",
    "product": {
      "name": "MTN 1GB",
      "network": "MTN",
      "dataAmount": "1"
    },
    "price": 2.50,
    "vendorOrderId": "txn_abc123",
    "createdAt": "2026-04-16T12:00:00.000Z",
    "updatedAt": "2026-04-16T12:00:00.000Z"
  },
  "requestId": "req_1626023045123_abc"
}
```

---

### 5. List Orders
```
GET /agent-api/orders?page=1&limit=20
Header: X-API-Key: your_api_key
```

**Query Parameters:**
- `page` (optional): Page number, default 1
- `limit` (optional): Items per page, default 20, max 50

**Response:**
```json
{
  "success": true,
  "orders": [
    {
      "id": "65a4c2e8f123456789abcdef",
      "orderId": "65a4c2e8f123456789abcdef",
      "status": "completed",
      "phone": "0541234567",
      "product": "MTN 1GB",
      "price": 2.50,
      "vendorOrderId": "txn_abc123",
      "createdAt": "2026-04-16T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "pages": 3
  },
  "requestId": "req_1626023045123_abc"
}
```

---

### 6. Get Account Balance
```
GET /agent-api/account/balance
Header: X-API-Key: your_api_key
```

**Response:**
```json
{
  "success": true,
  "account": {
    "userId": "69de8c394879b8da8020171d",
    "balance": 50.00,
    "currency": "GHS"
  },
  "requestId": "req_1626023045123_abc"
}
```

---

## Testing

### Run Test Suite

```bash
# Start the server first
npm run dev

# In another terminal, run tests
node test-agent-api.js
```

**Expected Output:**
```
✅ Health Check (No Auth)
✅ Missing API Key - Should Return 401
✅ Invalid API Key - Should Return 401
✅ Get Products
✅ Get Account Balance
...
```

### Manual Testing with cURL

**Health Check:**
```bash
curl http://localhost:3000/agent-api/health
```

**Get Products:**
```bash
curl -H "X-API-Key: test_key_12345" \
  http://localhost:3000/agent-api/products
```

**Create Order:**
```bash
curl -X POST http://localhost:3000/agent-api/orders/create \
  -H "X-API-Key: test_key_12345" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "PRODUCT_ID_HERE",
    "phoneNumber": "0541234567",
    "quantity": 1
  }'
```

---

## Phone Number Formats

All these formats are automatically normalized to `0XXXXXXXXX`:

✅ `0541234567` (local, 10 digits)  
✅ `541234567` (without prefix, 9 digits)  
✅ `+233541234567` (international with +)  
✅ `233541234567` (international without +)  
✅ `0541 234 567` (with spaces)  
✅ `0541-234-567` (with dashes)

---

## Error Codes

| Code | HTTP | Meaning | Solution |
|------|------|---------|----------|
| `MISSING_API_KEY` | 401 | Missing header | Add `X-API-Key: your_key` |
| `INVALID_API_KEY` | 401 | Wrong API key | Check your key is correct |
| `INVALID_PHONE` | 400 | Phone format error | Use format like `0541234567` |
| `INVALID_PRODUCT_ID` | 400 | Product ID format | Get from `/products` endpoint |
| `PRODUCT_NOT_FOUND` | 404 | Product doesn't exist | Check product ID |
| `INSUFFICIENT_BALANCE` | 400 | Not enough balance | Topup wallet |
| `ORDER_NOT_FOUND` | 404 | Order doesn't exist | Check order ID |
| `SERVER_ERROR` | 500 | Server error | Retry or contact support |

---

## Response Format

### Success Response (2xx)

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message",
  "requestId": "req_1626023045123_abc"
}
```

### Error Response (4xx, 5xx)

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable message",
  "requestId": "req_1626023045123_abc",
  "additional_field": "Optional field for extra context"
}
```

Every response includes:
- `X-Request-ID` header - Unique ID for tracking
- `requestId` field in body - Same as header

Use these IDs for debugging and support tickets.

---

## Implementation Details

### Files Modified/Created

1. **`src/routes/agent-api.ts`** - New route handlers
2. **`src/app.ts`** - Mount agent-api routes
3. **`test-agent-api.js`** - Test suite

### Key Features

✅ API Key authentication  
✅ Phone number auto-normalization  
✅ Request ID tracking  
✅ Structured error responses  
✅ Pagination support  
✅ Vendor API integration  
✅ Balance checking  
✅ Wallet deduction  

---

## Integration Example

```typescript
import fetch from "node-fetch";

const apiKey = "test_key_12345";
const baseUrl = "http://localhost:3000";

async function createOrder(productId: string, phone: string) {
  const response = await fetch(`${baseUrl}/agent-api/orders/create`, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      productId,
      phoneNumber: phone,
      quantity: 1,
    }),
  });

  const data = await response.json();

  if (data.success) {
    console.log("✅ Order created:", data.order.id);
    console.log("   Vendor Order ID:", data.order.vendorOrderId);
  } else {
    console.error("❌ Order failed:", data.error, data.message);
  }

  return data;
}

// Usage
createOrder("507f1f77bcf86cd799439011", "0541234567");
```

---

## Troubleshooting

### API Not Responding

1. Check server is running: `npm run dev`
2. Check API_KEY is set correctly
3. Check MongoDB is connected

### Orders Not Creating

1. Check balance: `GET /agent-api/account/balance`
2. Check phone format - should be 10 digits
3. Check product ID exists - run `GET /agent-api/products`
4. Check logs for vendor API errors

### Vendor Integration Issues

See [VENDOR_DEBUG_GUIDE.md](../VENDOR_DEBUG_GUIDE.md) for troubleshooting.

---

## Next Steps

1. ✅ API implementation complete
2. ✅ Tests passing - validate with `node test-agent-api.js`
3. ⏭️ Deploy to production
4. ⏭️ Notify partners to start integrating
5. ⏭️ Monitor vendor integration success

---

**Version:** 2.0.0  
**Status:** ✅ Production Ready  
**Last Updated:** April 16, 2026
