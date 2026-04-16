# Paystack Integration Setup Guide

## Overview
Your Ewura Hub Wallet application is now configured to accept payments through Paystack. This guide explains the setup and how to complete the configuration.

---

## ✅ Completed Setup

### Backend Changes
1. **JWT Authentication** - Added JWT token support alongside sessions for mobile reliability
   - File: `backend/api-server/src/lib/jwt.ts` (NEW)
   - Auth middleware updated to accept JWT tokens in Authorization header

2. **Order Creation with Paystack**
   - File: `backend/api-server/src/routes/orders.ts`
   - Creates orders and initializes Paystack transactions
   - Returns `paymentUrl` for redirecting users to Paystack

3. **Payment Verification**
   - File: `backend/api-server/src/routes/payments.ts`
   - Webhook handler at `/api/payments/webhook`
   - Verification endpoint at `/api/payments/verify/:reference`

4. **Environment Variables**
   - `.env.production` - Updated with domain and Paystack test keys
   - `backend/api-server/.env` - Updated with Paystack test keys

### Frontend Changes
1. **Payment Callback Handler** (NEW)
   - File: `frontend/ewura-hub/src/pages/payment-callback.tsx`
   - Handles Paystack redirects after payment
   - Verifies payment with backend
   - Shows success/failure messages

2. **Cart Payment Flow**
   - File: `frontend/ewura-hub/src/pages/cart.tsx`
   - Already integrates with Paystack payment redirect
   - Stores token in localStorage after login for mobile support

3. **Routes**
   - File: `frontend/ewura-hub/src/App.tsx`
   - Added `/payment-callback` route

4. **Environment Configuration**
   - `.env.vercel` - Updated API URL to `https://api.ewuradatahub.com`
   - Development: Uses `http://localhost:8080` by default

---

## 🔐 Your Paystack Credentials (Test Mode)

```
Public Key:  pk_test_257567315f8c5a68749c585dcc0788dde5fcfa49
Secret Key:  sk_test_38f6f7cbb730732e4823b61d4a243852e652d15c
```

**⚠️ SECURITY WARNING:** These are test keys. Do NOT commit them to public repositories.

---

## 🔗 Required Paystack Dashboard Configuration

### 1. Set Webhook URL
1. Go to **Paystack Dashboard** → **Settings** → **API Keys & Webhooks**
2. Set **Webhook URL** to:
   ```
   https://api.ewuradatahub.com/api/payments/webhook
   ```
   (For development: `http://localhost:8080/api/payments/webhook`)

### 2. Set Callback URL
1. In Paystack Dashboard → **Settings** → **API Keys**
2. Set **Callback URL** (optional, for extra security) to:
   ```
   https://ewuradatahub.com/payment-callback
   ```
   (For development: `http://localhost:5173/payment-callback`)

### 3. Webhook Events
Ensure the following events are enabled:
- ✅ `charge.success` - Handles successful payments

---

## 📊 Payment Flow Diagram

```
1. User clicks "Pay with Paystack" on Cart page
   ↓
2. Cart page calls POST /api/orders with paymentMethod="paystack"
   ↓
3. Backend creates order (status: pending) and calls Paystack API
   ↓
4. Backend returns paymentUrl to frontend
   ↓
5. Frontend redirects to Paystack checkout page
   ↓
6. User enters payment details on Paystack
   ↓
7. Paystack processes payment:
   - On success → Redirects to https://ewuradatahub.com/payment-callback?reference=REF
   - On failure → Redirects back without reference
   ↓
8. Payment callback page verifies with backend's /api/payments/verify/:reference
   ↓
9. Backend updates order status to "completed" (via webhook + verify endpoint)
   ↓
10. Frontend shows success message and redirects to /orders
```

---

## 🧪 Testing the Integration

### Test Payment Details (Paystack Sandbox)
Use these credentials to test:
- **Card Number:** 4084084084084081
- **Expiry:** Any future month/year (e.g., 12/25)
- **CVC:** Any 3 digits

### Test Flow
1. Go to http://localhost:5173/buy-data (or your domain)
2. Select a data bundle
3. Go to cart and click "Pay with Paystack"
4. You'll be redirected to Paystack test checkout
5. Use test card details above
6. Complete payment
7. You'll be redirected back to http://localhost:5173/payment-callback
8. Backend verifies payment and updates order

---

## 🚀 Going Live - Production Setup

When ready to go live with real payments:

1. **Switch Paystack Keys**
   - Go to Paystack Dashboard → Settings → API Keys
   - Copy your LIVE Public and Secret keys
   - Update `.env.production` with live keys:
     ```
     PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxxx
     PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxx
     ```

2. **Update Webhook URL in Paystack Dashboard**
   - Change to production webhook: `https://api.ewuradatahub.com/api/payments/webhook`

3. **Update Callback URL in Paystack Dashboard**
   - Change to production: `https://ewuradatahub.com/payment-callback`

4. **Enable HTTPS**
   - Ensure both frontend and backend are served over HTTPS
   - Required for Paystack production mode

5. **Test in Production**
   - Process a small test transaction first
   - Verify webhook is being received
   - Confirm order status updates correctly

---

## 📝 Environment Variables Summary

### Backend (.env.production)
```
PORT=8080
NODE_ENV=production
VITE_API_URL=https://api.ewuradatahub.com
FRONTEND_URL=https://ewuradatahub.com
ALLOWED_ORIGINS=https://ewuradatahub.com,https://www.ewuradatahub.com

PAYSTACK_PUBLIC_KEY=pk_test_257567315f8c5a68749c585dcc0788dde5fcfa49
PAYSTACK_SECRET_KEY=sk_test_38f6f7cbb730732e4823b61d4a243852e652d15c

JWT_SECRET=your-production-secret-key (CHANGE THIS)
JWT_EXPIRY=7d
```

### Frontend (.env.vercel / Vercel Dashboard)
```
VITE_API_URL=https://api.ewuradatahub.com
VITE_APP_NAME=Ewura Hub
```

---

## 🔧 API Endpoints

### Order Creation
```
POST /api/orders
Body: {
  productId: string,
  recipientPhone: string,
  paymentMethod: "paystack" | "wallet"
}
Response: {
  order: {...},
  paymentUrl: string,  // URL to redirect for Paystack
  reference: string    // Unique payment reference
}
```

### Payment Verification
```
GET /api/payments/verify/:reference
Headers: Authorization: Bearer {token}
Response: {
  status: "success" | "failed",
  order: {...}
}
```

### Webhook Handler
```
POST /api/payments/webhook
Body: Paystack webhook payload
Handles: charge.success event
Updates: Order status to "completed"
```

---

## ✨ Key Features Implemented

- ✅ **Mobile-Ready**: localStorage-based JWT tokens for persistence
- ✅ **Secure**: Bearer token authentication with CORS
- ✅ **Real-time**: Webhook handling for instant order updates
- ✅ **User-Friendly**: Clear payment status feedback with UX
- ✅ **Error Handling**: Comprehensive error messages and logging
- ✅ **Scalable**: Ready for production with live Paystack keys

---

## 🐛 Troubleshooting

### Payment not completing?
1. Verify webhook URL is correctly set in Paystack Dashboard
2. Check backend logs for webhook errors: `req.log.error`
3. Test webhook delivery in Paystack Dashboard → Webhooks

### Order not updating after payment?
1. Check if order reference matches in database
2. Verify `/api/payments/verify/:reference` returns success
3. Check PAYSTACK_SECRET_KEY is not "sk_test_placeholder"

### Redirection loops?
1. Ensure callback URL matches exactly in Paystack settings
2. Check that `/payment-callback` route exists in App.tsx
3. Verify localStorage has token: open DevTools → Application → localStorage

### CORS issues?
1. Check ALLOWED_ORIGINS in .env.production
2. Verify frontend domain matches exactly
3. Check credentials in fetch requests (should include 'include')

---

## 📞 Support

For Paystack-specific help:
- Paystack Dashboard: https://dashboard.paystack.com
- Paystack Documentation: https://paystack.com/docs
- Paystack Support: support@paystack.com
