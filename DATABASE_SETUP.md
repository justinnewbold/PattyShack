# Database Setup Guide

PattyShack now uses PostgreSQL for persistent data storage. This guide will help you set up the database.

## Quick Start with Docker

The easiest way to get started is using Docker Compose:

```bash
# Start PostgreSQL database
docker-compose up -d

# Wait for database to be ready
docker-compose ps

# Copy environment file
cp .env.example .env

# Start the application (migrations run automatically)
npm run dev
```

The server will automatically:
1. Connect to the database
2. Run migrations to create tables
3. Seed demo data (in development mode)

## Manual PostgreSQL Setup

If you prefer to install PostgreSQL manually:

### 1. Install PostgreSQL

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download and install from: https://www.postgresql.org/download/windows/

### 2. Create Database and User

```bash
# Connect to PostgreSQL
psql postgres

# Run these commands:
CREATE DATABASE pattyshack;
CREATE USER pattyshack_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE pattyshack TO pattyshack_user;
\q
```

### 3. Configure Environment

Copy `.env.example` to `.env` and update the database credentials:

```env
NODE_ENV=development
PORT=3000

# Database Configuration
DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pattyshack
DB_USER=pattyshack_user
DB_PASSWORD=your_secure_password
DB_SSL=false

# Database Seeding (set to false to skip demo data)
SEED_DATABASE=true
```

### 4. Start the Server

```bash
npm run dev
```

The server will automatically:
- Create all database tables via migrations
- Seed demo data (if `SEED_DATABASE=true`)

## Database Schema

The database includes the following tables:

- **users** - User accounts with role-based permissions
- **locations** - Restaurant locations with hierarchical organization
- **tasks** - Task management with recurring task support
- **temperature_logs** - HACCP-compliant temperature monitoring
- **temperature_alerts** - Temperature alert lifecycle tracking
- **inventory_items** - Inventory item master data
- **inventory_counts** - Inventory count records
- **schedules** - Employee shift schedules
- **invoices** - Invoice records with line items

## Migrations

Migrations are stored in `src/database/migrations/` and run automatically on server start.

To manually run migrations:

```javascript
const { runMigrations } = require('./src/database/migrate');
await runMigrations();
```

## Seeding Data

Demo data is automatically seeded in development mode. To manually seed:

```javascript
const { seedDatabase } = require('./src/database/seeds');
await seedDatabase();
```

To skip seeding, set `SEED_DATABASE=false` in your `.env` file.

## Resetting the Database

To completely reset the database:

```bash
# Using Docker
docker-compose down -v
docker-compose up -d
npm run dev

# Using manual PostgreSQL
psql -U pattyshack_user -d pattyshack -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
npm run dev
```

## Production Deployment

For production, ensure you:

1. Use a secure password for `DB_PASSWORD`
2. Enable SSL: `DB_SSL=true`
3. Set `SEED_DATABASE=false`
4. Configure connection pooling (already set in `src/config/database.js`)
5. Set up automated backups
6. Monitor database performance

### Production Environment Variables

```env
NODE_ENV=production
DB_DIALECT=postgres
DB_HOST=your-db-host.com
DB_PORT=5432
DB_NAME=pattyshack
DB_USER=pattyshack_user
DB_PASSWORD=your_very_secure_password
DB_SSL=true
SEED_DATABASE=false
```

## Troubleshooting

### Connection Errors

If you see "Database connection failed":

1. Check PostgreSQL is running: `docker-compose ps` or `pg_isready`
2. Verify credentials in `.env` match database
3. Check firewall settings for port 5432
4. Review logs: `docker-compose logs postgres`

### Migration Errors

If migrations fail:

1. Check database user has proper permissions
2. Review migration SQL in `src/database/migrations/`
3. Manually connect and check: `psql -U pattyshack_user -d pattyshack`

### Slow Queries

If experiencing slow queries:

1. Check indexes are created (included in migration)
2. Review query plans: `EXPLAIN ANALYZE <query>`
3. Adjust connection pool settings in `src/config/database.js`
4. Consider adding Redis caching

## Database Backup

### Docker Backup

```bash
# Create backup
docker exec pattyshack-db pg_dump -U pattyshack_user pattyshack > backup.sql

# Restore backup
docker exec -i pattyshack-db psql -U pattyshack_user pattyshack < backup.sql
```

### Manual Backup

```bash
# Create backup
pg_dump -U pattyshack_user pattyshack > backup.sql

# Restore backup
psql -U pattyshack_user pattyshack < backup.sql
```

## Next Steps

After database setup:

1. ✅ Database is running with persistent storage
2. ✅ Migrations have created all tables
3. ✅ Demo data is seeded (development only)
4. 🔜 Implement real authentication (JWT token generation)
5. 🔜 Add unit and integration tests
6. 🔜 Set up CI/CD pipeline

For more information, see:
- [API Documentation](./docs/API.md)
- [Architecture Overview](./docs/ARCHITECTURE.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
