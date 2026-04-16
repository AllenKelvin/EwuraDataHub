# Agent API v2.0 - Quick Start Testing Guide

## ⚡ Start the Server

```bash
cd backend/api-server
npm run dev
```

Wait for: `🚀 Server running on http://localhost:3000`

---

## 🧪 Run Tests

```bash
# In a NEW terminal window
node test-agent-api.js
```

**Expected Output:**
```
🚀 Agent API v2.0 - Test Suite

API Base: http://localhost:3000
API Key: test_...5

✅ Health Check (No Auth)
✅ Missing API Key - Should Return 401
✅ Invalid API Key - Should Return 401
✅ Get Products
✅ Get Account Balance
✅ Invalid Phone Number - Should Return 400
...

📊 TEST RESULTS
============================================================

Total: 13/13 tests passed (100%)
```

---

## 🔧 Manual Testing with cURL

### 1. Health Check (No Auth)
```bash
curl http://localhost:3000/agent-api/health | jq
```

Response:
```json
{
  "success": true,
  "service": "AllenDataHub Agent API",
  "version": "2.0.0",
  "status": "ok"
}
```

---

### 2. Get Products
```bash
curl -H "X-API-Key: test_key_12345" \
  http://localhost:3000/agent-api/products | jq
```

Response:
```json
{
  "success": true,
  "products": [
    {
      "id": "507f...",
      "name": "MTN 1GB",
      "network": "MTN",
      "dataAmount": "1",
      "price": 2.50
    }
  ],
  "requestId": "req_1626023045_abc"
}
```

**Copy an `id` value for next steps**

---

### 3. Check Balance
```bash
curl -H "X-API-Key: test_key_12345" \
  http://localhost:3000/agent-api/account/balance | jq
```

Response:
```json
{
  "success": true,
  "account": {
    "userId": "test_agent_id",
    "balance": 1000.00,
    "currency": "GHS"
  }
}
```

---

### 4. Create an Order

```bash
# Save product ID from step 2
PRODUCT_ID="507f1f77bcf86cd799439011"

curl -X POST http://localhost:3000/agent-api/orders/create \
  -H "X-API-Key: test_key_12345" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "'$PRODUCT_ID'",
    "phoneNumber": "0541234567",
    "quantity": 1
  }' | jq
```

Response (201):
```json
{
  "success": true,
  "message": "Order created successfully",
  "order": {
    "id": "65a4c2e8f123...",
    "orderId": "65a4c2e8f123...",
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
  "requestId": "req_1626023045_abc"
}
```

**Copy the `orderId` for next step**

---

### 5. Get Order Details

```bash
ORDER_ID="65a4c2e8f123456789abcdef"

curl -H "X-API-Key: test_key_12345" \
  http://localhost:3000/agent-api/orders/$ORDER_ID | jq
```

Response:
```json
{
  "success": true,
  "order": {
    "id": "65a4c2e8f123...",
    "orderId": "65a4c2e8f123...",
    "status": "pending",
    "phoneNumber": "0541234567",
    "product": {
      "name": "MTN 1GB",
      "network": "MTN"
    },
    "price": 2.50,
    "createdAt": "2026-04-16T12:00:00.000Z",
    "updatedAt": "2026-04-16T12:00:00.000Z"
  }
}
```

---

### 6. List Orders

```bash
curl -H "X-API-Key: test_key_12345" \
  "http://localhost:3000/agent-api/orders?page=1&limit=10" | jq
```

Response:
```json
{
  "success": true,
  "orders": [
    {
      "id": "65a4c2e8f123...",
      "status": "pending",
      "phone": "0541234567",
      "product": "MTN 1GB",
      "price": 2.50
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

---

## ✅ Validation Checklist

After running tests, verify:

- [x] Health check returns 200 ✅
- [x] API requires X-API-Key header ✅
- [x] Invalid API key returns 401 ✅
- [x] GET /products returns list with prices ✅
- [x] GET /account/balance returns wallet balance ✅
- [x] POST /orders/create returns 201 with order ID ✅
- [x] Phone numbers normalized automatically ✅
- [x] Wallet balance deducted after order ✅
- [x] GET /orders/:id returns order details ✅
- [x] GET /orders lists all orders ✅
- [x] Error responses have helpful messages ✅
- [x] Every response has requestId for tracking ✅

---

## 🐛 Troubleshooting

### Server won't start

```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill if needed
kill -9 <PID>

# Try again
npm run dev
```

### Tests fail with "API Base"

Make sure server is running in another terminal:
```bash
npm run dev
```

### Database connection issues

Check:
1. MongoDB is running locally or connection string is valid
2. `.env` has `MONGODB_URI` set (if needed)
3. Check `VENDOR_API_KEY` is set for vendor integration

### Tests fail with insufficient balance

This is expected! The test wallet balance is limited. To fix:

Edit `.env`:
```
TEST_AGENT_ID=test_agent_id
```

Or modify test data in database.

---

## 📊 API Performance

Expected response times:
- GET /health → ~5ms
- GET /products → ~30ms
- POST /orders/create → ~150ms (includes vendor API)
- GET /orders → ~50ms
- GET /account/balance → ~30ms

---

## 🚀 Next Steps

1. ✅ API is running locally
2. ✅ Tests are passing
3. ✅ API is working correctly
4. ⏭️ Configure for production
5. ⏭️ Set real API keys
6. ⏭️ Deploy to production
7. ⏭️ Share with partners

---

## 📚 Full Documentation

See [AGENT_API_IMPLEMENTATION.md](./AGENT_API_IMPLEMENTATION.md) for complete API reference.

---

## 🆘 Support

Having issues? Check:

1. [AGENT_API_IMPLEMENTATION.md](./AGENT_API_IMPLEMENTATION.md) - Full reference
2. [VENDOR_DEBUG_GUIDE.md](./VENDOR_DEBUG_GUIDE.md) - Vendor integration issues
3. Server logs: Check for errors in terminal where `npm run dev` is running
4. Test output: Run `node test-agent-api.js` - shows which tests fail

---

**Ready to test?** Run the test suite:
```bash
node test-agent-api.js
```

If all tests pass ✅, the API is working perfectly!
