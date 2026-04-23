# Paystack Callback & Wallet Funding Fix

## Issues Fixed

### Issue 1: 404 Page After Paystack Payment
**Root Cause:** Paystack redirect URL is not configured in the Paystack Dashboard, so Paystack doesn't know where to redirect users after payment completion.

**Solution:** Configure the Redirect URL in Paystack Dashboard:

1. Go to [Paystack Dashboard](https://dashboard.paystack.com)
2. Navigate to **Settings** → **Developers** → **API Keys & Webhooks**
3. Look for **Callback URL** setting (under Payment Settings/General Settings)
4. Set it to:
   - **Production:** `https://ewuradatahub.com/payment-callback`
   - **Development:** `http://localhost:5173/payment-callback`
5. Click **Save**

### Issue 2: Wallet Balance Not Showing After Payment
**Root Cause:** Backend wasn't returning complete wallet information in the verify response.

**Solution:** Backend has been updated to:
- Return `isWalletFund: true` flag for wallet fund transactions
- Return the updated wallet balance in the response
- Prevent duplicate wallet updates when webhook and verify both fire
- Add proper logging for debugging

## Backend Changes Made

### 1. Payment Verification Endpoint (`/api/payments/verify/:reference`)
**File:** `backend/api-server/src/routes/payments.ts`

**Changes:**
- Returns `isWalletFund: true` flag in response for wallet funds
- Returns `newBalance` showing the updated wallet balance
- Fetches updated user object with `{ new: true }` option
- Adds validation that user exists before updating wallet

### 2. Webhook Handler (`POST /api/payments/webhook`)
**File:** `backend/api-server/src/routes/payments.ts`

**Changes:**
- Checks for duplicate transactions before processing
- Returns early if transaction already exists (prevents double-crediting)
- Logs the new wallet balance after update
- Validates user exists before updating

### 3. Wallet Fund Initialization (`POST /api/wallet/fund`)
**File:** `backend/api-server/src/routes/wallet.ts`

**Changes:**
- Added logging when wallet fund is initialized
- Logs the reference for tracking

## Testing the Fix

### Step 1: Verify Paystack Configuration
```bash
# Check that callback URL is set in Paystack Dashboard
# Navigate to: https://dashboard.paystack.com → Settings → Developers
# Look for "Callback URL" setting and verify it matches your domain
```

### Step 2: Test Wallet Funding Locally
```bash
curl -X POST http://localhost:8080/api/wallet/fund \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"amount": 10}'
```

**Expected Response:**
```json
{
  "authorizationUrl": "https://checkout.paystack.com/...",
  "accessCode": "...",
  "reference": "WALLET-FUND-...",
  "amount": 10,
  "adminFee": 0.4,
  "totalChargeAmount": 10.4
}
```

### Step 3: Simulate Payment Callback
After completing payment on Paystack, verify:
1. Paystack redirects to `/payment-callback?reference=REF_123`
2. Payment callback page loads (not a 404)
3. Page shows "Processing Payment" spinner
4. Page shows "Payment Successful!" after 2-3 seconds
5. Page redirects to `/wallet` (for wallet funds) or `/orders` (for product orders)
6. Wallet balance is updated

### Step 4: Verify Wallet Update
Check that both webhook and verify endpoints update wallet:

**Backend logs should show:**
```
✅ Payment verification: Wallet fund successful: 10 credited to user 64f... (Fee: 0.4), New Balance: 100.4
✅ [Paystack Webhook] Wallet fund successful: 10 credited to user 64f... (Fee: 0.4), New Balance: 100.4
```

## Frontend Code Flow

### Payment Callback Page (`frontend/ewura-hub/src/pages/payment-callback.tsx`)
1. Extracts `reference` from URL query params
2. Calls `GET /api/payments/verify/{reference}` to verify payment
3. Checks `!data.order?.productName` to determine if it's a wallet fund
4. Redirects to `/wallet` (wallet funds) or `/orders` (product orders) after 3 seconds
5. Shows appropriate toast message

### Wallet Page (`frontend/ewura-hub/src/pages/wallet.tsx`)
1. User enters amount and clicks "Fund via Paystack"
2. Calls `POST /api/wallet/fund` endpoint
3. Backend returns Paystack authorization URL
4. Frontend redirects to Paystack checkout: `window.location.href = authorizationUrl`
5. User completes payment on Paystack
6. Paystack redirects to `/payment-callback?reference=...`
7. Callback page verifies and updates wallet

## Environment Variables to Check

### Backend (`.env.production` or `.env`)
```
PAYSTACK_SECRET_KEY=sk_test_... # Should be test key for testing
PAYSTACK_PUBLIC_KEY=pk_test_...
BACKEND_URL=https://api.ewuradatahub.com (for production)
DATABASE_URL=... (must have runtime scope on Render)
```

### Frontend (`.env.vercel` or `.env.local`)
```
VITE_API_URL=https://api.ewuradatahub.com (for production)
```

## Paystack Dashboard Configuration Checklist

- [ ] **Webhook URL:** Set to `https://api.ewuradatahub.com/api/payments/webhook`
- [ ] **Callback URL:** Set to `https://ewuradatahub.com/payment-callback`
- [ ] **Enable charge.success event:** Must be enabled for webhooks
- [ ] **Test Keys:** Using `sk_test_*` and `pk_test_*` keys
- [ ] **Live Keys:** Ready for production (when switching from test mode)
- [ ] **Verify API Key Permissions:** Must include transactions and webhooks

## Troubleshooting

### Issue: Still Getting 404 After Paystack Payment
1. **Verify callback URL is set in Paystack Dashboard** - This is the most common cause
2. Check browser dev tools → Network tab → See where Paystack is redirecting to
3. Verify `/payment-callback` route is registered in `frontend/ewura-hub/src/App.tsx`
4. Check Vercel/Render deployment logs for errors

### Issue: Wallet Shows Old Balance After Payment
1. Check backend logs for "Wallet fund successful" message
2. Verify webhook was received: Look for "[Paystack Webhook]" in logs
3. If webhook didn't fire, the verify endpoint should have updated wallet
4. Try refreshing the page to get fresh wallet balance from API
5. Check `WalletTransaction` collection in MongoDB for the transaction record

### Issue: Duplicate Transactions or Wrong Balance
1. Backend now checks for existing transactions to prevent duplicates
2. Check MongoDB `wallettransactions` collection - should have one per payment
3. If duplicates exist, delete them and re-sync wallet balance from orders

## Next Steps for Production

1. **Obtain Paystack Live Keys**
   - Request from Paystack support or dashboard
   - Update `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY` in production

2. **Test with Real Payments**
   - Use Paystack's test cards first
   - Then test with real GHS transactions

3. **Monitor Webhook Delivery**
   - Check Paystack dashboard for webhook delivery status
   - Set up alerts for failed webhook deliveries

4. **Enable SSL Certificate**
   - Ensure `https://` callback and webhook URLs work
   - Test webhook delivery with HTTPS

## References
- [Paystack Payment Integration Docs](https://paystack.com/docs/payments/accept-payments/)
- [Paystack Webhook Documentation](https://paystack.com/docs/webhooks/)
- [Paystack API Reference](https://paystack.com/docs/api/)
