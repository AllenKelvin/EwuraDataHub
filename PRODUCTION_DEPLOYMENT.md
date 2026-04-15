# 🚀 Production Deployment Guide - Ewura Hub

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Deployment Methods](#deployment-methods)
5. [Post-Deployment](#post-deployment)
6. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Pre-Deployment Checklist

### Security ✅
- [ ] Change all default secrets (SESSION_SECRET, API keys)
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure CORS with specific domains only
- [ ] Review and update CORS origin settings
- [ ] Store sensitive data in environment variables only
- [ ] Disable debug mode (NODE_ENV=production)
- [ ] Review security headers configuration
- [ ] Set up rate limiting
- [ ] Enable HTTPS redirect

### Performance ✅
- [ ] Run production build: `pnpm build`
- [ ] Test minified/optimized bundle
- [ ] Enable HTTP/2
- [ ] Configure caching headers
- [ ] Set up CDN for static assets
- [ ] Optimize database indexing
- [ ] Configure connection pooling

### Testing ✅
- [ ] Run all tests: `pnpm test` (if available)
- [ ] Test API endpoints with production configs
- [ ] Verify authentication flows work
- [ ] Test payment gateway integration
- [ ] Load test the application
- [ ] Check database migration scripts

### Documentation ✅
- [ ] Document all environment variables
- [ ] Create deployment runbook
- [ ] Document rollback procedures
- [ ] Create incident response procedures

---

## Environment Setup

### 1. Production Environment Variables

Create `.env.production` in root directory with these variables:

```bash
# Copy from template
cp .env.production.template .env.production

# Edit with actual production values
nano .env.production
```

**Critical Variables:**
```
NODE_ENV=production
LOG_LEVEL=info
SESSION_SECRET=<generate-strong-random-secret>
MONGODB_URI=<your-mongodb-production-uri>
VITE_API_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

### 2. Generate Secrets

```bash
# Generate secure random SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate API Key
node -e "console.log(require('crypto').randomBytes(24).toString('base64'))"
```

---

## Database Setup

### MongoDB Atlas (Recommended for Production)

1. **Create Cluster**
   - Go to https://www.mongodb.com/cloud/atlas
   - Create new cluster (M0 free tier or higher)
   - Choose production-grade backup options

2. **Database Configuration**
   ```
   Cluster Name: ewura-hub-prod
   Region: Choose closest to your users
   Backup: Enable (automatic daily)
   ```

3. **Get Connection String**
   - Click "Connect"
   - Select "Connect Your Application"
   - Copy connection string
   - Add to `.env.production` as MONGODB_URI

4. **Create Admin User**
   - Database Access → Add New User
   - Set strong password
   - Grant admin privileges

5. **Whitelist IPs**
   - Network Access → Add IP Address
   - For cloud: 0.0.0.0/0 (managed by cloud provider)
   - For on-premise: Add specific IPs only

### Database Backup

```bash
# Backup local database
mongodump --uri="mongodb://localhost:27017/ewura-hub-prod" \
          --archive=ewura-backup-$(date +%Y%m%d).archive

# Restore if needed
mongorestore --uri="mongodb://localhost:27017/ewura-hub-prod" \
             --archive=ewura-backup-20240101.archive
```

---

## Deployment Methods

### Option 1: Docker (Recommended)

#### Build Docker Image

```bash
# Build backend image
docker build -t ewura-hub-api:latest backend/api-server

# Build frontend image
docker build -t ewura-hub-web:latest frontend/ewura-hub
```

#### Docker Compose (Production)

Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"
    restart: always

  api:
    image: ewura-hub-api:latest
    environment:
      NODE_ENV: production
      PORT: 8080
      MONGODB_URI: mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/ewura-hub
      SESSION_SECRET: ${SESSION_SECRET}
      PAYSTACK_PUBLIC_KEY: ${PAYSTACK_PUBLIC_KEY}
      PAYSTACK_SECRET_KEY: ${PAYSTACK_SECRET_KEY}
    ports:
      - "8080:8080"
    depends_on:
      - mongodb
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  web:
    image: ewura-hub-web:latest
    environment:
      VITE_API_URL: https://api.yourdomain.com
      NODE_ENV: production
    ports:
      - "3000:5173"
    depends_on:
      - api
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5173"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - api
      - web
    restart: always

volumes:
  mongodb_data:
```

#### Run Production Environment

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

### Option 2: Traditional Server Deployment (VPS/Dedicated)

#### Using PM2 for Process Management

```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'ewura-api',
      script: './dist/index.mjs',
      cwd: './backend/api-server',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 8080
      },
      output: './logs/api-out.log',
      error: './logs/api-error.log',
      merge_logs: true
    },
    {
      name: 'ewura-web',
      script: 'node_modules/.bin/vite',
      args: 'preview',
      cwd: './frontend/ewura-hub',
      env: {
        NODE_ENV: 'production',
        PORT: 5173
      },
      output: './logs/web-out.log',
      error: './logs/web-error.log'
    }
  ]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 config to restart on reboot
pm2 startup
pm2 save

# View logs
pm2 logs

# Monitor
pm2 monit
```

#### Nginx Reverse Proxy

Create `/etc/nginx/sites-available/ewura-hub`:

```nginx
upstream api {
    server localhost:8080;
}

upstream web {
    server localhost:5173;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Configuration
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # API Proxy
    location /api/ {
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend
    location / {
        proxy_pass http://web;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Health Check
    location /health {
        proxy_pass http://api;
        access_log off;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/ewura-hub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Install SSL Certificate (Let's Encrypt)

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com
```

### Option 3: Cloud Platforms

#### Vercel (Frontend Only)

1. Push code to GitHub
2. Go to https://vercel.com
3. Import project
4. Set environment variables
5. Deploy automatically on push

#### Railway (Full Stack)

1. Connect GitHub repository
2. Create services for:
   - MongoDB (add from marketplace)
   - Backend API
   - Frontend
3. Set environment variables for each service
4. Deploy with one click

#### Heroku (Full Stack - requires buildpacks)

```bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login

# Create app
heroku create ewura-hub-prod

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set SESSION_SECRET=your-secret
heroku config:set MONGODB_URI=your-uri

# Deploy
git push heroku main
```

---

## Post-Deployment

### 1. Verify Everything is Running

```bash
# Check API health
curl https://api.yourdomain.com/api/health

# Check frontend is accessible
curl https://yourdomain.com

# Check SSL certificate
openssl s_client -connect api.yourdomain.com:443 -showcerts
```

### 2. Test Critical Features

- [ ] User registration and login
- [ ] Product listing and search
- [ ] Order creation and payment
- [ ] Wallet functionality
- [ ] Admin panel access
- [ ] Error handling and logging

### 3. Set Up Monitoring

```bash
# Monitor logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Or with PM2
pm2 logs

# Monitor system resources
htop
```

### 4. Configure Backups

```bash
# Add to crontab for daily backups
0 2 * * * mongodump --uri="$MONGODB_URI" --archive=/backups/ewura-$(date +\%Y\%m\%d).archive

# Upload to S3
aws s3 sync /backups s3://your-backup-bucket/ewura-hub
```

---

## Monitoring & Maintenance

### Health Checks

Configure automated health monitoring:

```bash
# Setup with Uptime Robot, Datadog, or similar
POST https://api.yourdomain.com/api/health
Expected Response: { status: "ok" }
Check every 5 minutes
Alert if fails > 3 times
```

### Log Aggregation

Use centralized logging:
- **ELK Stack**: Elasticsearch, Logstash, Kibana
- **Datadog**: Complete monitoring solution
- **Papertrail**: Simple cloud logging
- **LogRocket**: Frontend error tracking

### Performance Monitoring

```bash
# Use Artillery for load testing
npm install -g artillery

# Create load.yml
endpoints:
  - https://api.yourdomain.com

scenarios:
  - name: "API Load Test"
    flow:
      - get:
          url: "/api/products"
      - post:
          url: "/api/orders"
          json:
            productId: "123"
            quantity: 1

# Run test
artillery run load.yml
```

### Scheduled Tasks

Set up cron jobs for:
- Database backups (daily)
- Log rotation (daily)
- Cache cleanup (weekly)
- Security updates (weekly)

```bash
# Check cron status
crontab -l

# Edit cron
crontab -e

# Example: Daily backup at 2 AM
0 2 * * * /path/to/backup-script.sh
```

---

## Troubleshooting

### Common Issues

**502 Bad Gateway**
```bash
# Check if API is running
pm2 logs ewura-api

# Restart service
pm2 restart ewura-api
```

**High Memory Usage**
```bash
# Identify process
pm2 monit

# Restart service
pm2 restart all

# Check for memory leaks
pm2 kill && pm2 start ecosystem.config.js
```

**Database Connection Errors**
```bash
# Verify connectivity
mongo "mongodb+srv://user:password@cluster.mongodb.net/ewura-hub"

# Check connection string in .env
cat .env.production | grep MONGODB_URI

# Test with curl
curl -v mongodb+srv://user:password@cluster.mongodb.net/ewura-hub
```

**SSL Certificate Issues**
```bash
# Check certificate expiration
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/cert.pem -noout -dates

# Renew certificate
sudo certbot renew

# Check Nginx configuration
sudo nginx -t
```

---

## Rollback Procedure

If deployment fails:

```bash
# Stop current deployment
docker-compose -f docker-compose.prod.yml down
# OR
pm2 stop all

# Restore from backup
git checkout previous-tag
pnpm install
pnpm build

# Restart services
docker-compose -f docker-compose.prod.yml up -d
# OR
pm2 start ecosystem.config.js

# Verify restoration
curl https://yourdomain.com
```

---

## Support & Resources

- **MongoDB Docs**: https://docs.mongodb.com/
- **Express.js**: https://expressjs.com/
- **React Docs**: https://react.dev/
- **Vite Guide**: https://vitejs.dev/
- **Docker**: https://docs.docker.com/
- **Nginx**: https://nginx.org/en/docs/

---

## Maintenance Schedule

### Daily
- Monitor error logs
- Check health endpoints
- Review performance metrics

### Weekly
- Review and apply security patches
- Check disk space
- Test backups
- Review error trends

### Monthly
- Update dependencies
- Performance analysis
- Security audit
- Capacity planning

### Quarterly
- Full system health review
- Disaster recovery drill
- Load testing
- Architecture review
