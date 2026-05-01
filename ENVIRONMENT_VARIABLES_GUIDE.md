# Environment Variables Architecture

## Where Each Variable Goes

```
┌─────────────────────────────────────────────────────────────────┐
│                    YOUR APPLICATION                             │
└─────────────────────────────────────────────────────────────────┘
                    /                              \
                   /                                \
         ┌────────────────────┐        ┌──────────────────────┐
         │   VERCEL FRONTEND  │        │   RENDER BACKEND     │
         │  ewuradatahub.com  │        │  api.ewuradatahub..  │
         └────────────────────┘        └──────────────────────┘
              FEW VARIABLES                  MANY VARIABLES

┌─ VERCEL FRONTEND ─────────────────────────────────────────────┐
│                                                                │
│  Environment Variables to Set:                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                │
│  Production Env:                                             │
│    VITE_API_URL=https://api.ewuradatahub.com                │
│    VITE_APP_NAME=Ewura Hub                                  │
│                                                                │
│  Preview Env:                                                │
│    VITE_API_URL=https://api.ewuradatahub.com                │
│    VITE_APP_NAME=Ewura Hub (Preview)                        │
│                                                                │
│  Development Env:                                            │
│    VITE_API_URL=http://localhost:8080                       │
│    VITE_APP_NAME=Ewura Hub                                  │
│                                                                │
│  Note: Vendor API key is NOT needed here (backend only)     │
│                                                                │
└────────────────────────────────────────────────────────────────┘


┌─ RENDER BACKEND ──────────────────────────────────────────────┐
│                                                                │
│  Environment Variables to Set:                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                │
│  Core:                                                       │
│    NODE_ENV=production                                       │
│    PORT=10000                                                │
│    LOG_LEVEL=info                                            │
│                                                                │
│  Database:                                                   │
│    MONGODB_URI=mongodb+srv://...  (from connection)          │
│                                                                │
│  Security:                                                   │
│    SESSION_SECRET=(generate new value in Render)            │
│    JWT_SECRET=(generate new value in Render)                │
│    JWT_EXPIRY=7d                                             │
│                                                                │
│  URLs & CORS:                                                │
│    CORS_ORIGIN=https://ewuradatahub.com,...                 │
│    FRONTEND_URL=https://ewuradatahub.com                    │
│                                                                │
│  Paystack:                                                   │
│    PAYSTACK_PUBLIC_KEY=pk_test_...                          │
│    PAYSTACK_SECRET_KEY=sk_test_...                          │
│                                                                │
│  Vendor API (NEW):                                           │
│    VENDOR_API_KEY=adh_2cbe500a9365...                       │
│    VENDOR_API_URL=https://api.allendatahub.com              │
│                                                                │
└────────────────────────────────────────────────────────────────┘


Data Flow:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Browser
    ↓
  VERCEL (Frontend)
    ↓ Uses: VITE_API_URL
    ↓ (points to backend)
    ↓
  RENDER (Backend)
    ├─ Uses: VENDOR_API_KEY, VENDOR_API_URL
    ├─ (to call AllenDataHub)
    ├─ Uses: PAYSTACK_SECRET_KEY
    ├─ (for payment processing)
    └─ Uses: MONGODB_URI
      (for database)
```

---

## Quick Variable Reference Table

### 🎨 Frontend Variables (Vercel)
```yaml
Category: Frontend (User Interface)
Platform: Vercel
Count: 2-3 variables

VITE_API_URL          → Points frontend to backend
VITE_APP_NAME         → Display name in browser
VITE_ANALYTICS_ID     → Optional analytics
```

### 🔧 Backend Variables (Render)
```yaml
Category: Backend (Server & APIs)
Platform: Render
Count: 13+ variables

Core:
  NODE_ENV             → Production
  PORT                 → Server port (10000)
  LOG_LEVEL            → Logging level

Database:
  MONGODB_URI          → Database connection

Security:
  SESSION_SECRET       → Session encryption
  JWT_SECRET           → JWT token signing
  JWT_EXPIRY           → Token expiration

URLs:
  CORS_ORIGIN          → Allowed frontend domains
  FRONTEND_URL         → Frontend URL reference

Payment:
  PAYSTACK_PUBLIC_KEY  → Public key for frontend
  PAYSTACK_SECRET_KEY  → Secret key for backend

Vendor (NEW):
  VENDOR_API_KEY       → AllenDataHub API key
  VENDOR_API_URL       → AllenDataHub API endpoint
```

---

## Decision Tree: Which Platform?

```
Do I need to set this variable?
│
├─ Does it contain API keys or secrets?
│  ├─ YES → Set on RENDER (backend)
│  └─ NO  → Could be frontend or backend
│
├─ Is it a VITE_ prefixed variable?
│  ├─ YES → Set on VERCEL (frontend)
│  └─ NO  → Set on RENDER (backend)
│
├─ Is it about database or server?
│  ├─ YES → Set on RENDER (backend)
│  └─ NO  → Set on VERCEL (frontend)
│
└─ Is it an external service key? (Paystack, Vendor)
   ├─ YES → Set on RENDER (backend only)
   └─ NO  → Set on appropriate platform
```

---

## Deployment Summary

### What Gets Deployed Where

```
┌─────────────────────────────────┐
│     Git Repository              │
│  (ewura-data-hub)               │
│                                 │
│  ├─ backend/                    │
│  │  └─ api-server/              │
│  │     ├─ .env ← Dev secrets    │
│  │     ├─ src/                  │
│  │     └─ ...                   │
│  │                              │
│  └─ frontend/                   │
│     └─ ewura-data-hub/               │
│        ├─ .env.vercel ← Prod    │
│        ├─ src/                  │
│        └─ ...                   │
│                                 │
└─────────────────────────────────┘
         Push to GitHub
            ↙      ↘
    RENDER (pull)  VERCEL (pull)
    Backend        Frontend
    Rebuild        Rebuild
    Deploy         Deploy
       ↓              ↓
   api.ewuradatahub.com  ewuradatahub.com
```

### Each Platform's Role

```
┌─── RENDER ───────────────────────────────────────┐
│ Role: Backend API Server                        │
│ Purpose: Process business logic                 │
│ Handles: Database, Payments, Vendor API         │
│ Needs: All secrets & API keys                   │
│ Variables: 13+                                  │
└──────────────────────────────────────────────────┘

┌─── VERCEL ───────────────────────────────────────┐
│ Role: Frontend Web Server                       │
│ Purpose: User interface & interactions          │
│ Handles: Browser requests                       │
│ Needs: Only API endpoint URL                    │
│ Variables: 2-3                                  │
└──────────────────────────────────────────────────┘
```

---

## Environment Files Reference

### Development (Local Machine)

```
backend/api-server/.env        ← Local development secrets
frontend/ewura-hub/.env.local  ← Local frontend config (if needed)
```

### Staging (Optional)

```
.env.staging               ← Staging-specific config
render.yaml               ← Render deployment config
```

### Production (Deployed)

```
VERCEL Dashboard          ← Frontend environment variables
RENDER Dashboard          ← Backend environment variables
(Updated via dashboard UI, not Git)
```

---

## Key Takeaways

| Aspect | Frontend (Vercel) | Backend (Render) |
|--------|-------------------|-----------------|
| URL | https://ewuradatahub.com | https://api.ewuradatahub.com |
| Variables | 2-3 | 13+ |
| Contains Secrets | NO | YES |
| Vendor API Key | NOT NEEDED | ✅ REQUIRED |
| Paystack Keys | NOT NEEDED | ✅ REQUIRED |
| JWT Secret | NOT NEEDED | ✅ REQUIRED |
| Database Info | NOT NEEDED | ✅ REQUIRED |
| API Endpoint | ✅ REQUIRED | NOT NEEDED |
| Deploy Platform | Vercel Dashboard | Render Dashboard |

---

## Video Game Analogy 🎮

Think of it like a two-tier game architecture:

**Frontend (Vercel) = Game Client**
- What player sees (UI)
- Simple, minimal config
- Knows WHERE to send requests (API endpoint)
- Doesn't handle sensitive data

**Backend (Render) = Game Server**
- Complex business logic
- Many configuration options
- Handles all sensitive data & secrets
- Communicates with external services (Vendor API, Paystack)

Network communication:
```
Player (Browser) 
  ↔ Game Client (Vercel Frontend)
    ↔ Game Server (Render Backend)
      ↔ Third-party APIs (Vendor, Paystack)
```

---

**Last Updated:** January 16, 2024
**For:** Ewura Hub Wallet Deployment

See full guide: [DEPLOYMENT_VENDOR_SETUP.md](DEPLOYMENT_VENDOR_SETUP.md)
