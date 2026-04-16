# Vendor Integration - Action Plan

**Your Order Status:** Order created locally, NOT sent to vendor  
**Root Cause:** Vendor API call is failing silently  
**Next Step:** Identify why the API call is failing

---

## The Problem (Visualized)

```
Your System                          AllenDataHub API
═══════════════════════════════════════════════════════════════

User creates order
        ↓
Save to DB ✅
        ↓
Try to send to vendor API
        ↓
          🚫 REQUEST FAILS 🚫
        ↓
Log error (silently, not critical)
        ↓
Order stays in DB with:
  - status: "processing"
  - vendorOrderId: undefined ❌

Result: Customer sees order processing,
        but vendor NEVER received it
```

---

## What We Fixed

✅ **Phone number formatting** - All formats now work
✅ **Error logging** - Now logs vendor API errors
✅ **Input validation** - Checks phone & product ID formats
✅ **Request tracking** - Each request has unique ID for debugging

---

## What We Still Need to Diagnose

❓ **Why is the vendor API call failing?**

Possible reasons:
1. **API Key Issue** - Wrong, expired, or not set
2. **Account Issue** - Not verified or access revoked
3. **Network Issue** - API unreachable from your server
4. **Rate Limit** - Too many requests
5. **Payload Issue** - Wrong format sent to vendor

---

## Action Items (TODO)

### ✅ Already Done:
- [x] Phone number normalization (0XXXXXXXXX format)
- [x] Enhanced error logging with request IDs
- [x] Input validation for phone & product ID
- [x] Better error messages

### 🔍 Need to Do:
- [ ] Check logs to see WHY vendor API calls are failing
- [ ] Verify VENDOR_API_KEY is set correctly in production
- [ ] Verify VENDOR_API_URL is set correctly 
- [ ] Run manual API test with curl
- [ ] Check if vendor account is verified
- [ ] Get actual error messages from logs

### 📋 Need from Vendor:
- [ ] Confirm account is verified
- [ ] Confirm API key is active
- [ ] Check their logs for your requests
- [ ] Send exact error responses
- [ ] Provide test credentials if needed

---

## How to Find the Real Error

### Option 1: Check Server Logs

**If using Render/Vercel/Heroku:**
```
Go to Dashboard → Logs
Search for: "VENDOR API ERROR" or "vendorErr"
Copy the error message
This IS the real problem!
```

**If running locally:**
```bash
npm run dev
# Create an order
# Look for red error messages starting with ❌
```

### Option 2: Check Database

```javascript
// In MongoDB/Atlas, run:
db.orders.find({vendorOrderId: {$exists: false}}).pretty()

// Look for recent orders with:
// - status: "processing" ✅ (means local save worked)
// - vendorOrderId: undefined ❌ (means vendor call failed)
// - createdAt: (recent)

// Example of what you'll see:
{
  _id: ObjectId("69e134f0023190b4b4aa678f"),
  productId: "69e0d655ff2e74a3bd849e51",
  recipientPhone: "0592786175",
  vendorProductId: "master_beneficiary_data_bundle",
  vendorOrderId: null,  // ← THIS MEANS VENDOR CALL FAILED
  status: "processing"
}
```

### Option 3: Manual API Test

```bash
# Test with curl
VENDOR_URL="https://api.allendatahub.com"
API_KEY="adh_your_key_here"
PHONE="0592786175"
PRODUCT_ID="507f1f77bcf86cd799439011"

curl -v -X POST "$VENDOR_URL/api/v1/orders" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"phoneNumber\": \"$PHONE\"
  }"
```

**What to look for in response:**

```
HTTP/1.1 201 Created          ← SUCCESS ✅
{
  "order": {
    "id": "...",
    "status": "pending"
  }
}

OR

HTTP/1.1 401 Unauthorized    ← API KEY WRONG ❌
{"message":"Invalid API key"}

OR

HTTP/1.1 403 Forbidden        ← ACCOUNT ISSUE ❌
{"message":"API access denied"}

OR

HTTP/1.1 400 Bad Request      ← VALIDATION ERROR ❌
{
  "error": "INVALID_PHONE_NUMBER",
  "message": "..."
}
```

---

## After Finding the Error

### If Error is "Invalid API key":
```
✅ FIX:
1. Get new API key from vendor dashboard
2. Update environment variables:
   VENDOR_API_KEY=adh_<new_key>
3. Restart server
4. Test new order
```

### If Error is "API access denied":
```
✅ FIX:
1. Contact vendor: "My account needs API access"
2. Wait for approval email
3. After approval, test new order
```

### If Error is "Network error":
```
✅ FIX:
1. Check if vendor API is online:
   curl https://api.allendatahub.com/api/v1/products -H "X-API-Key: adh_test"
2. If unreachable, vendor is down - wait and retry
3. If reachable, might be firewall/proxy issue - contact your hosting provider
```

### If Error is "Phone number validation":
```
✅ FIX:
Our normalization should handle this, but if still happening:
1. Open browser console
2. Check what format is being sent
3. Ensure it's exactly 0XXXXXXXXX
4. Try manually with curl using same phone
```

---

## Timeline

**What has been done:**
- April 16, 2026: Vendor sent complete fix with phone normalization
- April 16, 2026: Implemented phone formatting across all order creation points
- April 16, 2026: Added enhanced logging and error handling
- April 16, 2026: Created debugging guide

**What's happening now:**
- Your order shows vendor API call is failing
- Need to find out WHY it's failing
- Possible API key or account issue

**What's next:**
1. Check logs for real error message
2. Either fix it yourself (API key) or contact vendor (account issue)
3. Test new order after fix
4. Monitor logs for more issues

---

## Key Files Modified

1. **[backend/api-server/src/lib/vendor-api.ts](../backend/api-server/src/lib/vendor-api.ts)**
   - Enhanced error logging with request IDs
   - Better validation
   - Clearer error messages

2. **[backend/api-server/src/routes/orders.ts](../backend/api-server/src/routes/orders.ts#L87)**
   - Phone number formatting before vendor API call
   - Better error handling

3. **[backend/api-server/src/routes/payments.ts](../backend/api-server/src/routes/payments.ts#L96)**
   - Phone number formatting (2 places)
   - Better error handling

4. **[backend/api-server/src/lib/vendor-debug.ts](../backend/api-server/src/lib/vendor-debug.ts)** (NEW)
   - Debug utilities
   - Validation helpers
   - Configuration checker

---

## Quick Diagnosis Script

**Run this to check everything:**

```bash
#!/bin/bash

echo "🔍 VENDOR API CONFIGURATION CHECK"
echo "=================================="

# Check 1: Environment variables
echo "1. Environment Variables:"
if [ -z "$VENDOR_API_KEY" ]; then
  echo "   ❌ VENDOR_API_KEY not set"
else
  echo "   ✅ VENDOR_API_KEY set (${VENDOR_API_KEY:0:8}...)"
fi

if [ -z "$VENDOR_API_URL" ]; then
  echo "   ❌ VENDOR_API_URL not set (default: https://api.allendatahub.com)"
else
  echo "   ✅ VENDOR_API_URL set ($VENDOR_API_URL)"
fi

# Check 2: API connectivity
echo ""
echo "2. API Connectivity:"
if curl -s https://api.allendatahub.com/api/v1/products -H "X-API-Key: test" | grep -q "Invalid"; then
  echo "   ✅ API is reachable (rejected test key as expected)"
else
  echo "   ⚠️  Could not verify API reachability"
fi

# Check 3: Phone normalization
echo ""
echo "3. Example Phone Numbers:"
echo "   Input: 0592786175      → Should be: 0592786175"
echo "   Input: 592786175       → Should be: 0592786175"
echo "   Input: +233592786175   → Should be: 0592786175"
echo "   Input: 233592786175    → Should be: 0592786175"
```

---

## Support Checklist for Vendor

When contacting AllenDataHub support, provide:

```
[ ] Account email/ID
[ ] API key (adh_abc123...xyz789) - masked for security
[ ] The exact error message you're seeing
[ ] A requestId from your logs (req_1234567890_abc123)
[ ] The phone number you tested with
[ ] The productId you tested with
[ ] A screenshot of the error
[ ] When the error started happening
```

---

## Success Criteria

Your integration will be working when:

```
✅ You create an order
✅ Phone gets formatted to 0XXXXXXXXX
✅ Vendor API is called
✅ Vendor returns orderId
✅ Order updated with vendorOrderId
✅ Status changes to "completed" when vendor confirms
✅ Logs show no errors
```

---

**Last Updated:** April 16, 2026  
**Status:** Waiting for error diagnosis  
**Next Review:** After checking logs

