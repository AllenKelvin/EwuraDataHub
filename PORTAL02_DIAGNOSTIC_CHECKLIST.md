# Portal-02 Order Status Update Diagnostic Checklist

**Based on Partner's Troubleshooting Guide**
**Last Updated:** April 22, 2026

## 🚨 Critical Issues to Check (80% of problems)

### 1. Verify Render Environment Variables

**Action:** SSH into your Render service or check the dashboard

Go to your Render service dashboard → **Environment** tab → Search for these variables:

```bash
# Expected to find ALL of these:
NODE_ENV=production
BACKEND_URL=https://ewura-hub-api.onrender.com
PORTAL02_API_KEY=dk_...
PORTAL02_BASE_URL=https://www.portal-02.com/api/v1
DATABASE_URL=mongodb+srv://...
```

**Verification Steps:**

- [ ] `NODE_ENV` is set to `production`
- [ ] `BACKEND_URL` is NOT `http://localhost:5000` (that's the problem!)
- [ ] `BACKEND_URL` matches your actual Render domain
- [ ] `PORTAL02_API_KEY` is set and not empty
- [ ] `PORTAL02_BASE_URL` is set correctly
- [ ] `DATABASE_URL` has scope set to **Runtime** (not just Build)

**If BACKEND_URL is missing or wrong:**
1. Go to Render dashboard → Environment
2. Add/update `BACKEND_URL` → `https://ewura-hub-api.onrender.com`
3. Set scope to: **Runtime** 
4. Click **Restart Instance** button
5. Wait 2-3 minutes for restart

---

## 🔍 Webhook Configuration Verification

### Current Implementation Details

| Aspect | Configuration |
|--------|---|
| Webhook Endpoint | `/api/vendor/webhook` |
| Webhook URL Sent to Portal-02 | `${BACKEND_URL}/api/vendor/webhook` |
| Full Example | `https://ewura-hub-api.onrender.com/api/vendor/webhook` |

### Verification Steps:

- [ ] Your backend is deployed and running on Render
- [ ] `BACKEND_URL` is publicly reachable (test it in browser)
- [ ] Webhook endpoint is registered in Express routes
- [ ] Portal-02 has the correct webhook URL in their system

---

## 📋 Step-by-Step Testing Guide

### Step 1: Verify Environment Variables in Render

**Via Render Dashboard:**
1. Open Render → Your service (allen-data-hub-api)
2. Click **Environment** tab
3. Search for `BACKEND_URL`
4. Verify value is: `https://ewura-hub-api.onrender.com`
5. If missing, restart service immediately

**Via Terminal (SSH into Render):**
```bash
env | grep -E "BACKEND_URL|PORTAL02|DATABASE_URL"
```

### Step 2: Test Service Accessibility

```bash
# Test if your backend is reachable
curl https://ewura-hub-api.onrender.com/health

# Expected response: 200 OK or similar success response
```

If this fails with "Connection refused" or "Timeout":
- Your backend might not be running
- Check Render logs for startup errors
- Click "Restart Instance" on Render dashboard

### Step 3: Create a Test Order

```bash
# Replace YOUR_API_KEY with actual key
curl -X POST https://ewura-hub-api.onrender.com/api/vendor/purchase \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "0541234567",
    "bundleSize": 10,
    "network": "MTN"
  }'
```

**Expected response:**
```json
{
  "order": {
    "id": "mongo_order_id",
    "vendorOrderId": "portal02_transaction_id",
    "status": "pending",
    "vendorStatus": "pending",
    "amount": 0,
    "message": "Order submitted to Portal-02"
  }
}
```

**Save the `vendorOrderId`** for manual webhook testing in Step 4.

### Step 4: Manually Test Webhook

Simulate Portal-02 sending a webhook:

```bash
# Replace portal02_transaction_id with value from Step 3
curl -X POST https://ewura-hub-api.onrender.com/api/vendor/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "event": "order.status.updated",
      "orderId": "portal02_transaction_id",
      "reference": null,
      "status": "delivered",
      "recipient": "0541234567",
      "volume": 10,
      "timestamp": "2024-04-22T10:30:00Z"
    }
  }'
```

**Expected response:**
```json
{
  "received": true
}
```

### Step 5: Check Render Logs

1. Go to Render dashboard → Your service
2. Click **Logs** tab
3. Search for `[Portal-02]` or `webhook`
4. Look for entries like:
   - ✅ `[Portal-02 Webhook] Order ... updated: pending → completed`
   - ❌ `[Portal-02 Webhook] No local order found for vendor order`

---

## 🐛 Troubleshooting Specific Problems

### Problem: "Webhook URL is localhost"

**Symptom:** Portal-02 cannot reach your webhook endpoint

**Root Cause:** `BACKEND_URL` not set in Render environment variables

**Fix:**
1. Go to Render dashboard → Environment variables
2. Add: `BACKEND_URL=https://ewura-hub-api.onrender.com`
3. Set scope to: **Runtime**
4. Click "Restart Instance"

---

### Problem: "Order created but status never updates"

**Check in this order:**

#### A. Check Render Logs
```
Look for: "[Portal02] Webhook error"
If not found → webhook never reached server
```

#### B. Verify Order Reference Matching
The webhook searches using multiple strategies:
```
1. vendorOrderId = orderId (PRIMARY)
2. vendorReference = reference 
3. paymentReference = reference
4. vendorOrderId = reference (FALLBACK)
```

Make sure order is saved with `vendorOrderId` field populated.

#### C. Check Database Connection
- Verify `DATABASE_URL` is in runtime scope
- Test connection: `mongosh $DATABASE_URL`

---

### Problem: "403 Forbidden - Unauthorized"

**Causes to check:**
1. **Invalid API key** - Verify `PORTAL02_API_KEY` is correct
2. **API key revoked** - Contact Portal-02 support
3. **IP whitelist** - Some vendors restrict by IP

**Test Portal-02 API directly:**
```bash
curl -X POST https://www.portal-02.com/api/v1/order/mtn \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "single",
    "volume": 1,
    "phone": "233541234567",
    "offerSlug": "master_beneficiary_data_bundle",
    "webhookUrl": "https://ewura-hub-api.onrender.com/api/vendor/webhook"
  }'
```

---

### Problem: "Webhook marked as ignored"

**Symptoms:** Webhook received but order not updated

**Check in Render logs:**
```
Look for: "[Portal-02 Webhook] Event ignored"
```

**Possible causes:**
1. Invalid event type
2. Missing orderId/reference
3. Invalid status value

---

## ✅ Pre-Support Checklist

**Complete ALL before contacting support:**

- [ ] `BACKEND_URL` is set in Render (not localhost)
- [ ] `BACKEND_URL` matches actual Render domain
- [ ] `PORTAL02_API_KEY` is set and valid
- [ ] `PORTAL02_BASE_URL` is `https://www.portal-02.com/api/v1`
- [ ] `DATABASE_URL` is in runtime scope
- [ ] Service has been restarted after env var changes
- [ ] Webhook endpoint `/api/vendor/webhook` is registered
- [ ] Test order creation returns `success: true`
- [ ] Manual webhook test returns `200 OK`
- [ ] Render logs show no `[Portal-02]` errors
- [ ] Order has `vendorOrderId` field populated

---

## 📞 Getting Support

If all checks pass but issues persist:

1. **For Portal-02 API issues:**
   - Contact Portal-02 support
   - Provide: API key (first/last 8 chars only), webhook URL, test order reference

2. **For backend configuration:**
   - Check render.yaml file
   - Verify all environment variables
   - Review Render service logs

3. **For database issues:**
   - Verify MongoDB connection string
   - Check network access rules

---

## 🔗 Implementation Files

| File | Purpose |
|------|---------|
| `backend/api-server/src/lib/portal02.ts` | Portal-02 API service (handles API calls) |
| `backend/api-server/src/routes/vendor.ts` | Webhook handler and API endpoints |
| `render.yaml` | Render deployment configuration |
| `.env.production` | Production environment variables |

---

## 📝 Log Format Reference

Look for these log patterns in Render logs:

| Pattern | Meaning | Action |
|---------|---------|--------|
| `[Portal02] Initialized` | Service started | ✅ Normal |
| `[Portal02] Webhook received` | Webhook arrived | ✅ Check status update |
| `No local order found` | Order ID mismatch | ❌ Check vendorOrderId |
| `Order ... updated to completed` | Webhook processed | ✅ Success |
| `Portal02] Webhook error` | Processing failed | ❌ Check logs for details |

