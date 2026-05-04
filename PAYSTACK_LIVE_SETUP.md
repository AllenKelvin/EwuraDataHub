# 🎯 Paystack Live Setup - Configuration Guide

## ✅ Status
- **Environment files updated** with live Paystack keys
- **Next step:** Configure URLs in Paystack Dashboard

---

## 📋 Paystack Dashboard Configuration

You need to configure **2 URLs** in your Paystack Dashboard:

### 1️⃣ Callback URL (For Payment Redirect)
**Purpose:** Redirect users back to your app after payment

- **Dashboard Location:** Settings → Developers → Callback URL
- **Live URL:** 
  ```
  https://ewuradatahub.com/paystack-return
  ```

### 2️⃣ Webhook URL (For Payment Notifications)
**Purpose:** Receive payment confirmation webhooks from Paystack

- **Dashboard Location:** Settings → Developers → Webhooks → Add Webhook
- **Live URL:**
  ```
  https://ewura-hub-api.onrender.com/api/payments/webhook
  ```
- **Events to trigger:** Select `charge.success` event
- **Active:** Toggle ON

---

## 🔧 Step-by-Step Setup Instructions

### Step 1: Go to Paystack Dashboard
1. Open https://dashboard.paystack.com
2. Log in with your account
3. Click **Settings** (top right menu)

### Step 2: Configure Callback URL
1. In Settings, click **Developers**
2. Find **Callback URL** field
3. Enter: `https://ewuradatahub.com/paystack-return`
4. Click **Save**

### Step 3: Add Webhook
1. In Developers section, scroll to **Webhooks**
2. Click **Add Webhook** button
3. Enter URL: `https://ewura-hub-api.onrender.com/api/payments/webhook`
4. Select event: `charge.success`
5. Make sure webhook is **Active** (toggle ON)
6. Click **Add Webhook**

### Step 4: Verify Configuration
- ✅ Callback URL shows: `https://ewuradatahub.com/paystack-return`
- ✅ Webhook URL shows: `https://ewura-hub-api.onrender.com/api/payments/webhook`
- ✅ Webhook is Active (toggle is ON)

---

## 📝 Environment Variables

Your live Paystack keys should be set in:
- Render Dashboard → Environment Variables
- Vercel Dashboard → Environment Variables
- Your local `.env.production` (in .gitignore, never commit)
- Your local `.env.render` (in .gitignore, never commit)

**⚠️ IMPORTANT:** Never commit `.env` files with secrets to git. They are in `.gitignore` for security.

**Keys to set:**
```
PAYSTACK_PUBLIC_KEY=pk_live_your_actual_key_here
PAYSTACK_SECRET_KEY=sk_live_your_actual_key_here
```

---

## 🚀 Deployment Steps

After configuring Paystack URLs:

### 1. Environment Variables Locally
1. Create `.env.production` in project root (if needed for testing)
2. Create `.env.render` for Render deployment config
3. **DO NOT** commit these files (they're in .gitignore)

### 2. Deploy Backend (Render)
```bash
# Push your code changes
git add .
git commit -m "Configure Paystack live URLs"
git push origin main
```

### 3. Update Render Environment Variables
Go to Render Dashboard:
1. Select your backend service
2. Go to **Environment** tab
3. Add/Update these variables:
   - `PAYSTACK_PUBLIC_KEY=pk_live_your_actual_key`
   - `PAYSTACK_SECRET_KEY=sk_live_your_actual_key`
   - `BACKEND_URL=https://ewura-hub-api.onrender.com` (if not already set)
4. Click **Deploy** button

### 4. Update Frontend (Vercel)
Go to Vercel Dashboard:
1. Select your frontend project
2. Go to **Settings → Environment Variables**
3. Add/Update:
   - `VITE_API_URL=https://ewura-hub-api.onrender.com`

---

## ✨ Testing Your Live Setup

### Test Payment Flow:
1. Go to https://ewuradatahub.com
2. Buy a product/fund wallet
3. Complete payment with real card (live mode)
4. You should be redirected to: `https://ewuradatahub.com/paystack-return`
5. Payment should complete successfully

### Test Webhook:
1. Make a payment
2. Check Render logs for webhook handler logs
3. Look for: `[Paystack Webhook]` entries
4. Verify order is created and wallet is funded

---

## 🔍 Troubleshooting

### Issue: Getting 404 after payment
- ✓ Verify callback URL is set in Paystack dashboard
- ✓ Clear browser cache and try again
- ✓ Check Render logs for errors

### Issue: Payment not completing
- ✓ Check Render logs for webhook errors
- ✓ Verify webhook URL is correct in Paystack dashboard
- ✓ Ensure webhook is **Active** (toggle ON)
- ✓ Verify environment variables are set in Render

### Issue: Webhook not triggering
- ✓ Verify webhook URL is publicly accessible
- ✓ Check Render service is running and not crashed
- ✓ Check Render logs for incoming webhook requests
- ✓ Verify webhook is marked as Active in Paystack

---

## 📞 Support
- Paystack Docs: https://paystack.com/docs/
- Paystack Support: https://support.paystack.com
