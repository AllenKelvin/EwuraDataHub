#!/bin/bash

# ============================================
# Production Environment Setup Script
# ============================================
# This script sets up all necessary environment configurations

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Generate secure random secret
generate_secret() {
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
}

# Setup environment files
setup_env_files() {
    print_header "Setting Up Environment Files"
    
    # Check if .env.production exists
    if [ -f ".env.production" ]; then
        print_success ".env.production already exists"
        read -p "Do you want to recreate it? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return
        fi
    fi
    
    # Prompt for production values
    echo -e "${BLUE}Enter production configuration values:${NC}\n"
    
    read -p "MongoDB Connection URI (mongodb+srv://user:pass@cluster.mongodb.net/ewura-hub): " MONGODB_URI
    MONGODB_URI=${MONGODB_URI:-"mongodb+srv://user:pass@cluster.mongodb.net/ewura-hub"}
    
    read -p "Frontend URL (https://yourdomain.com): " FRONTEND_URL
    FRONTEND_URL=${FRONTEND_URL:-"https://yourdomain.com"}
    
    read -p "API URL (https://api.yourdomain.com): " VITE_API_URL
    VITE_API_URL=${VITE_API_URL:-"https://api.yourdomain.com"}
    
    read -p "Paystack Public Key (optional, press Enter to skip): " PAYSTACK_PUBLIC_KEY
    
    read -p "Paystack Secret Key (optional, press Enter to skip): " PAYSTACK_SECRET_KEY
    
    # Generate secrets
    SESSION_SECRET=$(generate_secret)
    
    # Create .env.production file
    cat > .env.production << EOF
# Production Configuration - Generated on $(date)

# Server
PORT=8080
NODE_ENV=production
LOG_LEVEL=info

# Security
SESSION_SECRET=${SESSION_SECRET}

# Database
MONGODB_URI=${MONGODB_URI}

# Frontend
VITE_API_URL=${VITE_API_URL}
VITE_APP_NAME=Ewura Hub
FRONTEND_URL=${FRONTEND_URL}

# CORS
CORS_ORIGIN=${FRONTEND_URL}

# Payment Gateway
PAYSTACK_PUBLIC_KEY=${PAYSTACK_PUBLIC_KEY}
PAYSTACK_SECRET_KEY=${PAYSTACK_SECRET_KEY}

# Optional Services
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password

# File Storage
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_REGION=us-east-1
# AWS_S3_BUCKET=

# Error Tracking
# SENTRY_DSN=
EOF
    
    print_success ".env.production created successfully"
    echo -e "${YELLOW}Session Secret: ${SESSION_SECRET}${NC}"
    echo -e "${YELLOW}Make sure to back up this secret securely!${NC}"
}

# Create SSL directory structure
setup_ssl_dirs() {
    print_header "Setting Up SSL Directory Structure"
    
    mkdir -p ssl
    mkdir -p certbot/conf
    mkdir -p certbot/www
    
    print_success "Created ssl and certbot directories"
}

# Create Docker directories
setup_docker_dirs() {
    print_header "Setting Up Docker Directories"
    
    mkdir -p docker-data/mongodb
    mkdir -p docker-data/logs
    
    print_success "Created docker-data directories"
}

# Generate example Nginx config
setup_nginx() {
    print_header "Setting Up Nginx Configuration"
    
    if [ -f "nginx.conf" ]; then
        print_success "nginx.conf already exists"
    else
        print_error "nginx.conf not found - please ensure it exists in root directory"
    fi
}

# Setup PM2 ecosystem file
setup_pm2() {
    print_header "Setting Up PM2 Configuration"
    
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: "ewura-api",
      script: "./backend/api-server/dist/index.mjs",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 8080
      },
      merge_logs: true,
      max_memory_restart: "500M",
      error_file: "logs/api-error.log",
      out_file: "logs/api-out.log"
    },
    {
      name: "ewura-web",
      script: "./frontend/ewura-hub/dist/public/index.html",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 5173
      },
      merge_logs: true,
      error_file: "logs/web-error.log",
      out_file: "logs/web-out.log"
    }
  ]
};
EOF
    
    print_success "ecosystem.config.js created"
}

# Create systemd service files
setup_systemd() {
    print_header "Setting Up Systemd Service Files"
    
    cat > ewura-api.service << 'EOF'
[Unit]
Description=Ewura Hub API Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/home/deploy/ewura-hub
Environment="NODE_ENV=production"
Environment="PATH=/usr/bin:/usr/local/bin"
ExecStart=/usr/bin/node --enable-source-maps /home/deploy/ewura-hub/backend/api-server/dist/index.mjs
Restart=always
RestartSec=10s
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ewura-api

[Install]
WantedBy=multi-user.target
EOF
    
    cat > ewura-web.service << 'EOF'
[Unit]
Description=Ewura Hub Web Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/home/deploy/ewura-hub
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npm run serve --prefix /home/deploy/ewura-hub/frontend/ewura-hub
Restart=always
RestartSec=10s
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ewura-web

[Install]
WantedBy=multi-user.target
EOF
    
    print_success "Created systemd service files"
    echo -e "${YELLOW}To install services, run:${NC}"
    echo "sudo cp ewura-api.service /etc/systemd/system/"
    echo "sudo cp ewura-web.service /etc/systemd/system/"
    echo "sudo systemctl daemon-reload"
    echo "sudo systemctl enable ewura-api ewura-web"
}

# Create backup script
setup_backup() {
    print_header "Setting Up Backup Script"
    
    mkdir -p scripts/backups
    
    cat > scripts/backups/backup-db.sh << 'EOF'
#!/bin/bash

# Backup MongoDB database
BACKUP_DIR="./backups/mongodb"
mkdir -p "$BACKUP_DIR"

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/ewura-backup-$DATE.archive"

echo "Creating MongoDB backup: $BACKUP_FILE"

mongodump --uri="$MONGODB_URI" \
          --archive="$BACKUP_FILE" && \
echo "Backup completed successfully" || \
echo "Backup failed"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "ewura-backup-*.archive" -mtime +7 -delete

# Upload to S3 (optional)
# aws s3 cp "$BACKUP_FILE" s3://your-bucket/backups/
EOF
    
    chmod +x scripts/backups/backup-db.sh
    print_success "Created backup script"
}

# Setup cron jobs
setup_cron() {
    print_header "Setting Up Cron Jobs"
    
    echo -e "${BLUE}Add these to your crontab with: crontab -e${NC}\n"
    echo "# Daily database backup at 2 AM"
    echo "0 2 * * * cd /path/to/ewura-hub && ./scripts/backups/backup-db.sh"
    echo ""
    echo "# SSL certificate renewal (handled by certbot)"
    echo "0 3 * * * certbot renew --quiet"
    echo ""
}

# Create health check script
setup_health_check() {
    print_header "Setting Up Health Check Script"
    
    cat > scripts/health-check.sh << 'EOF'
#!/bin/bash

echo "=== Ewura Hub Health Check ==="
echo ""

# Check API
echo "Checking API..."
if curl -f http://localhost:8080/api/health > /dev/null 2>&1; then
    echo "✓ API is healthy"
else
    echo "✗ API health check failed"
fi

# Check Frontend
echo "Checking Frontend..."
if curl -f http://localhost:5173 > /dev/null 2>&1; then
    echo "✓ Frontend is healthy"
else
    echo "✗ Frontend health check failed"
fi

# Check MongoDB
echo "Checking MongoDB..."
if mongostat --noheaders 1 &>/dev/null; then
    echo "✓ MongoDB is running"
else
    echo "✗ MongoDB not accessible"
fi

echo ""
echo "=== End Health Check ==="
EOF
    
    chmod +x scripts/health-check.sh
    print_success "Created health check script"
}

# Main execution
main() {
    echo -e "${BLUE}"
    echo " ____            _            Production Setup"
    echo "|  _ \ _ __ ___ | |__         "
    echo "| |_) | '__/ _ \| '_ \       "
    echo "|  __/| | | (_) | |_) |      "
    echo "|_|   |_|  \___/|_.__/       "
    echo -e "${NC}"
    
    setup_env_files
    setup_ssl_dirs
    setup_docker_dirs
    setup_nginx
    setup_pm2
    setup_systemd
    setup_backup
    setup_cron
    setup_health_check
    
    print_header "Production Setup Complete!"
    
    echo -e "${GREEN}✓ All production configurations have been created${NC}\n"
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Review and secure all created configuration files"
    echo "2. Update .env.production with real values if needed"
    echo "3. Run: pnpm run build"
    echo "4. Either:"
    echo "   a) Docker: docker-compose -f docker-compose.prod.yml up -d"
    echo "   b) PM2: pm2 start ecosystem.config.js"
    echo "   c) Systemd: sudo systemctl start ewura-api ewura-web"
    echo "5. Monitor: ./scripts/health-check.sh"
    echo ""
}

main
