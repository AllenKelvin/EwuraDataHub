# Render & Vercel Deployment Setup Guide

## Overview
This guide shows how to configure **Render** (backend API) and **Vercel** (frontend) with the new vendor API integration.

---

## 📦 RENDER BACKEND DEPLOYMENT

### Environment Variables for Render

Add these variables to your Render project settings:

| Key | Value | Description |
|-----|-------|-------------|
| `NODE_ENV` | `production` | Production environment |
| `PORT` | `10000` | Render default port |
| `MONGODB_URI` | `mongodb+srv://...` | Your MongoDB connection string |
| `SESSION_SECRET` | Generate secure value | Session encryption key |
| `JWT_SECRET` | Generate secure value or use prod key | JWT token secret |
| `JWT_EXPIRY` | `7d` | JWT token expiration |
| `PAYSTACK_SECRET_KEY` | `sk_test_...` | Paystack test/live secret |
| `PAYSTACK_PUBLIC_KEY` | `pk_test_...` | Paystack test/live public |
| `CORS_ORIGIN` | `https://ewuradatahub.com,https://www.ewuradatahub.com` | Allowed frontend domains |
| `FRONTEND_URL` | `https://ewuradatahub.com` | Frontend URL for redirects |
| `VENDOR_API_KEY` | `adh_0e5e0e7aa3d739778f74cd533e8d2c6bd9b1c787ff05a5e9` | **NEW** - AllenDataHub API key |
| `VENDOR_API_URL` | `https://api.allendatahub.com` | **NEW** - Vendor API base URL |
| `LOG_LEVEL` | `info` | Logging level |

### Step-by-Step Render Setup

#### 1. Go to Render Dashboard
```
https://dashboard.render.com
```

#### 2. Select Your Backend Service
- Click on your `ewura-hub-api` service

#### 3. Navigate to Environment Variables
- Go to **Settings** → **Environment** (or **Variables** tab)

#### 4. Update Environment Variables

**Remove these (old variable names):**
- `ALLOWED_ORIGINS` (replaced with `CORS_ORIGIN`)

**Add/Update these:**

```yaml
# Existing - Update if needed
NODE_ENV: production
PORT: 10000
SESSION_SECRET: [Generate new secure value]
JWT_SECRET: [Use production secret or generate]
JWT_EXPIRY: 7d
PAYSTACK_SECRET_KEY: sk_test_38f6f7cbb730732e4823b61d4a243852e652d15c
PAYSTACK_PUBLIC_KEY: pk_test_257567315f8c5a68749c585dcc0788dde5fcfa49
CORS_ORIGIN: https://ewuradatahub.com,https://www.ewuradatahub.com
FRONTEND_URL: https://ewuradatahub.com
LOG_LEVEL: info

# NEW - Vendor API
VENDOR_API_KEY: adh_0e5e0e7aa3d739778f74cd533e8d2c6bd9b1c787ff05a5e9
VENDOR_API_URL: https://api.allendatahub.com
```

#### 5. Update render.yaml (Optional - for reference)

If you want to update the source configuration file:

```yaml
services:
  - type: web
    name: ewura-hub-api
    runtime: node
    plan: standard
    buildCommand: cd backend/api-server && pnpm install && pnpm build
    startCommand: cd backend/api-server && pnpm start
    envVars:
      - key: ENABLE_PNPM
        value: "true"
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: MONGODB_URI
        fromDatabase:
          name: ewura-hub-db
          property: connectionString
      - key: SESSION_SECRET
        generateValue: true
      - key: JWT_SECRET
        scope: all
      - key: JWT_EXPIRY
        value: "7d"
      - key: LOG_LEVEL
        value: info
      - key: FRONTEND_URL
        scope: all
      - key: CORS_ORIGIN
        scope: all
      - key: PAYSTACK_PUBLIC_KEY
        scope: all
      - key: PAYSTACK_SECRET_KEY
        scope: all
      # NEW - Vendor API
      - key: VENDOR_API_KEY
        scope: all
      - key: VENDOR_API_URL
        value: https://api.allendatahub.com
```

#### 6. Deploy
- Click **Deploy** or push to your connected Git repository
- Monitor deployment logs to ensure vendor API initializes

---

## 🚀 VERCEL FRONTEND DEPLOYMENT

### Environment Variables for Vercel

Add these variables to your Vercel project:

| Key | Value | Description |
|-----|-------|-------------|
| `VITE_API_URL` | `https://api.ewuradatahub.com` | Backend API URL |
| `VITE_APP_NAME` | `Ewura Hub` | Application name |

**Note:** Vendor API key is backend-only (not needed in frontend)

### Step-by-Step Vercel Setup

#### 1. Go to Vercel Dashboard
```
https://vercel.com/dashboard
```

#### 2. Select Your Frontend Project
- Click on your `ewura-hub` (or frontend) project

#### 3. Navigate to Environment Variables
- Go to **Settings** → **Environment Variables**

#### 4. Add/Update Environment Variables

For each environment (Production, Preview, Development):

**Production Environment:**
```yaml
VITE_API_URL=https://api.ewuradatahub.com
VITE_APP_NAME=Ewura Hub
```

**Preview Environment:**
```yaml
VITE_API_URL=https://api.ewuradatahub.com
VITE_APP_NAME=Ewura Hub (Preview)
```

**Development Environment:**
```yaml
VITE_API_URL=http://localhost:8080
VITE_APP_NAME=Ewura Hub
```

#### 5. Update .env.vercel (Source Control)

```bash
# ============================================
# VERCEL DEPLOYMENT - FRONTEND (.env.vercel)
# ============================================

# API Configuration
VITE_API_URL=https://api.ewuradatahub.com
VITE_APP_NAME=Ewura Hub

# Optional: Analytics
VITE_ANALYTICS_ID=

# Optional: Feature flags
VITE_ENABLE_DEMO_MODE=false
```

#### 6. Deploy
- Push changes to your Git repository (connected to Vercel)
- Vercel will automatically deploy
- Monitor deployment progress

---

## ✅ VERIFICATION CHECKLIST

### After Render Deployment

- [ ] Backend builds successfully
- [ ] No errors in Render deployment logs
- [ ] Check log for: "✓ Vendor API client initialized successfully"
- [ ] Test health endpoint:
  ```bash
  curl https://api.ewuradatahub.com/health
  ```
- [ ] Test vendor products endpoint:
  ```bash
  curl https://api.ewuradatahub.com/api/vendor/status
  ```
- [ ] CORS works (test from frontend domain)

### After Vercel Deployment

- [ ] Frontend builds successfully
- [ ] No build errors in Vercel console
- [ ] Frontend loads at `https://ewuradatahub.com`
- [ ] Login page appears correctly
- [ ] Browser console shows no errors
- [ ] Network tab shows requests to correct API URL

### Integration Testing

- [ ] Log in with valid credentials
- [ ] Vendor products load (if agent account)
- [ ] Can create vendor orders
- [ ] Orders appear in the system
- [ ] Webhook updates work (check Render logs)

---

## 🔐 Security Best Practices

### ✅ DO
- ✅ Use environment variables for all secrets
- ✅ Keep different keys for staging/production
- ✅ Rotate keys periodically
- ✅ Use strong random values for JWT_SECRET and SESSION_SECRET
- ✅ Document which team member has credentials
- ✅ Enable 2FA on both Render and Vercel

### ❌ DON'T
- ❌ Commit `.env` files to Git
- ❌ Share credentials via email or chat
- ❌ Use default/weak secrets in production
- ❌ Expose API keys in frontend code
- ❌ Display credentials in logs

---

## 🔄 Updating Credentials

### When to Update

1. **Switching from Test to Live Paystack Keys**
   - Update on Render: `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY`
   - Redeploy backend

2. **Renewing Vendor API Key**
   - Update on Render: `VENDOR_API_KEY`
   - Redeploy backend

3. **Changing JWT Secret (Security)**
   - Update on Render: `JWT_SECRET`
   - Note: All existing tokens become invalid
   - Redeploy backend

### How to Update

**For Render:**
1. Go to Project Settings
2. Update Environment Variables
3. Click "Save" (may trigger redeploy)

**For Vercel:**
1. Go to Project Settings → Environment Variables
2. Click the variable to edit
3. Update value
4. Save and redeploy

---

## 📊 Environment Variables Summary

### Backend (Render)
```bash
# Core
NODE_ENV=production
PORT=10000

# Database
MONGODB_URI=mongodb+srv://...

# Security
SESSION_SECRET=<secure-random>
JWT_SECRET=<secure-random>
JWT_EXPIRY=7d

# Paystack
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...

# CORS & URLs
CORS_ORIGIN=https://ewuradatahub.com,https://www.ewuradatahub.com
FRONTEND_URL=https://ewuradatahub.com

# Vendor API (NEW)
VENDOR_API_KEY=adh_0e5e0e7aa3d739778f74cd533e8d2c6bd9b1c787ff05a5e9
VENDOR_API_URL=https://api.allendatahub.com

# Logging
LOG_LEVEL=info
```

### Frontend (Vercel)
```bash
# API
VITE_API_URL=https://api.ewuradatahub.com
VITE_APP_NAME=Ewura Hub
```

---

## 🧪 Quick Test Commands

### Test Backend Vendor API
```bash
# Check vendor service health
curl https://api.ewuradatahub.com/api/vendor/status

# Get vendor products (requires valid token in Authorization header)
curl https://api.ewuradatahub.com/api/vendor/products \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Frontend
```bash
# Visit frontend
https://ewuradatahub.com

# Check console for API URL
# Should show: VITE_API_URL = https://api.ewuradatahub.com
```

---

## 🐛 Troubleshooting

### "Vendor API client initialization failed"
**Cause:** `VENDOR_API_KEY` not set in Render environment
**Fix:**
1. Go to Render Settings → Environment Variables
2. Add `VENDOR_API_KEY=adh_0e5e0e7aa3d739778f74cd533e8d2c6bd9b1c787ff05a5e9`
3. Redeploy

### "CORS error from frontend"
**Cause:** `CORS_ORIGIN` not updated to correct domain
**Fix:**
1. Check Render env var: `CORS_ORIGIN`
2. Should include: `https://ewuradatahub.com`
3. Redeploy backend

### "API requests failing from frontend"
**Cause:** `VITE_API_URL` is incorrect on Vercel
**Fix:**
1. Go to Vercel Project Settings → Environment Variables
2. Verify `VITE_API_URL=https://api.ewuradatahub.com`
3. Redeploy frontend

### "Verification failed for JWT"
**Cause:** `JWT_SECRET` changed or inconsistent
**Fix:**
1. Ensure same `JWT_SECRET` in all instances
2. Users may need to re-login
3. Check Render logs

---

## 📚 Related Documentation

- [VENDOR_INTEGRATION.md](../VENDOR_INTEGRATION.md) - Vendor API usage
- [PAYSTACK_SETUP.md](../PAYSTACK_SETUP.md) - Paystack configuration
- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)

---

## 📞 Support

### For Render Issues
- Go to Render error logs
- Check resource limits (upgrade plan if needed)
- Contact: support@render.com

### For Vercel Issues
- Check Vercel deployment logs
- Test locally first: `pnpm dev`
- Contact: support@vercel.com

### For Your Application
- Backend logs: Render Dashboard → Service Logs
- Frontend logs: Browser DevTools Console
- Check network requests in DevTools Network tab

---

## ✨ Key Points to Remember

1. **Never commit `.env` files** - Use environment variables only
2. **Vendor API is backend-only** - Don't expose key in frontend
3. **Different keys for dev/staging/prod** - Use appropriate keys for each
4. **Update CORS_ORIGIN** - Must match your frontend domain
5. **Test after each update** - Verify health endpoints
6. **Monitor logs** - Check for initialization messages
7. **Document changes** - Keep track of when you update credentials

---

**Last Updated:** January 16, 2024
**Version:** 1.0

For the latest updates, refer to deployment documentation in the project root.
