# API Integration Issues - Partner Client

## Issues Found

### 1. **CRITICAL: Phone Number Format Mismatch** ⚠️

**Problem:** Your API expects phone numbers to be **exactly 10 digits**, but the partner's `formatPhoneNumber()` method converts them to the international format with 12 digits (233XXXXXXXXX).

**API Validation:**
```typescript
// server/routes.ts line 987
phoneNumber: z.string().regex(/^\d{10}$/, "phoneNumber must be exactly 10 digits"),
```

**Partner's formatPhoneNumber() Output:**
- Input: `0541234567` → Output: `233541234567` (12 digits) ❌
- Input: `541234567` → Output: `233541234567` (12 digits) ❌

**Expected Format:**
- `0541234567` (10 digits with leading 0) ✅
- `541234567` (9 digits without leading 0) ✅

**Fix:**
The partner needs to modify their `formatPhoneNumber()` method to keep the 10-digit format:

```typescript
static formatPhoneNumber(phoneNumber: string): string {
  let cleaned = phoneNumber
    .replace(/-/g, "")
    .replace(/ /g, "")
    .replace(/\+/g, "");

  // Keep in 10-digit format (0XXXXXXXXX) expected by API
  if (cleaned.startsWith("233")) {
    // International format: remove 233 and add 0
    return "0" + cleaned.slice(3);
  }
  
  if (cleaned.startsWith("0")) {
    // Already in correct format
    return cleaned;
  }

  // 9 digits without prefix: add 0
  if (cleaned.length === 9) {
    return "0" + cleaned;
  }

  return cleaned;
}
```

---

## API Endpoint Reference

All endpoints require the `X-API-Key: adh_<key>` header.

### GET /api/v1/products
- Returns: `{ products: VendorProduct[] }`
- **No issues** ✅

### POST /api/v1/data/purchase
- **Required body:**
  ```json
  {
    "network": "MTN",
    "volume": 1,
    "phoneNumber": "0541234567"
  }
  ```
- Returns: `{ order: VendorOrder }`
- **Issue:** Phone number must be exactly 10 digits (currently failing if formatted to 12 digits)

### GET /api/v1/orders
- Query params: `page`, `limit`, `source` (all correct)
- **No issues** ✅

### GET /api/v1/orders/:orderId
- **No issues** ✅

---

## Testing Checklist

- [ ] Verify API Key format: `adh_<key>` (not just the key)
- [ ] Confirm account is verified in AllenDataHub admin panel
- [ ] Test phone number formatting: should be exactly 10 digits
- [ ] Try a test order with correct phone format
- [ ] Check error responses match your error handling

---

## Common Error Responses

| Status | Message | Cause |
|--------|---------|-------|
| 401 | Missing X-API-Key header | No X-API-Key sent |
| 401 | Invalid API key | Wrong API key or inactive |
| 403 | API access denied | Account not verified |
| 400 | Invalid body, issues: { fieldErrors: { phoneNumber: ["..."] } } | Phone number not exactly 10 digits |
| 404 | Product not found | Invalid network/volume combination |
| 400 | Insufficient wallet balance | Agent account needs more funds |
