#!/bin/bash

# 🚀 Quick Deployment Script for Render + Vercel
# This script prepares your project for deployment

set -e

echo "📦 Ewura Hub - Render & Vercel Deployment Preparation"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check prerequisites
echo -e "${BLUE}Step 1: Checking prerequisites...${NC}"
command -v git >/dev/null 2>&1 || { echo "❌ Git is required but not installed."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm is required but not installed."; exit 1; }
echo -e "${GREEN}✅ All prerequisites installed${NC}"
echo ""

# Step 2: Verify repository
echo -e "${BLUE}Step 2: Verifying Git repository...${NC}"
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Not in a Git repository"
    exit 1
fi
echo -e "${GREEN}✅ Git repository verified${NC}"
echo ""

# Step 3: Install dependencies
echo -e "${BLUE}Step 3: Installing dependencies...${NC}"
pnpm install --frozen-lockfile
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 4: Build backend
echo -e "${BLUE}Step 4: Building backend (Render)...${NC}"
cd backend/api-server
pnpm build
cd ../..
echo -e "${GREEN}✅ Backend built successfully${NC}"
echo ""

# Step 5: Build frontend
echo -e "${BLUE}Step 5: Building frontend (Vercel)...${NC}"
cd frontend/ewura-hub
pnpm build
cd ../..
echo -e "${GREEN}✅ Frontend built successfully${NC}"
echo ""

# Step 6: Verify environment files
echo -e "${BLUE}Step 6: Checking environment templates...${NC}"
if [ -f ".env.render" ]; then
    echo -e "${GREEN}✅ .env.render found${NC}"
else
    echo -e "${YELLOW}⚠️  .env.render not found${NC}"
fi

if [ -f "frontend/ewura-hub/.env.vercel" ]; then
    echo -e "${GREEN}✅ .env.vercel found${NC}"
else
    echo -e "${YELLOW}⚠️  .env.vercel not found${NC}"
fi
echo ""

# Step 7: Verify deployment files
echo -e "${BLUE}Step 7: Checking deployment configurations...${NC}"
files=("render.yaml" "frontend/ewura-hub/vercel.json" ".nvmrc" "DEPLOYMENT_RENDER_VERCEL.md")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file found${NC}"
    else
        echo -e "${YELLOW}⚠️  $file not found${NC}"
    fi
done
echo ""

# Step 8: Git status
echo -e "${BLUE}Step 8: Checking Git status...${NC}"
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${GREEN}✅ Working tree clean${NC}"
else
    echo -e "${YELLOW}⚠️  Uncommitted changes detected:${NC}"
    git status --short
    echo ""
    read -p "Continue with uncommitted changes? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
echo ""

# Step 9: Summary
echo -e "${BLUE}Step 9: Deployment Summary${NC}"
echo "=================================================="
echo -e "${GREEN}✅ Backend ready for Render deployment${NC}"
echo "   Command: cd backend/api-server && pnpm start"
echo ""
echo -e "${GREEN}✅ Frontend ready for Vercel deployment${NC}"
echo "   Command: cd frontend/ewura-hub && pnpm build"
echo ""
echo -e "${GREEN}✅ All systems ready for production!${NC}"
echo ""

# Step 10: Next steps
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Review DEPLOYMENT_RENDER_VERCEL.md for detailed instructions"
echo "2. Create Render account: https://render.com"
echo "3. Create Vercel account: https://vercel.com"
echo "4. Set up MongoDB Atlas: https://mongodb.com/cloud"
echo "5. Configure environment variables on each platform"
echo "6. Deploy and test!"
echo ""

echo -e "${GREEN}🎉 Preparation complete!${NC}"
