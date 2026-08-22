# API Integration Troubleshooting Guide

## Common Issues & Solutions

### Issue: 405 Method Not Allowed on `/api/v1/data/purchase`

**Root Cause:** The partner request is using the wrong endpoint or the wrong purchase payload.

**What's Happening:**
- Some integrations are sending requests to `/api/v1/orders` or `/api/orders`.
- AllenDataHub expects data bundle purchases through `/api/v1/data/purchase`.

**Solution:**

1. **Confirm your request URL is exactly:**
```bash
https://allen-data-hub-backend.onrender.com/api/v1/data/purchase
```
2. **Confirm you are using `POST` with the correct headers:**
```bash
curl -X POST https://allen-data-hub-backend.onrender.com/api/v1/data/purchase \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"network":"MTN","volume":1,"phoneNumber":"0541234567"}'
```
3. **Do not use `productId` in the purchase request.**

If you still see errors, verify that both `network` and `volume` match an available bundle, and that the phone number is a valid Ghana number.

**Fetch available products:**
```bash
curl -X GET https://allen-data-hub-backend.onrender.com/api/v1/products \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

Response includes:
```json
{
  "products": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "MTN 1GB Data Bundle",
      "network": "MTN",
      "dataAmount": "1",
      "description": "...",
      "apiPrice": 2.50
    },
    ...
  ]
}
```

**What NOT to do:**
- ❌ `{"productId": "master_beneficiary_data_bundle"}`
- ❌ `{"productId": "MTN"}`
- ❌ `{"productId": "MTN 1GB"}`

---

### Issue: 401 Unauthorized

**Cause:** Missing or invalid X-API-Key header

**Solution:**
1. Verify the API key exists in the admin panel
2. Ensure the agent account is verified
3. Check that the API key status is "active" (not revoked)
4. Include header in every request:
```bash
curl -H "X-API-Key: adh_0e5e..." ...
```

---

### Issue: 400 Bad Request - Invalid Phone Number

**Valid Formats:**
- ✅ `0541234567` (local format, 10 digits)
- ✅ `+233541234567` (international, +233 prefix)
- ✅ `233541234567` (international without +)
- ✅ `541234567` (9 digits, auto-prefixed with 0)
- ✅ `0541 234 567` (with spaces, auto-normalized)

**Invalid Formats:**
- ❌ `0541` (too short)
- ❌ `05412345678` (too long)
- ❌ `123456789` (ambiguous format)

---

### Issue: 403 Forbidden - Account Not Verified

**Cause:** Agent account exists but is not verified by admin

**Solution:**
1. Contact support@allendatahub.com
2. Request account verification
3. Admin will review and activate
4. You'll receive confirmation when ready to use the API

---

### API Key Lifecycle

| Status | Can Create Orders? | Next Action |
|--------|-------------------|------------|
| Pending | ❌ | Wait for admin review |
| Active | ✅ | Ready to use |
| Revoked | ❌ | Contact support to reapply |

---

### Testing Checklist

Before going to production:

1. ✅ Test endpoint exists:
```bash
curl https://allen-data-hub-backend.onrender.com/agent-api/health
```

2. ✅ Fetch products:
```bash
curl -X GET https://allen-data-hub-backend.onrender.com/api/v1/products \
  -H "X-API-Key: YOUR_KEY"
```

3. ✅ Create a test order with valid network and volume:
```bash
curl -X POST https://allen-data-hub-backend.onrender.com/api/v1/data/purchase \
  -H "X-API-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"network":"MTN","volume":1,"phoneNumber":"0541234567"}'
```

4. ✅ Check order status:
```bash
curl -X GET https://allen-data-hub-backend.onrender.com/api/v1/orders/ORDER_ID_FROM_STEP_3 \
  -H "X-API-Key: YOUR_KEY"
```

---

### Support Contacts

- **Integration Help:** support@allendatahub.com
- **API Documentation:** https://docs.allendatahub.com
- **Status Page:** https://status.allendatahub.com
- **Issues:** Include `X-Request-ID` from error response

