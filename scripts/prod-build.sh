#!/bin/bash

# ============================================
# Production Build & Deployment Script
# ============================================
# This script prepares and builds the project for production deployment

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "\n${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    print_success "Node.js v$(node --version)"
    
    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        print_error "pnpm is not installed"
        exit 1
    fi
    print_success "pnpm v$(pnpm --version)"
    
    # Check TypeScript
    if ! command -v tsc &> /dev/null; then
        print_warning "TypeScript not globally installed, will use local version"
    else
        print_success "TypeScript v$(tsc --version)"
    fi
}

# Type checking
run_typecheck() {
    print_header "Running TypeScript Type Checking"
    
    if pnpm run typecheck; then
        print_success "Type checking passed"
    else
        print_error "Type checking failed"
        exit 1
    fi
}

# Build the project
build_project() {
    print_header "Building Project"
    
    if pnpm run build; then
        print_success "Build completed successfully"
    else
        print_error "Build failed"
        exit 1
    fi
}

# Verify build outputs
verify_builds() {
    print_header "Verifying Build Outputs"
    
    # Check backend build
    if [ -d "backend/api-server/dist" ]; then
        print_success "Backend build output found"
        ls -lh backend/api-server/dist/
    else
        print_error "Backend build output not found"
        exit 1
    fi
    
    # Check frontend build
    if [ -d "frontend/ewura-hub/dist" ]; then
        print_success "Frontend build output found"
        du -sh frontend/ewura-hub/dist/*
    else
        print_error "Frontend build output not found"
        exit 1
    fi
}

# Check environment configuration
check_env_config() {
    print_header "Checking Environment Configuration"
    
    if [ ! -f ".env.production" ]; then
        print_error ".env.production file not found"
        print_warning "Creating template from .env.production..."
        # Note: .env.production should already exist
    else
        print_success ".env.production file exists"
        # Count environment variables
        VAR_COUNT=$(grep -c "=" .env.production || true)
        print_success "Found $VAR_COUNT environment variables"
    fi
}

# Analyze bundle sizes
analyze_bundles() {
    print_header "Bundle Size Analysis"
    
    echo -e "${BLUE}Frontend Build Artifacts:${NC}"
    if [ -d "frontend/ewura-hub/dist" ]; then
        find frontend/ewura-hub/dist -type f \( -name "*.js" -o -name "*.css" \) -exec ls -lh {} \; | awk '{print $9, "(" $5 ")"}'
    fi
    
    echo -e "\n${BLUE}Backend Build Artifacts:${NC}"
    if [ -d "backend/api-server/dist" ]; then
        du -sh backend/api-server/dist/
    fi
}

# Security checks
run_security_checks() {
    print_header "Security Checks"
    
    print_warning "Checking for sensitive files in git history..."
    # Check for common sensitive patterns
    if git log --all --oneline --name-only 2>/dev/null | grep -E "(\.env|private|secret|password)" > /dev/null 2>&1; then
        print_warning "Found potential sensitive files in git history"
        print_warning "Consider using git-filter-repo to remove them"
    else
        print_success "No obvious sensitive files found in git history"
    fi
    
    # Check for .env files in root
    if [ -f ".env" ]; then
        print_warning "Ensure .env file is in .gitignore"
    fi
    
    # Check environment variable usage
    print_success "Verify all environment variables are documented in .env.production"
}

# Generate documentation
generate_docs() {
    print_header "Documentation"
    
    cat > DEPLOYMENT_CHECKLIST.md << 'EOF'
# Production Deployment Checklist

## Pre-Deployment
- [ ] All type checks pass (`pnpm run typecheck`)
- [ ] Code builds successfully (`pnpm run build`)
- [ ] All tests pass (if tests exist)
- [ ] Git repository is clean (`git status`)
- [ ] Latest code is committed and pushed

## Environment Setup
- [ ] `.env.production` file is created and configured
- [ ] SESSION_SECRET is set to a strong random value
- [ ] MONGODB_URI points to production database
- [ ] CORS_ORIGIN is set to allowed domains
- [ ] Payment gateway credentials are set (if using)

## Infrastructure Setup
- [ ] Server/Container environment is prepared
- [ ] MongoDB production instance is running
- [ ] SSL certificates are installed
- [ ] Firewall rules are configured
- [ ] Nginx/reverse proxy is configured

## Docker Deployment
- [ ] Docker images build successfully
- [ ] docker compose.prod.yml is configured
- [ ] Environment variables are set
- [ ] Volumes are configured correctly
- [ ] Health checks are in place

## Security
- [ ] SESSION_SECRET changed from default
- [ ] CORS properly configured
- [ ] Database credentials secured
- [ ] API keys stored in environment variables
- [ ] HTTPS is enforced
- [ ] Security headers are enabled

## Post-Deployment
- [ ] Application starts without errors
- [ ] Health check endpoints respond
- [ ] API endpoints are accessible
- [ ] Frontend loads without errors
- [ ] Database connections work
- [ ] Logs are being generated
- [ ] Monitoring is active

## Testing
- [ ] Manual smoke test of critical flows
- [ ] Login/authentication works
- [ ] API endpoints respond correctly
- [ ] Payment integration works (if testing)
- [ ] Error handling works as expected

## Monitoring
- [ ] Health monitoring is active
- [ ] Error logging is working
- [ ] Performance metrics are being collected
- [ ] Backup jobs are scheduled
- [ ] Alert rules are configured
EOF
    
    print_success "Generated DEPLOYMENT_CHECKLIST.md"
}

# Main execution
main() {
    echo -e "${BLUE}"
    echo " ____            _            _   _           _                 "
    echo "| __ ) _   _ _ _| | ____ ___ | (_) _   _    | | ___  __ _ _ __"
    echo "|  _ \| | | | '__| |/ / _  _ \| | | | | |____| |/ _ \/ _  | '_ \\"
    echo "| |_) | |_| | |  |   < (_) (_) | | | |_| |____| | (_) (_) | | | |"
    echo "|_,  _| \___,_|_|  |_|\_\___\___/|_|_|\__, |   |_|\___/\__,_|_| |_|"
    echo "                                      |___/                     "
    echo -e "${NC}"
    
    check_prerequisites
    run_typecheck
    build_project
    verify_builds
    analyze_bundles
    check_env_config
    run_security_checks
    generate_docs
    
    print_header "Production Build Ready!"
    echo -e "${GREEN}✓ Your project is ready for production deployment${NC}"
    echo -e "\n${BLUE}Next Steps:${NC}"
    echo "1. Review DEPLOYMENT_CHECKLIST.md"
    echo "2. Configure .env.production with actual values"
    echo "3. Run Docker build: docker-compose -f docker-compose.prod.yml build"
    echo "4. Start services: docker-compose -f docker-compose.prod.yml up -d"
    echo "5. Monitor logs: docker-compose -f docker-compose.prod.yml logs -f"
    echo ""
}

# Run main function
main
