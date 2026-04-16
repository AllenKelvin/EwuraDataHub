# Vendor API Integration - Debugging Guide

**Date:** April 16, 2026  
**Purpose:** Help diagnose why orders aren't reaching the AllenDataHub vendor API

---

## Quick Status Check

### Your Order Example
```
Order ID: 69e134f0023190b4b4aa678f
Status: processing
Phone: 0592786175 ✅ (correct 10-digit format)
Vendor Product ID: master_beneficiary_data_bundle ✅ (present)
Vendor Order ID: ❌ MISSING (means vendor API call failed)
```

### The Problem
Order created in **your database** but **NOT created with vendor** = vendor API call is failing.

---

## Configuration Checklist

### 1. Verify Environment Variables

```bash
# Check if these are set in your production environment:
echo $VENDOR_API_KEY
echo $VENDOR_API_URL
```

**Expected Output:**
```
adh_<your_actual_key>
https://api.allendatahub.com
```

**If you see:**
- `$ ` or blank = NOT SET ❌
- Anything else = check if correct format ✅

### 2. Verify API Key Format

```
✅ Correct:   adh_abc123xyz789...
❌ Wrong:     abc123xyz789...    (missing "adh_" prefix)
❌ Wrong:     "adh_abc123xyz789" (has quotes)
❌ Wrong:     adh_abc123 xyz789  (has spaces)
```

---

## Testing Steps

### Step 1: Test Environment Variables in Code

Create a test file:
```bash
cat > /tmp/test-env.js << 'EOF'
console.log("🔧 ENVIRONMENT VARIABLE CHECK");
console.log("================================");
console.log("VENDOR_API_KEY:", process.env.VENDOR_API_KEY ? `✅ SET (${process.env.VENDOR_API_KEY.slice(0,8)}...)` : "❌ NOT SET");
console.log("VENDOR_API_URL:", process.env.VENDOR_API_URL || "❌ NOT SET");
console.log("NODE_ENV:", process.env.NODE_ENV || "development");
EOF

node /tmp/test-env.js
```

### Step 2: Test Phone Number Formatting

Your formatted phone numbers should always be 10 digits starting with 0:

```javascript
// Good examples:
"0592786175"  // From your order ✅
"0541234567"  // Standard format ✅

// Bad examples:
"592786175"   // Missing leading 0 ❌
"+233592786175" // International without transformation ❌
"233592786175"  // International without transformation ❌
```

### Step 3: Manual API Test

Test the vendor API directly:

```bash
# Replace with your actual API key
API_KEY="adh_<your_key_here>"
BASE_URL="https://api.allendatahub.com"
PRODUCT_ID="507f1f77bcf86cd799439011"  # Use a real product ID
PHONE="0592786175"

echo "Testing Vendor API..."
curl -X POST "${BASE_URL}/api/v1/orders" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"${PRODUCT_ID}\",
    \"phoneNumber\": \"${PHONE}\"
  }"
```

**Expected Success Response:**
```json
{
  "order": {
    "id": "vendor_order_id_here",
    "status": "pending",
    "phoneNumber": "0592786175",
    "price": 2.50,
    "createdAt": "2026-04-16T19:13:52.022Z"
  }
}
```

**Expected Error Responses:**

```json
{
  "message": "Invalid API key"
}
```
→ API key is wrong or not active

```json
{
  "message": "API access denied"
}
```
→ Account not verified in AllenDataHub

```json
{
  "error": "INVALID_PHONE_NUMBER",
  "message": "Invalid phone format..."
}
```
→ Phone number format issue (but shouldn't happen after normalization)

---

## Logs to Check

### Server Logs

When you create an order, you should see logs like:

```
📤 [req_1234567890_abc123] VENDOR API REQUEST
   Method:   POST
   URL:      https://api.allendatahub.com/api/v1/orders
   Headers:  X-API-Key: adh_abc123...
   Body:     {"productId":"507f...","phoneNumber":"0592786175"}

📞 PHONE NUMBER NORMALIZATION
   Input:        0592786175
   Normalized:   0592786175
   Valid:        ✅

🛒 CREATING VENDOR ORDER
   Product ID:   507f...
   Phone:        0592786175
   Payload:      {"productId":"507f...","phoneNumber":"0592786175"}

✅ [req_1234567890_abc123] VENDOR API SUCCESS
   Duration: 245ms
   Status:   201
   Response: {...}
   
   OR

❌ [req_1234567890_abc123] VENDOR API ERROR (401)
   Duration: 125ms
   Status:   401 Unauthorized
   Error:    Invalid API key
   Details:  {...}
```

**If you DON'T see these logs:**
- Vendor API call is not being made
- Check if vendorClient is null
- Check if order creation is using correct code path

### Database Logs

Check the order in database:

```javascript
// MongoDB query
db.orders.findOne({_id: ObjectId("69e134f0023190b4b4aa678f")})
```

**Check for:**
- `vendorOrderId`: ❌ If empty/undefined = vendor call failed
- `vendorProductId`: ✅ Should have `master_beneficiary_data_bundle`
- `status`: Should be `"processing"` if vendor succeeded
- `paymentMethod`: Should be `"wallet"`

---

## Common Issues & Solutions

### Issue 1: "VENDOR_API_KEY environment variable is not set"

**Symptom:**
```
❌ VENDOR_API_KEY environment variable is not set!
   Please set: VENDOR_API_KEY=adh_<your_key>
```

**Solution:**
1. Add to `.env` file:
   ```
   VENDOR_API_KEY=adh_<your_actual_key>
   VENDOR_API_URL=https://api.allendatahub.com
   ```

2. OR set when starting server:
   ```bash
   VENDOR_API_KEY=adh_<your_key> npm start
   ```

3. OR in production environment (Render/Vercel/etc):
   - Go to deployment dashboard
   - Add environment variable
   - Restart server

---

### Issue 2: "Invalid API key" (401)

**Symptom:**
```
{"message":"Invalid API key"}
```

**Checklist:**
- [ ] API key starts with `adh_`?
- [ ] No extra spaces or quotes?
- [ ] Key hasn't been revoked?
- [ ] Copy-paste correctly (no typos)?
- [ ] Created a new key from vendor dashboard?

**Test Command:**
```bash
curl -X GET "https://api.allendatahub.com/api/v1/products" \
  -H "X-API-Key: adh_<your_key>"
```

If this fails with 401, your key is wrong.

---

### Issue 3: "API access denied" (403)

**Symptom:**
```
{"message":"API access denied"}
```

**Checklist:**
- [ ] Account is verified in AllenDataHub dashboard?
- [ ] Requested API access?
- [ ] Got approval email?
- [ ] API access is active (not revoked)?

**Contact Vendor:** vendor@allendatahub.com with your account email

---

### Issue 4: Orders created but NO vendorOrderId

**Symptom:**
Same as your order - order in DB but no vendor ID

**Debugging Steps:**

1. **Check vendor client initialization:**
   ```javascript
   // Add this to orders.ts around line 12
   console.log("Vendor client status:", vendorClient ? "✅ INITIALIZED" : "❌ NULL");
   ```

2. **Check if vendor call is being made:**
   ```javascript
   if (vendorClient && vendorProductId) {
     console.log("🎯 Making vendor API call...");
   } else {
     console.log("⚠️ Skipping vendor call. Client:", vendorClient ? "yes" : "no", "ProductId:", vendorProductId);
   }
   ```

3. **Check error logs:**
   - Look for `Vendor API call failed` in logs
   - Extract the requestId from logs
   - Send logs + requestId to vendor support

---

## Data Validation

### Phone Number

Your order has: `0592786175`

**Validation:**
```
Length: 10 ✅
Starts with 0: ✅
All digits: ✅
Format: 0XXXXXXXXX ✅
Status: VALID ✅
```

### Vendor Product ID

Your order has: `master_beneficiary_data_bundle`

**Validation:**
```
Empty: ❌ (it has value)
Type: string ✅
Format: looks like vendor ID ✅
Status: VALID ✅
```

---

## What Happens at Each Step

### Correct Flow:

```
1. User creates order
   ↓
2. Phone formatted: "0592786175" (valid)
   ↓
3. Vendor API called:
   POST https://api.allendatahub.com/api/v1/orders
   {productId: "...", phoneNumber: "0592786175"}
   ↓
4. ✅ Success: Get vendorOrderId
   Update order: status = "processing", vendorOrderId = "xxx"
   ↓
5. Customer sees order as "Processing"
```

### Your Current Flow:

```
1. User creates order
   ↓
2. Phone formatted: "0592786175" (valid)
   ↓
3. Vendor API called BUT FAILS
   (Error: API key?, Account not verified?, Network error?)
   ↓
4. ❌ Catch block: Log error, continue anyway
   Update order: status = "processing", vendorOrderId = undefined
   ↓
5. Customer sees order as "Processing" but vendor never received it
   ↓
6. Order stays "processing" forever (never completes)
```

---

## Next Steps

### If Logs Look Good:
- Vendor API is being called correctly
- Phone numbers are formatted correctly
- Vendor is returning an error
- **Action:** Share vendor error message with vendor support

### If Logs Show No API Call:
- vendorClient is null or vendor call is skipped
- **Action:** Check env variables, restart server, check logs again

### If Logs Show Network Error:
- Vendor API is unreachable
- **Action:** Test with curl command above, check firewall/proxy

---

## Support Info

When contacting vendor support, provide:

1. **Your Account:** (from AllenDataHub dashboard)
2. **API Key:** adh_<first8chars>...<last4chars> (don't share full key)
3. **A test order requestId:** from logs like `[req_1234567890_abc123]`
4. **Full error message:** from logs
5. **Timestamp:** when order was created
6. **Phone number used:** (for vendor to check)

---

## Files That Handle Vendor API

Main files to check:

- [backend/api-server/src/routes/orders.ts](../backend/api-server/src/routes/orders.ts#L87) - Creates orders with wallet payment
- [backend/api-server/src/routes/payments.ts](../backend/api-server/src/routes/payments.ts#L96) - Creates orders after Paystack payment
- [backend/api-server/src/lib/vendor-api.ts](../backend/api-server/src/lib/vendor-api.ts) - Vendor API client
- [backend/api-server/src/lib/vendor-debug.ts](../backend/api-server/src/lib/vendor-debug.ts) - Debug utilities

---

## Quick Test Code

Add this to `backend/api-server/src/routes/orders.ts` for debugging:

```typescript
// At the top of router.post("/", ...)
console.log(`
┌─ NEW ORDER REQUEST ─────────────────────────────────────────
│ Time: ${new Date().toISOString()}
│ User: ${user.username} (${user.role})
│ Product: ${productId}
│ Phone: ${recipientPhone}
│ Vendor Client: ${vendorClient ? "✅ READY" : "❌ NOT READY"}
└─────────────────────────────────────────────────────────────
`);
```

---

**Last Updated:** April 16, 2026  
**Status:** Active - Use this guide to debug vendor API issues

