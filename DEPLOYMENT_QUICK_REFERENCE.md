# Quick Reference - Render & Vercel Environment Setup

## 🎯 TL;DR - Copy & Paste Values

### RENDER Backend Environment Variables

```
NODE_ENV=production
PORT=10000
JWT_EXPIRY=7d
FRONTEND_URL=https://ewuradatahub.com
CORS_ORIGIN=https://ewuradatahub.com,https://www.ewuradatahub.com
VENDOR_API_KEY=adh_0e5e0e7aa3d739778f74cd533e8d2c6bd9b1c787ff05a5e9
VENDOR_API_URL=https://api.allendatahub.com
PAYSTACK_PUBLIC_KEY=pk_test_257567315f8c5a68749c585dcc0788dde5fcfa49
PAYSTACK_SECRET_KEY=sk_test_38f6f7cbb730732e4823b61d4a243852e652d15c
LOG_LEVEL=info
```

**Values to generate in Render dashboard:**
- `SESSION_SECRET` - (Use "Generate Value" button)
- `JWT_SECRET` - (Use "Generate Value" button or set to production secret)
- `MONGODB_URI` - (From database connection)

---

### VERCEL Frontend Environment Variables

```
Production:
  VITE_API_URL=https://api.ewuradatahub.com
  VITE_APP_NAME=Ewura Hub

Preview:
  VITE_API_URL=https://api.ewuradatahub.com
  VITE_APP_NAME=Ewura Hub (Preview)

Development:
  VITE_API_URL=http://localhost:8080
  VITE_APP_NAME=Ewura Hub
```

---

## 📋 Checklist - What to Do

### Step 1: Render Backend Setup (5 minutes)

- [ ] Go to https://dashboard.render.com
- [ ] Select your `ewura-hub-api` service
- [ ] Click Settings → Environment Variables
- [ ] Delete old variable: `ALLOWED_ORIGINS` (if exists)
- [ ] Add/Update these variables:
  - `VENDOR_API_KEY` = `adh_0e5e0e7aa3d739778f74cd533e8d2c6bd9b1c787ff05a5e9`
  - `VENDOR_API_URL` = `https://api.allendatahub.com`
  - `CORS_ORIGIN` = `https://ewuradatahub.com,https://www.ewuradatahub.com`
  - `SESSION_SECRET` = Generate new value
  - `JWT_SECRET` = Generate new value
- [ ] Click "Save"
- [ ] Wait for deployment to complete
- [ ] Check logs for: "✓ Vendor API client initialized successfully"

### Step 2: Vercel Frontend Setup (3 minutes)

- [ ] Go to https://vercel.com/dashboard
- [ ] Select your frontend project
- [ ] Click Settings → Environment Variables
- [ ] For each environment (Production, Preview, Development):
  - [ ] Add `VITE_API_URL=https://api.ewuradatahub.com` (or localhost for Dev)
  - [ ] Add `VITE_APP_NAME=Ewura Hub`
- [ ] Git commit and push to deploy
- [ ] Wait for Vercel deployment

### Step 3: Verify Everything Works

- [ ] Backend health check:
  ```bash
  curl https://api.ewuradatahub.com/health
  ```
  
- [ ] Backend vendor status:
  ```bash
  curl https://api.ewuradatahub.com/api/vendor/status
  ```
  
- [ ] Frontend loads:
  ```
  https://ewuradatahub.com
  ```
  
- [ ] Can log in successfully
- [ ] No CORS errors in browser console
- [ ] Check Render logs for any errors

---

## 🔑 Summary of New Variables

### Vendor API (NEW)
| Variable | Value |
|----------|-------|
| `VENDOR_API_KEY` | `adh_0e5e0e7aa3d739778f74cd533e8d2c6bd9b1c787ff05a5e9` |
| `VENDOR_API_URL` | `https://api.allendatahub.com` |

### Fixed Variable Names (CHANGED)
| Old Name | New Name |
|----------|----------|
| `ALLOWED_ORIGINS` | `CORS_ORIGIN` |

### All Render Backend Variables (COMPLETE LIST)
```
CORE:
  NODE_ENV=production
  PORT=10000
  
SECURITY:
  SESSION_SECRET=(generate in Render)
  JWT_SECRET=(generate in Render)
  JWT_EXPIRY=7d
  
DATABASE:
  MONGODB_URI=(from database)
  
PAYSTACK:
  PAYSTACK_PUBLIC_KEY=pk_test_257567315f8c5a68749c585dcc0788dde5fcfa49
  PAYSTACK_SECRET_KEY=sk_test_38f6f7cbb730732e4823b61d4a243852e652d15c
  
CORS & URLs:
  CORS_ORIGIN=https://ewuradatahub.com,https://www.ewuradatahub.com
  FRONTEND_URL=https://ewuradatahub.com
  
VENDOR (NEW):
  VENDOR_API_KEY=adh_0e5e0e7aa3d739778f74cd533e8d2c6bd9b1c787ff05a5e9
  VENDOR_API_URL=https://api.allendatahub.com
  
LOGGING:
  LOG_LEVEL=info
```

### All Vercel Frontend Variables
```
VITE_API_URL=https://api.ewuradatahub.com
VITE_APP_NAME=Ewura Hub
```

---

## ⚡ Testing After Deployment

### Test Vendor API is Working
```bash
# Check backend health
curl https://api.ewuradatahub.com/health

# Check vendor service initialized
curl https://api.ewuradatahub.com/api/vendor/status
```

### Expected Response
```json
{
  "status": "online",
  "message": "Vendor service is operational",
  "productsCount": 15
}
```

### Test Frontend Can Reach Backend
1. Open `https://ewuradatahub.com`
2. Open DevTools (F12)
3. Go to Network tab
4. Try logging in
5. Requests should go to `https://api.ewuradatahub.com`
6. No CORS errors

---

## ❌ If Something Goes Wrong

### Backend Won't Start
- Check Render logs for errors
- Look for: "Vendor API client initialization failed"
- Fix: Add `VENDOR_API_KEY` to Render environment

### CORS Errors
- Check: `CORS_ORIGIN` value in Render
- Must include: `https://ewuradatahub.com`
- Must be exact domain match

### Frontend Won't Load
- Check Vercel deployment logs
- Check: `VITE_API_URL` value
- Should be: `https://api.ewuradatahub.com`

### Vendor Orders Failing
- Check: Backend logs in Render
- Verify: `VENDOR_API_KEY` is correct
- Verify: `VENDOR_API_URL` is correct

---

## 📚 Full Documentation

For detailed explanations, see: [DEPLOYMENT_VENDOR_SETUP.md](DEPLOYMENT_VENDOR_SETUP.md)

---

**Quick Setup Time:** ~10 minutes
**Difficulty:** ⭐ Easy
**Status:** Ready to deploy
