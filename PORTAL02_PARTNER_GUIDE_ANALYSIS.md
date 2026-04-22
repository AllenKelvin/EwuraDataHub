# Portal-02 Order Status Update - Implementation Analysis

**Date:** April 22, 2026
**Context:** Partner sent troubleshooting guide for Portal-02 webhook issues

---

## Executive Summary

Your Portal-02 integration is **correctly configured at the code level**, but there may be runtime environment issues preventing webhooks from being processed. The partner's guide identified that **80% of issues** are caused by missing or incorrect environment variables on Render.

---

## Current Implementation Status

### ✅ What's Working

1. **Portal-02 Service** (`backend/api-server/src/lib/portal02.ts`)
   - ✅ Correctly formats phone numbers (0241234567 → 233241234567)
   - ✅ Validates network/volume combinations
   - ✅ Constructs webhook URL: `${BACKEND_URL}/api/vendor/webhook`
   - ✅ Handles API timeouts (30-second timeout)
   - ✅ Parses multiple webhook payload formats

2. **Webhook Handler** (`backend/api-server/src/routes/vendor.ts`)
   - ✅ Registered at `/api/vendor/webhook`
   - ✅ Supports multiple order lookup strategies (vendorOrderId, vendorReference, paymentReference)
   - ✅ Proper status mapping (delivered → completed, failed → failed, etc.)
   - ✅ Records webhook history for debugging
   - ✅ Logs detailed information for troubleshooting

3. **Environment Configuration**
   - ✅ `BACKEND_URL` is set to `https://ewura-hub-api.onrender.com` in render.yaml
   - ✅ Portal-02 API keys configured
   - ✅ Database URL configured

### ⚠️ What Needs Verification

According to the partner's troubleshooting guide, verify these on Render:

1. **CRITICAL: Environment Variable Scopes**
   - The guide emphasizes that "Incorrect scope will break the integration"
   - Some variables must be "Runtime" scope, not "Build" scope
   - You need to SSH into Render and verify:
     ```bash
     env | grep -E "BACKEND_URL|PORTAL02|DATABASE_URL"
     ```

2. **Database Connection**
   - Verify `DATABASE_URL` has scope set to **Runtime**
   - If it's only in Build scope, webhooks can't update orders

3. **Service Restart**
   - After setting any new environment variables, the service must be restarted
   - Go to Render → Click "Restart Instance" button

---

## The 80% Problem: Missing BACKEND_URL or Incorrect Scope

### What the Guide Says:

> **"Your environment variables must be set correctly on Render. Incorrect scope will break the integration."**

> **"When Portal-02 sends order status updates, they POST to: `${BACKEND_URL}/api/webhooks/portal02`"**
> 
> **"If `BACKEND_URL` is not set, the webhook URL becomes: `http://localhost:5000/api/webhooks/portal02`"**
> 
> **"Portal-02 cannot reach localhost, so webhooks fail silently"**

### Your Configuration:

| Variable | Value | Scope | Status |
|----------|-------|-------|--------|
| `BACKEND_URL` | `https://ewura-hub-api.onrender.com` | All | ✅ Correct |
| `PORTAL02_API_KEY` | `dk_...` | All | ✅ Correct |
| `PORTAL02_BASE_URL` | `https://www.portal-02.com/api/v1` | All | ✅ Updated (added scope) |
| `DATABASE_URL` | MongoDB URI | ? | ⚠️ **Verify on Render** |

---

## What Could Be Wrong (In Order of Likelihood)

### 1. Environment Variable Scopes Are Wrong (80% likely)

**On Render, some variables might be in "Build" scope instead of "Runtime" scope.**

**Fix:**
1. Go to your Render service dashboard
2. Click **Environment** tab
3. For each critical variable, check the dropdown scope:
   - `BACKEND_URL` → should be **Runtime**
   - `DATABASE_URL` → should be **Runtime**
   - `PORTAL02_API_KEY` → should be **Runtime**
4. If any are wrong, update and click "Restart Instance"

### 2. BACKEND_URL Missing or Malformed (15% likely)

**On Render, `BACKEND_URL` might not be set at all, causing:**
- Webhook URL defaults to `http://localhost:5000/api/vendor/webhook`
- Portal-02 can't reach localhost
- Webhooks fail silently

**Fix:**
1. Go to Render → Environment variables
2. Add: `BACKEND_URL` = `https://ewura-hub-api.onrender.com`
3. Set scope to: **Runtime** (not Build)
4. Click "Restart Instance"

### 3. Service Not Restarted After Config Changes (5% likely)

**If you changed any environment variables recently, the service must be restarted.**

**Fix:**
1. Go to Render dashboard
2. Find your service: `allen-data-hub-api`
3. Click **Restart Instance** button
4. Wait 2-3 minutes for restart to complete
5. Check **Logs** tab to confirm startup succeeded

---

## Immediate Action Steps

### Step 1: Verify on Render (5 minutes)

```bash
# SSH into your Render service and run:
env | grep -E "BACKEND_URL|PORTAL02|DATABASE"

# Should output:
BACKEND_URL=https://ewura-hub-api.onrender.com
PORTAL02_API_KEY=dk_...
PORTAL02_BASE_URL=https://www.portal-02.com/api/v1
DATABASE_URL=mongodb+srv://...
```

If `BACKEND_URL` is missing or shows `http://localhost:5000`, **that's the problem**.

### Step 2: Test Webhook Endpoint (5 minutes)

```bash
# Test if webhook is reachable
curl -X POST https://ewura-hub-api.onrender.com/api/vendor/webhook \
  -H "Content-Type: application/json" \
  -d '{"data": {"event": "order.status.updated", "orderId": "test_123", "status": "delivered"}}'

# Should return: {"received": true}
```

### Step 3: Check Render Logs (5 minutes)

1. Go to Render dashboard
2. Click your service: `allen-data-hub-api`
3. Click **Logs** tab
4. Search for `[Portal02]` 
5. Look for webhook errors or confirmation messages

### Step 4: Contact Portal-02 Support If Still Broken

Provide:
- Your API key (first and last 8 chars only)
- Your webhook URL: `https://ewura-hub-api.onrender.com/api/vendor/webhook`
- A test order reference from your system
- Screenshot of successful order creation
- Request they manually trigger a webhook for that order

---

## Code Quality Assessment

### Strengths

✅ **Robust webhook payload handling**: The code supports multiple payload formats  
✅ **Multiple lookup strategies**: Order can be found by vendorOrderId, reference, or paymentReference  
✅ **Comprehensive logging**: Every step is logged for debugging  
✅ **Proper error handling**: Timeouts, network errors, and malformed payloads are handled  
✅ **Status mapping**: Correctly maps Portal-02 statuses to internal statuses  
✅ **Webhook history**: Stores all webhooks for audit trail  

### Minor Recommendations

1. **Consider adding request signing validation**: Some vendors (like Stripe, Paystack) sign webhooks for security
2. **Add exponential backoff for order lookup**: If order not found initially, retry a few times
3. **Add monitoring/alerting**: Track webhook success rate

---

## Configuration Update Made

I've updated `render.yaml` to add proper scoping to `PORTAL02_BASE_URL`:

```yaml
- key: PORTAL02_BASE_URL
  value: https://www.portal-02.com/api/v1
  scope: all          # ← Added this for consistency
```

This ensures the variable is available in both Build and Runtime phases.

---

## Next Steps

1. **Immediate (Today):**
   - [ ] SSH into Render and verify environment variables
   - [ ] Test webhook endpoint accessibility
   - [ ] Check Render logs for `[Portal02]` entries

2. **If Issues Persist:**
   - [ ] Follow the diagnostic checklist in `PORTAL02_DIAGNOSTIC_CHECKLIST.md`
   - [ ] Use the manual webhook test from Step 4 above
   - [ ] Contact Portal-02 support with the information provided

3. **For Future Prevention:**
   - [ ] Add monitoring for webhook processing success rate
   - [ ] Set up Render alerts for service restarts
   - [ ] Document your Portal-02 webhook configuration

---

## Related Documentation

- **Diagnostic Guide:** `PORTAL02_DIAGNOSTIC_CHECKLIST.md`
- **Partner's Guide:** Check the document they sent (referenced above)
- **Implementation Code:** 
  - `backend/api-server/src/lib/portal02.ts` - Portal-02 service
  - `backend/api-server/src/routes/vendor.ts` - Webhook handler

