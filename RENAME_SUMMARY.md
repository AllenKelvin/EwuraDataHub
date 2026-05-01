# Project Rename: Ewura Hub → EwuraDataHub

## Summary
Complete list of all files and references that need to be changed from "Ewura" or "ewura" to "AllenDataHub" or appropriate variants.

---

## 1. ENVIRONMENT FILES (4 files)

### .env Configuration Files
- **[.env.production](.env.production)** - Production environment config
  - Line 2: `# EWURA HUB - PRODUCTION ENVIRONMENT CONFIG` → `# ALLEN DATAHUB - PRODUCTION ENVIRONMENT CONFIG`
  - Line 18: `MONGODB_URI=...ewura-hub-prod` → `...allen-datahub-prod`
  - Line 19: Comment reference
  - Line 22: `VITE_API_URL=https://api.ewuradatahub.com` → `https://api.allendatahub.com`
  - Line 23: `VITE_APP_NAME=Ewura Hub` → `Allen DataHub`
  - Line 30: `FRONTEND_URL=https://ewuradatahub.com` → `https://allendatahub.com`
  - Line 31: `CORS_ORIGIN=https://ewuradatahub.com,...` → `https://allendatahub.com,...`
  - Line 47: `AWS_S3_BUCKET=ewura-hub-prod` → `allen-datahub-prod`

- **[.env.render](.env.render)** - Render deployment config
  - Line 14: MongoDB URI reference
  - Line 20: `FRONTEND_URL=https://ewura-hub.vercel.app` → needs appropriate URL
  - Line 21: `ALLOWED_ORIGINS` reference
  - Line 37: `AWS_S3_BUCKET=ewura-hub-prod`

- **[.env.example](.env.example)** - Example environment file
  - Line 3: `SESSION_SECRET=ewura-hub-dev-secret-change-in-prod` → `allen-datahub-dev-secret-change-in-prod`
  - Line 6: Comment reference
  - Line 9: `VITE_APP_NAME=Ewura Hub` → `Allen DataHub`

- **[frontend/ewura-hub/.env.vercel](frontend/ewura-hub/.env.vercel)** - Vercel frontend config
  - Likely contains similar references

---

## 2. PACKAGE.JSON FILES (9 files)

All package.json files contain workspace/package names that reference "ewura-hub":

- **[package.json](package.json)** - Root workspace
  - May reference workspace filters

- **[frontend/ewura-hub/package.json](frontend/ewura-hub/package.json)**
  - Line 1: `"name": "@workspace/ewura-hub"` → `@workspace/allen-datahub`

- **[backend/api-server/package.json](backend/api-server/package.json)** - Check for references

- **[frontend/mockup-sandbox/package.json](frontend/mockup-sandbox/package.json)** - Check for references

- **[lib/api-spec/package.json](lib/api-spec/package.json)** - Check for references

- **[lib/api-client-react/package.json](lib/api-client-react/package.json)** - Check for references

- **[lib/api-zod/package.json](lib/api-zod/package.json)** - Check for references

- **[lib/db/package.json](lib/db/package.json)** - Check for references

- **[scripts/package.json](scripts/package.json)** - Check for references

---

## 3. CONFIGURATION FILES (4 files)

### Deployment & Build Config
- **[render.yaml](render.yaml)**
  - Line 3: `name: ewura-hub-api` → `allen-datahub-api`
  - Line 4: runtime spec
  - References to `ewura-hub-api` service name

- **[frontend/ewura-hub/vercel.json](frontend/ewura-hub/vercel.json)** - Vercel deployment config
  - Build and output configurations

- **[Dockerfile.frontend](Dockerfile.frontend)**
  - Line 14: `COPY frontend/ewura-hub ./frontend/ewura-hub` - Path references (folder rename)
  - Line 21: `RUN cd frontend/ewura-hub && \` - Path reference
  - Line 33: `COPY --from=builder /app/frontend/ewura-hub/dist/public` - Path reference

- **[docker-compose.prod.yml](docker-compose.prod.yml)** - Check for service names

---

## 4. SCRIPTS (1 file + paths)

- **[start.sh](start.sh)**
  - Line 2: `# Ewura Hub Wallet - Development Server Startup Script`
  - Line 6: `echo "🚀 Starting Ewura Hub Wallet Development Servers"`
  - Line 49: `cd "$SCRIPT_DIR/frontend/ewura-hub"` - Path reference

---

## 5. SOURCE CODE - BACKEND (3 files)

### TypeScript Backend Files
- **[backend/api-server/src/app.ts](backend/api-server/src/app.ts)**
  - Line 83: `const sessionSecret = process.env.SESSION_SECRET || "ewura-hub-dev-secret-change-in-prod";`
  - Line 85: Reference to the same secret
  - Line 94: `dbName: process.env.MONGODB_DB || "ewura-hub",` → `"allen-datahub"`

- **[backend/api-server/src/lib/seed.ts](backend/api-server/src/lib/seed.ts)**
  - Line 6: `email: "admin001@ewurahub.com"` → `admin001@allendatahub.com`
  - Line 7: `email: "admin002@ewurahub.com"` → `admin002@allendatahub.com`

- **[backend/api-server/src/migrate-vendor-ids.ts](backend/api-server/src/migrate-vendor-ids.ts)**
  - Line 38: `const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/ewura-hub";`

---

## 6. SOURCE CODE - GENERATED API FILES (Multiple)

### lib/api-zod/src/generated/ (Multiple files)
All files in this directory contain the header comment:
- `* Ewura Hub API - Airtime & Data selling platform` → `* Allen DataHub API - Airtime & Data selling platform`

Files include:
- api.ts
- types/healthStatus.ts
- types/orderStatus.ts
- types/initPaymentBody.ts
- types/user.ts
- types/getOrdersParams.ts
- types/userRole.ts
- types/verifyAgentBody.ts
- types/fundWalletBody.ts
- types/registerBodyRole.ts
- types/index.ts
- types/getProductsParams.ts
- types/adjustBalanceBody.ts
- types/walletTransactionType.ts
- types/getProductsNetwork.ts
- types/loginBody.ts
- types/productType.ts
- types/product.ts
- types/getWalletTransactionsParams.ts
- types/getAdminOrdersParams.ts
- types/adjustBalanceBodyType.ts
- types/orderNetwork.ts
- types/createOrderBodyPaymentMethod.ts

### lib/api-client-react/src/generated/
- api.ts - Line 5: API description comment
- api.schemas.ts - Line 5: API description comment

---

## 7. SOURCE CODE - FRONTEND (4 files)

### React/TSX Component Files
- **[frontend/ewura-hub/src/pages/register.tsx](frontend/ewura-hub/src/pages/register.tsx)**
  - Line 44: `toast({ title: "Account created!", description: "Welcome to Ewura Hub" });`
  - Line 62: `<span className="font-bold text-xl text-foreground">Ewura Hub</span>`

- **[frontend/ewura-hub/src/pages/home.tsx](frontend/ewura-hub/src/pages/home.tsx)**
  - Line 35: `Ewura Hub is the most reliable platform...`
  - Line 132: `<h2 className="text-3xl font-bold tracking-tight...">Choose how you use Ewura Hub</h2>`
  - Line 203: `Join thousands of users and agents who trust Ewura Hub...`

- **[frontend/ewura-hub/src/pages/login.tsx](frontend/ewura-hub/src/pages/login.tsx)**
  - Line 65: `<p className="text-white font-bold text-xl leading-tight">Ewura Hub</p>`
  - Line 126: `<span className="font-bold text-xl text-foreground">Ewura Hub</span>`

- **[frontend/ewura-hub/src/components/layout/AppLayout.tsx](frontend/ewura-hub/src/components/layout/AppLayout.tsx)**
  - Line 76: `<p className="font-bold text-sidebar-foreground text-base leading-tight">Ewura Hub</p>`
  - Line 215: `<span className="font-bold text-sm text-foreground">Ewura Hub</span>`

- **[frontend/ewura-hub/src/components/layout/Navbar.tsx](frontend/ewura-hub/src/components/layout/Navbar.tsx)**
  - Line 117: `<span className="font-bold text-xl tracking-tight hidden sm:inline-block">Ewura Hub</span>`
  - Line 166: `<span className="font-bold text-xl tracking-tight">Ewura Hub</span>`

---

## 8. DOCUMENTATION FILES (Multiple)

### Documentation referencing "Ewura Hub" or "ewura-hub"
- **[README.md](README.md)** - Line 1: `# EwuraDataHub`
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - 10+ references
- [DEPLOYMENT_VENDOR_SETUP.md](DEPLOYMENT_VENDOR_SETUP.md) - Multiple references
- [DEPLOYMENT_QUICK_REFERENCE.md](DEPLOYMENT_QUICK_REFERENCE.md) - Multiple references
- [DEPLOYMENT_QUICK_START.md](DEPLOYMENT_QUICK_START.md) - Multiple references
- [DEBUGGING.md](DEBUGGING.md) - Multiple references
- [QUICK_START.md](QUICK_START.md) - Multiple references
- [ISSUE_FIXED.md](ISSUE_FIXED.md) - File path references
- [PERFORMANCE.md](PERFORMANCE.md) - Possible references
- And others

---

## 9. FOLDER/PATH REFERENCES

The folder `frontend/ewura-hub/` itself needs to be renamed to `frontend/allen-datahub/`

This affects:
- All imports referencing `@workspace/ewura-hub`
- All file paths in documentation
- All build commands
- All deployment configurations

---

## MAPPING GUIDE

When renaming, use these patterns:

| Pattern | Find | Replace With |
|---------|------|--------------|
| **Folder** | `frontend/ewura-hub` | `frontend/allen-datahub` |
| **Package name** | `@workspace/ewura-hub` | `@workspace/allen-datahub` |
| **Service name** | `ewura-hub-api` | `allen-datahub-api` |
| **Database name** | `ewura-hub` | `allen-datahub` |
| **S3 bucket** | `ewura-hub-prod` | `allen-datahub-prod` |
| **Display name** | `Ewura Hub` | `Allen DataHub` |
| **App name env** | `VITE_APP_NAME=Ewura Hub` | `VITE_APP_NAME=Allen DataHub` |
| **Domain** | `ewuradatahub.com` | `allendatahub.com` |
| **URL prefix** | `api.ewuradatahub.com` | `api.allendatahub.com` |
| **Session secret** | `ewura-hub-dev-secret` | `allen-datahub-dev-secret` |
| **Email domain** | `@ewurahub.com` | `@allendatahub.com` |
| **API comment** | `Ewura Hub API` | `Allen DataHub API` |

---

## VENDOR-RELATED FILES

The following files specifically reference vendor/integration APIs (these should keep "VENDOR" as is):
- All files with `VENDOR_API_KEY` and `VENDOR_API_URL` variables
- Scripts with `vendorProductId` references
- Files related to third-party integrations (these are correct as-is)

---

## SUMMARY STATISTICS

- **Environment files to update**: 4
- **Package.json files to check**: 9
- **Configuration files to update**: 4
- **Script files to update**: 1
- **Backend source files to update**: 3
- **Generated API files to update**: ~20+ files
- **Frontend component files to update**: 4
- **Documentation files to update**: 8+
- **Folders to rename**: 1 major folder (`frontend/ewura-hub/`)
- **Total files requiring changes**: 50+

