# Ewura Hub Wallet - Setup & Running Guide

## ✅ Current Status
- **Backend API**: Running on `http://localhost:8080`
- **Frontend**: Running on `http://localhost:5173` (or 5174/5175 if ports are in use)
- **TypeScript**: No compilation errors
- **Native Modules**: Properly installed for macOS

## 🚀 Quick Start

### Prerequisites
- Node.js v24.14.1+
- pnpm v10.33.0+
- macOS (Darwin x64)

### Installation
```bash
cd /Users/allenkelvin/Desktop/Ewura-Hub-Wallet
pnpm install
```

### Running Development Servers

#### Option 1: Run both servers together (from root)
```bash
pnpm dev
```

#### Option 2: Run servers separately

**Backend API (Port 8080):**
```bash
cd backend/api-server
PORT=8080 NODE_ENV=development pnpm dev
```

**Frontend (Port 5173):**
```bash
cd frontend/ewura-hub
PORT=5173 BASE_PATH=/ pnpm dev
```

### Accessing the Application
- **Frontend**: http://localhost:5173
- **API**: http://localhost:8080
- **Network Access**: http://192.168.0.114:5173 (from other devices)

## 📁 Project Structure
```
Ewura-Hub-Wallet/
├── backend/
│   └── api-server/          # Express.js API server
├── frontend/
│   ├── ewura-hub/           # Main React app
│   └── mockup-sandbox/      # Component preview
├── lib/
│   ├── api-client-react/    # Generated API client
│   ├── api-spec/            # OpenAPI specification
│   ├── api-zod/             # Zod validation schemas
│   └── db/                  # Database schema (Drizzle)
└── scripts/                 # Utility scripts
```

## 🔧 Configuration Files

### Environment Variables (.env)
```env
PORT=8080
NODE_ENV=development
SESSION_SECRET=ewura-hub-dev-secret-change-in-prod
VITE_API_URL=http://localhost:8080
VITE_APP_NAME=Ewura Hub
```

For MongoDB support, add:
```env
MONGODB_URI=mongodb://localhost:27017/ewura-hub
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill processes using port
lsof -ti :8080 | xargs kill -9
lsof -ti :5173 | xargs kill -9
```

### Missing Dependencies
```bash
# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### TypeScript Errors
```bash
# Rebuild project
pnpm run build
```

## 📦 Technologies Used
- **Frontend**: React 19.1.0, Vite 7.3.2, Tailwind CSS 4.1.14
- **Backend**: Express.js 5, Mongoose 9, Pino logging
- **Build**: esbuild, Rollup with native macOS optimizations
- **Package Manager**: pnpm workspaces

## ✨ Features
- **Responsive UI**: Built with Radix UI components
- **Type Safety**: Full TypeScript support
- **API Client**: Auto-generated from OpenAPI spec
- **Dark Mode**: Next.js themes integration
- **Real-time Updates**: React Query for data synchronization

## 📝 Scripts

From root directory:
```bash
pnpm dev              # Start all dev servers
pnpm build            # Build all packages
pnpm typecheck        # Check TypeScript in all packages
```

## 🔐 Security Notes
- **Session Secret**: Change in production
- **MongoDB**: Enable for persistence in production
- **CORS**: Currently allows all origins (change in production)
- **Minimum Release Age**: 1440 minutes (1 day) for npm packages

---

**Last Updated**: April 13, 2026
**Status**: ✅ Fully Operational
