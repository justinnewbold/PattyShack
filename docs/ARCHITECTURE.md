# PattyShack Architecture

## System Overview

PattyShack is a modern, scalable restaurant operations platform built with Node.js and Express, designed to handle multi-location management, real-time monitoring, and comprehensive analytics.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Web    │  │  Mobile  │  │  Tablet  │  │   IoT    │   │
│  │ Browser  │  │   App    │  │   App    │  │ Devices  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ HTTPS/WSS
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                   API Gateway Layer                         │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Nginx / Load Balancer                             │    │
│  │  - SSL Termination                                 │    │
│  │  - Rate Limiting                                   │    │
│  │  - Request Routing                                 │    │
│  └────────────────────────────────────────────────────┘    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                 Application Layer                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          Express.js API Server                      │   │
│  │                                                      │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │            Middleware                        │  │   │
│  │  │  - Authentication (JWT)                      │  │   │
│  │  │  - Authorization (RBAC)                      │  │   │
│  │  │  - Request Validation                        │  │   │
│  │  │  - Error Handling                            │  │   │
│  │  │  - Logging                                   │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  │                                                      │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │              Routes                          │  │   │
│  │  │  - Tasks (/api/v1/tasks)                     │  │   │
│  │  │  - Temperatures (/api/v1/temperatures)       │  │   │
│  │  │  - Inventory (/api/v1/inventory)             │  │   │
│  │  │  - Schedules (/api/v1/schedules)             │  │   │
│  │  │  - Analytics (/api/v1/analytics)             │  │   │
│  │  │  - Locations (/api/v1/locations)             │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  │                                                      │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │            Services Layer                    │  │   │
│  │  │  - TaskService                               │  │   │
│  │  │  - NotificationService                       │  │   │
│  │  │  - InventoryService                          │  │   │
│  │  │  - AnalyticsService                          │  │   │
│  │  │  - IntegrationService                        │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  │                                                      │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │            Models Layer                      │  │   │
│  │  │  - User                                      │  │   │
│  │  │  - Location                                  │  │   │
│  │  │  - Task                                      │  │   │
│  │  │  - TemperatureLog                            │  │   │
│  │  │  - InventoryItem                             │  │   │
│  │  │  - Schedule                                  │  │   │
│  │  │  - Invoice                                   │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────┬─────────────────┬───────────────┬───────────────┘
            │                 │               │
            │                 │               │
┌───────────▼──────┐ ┌────────▼────────┐ ┌───▼──────────────┐
│  Data Layer      │ │  Cache Layer    │ │  Queue Layer     │
│                  │ │                 │ │                  │
│  ┌────────────┐  │ │  ┌──────────┐  │ │  ┌────────────┐  │
│  │ PostgreSQL │  │ │  │  Redis   │  │ │  │   Bull     │  │
│  │            │  │ │  │          │  │ │  │  (Redis)   │  │
│  │ - Users    │  │ │  │ - Session│  │ │  │            │  │
│  │ - Tasks    │  │ │  │ - Cache  │  │ │  │ - Jobs     │  │
│  │ - Temps    │  │ │  │ - Pub/Sub│  │ │  │ - Alerts   │  │
│  │ - Inventory│  │ │  └──────────┘  │ │  │ - Reports  │  │
│  │ - Schedules│  │ │                 │ │  └────────────┘  │
│  └────────────┘  │ └─────────────────┘ └──────────────────┘
└──────────────────┘
            │
            │
┌───────────▼──────────────────────────────────────────────────┐
│              External Integrations                           │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────┐    │
│  │   POS   │  │ Payroll │  │   IoT   │  │ Accounting  │    │
│  │ Systems │  │ Systems │  │ Sensors │  │   Systems   │    │
│  └─────────┘  └─────────┘  └─────────┘  └─────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. API Server (`src/server/`)
- Express.js-based REST API server
- Handles all HTTP requests and responses
- Implements business logic routing
- Manages middleware pipeline

### 2. Routes (`src/routes/`)
- Define API endpoints
- Handle request routing
- Apply endpoint-specific middleware
- Return structured responses

**Available Routes:**
- `tasks.js` - Task management endpoints
- `temperatures.js` - Temperature monitoring endpoints
- `inventory.js` - Inventory management endpoints
- `schedules.js` - Staff scheduling endpoints
- `analytics.js` - Analytics and reporting endpoints
- `locations.js` - Location management endpoints

### 3. Models (`src/models/`)
- Data structure definitions
- Business logic for entities
- Data validation rules
- Helper methods

**Core Models:**
- `User.js` - User accounts and authentication
- `Location.js` - Restaurant locations
- `Task.js` - Tasks and checklists
- `TemperatureLog.js` - Temperature readings
- `InventoryItem.js` - Inventory tracking
- `Schedule.js` - Employee schedules
- `Invoice.js` - Purchase invoices

### 4. Services (`src/services/`)
- Business logic implementation
- Complex operations
- Third-party integrations
- Background jobs

**Core Services:**
- `TaskService.js` - Task management logic
- `NotificationService.js` - Multi-channel notifications

### 5. Middleware (`src/middleware/`)
- Request processing
- Authentication and authorization
- Error handling
- Logging

**Core Middleware:**
- `auth.js` - JWT authentication and RBAC
- `errorHandler.js` - Centralized error handling

### 6. Configuration (`src/config/`)
- Application settings
- Environment variables
- Database configuration
- Feature flags

### 7. Utilities (`src/utils/`)
- Helper functions
- Validators
- Common utilities

## Data Flow

### Request Flow
```
1. Client Request → Nginx
2. Nginx → Express Server
3. Middleware Pipeline
   - CORS
   - Body Parsing
   - Authentication
   - Authorization
4. Route Handler
5. Service Layer
6. Model/Database Layer
7. Response Generation
8. Middleware Pipeline (error handling)
9. Client Response
```

### Task Creation Flow
```
POST /api/v1/tasks
    ↓
Authentication Middleware
    ↓
Route Handler (tasks.js)
    ↓
TaskService.createTask()
    ↓
Task Model Validation
    ↓
Database Insert
    ↓
Notification Service (if assigned)
    ↓
Schedule Recurring (if applicable)
    ↓
Return Response
```

### Temperature Alert Flow
```
IoT Sensor Reading
    ↓
POST /api/v1/temperatures
    ↓
Temperature Validation
    ↓
Threshold Check
    ↓
If Out of Range:
    ├─ Save to Database
    ├─ NotificationService.sendTemperatureAlert()
    ├─ Create Corrective Action Task
    └─ Log Event
    ↓
Return Response
```

## Security Architecture

### Authentication
- JWT (JSON Web Tokens)
- Token expiration: 24 hours
- Refresh token support (to be implemented)

### Authorization
- Role-Based Access Control (RBAC)
- Hierarchical permissions
- Resource-level access control

### Data Protection
- HTTPS/TLS encryption in transit
- Database encryption at rest
- Password hashing (bcrypt)
- SQL injection prevention
- XSS protection
- CSRF protection

## Scalability Considerations

### Horizontal Scaling
- Stateless API design
- Session storage in Redis
- Load balancing with Nginx
- Multi-instance deployment

### Database Scaling
- Read replicas for heavy read operations
- Connection pooling
- Query optimization
- Indexing strategy

### Caching Strategy
- Redis for session management
- API response caching
- Database query caching
- CDN for static assets

### Queue System
- Background job processing
- Async task execution
- Email/SMS queue
- Report generation queue

## Monitoring & Observability

### Application Monitoring
- Health check endpoint: `/health`
- Uptime monitoring
- Response time tracking
- Error rate monitoring

### Logging
- Structured logging
- Log levels (debug, info, warn, error)
- Log aggregation (to be implemented)
- Audit trail logging

### Metrics
- Request rate
- Response times
- Error rates
- Database query performance
- Cache hit rates

## Deployment Architecture

### Development
- Local development server
- SQLite database
- No external dependencies required

### Staging
- Docker containers
- PostgreSQL database
- Redis cache
- Nginx reverse proxy

### Production
- Multiple app instances
- Load balancer
- PostgreSQL with replication
- Redis cluster
- CDN for static assets
- Monitoring and alerting

## Technology Stack

### Backend
- **Runtime**: Node.js 14+
- **Framework**: Express.js
- **Database**: PostgreSQL (production), SQLite (development)
- **Cache**: Redis
- **Queue**: Bull (Redis-based)

### Frontend
- **HTML5/CSS3**: Responsive design
- **Vanilla JavaScript**: No framework dependencies

### DevOps
- **Container**: Docker
- **Orchestration**: Docker Compose / Kubernetes
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry, custom health checks

### External Services
- **Email**: SendGrid, AWS SES
- **SMS**: Twilio
- **Push Notifications**: Firebase Cloud Messaging
- **File Storage**: AWS S3 (to be implemented)

## API Design Principles

1. **RESTful**: Standard HTTP methods (GET, POST, PUT, DELETE)
2. **Versioned**: `/api/v1/` namespace
3. **Consistent**: Uniform response format
4. **Documented**: OpenAPI/Swagger spec (to be added)
5. **Secure**: Authentication required
6. **Performant**: Pagination, filtering, caching

## Future Enhancements

- GraphQL API endpoint
- WebSocket support for real-time updates
- Mobile app SDKs
- Advanced AI/ML features
- Computer vision integration
- Voice interface support
- Enhanced analytics engine
- Multi-tenant architecture
- Microservices migration path

## Performance Targets

- API Response Time: < 200ms (p95)
- Database Query Time: < 50ms (p95)
- Uptime: 99.9%
- Concurrent Users: 10,000+
- Requests per Second: 1,000+

## Disaster Recovery

- Automated daily backups
- Point-in-time recovery
- Multi-region deployment (future)
- Failover procedures
- Data replication

## Compliance

- HACCP compliance for food safety
- GDPR compliance for data protection
- SOC 2 Type II (planned)
- PCI DSS for payment data (if applicable)
