# 🚀 Render + Vercel Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      Vercel (Frontend)                  │
│        https://ewura-hub.vercel.app (React + Vite)     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  API Requests to Render Backend                 │  │
│  │  https://ewura-hub-api.onrender.com             │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                Render (Backend API)                     │
│    https://ewura-hub-api.onrender.com (Node.js)       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │        Express.js API Server (Port 10000)       │  │
│  │  - Authentication Routes                        │  │
│  │  - Product Management                           │  │
│  │  - Order Processing                             │  │
│  │  - Wallet Management                            │  │
│  │  - Payment Integration (Paystack)               │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │       MongoDB Atlas (External Database)         │  │
│  │  - User data                                    │  │
│  │  - Orders & Transactions                        │  │
│  │  - Products & Categories                        │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Step 1: Prepare Render for Backend Deployment

### 1.1 Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub account (recommended)
3. Connect your GitHub repository

### 1.2 Create a Web Service on Render

1. **Go to Dashboard** → Click "New +"
2. **Select "Web Service"**
3. **Connect Repository**
   - Select your GitHub repo: `AllenKelvin/EwuraDataHub`
   - Choose branch: `main`

4. **Configure Service**
   - **Name**: `ewura-hub-api`
   - **Environment**: `Node`
   - **Region**: Choose closest to your users (e.g., Frankfurt, Singapore)
   - **Branch**: `main`
   - **Build Command**: 
     ```
     pnpm install --frozen-lockfile && pnpm workspace @workspace/api-server build
     ```
   - **Start Command**: 
     ```
     cd backend/api-server && pnpm start
     ```

5. **Select Plan**: Standard ($12/month for auto-sleep prevention)

6. **Add Environment Variables** (on next page):
   - Copy variables from `.env.render`
   - Essential variables:
     - `NODE_ENV` = `production`
     - `PORT` = `10000`
     - `MONGODB_URI` = Your MongoDB Atlas connection string
     - `SESSION_SECRET` = Generate random string
     - `FRONTEND_URL` = Your Vercel app URL
     - `PAYSTACK_PUBLIC_KEY` & `PAYSTACK_SECRET_KEY`

7. **Click "Create Web Service"**

### 1.3 Get Your Render API URL
- After deployment, you'll get a URL like: `https://ewura-hub-api.onrender.com`
- Copy this URL for use in Vercel environment variables

---

## Step 2: Prepare Vercel for Frontend Deployment

### 2.1 Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub account (recommended)
3. Import project

### 2.2 Import Project to Vercel

1. **Click "Add New..." → "Project"**
2. **Import Git Repository**
   - Select: `AllenKelvin/EwuraDataHub`
   - Click "Import"

3. **Configure Project**
   - **Project Name**: `ewura-hub` (or custom name)
   - **Root Directory**: `frontend/ewura-hub`
   - **Framework**: Vite
   - **Build Command**: `pnpm build`
   - **Output Directory**: `dist`
   - **Install Command**: `pnpm install --frozen-lockfile`

4. **Add Environment Variables**:
   - **VITE_API_URL** = `https://ewura-hub-api.onrender.com` (Your Render API URL)
   - **VITE_APP_NAME** = `Ewura Hub`

5. **Click "Deploy"**

### 2.3 Get Your Vercel URL
- After deployment, you'll get a URL like: `https://ewura-hub.vercel.app`
- Update Render's `FRONTEND_URL` environment variable with this

---

## Step 3: Database Setup (MongoDB Atlas)

### 3.1 Create MongoDB Atlas Cluster

1. Go to [mongodb.com/cloud](https://mongodb.com/cloud)
2. Create free or paid cluster
3. Create database user with strong password
4. Whitelist IP addresses (or allow all: 0.0.0.0/0)
5. Copy connection string:
   ```
   mongodb+srv://username:password@cluster-name.mongodb.net/database-name?retryWrites=true&w=majority
   ```

### 3.2 Add to Render
- Add `MONGODB_URI` environment variable in Render dashboard with the connection string

---

## Step 4: Configure CORS & Security

### Render Backend CORS Configuration
Update `backend/api-server/src/app.ts`:

```typescript
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'https://ewura-hub.vercel.app',
  'https://www.ewura-hub.vercel.app'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### Update Environment Variables
On Render dashboard, set:
```
ALLOWED_ORIGINS=https://ewura-hub.vercel.app,https://www.ewura-hub.vercel.app
```

---

## Step 5: Connect Frontend to Backend

### Verify API Configuration
Your `frontend/ewura-hub/src/main.tsx` should have:

```typescript
import { setBaseUrl } from "@workspace/api-client-react";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";
setBaseUrl(apiUrl);
```

### Vercel Environment Variables
Ensure Vercel has:
- `VITE_API_URL=https://ewura-hub-api.onrender.com`

---

## Step 6: Deploy & Test

### 6.1 Initial Render Deployment
1. Render auto-deploys from GitHub
2. Check Render logs: Dashboard → Service → Logs
3. Verify API is running: Visit `https://ewura-hub-api.onrender.com/api/health`
4. Expected response:
   ```json
   {
     "status": "ok",
     "timestamp": "2026-04-15T..."
   }
   ```

### 6.2 Initial Vercel Deployment
1. Vercel auto-deploys from GitHub
2. Check deployment: Vercel Dashboard → Deployment Logs
3. Visit `https://ewura-hub.vercel.app`
4. Check browser console for API connection status

### 6.3 Test API Connection
1. Open frontend in browser
2. Open Developer Tools → Network tab
3. Try any API action (login, browse products, etc.)
4. Verify requests go to Render backend
5. Look for successful responses (200, 201 status codes)

---

## Step 7: Configure Custom Domains (Optional)

### For Render Backend
1. Render Dashboard → Service → Settings
2. Add custom domain (e.g., `api.yourdomain.com`)
3. Add DNS records as instructed

### For Vercel Frontend
1. Vercel Dashboard → Project → Settings → Domains
2. Add custom domain (e.g., `yourdomain.com`)
3. Update DNS records

---

## Environment Variables Checklist

### ✅ Render Backend (.env.render)
- [ ] `NODE_ENV=production`
- [ ] `PORT=10000`
- [ ] `MONGODB_URI=mongodb+srv://...`
- [ ] `SESSION_SECRET=<strong-random-string>`
- [ ] `FRONTEND_URL=https://ewura-hub.vercel.app`
- [ ] `ALLOWED_ORIGINS=https://ewura-hub.vercel.app`
- [ ] `PAYSTACK_PUBLIC_KEY=pk_live_...`
- [ ] `PAYSTACK_SECRET_KEY=sk_live_...`

### ✅ Vercel Frontend (.env.vercel)
- [ ] `VITE_API_URL=https://ewura-hub-api.onrender.com`
- [ ] `VITE_APP_NAME=Ewura Hub`

---

## Monitoring & Maintenance

### Render Monitoring
- **Logs**: Service → Logs (real-time)
- **Health Check**: `/api/health` endpoint
- **Metrics**: Service → Metrics tab
- **Auto-sleep**: Standard plan has auto-sleep; use Pro to prevent

### Vercel Monitoring
- **Analytics**: Edge Network details
- **Function Invocations**: Monitor serverless functions
- **Error Tracking**: Check deployments → Error logs

### Health Check URLs
- Backend: `https://ewura-hub-api.onrender.com/api/health`
- Frontend: `https://ewura-hub.vercel.app` (should load)

---

## Troubleshooting

### Frontend Can't Connect to Backend
**Problem**: 404 or CORS errors

**Solutions**:
1. Verify `VITE_API_URL` is correct on Vercel
2. Check Render backend is running: `https://ewura-hub-api.onrender.com/api/health`
3. Verify `ALLOWED_ORIGINS` on Render includes Vercel URL
4. Check browser console for exact error message

### Build Fails on Render
**Problem**: `pnpm install` or build errors

**Solutions**:
1. Check Render logs for specific error
2. Ensure `pnpm-lock.yaml` is committed
3. Verify build command is correct
4. Check Node version compatibility (use 20.x or 18.x)

### Database Connection Fails
**Problem**: `MONGODB_URI` connection error

**Solutions**:
1. Verify MongoDB Atlas connection string format
2. Check IP whitelist allows Render IP
3. Verify username/password are correct
4. Test locally first with connection string

### Vercel Deployment Fails
**Problem**: Build errors during deployment

**Solutions**:
1. Check deployment logs on Vercel
2. Ensure correct root directory: `frontend/ewura-hub`
3. Verify build command: `pnpm build`
4. Check Node version requirements

---

## Performance Tips

### Render Backend
- Use Standard plan for consistent performance
- Monitor response times in metrics
- Add caching headers for static endpoints
- Use connection pooling for MongoDB

### Vercel Frontend
- Built-in CDN caches static assets globally
- Use image optimization features
- Enable ISR (Incremental Static Regeneration) if needed
- Monitor Web Vitals in Analytics

---

## Security Checklist

- [ ] Change all default environment variables
- [ ] Generate strong `SESSION_SECRET`
- [ ] Use HTTPS everywhere (automatic with Render/Vercel)
- [ ] Whitelist MongoDB IP addresses
- [ ] Enable two-factor authentication on Render/Vercel
- [ ] Rotate Paystack keys regularly
- [ ] Monitor error logs for suspicious activity
- [ ] Set up rate limiting on backend (if needed)

---

## Cost Estimate

| Service | Plan | Cost/Month | Details |
|---------|------|-----------|---------|
| Render Backend | Standard | $12 | Auto-sleep off |
| Vercel Frontend | Pro | $20 | Custom domains |
| MongoDB Atlas | Shared | Free - $500+ | Depends on usage |
| **Total** | | **$32+** | Scalable |

---

## Next Steps

1. ✅ Create Render account and deploy backend
2. ✅ Create Vercel account and deploy frontend
3. ✅ Set up MongoDB Atlas
4. ✅ Configure environment variables
5. ✅ Test API connectivity
6. ✅ Monitor logs and performance
7. ✅ Set up custom domains (optional)
8. ✅ Enable automated backups

---

## Support & Resources

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Docs**: https://docs.mongodb.com
- **Express.js**: https://expressjs.com
- **Vite**: https://vitejs.dev

