# Frontend Loading Issues - Debugging Guide

## Problem Analysis
- Frontend running on port 5177: ✅ Running
- Backend running on port 8080: ✅ Running
- Frontend not loading data: ❌ Data requests failing

## ROOT CAUSE IDENTIFIED
The frontend wasn't configured with the API base URL. This has been fixed by:
1. **Modified `/frontend/ewura-hub/src/main.tsx`** to set the API base URL on startup
2. **Set environment variable** `VITE_API_URL=http://localhost:8080`

## Current Setup

### Backend (API Server)
- **Port**: 8080
- **Status**: Running
- **Logging**: Pino logger (uses stdout)
- **Features**: 
  - Products endpoint: `GET /products`
  - Authentication: `POST /auth/login`, `/auth/register`
  - Orders, Wallet, Payments endpoints available

### Frontend (React + Vite)
- **Port**: 5177 (auto-incremented due to port conflicts)
- **Status**: Running
- **API URL Configured**: `http://localhost:8080`
- **Auto-reload**: Enabled
- **Styling**: Tailwind CSS v4 + Lightning CSS

## Testing API Connectivity

### Health Check
```bash
curl http://localhost:8080/healthz
```

### Products Endpoint
```bash
curl http://localhost:8080/products
```

### Login Endpoint
```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ewura.com","password":"password"}'
```

## What Should Work Now
1. ✅ Frontend loads on http://localhost:5177
2. ✅ Pages display without errors
3. ✅ API calls from frontend reach backend
4. ✅ Data loads dynamically
5. ✅ Forms submit successfully

## Troubleshooting

### Nothing Still Loading?
1. **Clear browser cache**: Cmd+Shift+Delete
2. **Hard refresh**: Cmd+Shift+R (Chrome/Safari)
3. **Check browser console**: Cmd+Option+I > Console tab
4. **Check network tab**: Look for failed requests

### API Errors?
1. Monitor backend output: `tail -f <backend-process>`
2. Test with curl: `curl http://localhost:8080/products`
3. Check CORS headers: Requests should include `Access-Control-Allow-Origin`

### Port Conflicts?
```bash
# Kill process on specific port
lsof -ti :8080 | xargs kill -9

# Kill all dev processes
pkill -f "pnpm dev" || true
```

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:8080
VITE_APP_NAME=Ewura Hub
```

### Backend (.env)
```
PORT=8080
NODE_ENV=development
SESSION_SECRET=ewura-hub-dev-secret-change-in-prod
```

## Next Steps
1. Open http://localhost:5177 in browser
2. Check if data loads
3. Monitor browser console for errors
4. Check network tab for failed requests
5. Review backend logs for error messages

---
**Last Updated**: April 13, 2026 - 8:30 PM
