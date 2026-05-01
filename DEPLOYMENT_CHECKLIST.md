# ✅ Render + Vercel Deployment Checklist

## Pre-Deployment Checklist

### Local Testing
- [ ] Run `pnpm install --frozen-lockfile`
- [ ] Run `pnpm workspace @workspace/api-server build`
- [ ] Run `pnpm workspace @workspace/ewura-data-hub build`
- [ ] No TypeScript errors: `pnpm workspaces run typecheck`
- [ ] Test locally: `pnpm run dev` in both frontend and backend
- [ ] Verify API endpoints work locally
- [ ] Test database connection locally

### Code Quality
- [ ] No console.logs in production code
- [ ] No sensitive data in code (API keys, passwords)
- [ ] CORS configuration is correct
- [ ] Environment variables are properly configured
- [ ] Error handling is in place
- [ ] No broken imports or references

### Configuration Files
- [ ] ✅ `render.yaml` - Created
- [ ] ✅ `frontend/ewura-data-hub/vercel.json` - Created
- [ ] ✅ `.nvmrc` - Created (Node 20)
- [ ] ✅ `.env.render` - Created (template)
- [ ] ✅ `.env.vercel` - Created (template)
- [ ] ✅ `DEPLOYMENT_RENDER_VERCEL.md` - Created

### Git Repository
- [ ] All changes committed: `git status`
- [ ] Branch is main: `git branch`
- [ ] Remote is set correctly: `git remote -v`
- [ ] Latest changes pushed: `git push`

---

## Render Backend Deployment

### Create Accounts & Services
- [ ] **Create Render Account**
  - Go to https://render.com
  - Sign up with GitHub
  - Link GitHub account

- [ ] **Create MongoDB Atlas Account**
  - Go to https://mongodb.com/cloud
  - Create free cluster
  - Get connection string with credentials

- [ ] **Create Render Web Service**
  - Dashboard → New Web Service
  - Connect repository: `AllenKelvin/EwuraDataHub`
  - Name: `ewuradatahub-api`
  - Environment: Node
  - Build Command: `pnpm install --frozen-lockfile && pnpm workspace @workspace/api-server build`
  - Start Command: `cd backend/api-server && pnpm start`
  - Plan: Standard ($12/month)

### Configure Environment Variables on Render
- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `10000`
- [ ] `LOG_LEVEL` = `info`
- [ ] `MONGODB_URI` = `mongodb+srv://user:pass@cluster.mongodb.net/db`
- [ ] `SESSION_SECRET` = Generate strong random string
- [ ] `FRONTEND_URL` = (Will get from Vercel)
- [ ] `ALLOWED_ORIGINS` = (Will update after Vercel deployment)
- [ ] `PAYSTACK_PUBLIC_KEY` = Your Paystack public key
- [ ] `PAYSTACK_SECRET_KEY` = Your Paystack secret key
- [ ] Other optional variables as needed

### Verify Render Backend
- [ ] Wait for initial deployment to complete
- [ ] Check Render logs: Service → Logs
- [ ] Visit `https://ewura-hub-api.onrender.com/api/health`
- [ ] Verify response: `{ "status": "ok", ... }`
- [ ] Copy Render URL for Vercel configuration

---

## Vercel Frontend Deployment

### Create Vercel Account & Project
- [ ] **Create Vercel Account**
  - Go to https://vercel.com
  - Sign up with GitHub
  - Link GitHub account

- [ ] **Import Project to Vercel**
  - Dashboard → Add New → Project
  - Select repository: `AllenKelvin/EwuraDataHub`
  - Root Directory: `frontend/ewura-data-hub`
  - Framework: Vite
  - Build Command: `pnpm build`
  - Output Directory: `dist`
  - Install Command: `pnpm install --frozen-lockfile`

### Configure Environment Variables on Vercel
- [ ] `VITE_API_URL` = `https://ewura-hub-api.onrender.com` (Your Render URL)
- [ ] `VITE_APP_NAME` = `Ewura Hub`

### Verify Vercel Frontend
- [ ] Wait for initial deployment to complete
- [ ] Check deployment logs
- [ ] Visit provided Vercel URL (e.g., `https://ewuradatahub.vercel.app`)
- [ ] Page should load without errors
- [ ] Copy Vercel URL for Render update
- [ ] Open browser DevTools → Network tab
- [ ] Try an API action and verify requests go to Render

---

## Post-Deployment Configuration

### Update Render with Vercel URL
- [ ] Go back to Render Dashboard
- [ ] Select `ewuradatahub-api` service
- [ ] Settings → Environment Variables
- [ ] Update `FRONTEND_URL` = Your Vercel URL
- [ ] Update `ALLOWED_ORIGINS` = Your Vercel URL (including www if needed)
- [ ] Save and redeploy

### Test Full Integration
- [ ] Frontend loads: `https://ewuradatahub.vercel.app`
- [ ] Check browser console for errors
- [ ] Test login functionality
- [ ] Test API calls (check Network tab)
- [ ] Verify data appears correctly
- [ ] Test payment integration (test mode)
- [ ] Test wallet functionality
- [ ] Test order creation

### Security Verification
- [ ] HTTPS is enabled (automatic)
- [ ] CORS headers are correct
- [ ] No sensitive data in responses
- [ ] Session cookies have secure flags
- [ ] Environment variables don't contain secrets in logs

---

## Monitoring & Maintenance

### Set Up Monitoring
- [ ] **Render Backend**
  - [ ] Check logs regularly
  - [ ] Monitor metrics (CPU, Memory)
  - [ ] Set up uptime monitoring

- [ ] **Vercel Frontend**
  - [ ] Monitor deployment logs
  - [ ] Check Web Vitals analytics
  - [ ] Review error logs

### Regular Tasks
- [ ] Monitor API logs for errors
- [ ] Check database usage (MongoDB Atlas)
- [ ] Review application performance
- [ ] Update dependencies monthly
- [ ] Backup database regularly
- [ ] Test disaster recovery procedures

### Health Check
Run periodic health checks:
```bash
./scripts/health-check-deployment.sh https://ewura-hub-api.onrender.com https://ewura-hub.vercel.app
```

---

## Scaling & Optimization (Optional)

### If You Need Better Performance:

**Render Backend Scaling:**
- [ ] Upgrade from Standard to Pro plan
- [ ] Add Redis for caching (Render databases)
- [ ] Implement database connection pooling
- [ ] Add load balancing if traffic spikes

**Vercel Frontend Optimization:**
- [ ] Enable Analytics
- [ ] Configure custom domain
- [ ] Set up image optimization
- [ ] Enable Web Vitals monitoring

**Database Optimization:**
- [ ] Upgrade MongoDB Atlas cluster type
- [ ] Add read replicas for scale
- [ ] Configure auto-scaling
- [ ] Set up automated backups

---

## Custom Domains (Optional)

### For Render Backend (API)
- [ ] Buy domain (GoDaddy, Namecheap, etc.)
- [ ] Render Dashboard → Service Settings
- [ ] Add custom domain
- [ ] Update DNS records as instructed
- [ ] Update `FRONTEND_URL` and `ALLOWED_ORIGINS` on Render

### For Vercel Frontend
- [ ] Use existing domain or buy new one
- [ ] Vercel Dashboard → Project Settings → Domains
- [ ] Add domain
- [ ] Update DNS records as instructed
- [ ] Update `VITE_API_URL` on Vercel if needed

---

## Troubleshooting Guide

### Backend Won't Start
**Check:**
- [ ] Render logs for specific error
- [ ] MongoDB connection string is correct
- [ ] Database credentials are valid
- [ ] All required environment variables are set
- [ ] Node version is compatible (20.x)

**Fix:**
- [ ] Review `MONGODB_URI` - must be accessible from Render
- [ ] Check if database is up and running
- [ ] Verify build command completed successfully
- [ ] Try redeploying from Render dashboard

### Frontend Can't Connect to API
**Check:**
- [ ] Browser DevTools → Network tab shows failed requests
- [ ] `VITE_API_URL` matches Render backend URL
- [ ] Backend `/api/health` endpoint works
- [ ] `ALLOWED_ORIGINS` on backend includes Vercel URL
- [ ] CORS headers in API response

**Fix:**
- [ ] Verify Render backend is running
- [ ] Update `VITE_API_URL` on Vercel
- [ ] Clear browser cache
- [ ] Check Render CORS configuration in app.ts
- [ ] Redeploy both services

### Build Fails on Deployment
**Check:**
- [ ] `pnpm-lock.yaml` is committed
- [ ] All dependencies are in package.json
- [ ] TypeScript compiles locally
- [ ] No syntax errors

**Fix:**
- [ ] Run `pnpm install` locally to regenerate lock file
- [ ] Commit and push changes
- [ ] Trigger manual redeploy from Render/Vercel

---

## Rollback Procedure

If something goes wrong:

### Render Rollback
1. Render Dashboard → Service → Deployments
2. Find previous successful deployment
3. Click → More → Redeploy
4. Verify rollback completed

### Vercel Rollback
1. Vercel Dashboard → Deployments
2. Find previous successful deployment
3. Click → Promote to Production
4. Verify rollback completed

---

## Success Criteria ✅

Your deployment is successful when:
- [ ] Frontend loads at `https://ewuradatahub.vercel.app`
- [ ] Backend health check returns 200: `https://ewura-hub-api.onrender.com/api/health`
- [ ] Frontend can call backend APIs
- [ ] User can register/login
- [ ] Products load correctly
- [ ] Orders can be created
- [ ] Payment integration works
- [ ] Wallet functions properly
- [ ] No console errors
- [ ] No network failures

---

## Support Resources

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Atlas**: https://docs.mongodb.com
- **GitHub Copilot**: Ask questions during deployment
- **Render Support**: https://render.com/support
- **Vercel Support**: https://vercel.com/support

---

## Notes

- [ ] First deployment may take 5-10 minutes for builds
- [ ] Subsequent deployments are faster (caching)
- [ ] Render free tier has auto-sleep after 15 min; use Standard plan for 24/7
- [ ] Vercel builds on every push to main (automatic)
- [ ] Monitor costs: Render ($12+), Vercel (free or $20 pro), MongoDB ($0-500+)

---

**Last Updated**: April 15, 2026  
**Status**: ✅ Ready for Production
