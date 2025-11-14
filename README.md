# PattyShack 🍔

> **Enterprise Restaurant Operations Platform**
> Complete multi-location management system for modern restaurant chains

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/justinnewbold/PattyShack)

## Overview

PattyShack is a comprehensive restaurant operations platform designed for multi-location restaurant chains. It provides end-to-end management capabilities including task management, temperature monitoring, inventory control, employee scheduling, analytics, and third-party integrations.

### Key Features

- 🎯 **Task Management** - Templates, dependencies, bulk operations, and escalation
- 🌡️ **Temperature Monitoring** - HACCP compliance, alerts, and cold chain tracking
- 📦 **Inventory Management** - Smart reordering, recipe costing, and forecasting
- 👥 **Employee Scheduling** - Auto-scheduling, shift trades, and conflict detection
- 📊 **Advanced Analytics** - Labor costs, sales tracking, prime cost analysis
- 🔌 **Integrations** - POS, payroll, accounting (Square, Toast, QuickBooks, etc.)
- 📱 **Mobile Apps** - iOS and Android with offline support
- 🔐 **RBAC Security** - Role-based access control with granular permissions

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

```bash
# Clone repository
git clone https://github.com/justinnewbold/PattyShack.git
cd PattyShack

# Install dependencies
npm install
npm install --prefix frontend

# Setup environment variables
cp .env.example .env
# Edit .env with your database credentials

# Setup database
npm run db:setup

# Run migrations
npm run migrate

# Start development server
npm run dev
```

Access the application at:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000
- **API Docs**: http://localhost:3000/api/v1/docs

## Architecture

### Tech Stack

**Frontend**
- React 19 with Vite
- React Router for navigation
- Tailwind CSS for styling
- Recharts for analytics
- Axios for API calls

**Backend**
- Node.js + Express
- PostgreSQL with connection pooling
- JWT authentication
- Multer for file uploads
- Swagger/OpenAPI documentation

**Mobile**
- React Native
- Offline-first architecture
- Push notifications
- Geolocation services
- Camera integration

### Project Structure

```
PattyShack/
├── api/                    # Vercel serverless functions
│   └── index.js           # API entry point
├── frontend/              # React web application
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── pages/        # Page components
│   │   └── services/     # API services
│   └── dist/             # Production build
├── mobile/               # React Native apps
│   ├── ios/             # iOS app
│   └── android/         # Android app
├── src/
│   ├── config/          # Configuration files
│   ├── database/        # Database migrations & seeds
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes (18 route files)
│   └── services/        # Business logic (15 services)
├── scripts/             # Utility scripts
└── tests/              # Test suites

```

## Features Deep Dive

### 1. Enhanced Task Management

**Task Templates**
- 5 pre-configured templates (Opening, Closing, Cleaning, Safety, Maintenance)
- Create custom templates
- Bulk task creation across locations

**Task Dependencies**
- Define prerequisite tasks
- Circular dependency prevention
- Automatic readiness checking

**Priority Escalation**
- Automatic escalation based on overdue time
- Configurable rules per task type
- Escalation history tracking

**Photo Annotations**
- Attach photos to tasks
- Annotate with notes
- Track completion evidence

### 2. Temperature Monitoring

**Multi-Sensor Dashboard**
- Real-time temperature tracking
- Equipment status monitoring
- Battery level alerts

**HACCP Compliance**
- Cold chain event logging
- Compliance reports
- Audit trail

**Anomaly Detection**
- Statistical analysis (2σ deviation)
- Automatic alerts
- Equipment failure prediction

**Maintenance Scheduling**
- Preventive maintenance
- Service history
- Vendor tracking

### 3. Inventory Management

**Smart Reordering**
- Automatic reorder point calculation
- Formula: `(Avg Daily Usage × Lead Time) + Safety Stock`
- Low stock alerts

**Vendor Management**
- Multi-vendor pricing comparison
- Lead time tracking
- Price history

**Recipe Costing**
- Ingredient-based costing
- Margin percentage calculation
- Profitability analysis

**Demand Forecasting**
- 90-day historical analysis
- Stockout prediction
- Usage pattern detection

### 4. Employee Scheduling

**Automated Scheduling**
- Auto-assign shifts based on availability
- Conflict detection
- Preference consideration

**Shift Trading**
- Three types: swap, giveaway, pickup
- Manager approval workflow
- Automatic assignment updates

**Time-Off Management**
- Request workflow
- Approval tracking
- Calendar integration

### 5. Advanced Analytics

**Labor Cost Analytics**
- Clock in/out tracking
- Overtime calculation (1.5x after 8 hours)
- Labor cost percentage

**Sales Tracking**
- Hourly granularity
- Transaction and guest counts
- Average check analysis

**Prime Cost Analysis**
- Food cost + Labor cost
- Percentage tracking
- Variance analysis

**Employee Productivity**
- Sales per labor hour
- Tasks completed
- Performance metrics

### 6. Third-Party Integrations

**Pre-configured Providers**
- **POS**: Square, Toast, Clover
- **Payroll**: ADP, Gusto
- **Accounting**: QuickBooks, Xero
- **Communication**: Slack, Twilio, Mailchimp

**Webhook System**
- Event-based triggers
- Retry mechanism
- Delivery tracking

**Data Export**
- Formats: CSV, JSON, XLSX
- Scheduled exports
- Custom filters

### 7. Mobile Features

**Offline Support**
- Queue management
- Auto-sync when online
- Cached data access

**Push Notifications**
- Task assignments
- Shift reminders
- Temperature alerts
- Low inventory

**Geolocation**
- Clock-in/out verification
- Geofencing (100m radius)
- Distance calculation

**Camera Integration**
- Photo capture
- Automatic compression
- Multi-photo upload

### 8. User Management

**Role-Based Access Control**
- 6 default roles (Super Admin, Admin, Manager, Shift Lead, Employee, Read Only)
- 20+ granular permissions
- Location-specific assignments

**Teams**
- Team lead assignment
- Member management
- Team-based task assignment

**Activity Logging**
- Complete audit trail
- IP address tracking
- User action history

**Security**
- Password reset workflow
- Login attempt tracking
- Two-factor authentication ready

## API Documentation

### Authentication

```bash
# Login
POST /api/v1/auth/login
{
  "email": "manager@pattyshack.com",
  "password": "password123"
}

# Response
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "user": { ... }
  }
}
```

### Task Management

```bash
# Create task
POST /api/v1/tasks
Authorization: Bearer <token>
{
  "title": "Clean fryer station",
  "type": "cleaning",
  "priority": "high",
  "locationId": "loc-123",
  "assignedTo": "user-456"
}

# Get tasks
GET /api/v1/tasks?locationId=loc-123&status=pending
```

### Complete API Reference

See full API documentation at `/api/v1/docs` when running the server.

**Available Endpoints**: 150+

- `/api/v1/auth` - Authentication
- `/api/v1/tasks` - Task management
- `/api/v1/temperatures` - Temperature monitoring
- `/api/v1/inventory` - Inventory management
- `/api/v1/scheduling` - Employee scheduling
- `/api/v1/analytics` - Analytics and reporting
- `/api/v1/integrations` - Third-party integrations
- `/api/v1/exports` - Data export
- `/api/v1/user-management` - Users, roles, permissions

## Database Schema

**60+ Tables** including:

- `users`, `roles`, `permissions` - User management
- `tasks`, `task_templates`, `task_dependencies` - Task system
- `equipment`, `temperature_logs`, `temperature_alerts` - Monitoring
- `inventory`, `recipes`, `vendors` - Inventory
- `schedules`, `shifts`, `time_off_requests` - Scheduling
- `sales_entries`, `labor_entries`, `food_cost_entries` - Analytics
- `integration_providers`, `webhooks`, `api_keys` - Integrations

### Running Migrations

```bash
# Run all pending migrations
npm run migrate

# Create a new migration
npm run migrate:create my_migration_name

# Rollback last migration
npm run migrate:rollback
```

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add DATABASE_URL
vercel env add JWT_SECRET
```

### Environment Variables

Required variables:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Authentication
JWT_SECRET=your-secret-key-here

# Optional
NODE_ENV=production
PORT=3000
API_PREFIX=/api/v1
```

### Docker Deployment

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Development

### Running Tests

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# All tests with coverage
npm run test:coverage
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run type-check
```

### Development Workflow

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes
3. Run tests: `npm test`
4. Commit: `git commit -m "feat: add feature"`
5. Push: `git push origin feature/my-feature`
6. Create pull request

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Clone your fork
3. Create a feature branch
4. Make your changes
5. Write tests
6. Submit a pull request

## License

ISC License - see [LICENSE](LICENSE) file for details

## Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/justinnewbold/PattyShack/issues)
- **Email**: support@pattyshack.com

## Roadmap

### Phase 9 - Advanced Features (Planned)
- [ ] AI-powered demand forecasting
- [ ] Voice commands for hands-free operation
- [ ] AR inventory scanning
- [ ] Advanced reporting dashboard
- [ ] Multi-language support
- [ ] Franchise management

### Phase 10 - Enterprise Features (Planned)
- [ ] White-label customization
- [ ] Advanced compliance automation
- [ ] Predictive maintenance
- [ ] Customer feedback integration
- [ ] Supply chain optimization
- [ ] Energy management

## Acknowledgments

Built with ❤️ by the PattyShack team.

Special thanks to all contributors and the open-source community.

---

**Current Version**: 1.0.0
**Last Updated**: November 2024
**Status**: ✅ Production Ready
