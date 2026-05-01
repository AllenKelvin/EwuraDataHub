# 🚀 Render + Vercel Quick Start

## 5-Minute Deployment Summary

### Phase 1: Prepare Local Code ✅
```bash
# Build and test locally
cd /Users/allenkelvin/Desktop/Ewura-Hub-Wallet
pnpm install --frozen-lockfile
pnpm workspace @workspace/api-server build
pnpm workspace @workspace/ewura-hub build
git push origin main  # Make sure latest code is pushed
```

### Phase 2: Deploy Backend on Render (10 minutes)

1. **Create Render Account**: https://render.com (with GitHub)
2. **Create Web Service**:
   - Connect repo: `AllenKelvin/EwuraDataHub`
   - Name: `ewura-hub-api`
   - Build: `pnpm install --frozen-lockfile && pnpm workspace @workspace/api-server build`
   - Start: `cd backend/api-server && pnpm start`
   - Plan: **Standard** ($12/month)

3. **Add Environment Variables** (see `.env.render` template):
   - `NODE_ENV=production`
   - `PORT=10000`
   - `MONGODB_URI=` Your MongoDB connection
   - `SESSION_SECRET=` Generate random string
   - Other variables from `.env.render`

4. **Deploy** → Wait 5-10 minutes → Get URL like `https://ewura-hub-api.onrender.com`

### Phase 3: Deploy Frontend on Vercel (5 minutes)

1. **Create Vercel Account**: https://vercel.com (with GitHub)
2. **Import Project**:
   - Select repo: `AllenKelvin/EwuraDataHub`
   - Root: `frontend/ewura-hub`
   - Framework: Vite
   - Build: `pnpm build`
   - Output: `dist`

3. **Add Environment Variables**:
   - `VITE_API_URL=https://ewura-hub-api.onrender.com`
   - `VITE_APP_NAME=EwuraDataHub`

4. **Deploy** → Get URL like `https://ewuradatahub.vercel.app`

### Phase 4: Connect Services (2 minutes)

1. Go back to **Render Dashboard**
2. Select `ewura-hub-api` service
3. Add environment variables:
   - `FRONTEND_URL=https://ewuradatahub.vercel.app`
   - `ALLOWED_ORIGINS=https://ewuradatahub.vercel.app,https://www.ewuradatahub.vercel.app`
4. **Redeploy**

### Phase 5: Test (2 minutes)

| Check | URL | Expected |
|-------|-----|----------|
| Backend Health | `https://ewura-hub-api.onrender.com/api/health` | `200 ok` |
| Frontend | `https://ewuradatahub.vercel.app` | Page loads |
| API Connection | Open frontend, test login | Success |

---

## Configuration Files Reference

| File | Purpose | Status |
|------|---------|--------|
| `render.yaml` | Render deployment config | ✅ Created |
| `frontend/ewura-hub/vercel.json` | Vercel deployment config | ✅ Created |
| `.env.render` | Render environment template | ✅ Created |
| `frontend/ewura-hub/.env.vercel` | Vercel environment template | ✅ Created |
| `.nvmrc` | Node version (20.x) | ✅ Created |
| `DEPLOYMENT_RENDER_VERCEL.md` | Full deployment guide | ✅ Created |
| `DEPLOYMENT_CHECKLIST.md` | Step-by-step checklist | ✅ Created |

---

## Environment Variables Needed

### Render Backend (.env.render)
```env
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://Ewura:Agent@ewura.5xynt2f.mongodb.net/?appName=Ewura
SESSION_SECRET=very-long-random-string-here
FRONTEND_URL=https://ewuradatahub.vercel.app
ALLOWED_ORIGINS=https://ewuradatahub.vercel.app
PAYSTACK_PUBLIC_KEY=pk_live_...
PAYSTACK_SECRET_KEY=sk_live_...
```

### Vercel Frontend (.env.vercel)
```env
VITE_API_URL=https://ewura-hub-api.onrender.com
VITE_APP_NAME=Ewura Hub
```

---

## Troubleshooting Quick Answers

| Problem | Solution |
|---------|----------|
| Frontend can't reach API | Check `VITE_API_URL` on Vercel |
| Backend won't start | Check `MONGODB_URI` and database access |
| CORS errors | Verify `ALLOWED_ORIGINS` on Render backend |
| Build fails | Ensure `pnpm-lock.yaml` is committed |
| Port conflicts | Use PORT=10000 for backend, auto for frontend |

---

## Cost Breakdown

| Service | Plan | Cost | Type |
|---------|------|------|------|
| Render Backend | Standard | $12/month | VM |
| Vercel Frontend | Free | $0 | Serverless (free plan works!) |
| MongoDB Atlas | Shared | Free | Database (up to 5GB) |
| **Total** | | **$12+/month** | |

---

## After Deployment Checklist

- [ ] Test frontend loads
- [ ] Test API connectivity
- [ ] Test login
- [ ] Test product browsing
- [ ] Test order creation
- [ ] Test payment (test mode)
- [ ] Test wallet
- [ ] Monitor logs for 15 minutes
- [ ] Set up monitoring alerts
- [ ] Document admin credentials

---

## Helpful Commands

```bash
# Check backend health locally
curl http://localhost:8080/api/health

# Check backend health on Render
curl https://ewura-hub-api.onrender.com/api/health

# Run deployment health script
./scripts/health-check-deployment.sh

# Prepare for production
./scripts/prepare-deployment.sh

# Check git status
git status
```

---

## Key URLs to Save

- **GitHub Repo**: https://github.com/AllenKelvin/EwuraDataHub
- **Render Backend**: https://ewura-hub-api.onrender.com
- **Vercel Frontend**: https://ewuradatahub.vercel.app
- **MongoDB Atlas**: https://www.mongodb.com/cloud
- **Render Dashboard**: https://render.com/dashboard
- **Vercel Dashboard**: https://vercel.com/dashboard

---

## Next Steps

1. ✅ Code prepared and committed
2. ⬜ Create MongoDB Atlas cluster
3. ⬜ Deploy backend on Render
4. ⬜ Deploy frontend on Vercel
5. ⬜ Configure CORS for both services
6. ⬜ Test full integration
7. ⬜ Monitor production

---

**Status**: 🟢 Ready for Production Deployment  
**Last Updated**: April 15, 2026  
**Maintainer**: Your Team
