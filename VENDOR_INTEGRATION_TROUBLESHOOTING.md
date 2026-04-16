# AllenDataHub Vendor API Integration - Troubleshooting Report

**Date:** April 16, 2026  
**Issue:** Orders not being sent to vendor API successfully  
**Status:** Investigating - Request for vendor assistance

---

## Summary

We have implemented the Ewura Hub Wallet system with AllenDataHub vendor API integration. Orders are being created in our system, but they are **not reaching the vendor API** or are failing silently.

We have already implemented **phone number formatting fixes** (converting to 10-digit format `0XXXXXXXXX`), but orders are still not being processed.

---

## Implementation Details

### API Configuration

- **Vendor API Base URL:** `https://api.allendatahub.com`
- **Authentication:** `X-API-Key` header with API key
- **API Key Format:** `adh_<key>`
- **Phone Number Format:** Must be exactly 10 digits (`0XXXXXXXXX`)

### Endpoints Being Called

1. **POST /api/v1/orders** - Create new order
   ```json
   {
     "productId": "<12-digit MongoDB ID>",
     "phoneNumber": "0541234567"
   }
   ```

2. **GET /api/v1/products** - Fetch available products
3. **GET /api/v1/orders** - List orders
4. **GET /api/v1/orders/:orderId** - Get order details

---

## Current Implementation Status

### ✅ Fixes Already Implemented

1. **Phone Number Formatting** - All phone numbers are now formatted to 10 digits before sending:
   ```typescript
   // Converts: "0541234567" → "0541234567" ✅
   // Converts: "+233541234567" → "0541234567" ✅
   // Converts: "541234567" → "0541234567" ✅
   ```

2. **Order Creation Points** - Fixed in all 4 locations:
   - Wallet payment orders (`orders.ts`, line 87)
   - Direct vendor API calls (`vendor.ts`, line 68)
   - Paystack payment confirmation (`payments.ts`, line 96)
   - Paystack webhook callback (`payments.ts`, line 178)

### 📋 Order Flow

```
User Creates Order
    ↓
System validates phone & product
    ↓
Phone formatted to 10 digits: 0XXXXXXXXX
    ↓
Orders → Vendor API (POST /api/v1/orders)
    ↓
Vendor API Response Expected: { order: { id, status, price, ... } }
    ↓
Order saved with vendorOrderId
    ↓
Success or Error logged
```

---

## Issues We're Experiencing

### Issue 1: Orders Not Reaching Vendor

**Symptom:** 
- Orders created in our database
- No vendor order ID in response
- No error messages in logs (or error is being caught silently)

**Possible Causes:**
- [ ] API key not being sent or invalid
- [ ] API key format incorrect (should be `adh_<key>`)
- [ ] Vendor API endpoint unreachable
- [ ] Vendor account not verified
- [ ] Request payload format mismatch
- [ ] API key lacks permissions for specific endpoints

### Issue 2: Silent Failures

**Symptom:**
- No error thrown, but vendorOrderId is undefined
- Order continues to process as if vendor call succeeded
- Logs show "Vendor API client initialization failed"

**Possible Causes:**
- [ ] VENDOR_API_KEY environment variable not set
- [ ] VENDOR_API_URL environment variable incorrect
- [ ] Try-catch block hiding real error

---

## Diagnostic Steps for Vendor

Please help us verify:

### 1. API Key Validation
```
Can you confirm:
- [ ] API key format is correct (adh_<key>)
- [ ] API key is active and not revoked
- [ ] API key has permission for /api/v1/orders
- [ ] Our account is verified in AllenDataHub admin
- [ ] IP whitelist allows our requests (if applicable)
```

### 2. API Endpoint Verification
```
Test these endpoints:
- [ ] GET https://api.allendatahub.com/api/v1/products
      Status: __ Body: _______________

- [ ] POST https://api.allendatahub.com/api/v1/orders
      Body: { "productId": "507f1f77bcf86cd799439011", "phoneNumber": "0541234567" }
      Status: __ Body: _______________
```

### 3. Error Details
Please let us know if you see any of these errors:
- [ ] Invalid API key
- [ ] Account not verified
- [ ] Rate limit exceeded
- [ ] IP not whitelisted
- [ ] Phone number validation errors (even though we're sending 10 digits)
- [ ] Product ID format issue (we're using MongoDB ObjectIds)

---

## Our Current Code

### Phone Number Formatter
```typescript
static formatPhoneNumber(phoneNumber: string): string {
  let cleaned = phoneNumber
    .replace(/-/g, "")
    .replace(/ /g, "")
    .replace(/\+/g, "");

  // Keep in 10-digit format (0XXXXXXXXX) expected by API
  if (cleaned.startsWith("233")) {
    return "0" + cleaned.slice(3);
  }

  if (cleaned.startsWith("0")) {
    return cleaned;
  }

  if (cleaned.length === 9) {
    return "0" + cleaned;
  }

  return cleaned;
}
```

### Order Creation Example
```typescript
if (vendorClient && vendorProductId) {
  try {
    const formattedPhone = VendorAPIClient.formatPhoneNumber(recipientPhone);
    req.log.info(`Calling vendor API. Phone: ${recipientPhone} → ${formattedPhone}`);
    const vendorResponse = await vendorClient.createOrder(vendorProductId, formattedPhone);
    vendorOrderId = vendorResponse.order.id;
  } catch (vendorErr) {
    vendorError = vendorErr instanceof Error ? vendorErr.message : "Vendor API error";
    req.log.warn(`Vendor API failed: ${vendorError}`);
  }
}
```

---

## Environment Variables Required

We are setting these environment variables:
```
VENDOR_API_KEY=adh_<your_key>
VENDOR_API_URL=https://api.allendatahub.com
```

Please confirm:
- [ ] API key starts with `adh_`
- [ ] Base URL is correct
- [ ] No extra spaces or quotes in environment variables

---

## Logs & Debugging

### What We See in Logs

**Success Case (Expected):**
```
Calling vendor API for wallet payment. Product: <id>, Phone: 0541234567 → 0541234567
Vendor order created successfully. Vendor Order ID: <vendor_id>
```

**Failure Case (Current):**
```
Vendor API client initialization failed in orders route
Cannot call vendor API: Product <id> does not have vendorProductId
```

**Error Case (Need Details):**
```
Vendor API call failed: [ERROR MESSAGE HERE]
```

### Questions for Vendor

1. **Are orders hitting your API at all?** 
   - Can you check server logs for requests from our IP?

2. **If requests are received, why are they failing?**
   - Send us the exact error responses

3. **What's the expected response format?**
   ```json
   // Currently expecting:
   {
     "order": {
       "id": "string",
       "status": "pending|processing|completed|failed",
       "paymentStatus": "string",
       "phoneNumber": "string",
       "price": "number",
       ...
     }
   }
   ```
   Is this correct?

4. **Product ID Format:**
   - We store products in our DB as MongoDB ObjectIds (24-char hex)
   - When creating orders, we send your `vendorProductId` 
   - Is this the correct field to use?

5. **Rate Limiting:**
   - Are there rate limits we need to know about?
   - Do we need to implement backoff/retry logic?

6. **Webhook Support:**
   - Can you provide webhook endpoint details for order status updates?
   - What's the expected payload format?

---

## What We Need From You

Please provide:

1. **API Documentation**
   - [ ] Complete endpoint reference
   - [ ] Expected request/response formats
   - [ ] Error codes and meanings
   - [ ] Rate limit information
   - [ ] Authentication details

2. **Account Verification**
   - [ ] Confirm our account is verified
   - [ ] Confirm API key is active
   - [ ] Check if there are any usage restrictions

3. **Test Credentials**
   - [ ] Test endpoint (if available)
   - [ ] Test product IDs we can use
   - [ ] Test phone numbers that won't create real orders

4. **Debug Support**
   - [ ] Check your server logs for our requests
   - [ ] Send us exact error responses
   - [ ] Verify endpoint accessibility from external IPs

5. **Sample Response**
   - [ ] Show example successful order creation response
   - [ ] Show example error response

---

## Next Steps

1. **Vendor checks logs** and confirms:
   - Are our requests reaching the API?
   - If yes, what's the error?
   - If no, why (firewall, rate limit, etc)?

2. **Vendor provides test endpoint** with:
   - Test product IDs
   - Realistic test phone numbers

3. **We test with provided credentials**

4. **Vendor sends full error details** from their logs

5. **We implement fixes** based on real error responses

---

## Contact Information

- **System:** Ewura Hub Wallet
- **API Base:** `https://api.allendatahub.com`
- **Endpoints:** `/api/v1/products`, `/api/v1/orders`
- **Auth:** X-API-Key header

**Please review this document and provide the information in the "What We Need From You" section so we can complete this integration.**

---

**Document Version:** 1.0  
**Last Updated:** April 16, 2026  
**Created by:** Ewura Hub Wallet Development Team
