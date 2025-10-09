# Deployment Guide

## Overview
This guide covers deploying PattyShack to production environments.

## Prerequisites

### System Requirements
- Node.js 14.x or higher
- PostgreSQL 12.x or higher (recommended for production)
- Redis (optional, for caching)
- 2GB RAM minimum
- 10GB storage minimum

### Environment Setup
1. Production server (Linux recommended)
2. SSL certificate for HTTPS
3. Domain name
4. Database server
5. Email service (SendGrid, AWS SES, etc.)
6. SMS service (Twilio, etc.)

## Configuration

### Environment Variables

Create a `.env` file with production settings:

```env
# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database Configuration
DB_DIALECT=postgres
DB_HOST=your-db-host.com
DB_PORT=5432
DB_NAME=pattyshack_prod
DB_USER=pattyshack_user
DB_PASSWORD=secure-password-here
DB_SSL=true
DB_POOL_MIN=5
DB_POOL_MAX=20

# JWT Configuration
JWT_SECRET=generate-strong-secret-key-here
JWT_EXPIRES_IN=24h

# CORS Configuration
CORS_ORIGIN=https://your-domain.com

# Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/var/uploads

# Email Configuration
EMAIL_PROVIDER=sendgrid
EMAIL_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@pattyshack.com

# SMS Configuration
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info

# Redis (optional)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=redis-password
```

## Deployment Options

### Option 1: Traditional VPS/Server

#### 1. Prepare Server
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
sudo apt install -y nginx

# Install PM2 (Process Manager)
sudo npm install -g pm2
```

#### 2. Setup Application
```bash
# Clone repository
git clone https://github.com/justinnewbold/PattyShack.git
cd PattyShack

# Install dependencies
npm install --production

# Setup environment
cp .env.example .env
nano .env  # Edit with production values

# Run database migrations
npm run migrate

# Start with PM2
pm2 start src/server/index.js --name pattyshack
pm2 save
pm2 startup
```

#### 3. Configure Nginx
```nginx
# /etc/nginx/sites-available/pattyshack
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 4. Enable and Start Nginx
```bash
sudo ln -s /etc/nginx/sites-available/pattyshack /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Option 2: Docker

#### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "src/server/index.js"]
```

#### docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:14-alpine
    environment:
      - POSTGRES_DB=pattyshack
      - POSTGRES_USER=pattyshack
      - POSTGRES_PASSWORD=secure-password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
```

#### Deploy with Docker
```bash
docker-compose up -d
```

### Option 3: Cloud Platforms

#### AWS Elastic Beanstalk
```bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init -p node.js-18 pattyshack

# Create environment
eb create pattyshack-prod

# Deploy
eb deploy
```

#### Heroku
```bash
# Install Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Login
heroku login

# Create app
heroku create pattyshack-prod

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Deploy
git push heroku main

# Scale
heroku ps:scale web=1
```

#### Google Cloud Run
```bash
# Build container
gcloud builds submit --tag gcr.io/PROJECT_ID/pattyshack

# Deploy
gcloud run deploy pattyshack \
  --image gcr.io/PROJECT_ID/pattyshack \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## Database Setup

### PostgreSQL Production Setup
```sql
-- Create database
CREATE DATABASE pattyshack_prod;

-- Create user
CREATE USER pattyshack_user WITH PASSWORD 'secure-password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE pattyshack_prod TO pattyshack_user;

-- Enable required extensions
\c pattyshack_prod
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Run Migrations
```bash
npm run migrate
```

### Backup Strategy
```bash
# Automated daily backups
0 2 * * * /usr/bin/pg_dump pattyshack_prod | gzip > /backups/pattyshack_$(date +\%Y\%m\%d).sql.gz
```

## Security Hardening

### 1. Firewall Configuration
```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 2. SSL Certificate (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 3. Security Headers
Add to Nginx configuration:
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
```

### 4. Rate Limiting
```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /api/ {
    limit_req zone=api burst=20;
}
```

## Monitoring

### PM2 Monitoring
```bash
# View logs
pm2 logs pattyshack

# Monitor resources
pm2 monit

# View status
pm2 status
```

### Application Monitoring
- Set up Sentry for error tracking
- Configure application logging
- Monitor API response times
- Track database performance

### Server Monitoring
```bash
# Install monitoring tools
sudo apt install htop iotop nethogs

# Monitor system resources
htop
```

## Scaling

### Horizontal Scaling
```bash
# Run multiple instances with PM2
pm2 start src/server/index.js -i max --name pattyshack

# Or specify instance count
pm2 start src/server/index.js -i 4 --name pattyshack
```

### Load Balancing with Nginx
```nginx
upstream pattyshack {
    least_conn;
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;
    server localhost:3003;
}

server {
    location / {
        proxy_pass http://pattyshack;
    }
}
```

### Database Scaling
- Read replicas for read-heavy operations
- Connection pooling
- Query optimization
- Indexing strategy

## Maintenance

### Updates
```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install --production

# Run migrations
npm run migrate

# Restart application
pm2 restart pattyshack
```

### Health Checks
```bash
# Check application health
curl https://your-domain.com/health

# Check database connectivity
psql -h DB_HOST -U DB_USER -d DB_NAME -c "SELECT 1"
```

### Log Rotation
```bash
# Configure logrotate
sudo nano /etc/logrotate.d/pattyshack
```

```
/var/log/pattyshack/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

## Troubleshooting

### Common Issues

1. **Application won't start**
   - Check logs: `pm2 logs`
   - Verify environment variables
   - Check database connectivity

2. **High memory usage**
   - Monitor with `pm2 monit`
   - Check for memory leaks
   - Adjust PM2 instance count

3. **Database connection errors**
   - Verify credentials
   - Check firewall rules
   - Increase connection pool size

4. **Slow API responses**
   - Enable query logging
   - Add database indexes
   - Implement caching

## Rollback Procedure

```bash
# List PM2 processes
pm2 list

# Stop current version
pm2 stop pattyshack

# Checkout previous version
git checkout previous-tag

# Install dependencies
npm install --production

# Start application
pm2 start src/server/index.js --name pattyshack
```

## Support

For deployment support:
- Documentation: https://docs.pattyshack.com
- Support: support@pattyshack.com
- Status: https://status.pattyshack.com
