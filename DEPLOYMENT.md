# Deployment Guide

Complete guide for deploying PattyShack to production environments.

## Table of Contents

- [Vercel Deployment](#vercel-deployment)
- [Railway Deployment](#railway-deployment)
- [AWS Deployment](#aws-deployment)
- [Docker Deployment](#docker-deployment)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Post-Deployment](#post-deployment)

## Vercel Deployment

### Prerequisites

- Vercel account
- PostgreSQL database (Railway, Neon, Supabase, etc.)
- GitHub repository

### Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/justinnewbold/PattyShack)

### Manual Deployment

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Configure Project**
   ```bash
   cd PattyShack
   vercel
   ```

4. **Set Environment Variables**
   ```bash
   vercel env add DATABASE_URL production
   vercel env add JWT_SECRET production
   vercel env add NODE_ENV production
   ```

5. **Deploy**
   ```bash
   vercel --prod
   ```

### Vercel Configuration

The project includes `vercel.json`:

```json
{
  "buildCommand": "npm install --prefix frontend && npm run build --prefix frontend",
  "outputDirectory": "frontend/dist",
  "installCommand": "npm install",
  "framework": null,
  "rewrites": [
    {
      "source": "/api/v1/(.*)",
      "destination": "/api/index"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Environment Variables in Vercel

Go to Project Settings → Environment Variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| DATABASE_URL | postgresql://... | Production |
| JWT_SECRET | random-string-here | Production |
| NODE_ENV | production | Production |
| API_PREFIX | /api/v1 | All |

## Railway Deployment

### Database Setup

1. **Create PostgreSQL Database**
   - Go to Railway dashboard
   - Click "New Project" → "Provision PostgreSQL"
   - Copy the `DATABASE_URL`

2. **Configure SSL**
   ```bash
   # Add to DATABASE_URL
   ?sslmode=require
   ```

### Application Deployment

1. **Connect Repository**
   - Click "New" → "GitHub Repo"
   - Select PattyShack repository
   - Railway auto-detects Node.js

2. **Set Environment Variables**
   ```env
   DATABASE_URL=postgresql://...?sslmode=require
   JWT_SECRET=your-secret-key
   NODE_ENV=production
   PORT=3000
   ```

3. **Deploy**
   - Railway automatically deploys on push to main
   - View logs in Railway dashboard

## AWS Deployment

### Using AWS Elastic Beanstalk

1. **Install EB CLI**
   ```bash
   pip install awsebcli
   ```

2. **Initialize EB Application**
   ```bash
   eb init -p node.js-18 pattyshack
   ```

3. **Create Environment**
   ```bash
   eb create pattyshack-prod
   ```

4. **Set Environment Variables**
   ```bash
   eb setenv DATABASE_URL=postgresql://... JWT_SECRET=...
   ```

5. **Deploy**
   ```bash
   eb deploy
   ```

### Using AWS ECS (Docker)

1. **Build Docker Image**
   ```bash
   docker build -t pattyshack .
   ```

2. **Push to ECR**
   ```bash
   aws ecr create-repository --repository-name pattyshack
   docker tag pattyshack:latest {account}.dkr.ecr.{region}.amazonaws.com/pattyshack:latest
   docker push {account}.dkr.ecr.{region}.amazonaws.com/pattyshack:latest
   ```

3. **Create ECS Task Definition**
   ```json
   {
     "family": "pattyshack",
     "containerDefinitions": [{
       "name": "pattyshack",
       "image": "{ecr-image-uri}",
       "memory": 512,
       "cpu": 256,
       "essential": true,
       "portMappings": [{
         "containerPort": 3000,
         "protocol": "tcp"
       }],
       "environment": [
         {"name": "NODE_ENV", "value": "production"},
         {"name": "PORT", "value": "3000"}
       ],
       "secrets": [
         {"name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:..."},
         {"name": "JWT_SECRET", "valueFrom": "arn:aws:secretsmanager:..."}
       ]
     }]
   }
   ```

4. **Create ECS Service**
   ```bash
   aws ecs create-service \
     --cluster pattyshack-cluster \
     --service-name pattyshack-service \
     --task-definition pattyshack \
     --desired-count 2 \
     --launch-type FARGATE
   ```

## Docker Deployment

### Using Docker Compose

1. **Create docker-compose.prod.yml**
   ```yaml
   version: '3.8'
   services:
     app:
       build: .
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=production
         - DATABASE_URL=postgresql://db:5432/pattyshack
         - JWT_SECRET=${JWT_SECRET}
       depends_on:
         - db
       restart: always

     db:
       image: postgres:14
       volumes:
         - postgres_data:/var/lib/postgresql/data
       environment:
         - POSTGRES_DB=pattyshack
         - POSTGRES_USER=pattyshack
         - POSTGRES_PASSWORD=${DB_PASSWORD}
       restart: always

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
       restart: always

   volumes:
     postgres_data:
   ```

2. **Deploy**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm install
RUN npm install --prefix frontend

# Copy source
COPY . .

# Build frontend
RUN npm run build --prefix frontend

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "start"]
```

## Environment Configuration

### Required Variables

```env
# Database (Required)
DATABASE_URL=postgresql://user:password@host:5432/database

# Authentication (Required)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters

# Application (Required)
NODE_ENV=production
PORT=3000
API_PREFIX=/api/v1

# CORS (Optional)
CORS_ORIGIN=https://your-domain.com

# File Upload (Optional)
MAX_FILE_SIZE=10485760
UPLOAD_DIR=/tmp/uploads

# Email (Optional for password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Integrations (Optional)
SQUARE_ACCESS_TOKEN=...
TOAST_API_KEY=...
QUICKBOOKS_CLIENT_ID=...
```

### Generating Secrets

```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate API key
node -e "console.log('ps_' + require('crypto').randomBytes(32).toString('hex'))"
```

## Database Setup

### Initial Setup

1. **Create Database**
   ```sql
   CREATE DATABASE pattyshack;
   CREATE USER pattyshack_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE pattyshack TO pattyshack_user;
   ```

2. **Run Migrations**
   ```bash
   npm run migrate
   ```

3. **Seed Data (Optional)**
   ```bash
   npm run seed
   ```

### Database Backups

#### Automated Backups (PostgreSQL)

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="pattyshack"

pg_dump $DATABASE_URL > "$BACKUP_DIR/pattyshack_$DATE.sql"

# Keep only last 7 days
find $BACKUP_DIR -name "pattyshack_*.sql" -mtime +7 -delete
```

#### Restore from Backup

```bash
psql $DATABASE_URL < backup.sql
```

### Database Scaling

#### Read Replicas

```javascript
// src/database/pool.js
const readPool = new Pool({
  connectionString: process.env.DATABASE_READ_URL,
  ssl: { rejectUnauthorized: false }
});

// Use read pool for queries
function getReadPool() {
  return readPool;
}
```

#### Connection Pooling

```env
# Increase pool size for production
PGMAXCONNECTIONS=20
PGIDLETIMEOUT=30000
PGCONNECTTIMEOUT=10000
```

## Post-Deployment

### Health Checks

```bash
# Check API health
curl https://your-domain.com/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2024-11-14T...",
  "environment": "production"
}
```

### Database Migrations

```bash
# Check migration status
npm run migrate:status

# Run pending migrations
npm run migrate:up

# Rollback if needed
npm run migrate:down
```

### Create Admin User

```bash
npm run create-superuser
# Enter email and password when prompted
```

### Monitoring

#### Setup Uptime Monitoring

- **UptimeRobot**: Free tier available
- **Pingdom**: Professional monitoring
- **New Relic**: Application performance monitoring

#### Log Aggregation

```bash
# Vercel logs
vercel logs

# Railway logs
railway logs

# Docker logs
docker-compose logs -f app
```

### Performance Optimization

1. **Enable Caching**
   ```javascript
   // Add Redis for caching
   const redis = require('redis');
   const client = redis.createClient({
     url: process.env.REDIS_URL
   });
   ```

2. **CDN for Static Assets**
   - Use Cloudflare or AWS CloudFront
   - Cache frontend assets
   - Enable gzip compression

3. **Database Indexing**
   ```sql
   -- Add indexes for frequently queried columns
   CREATE INDEX idx_tasks_location ON tasks(location_id);
   CREATE INDEX idx_tasks_status ON tasks(status);
   CREATE INDEX idx_tasks_due_date ON tasks(due_date);
   ```

### Security Hardening

1. **Enable HTTPS**
   - Use Let's Encrypt for free SSL
   - Enforce HTTPS redirects

2. **Rate Limiting**
   ```javascript
   const rateLimit = require('express-rate-limit');

   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit each IP to 100 requests per windowMs
   });

   app.use('/api/', limiter);
   ```

3. **Security Headers**
   ```javascript
   const helmet = require('helmet');
   app.use(helmet());
   ```

### Continuous Deployment

#### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check DATABASE_URL format
   postgresql://username:password@host:port/database?sslmode=require

   # Test connection
   psql $DATABASE_URL -c "SELECT NOW();"
   ```

2. **Build Failures**
   ```bash
   # Clear cache
   rm -rf node_modules package-lock.json
   npm install

   # Rebuild frontend
   npm run build --prefix frontend
   ```

3. **Memory Issues**
   ```env
   # Increase Node.js memory
   NODE_OPTIONS=--max-old-space-size=4096
   ```

4. **SSL Certificate Issues**
   ```javascript
   // For development only
   ssl: { rejectUnauthorized: false }
   ```

### Getting Help

- Check logs for error messages
- Review environment variables
- Test database connectivity
- Verify API endpoints manually

## Maintenance

### Regular Tasks

- [ ] Weekly database backups
- [ ] Monthly security updates
- [ ] Quarterly dependency updates
- [ ] Monitor error rates
- [ ] Review access logs
- [ ] Update SSL certificates (if manual)

### Scaling Checklist

- [ ] Monitor CPU and memory usage
- [ ] Add read replicas for database
- [ ] Implement caching layer
- [ ] Use CDN for static assets
- [ ] Enable auto-scaling
- [ ] Load testing before traffic spikes

---

**Need Help?** Open an issue on [GitHub](https://github.com/justinnewbold/PattyShack/issues)
