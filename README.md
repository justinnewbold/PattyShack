# PattyShack - Restaurant Operations Platform

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js](https://img.shields.io/badge/Node.js-14+-green.svg)](https://nodejs.org)

A comprehensive restaurant operations platform for multi-location management, providing task management, temperature monitoring, inventory control, labor scheduling, and real-time analytics.

## 🚀 Features

### Core Operations Management
- ✅ Multi-location task management with real-time progress tracking
- 📋 Digital checklists for line checks, food safety, opening/closing routines
- 📸 Photo verification and completion timestamps
- 🔄 Automated recurring tasks and scheduling
- 🏢 Hierarchical visibility (store → district → regional → brand)
- 📝 Configurable SOP templates
- ⚠️ Corrective action workflows
- 📱 Offline task completion with sync

### Temperature & Equipment Monitoring
- 🌡️ Continuous wireless temperature monitoring
- 🚨 Real-time alerts via mobile, email, or SMS
- 📡 IoT sensor and Bluetooth probe integration
- ✅ HACCP-compliant digital logging
- 📈 Trend charts for predictive maintenance
- 🔋 Sensor battery monitoring

### Inventory & Food Cost Control
- 📦 Real-time inventory counts via mobile/tablet
- 📱 Barcode scanning support
- 🍔 Recipe-level tracking and cost analysis
- 📊 Actual vs Theoretical variance reporting
- 🗑️ Waste logging with reason codes
- 💰 Vendor management and purchase orders
- 📥 Receiving workflow with invoice reconciliation

### Purchasing & Back-Office
- 📄 Digital invoice capture
- 🤖 AI-powered invoice OCR
- ✅ Approval workflows by role/threshold
- 💼 ERP and accounting integration
- 📊 Automated cost updates to recipes

### Sales, Labor & Analytics
- 📊 Real-time sales dashboards
- 👥 Labor vs sales variance monitoring
- 📈 Labor forecasting with AI
- 📉 KPI widgets and drill-down analysis
- 🏆 Multi-location benchmarking with automated rankings
- 📍 Location-aware dashboards with task compliance, labor, food cost, and waste insights
- 🔔 AI-driven anomaly alerts

### Staff Scheduling & Attendance
- 📅 Drag-and-drop schedule builder
- ⏰ Mobile clock-in/out with geofencing
- ✅ Automatic compliance checks
- 🔄 Shift swaps and time-off requests
- 📊 Labor cost tracking

### Mobile Operations
- 📱 Dedicated mobile apps (manager, crew, district)
- ⚡ Offline support with auto-sync
- 🔔 Push notifications
- 📍 GPS tracking for field operations

### Enterprise Features
- 🏢 Multi-brand and multi-location hierarchy
- 🔐 Role-based access control
- 🔌 REST API and webhook support
- 🔄 POS, payroll, and accounting integrations
- ☁️ Cloud-hosted and scalable

## 📦 Installation

### Prerequisites
- Node.js 18.x or higher
- npm or yarn
- PostgreSQL 15+ (recommended) or SQLite (development)

### Backend Setup

1. Clone the repository:
```bash
git clone https://github.com/justinnewbold/PattyShack.git
cd PattyShack
```

2. Install backend dependencies:
```bash
npm install
```

3. Configure environment variables (optional):
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Start the backend server:
```bash
npm start
```

The API server will start on `http://localhost:3000`

### Frontend Setup

1. Navigate to the client directory:
```bash
cd client
```

2. Install frontend dependencies:
```bash
npm install
```

3. Configure environment (optional):
```bash
cp .env.example .env
# VITE_API_URL defaults to http://localhost:3000/api/v1
```

4. Start the development server:
```bash
npm run dev
```

The React app will start on `http://localhost:5173`

### Full Stack Development

To run both backend and frontend:

```bash
# Terminal 1 - Backend
npm start

# Terminal 2 - Frontend
cd client && npm run dev
```

Then visit http://localhost:5173 in your browser.

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Database Configuration
DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pattyshack
DB_USER=your_username
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production

# CORS Configuration
CORS_ORIGIN=*
```

## 📚 API Documentation

### Interactive Documentation

Visit the **Swagger UI** for interactive API documentation:
```
http://localhost:3000/api/v1/docs
```

Features:
- Browse all 45 API endpoints
- Test endpoints directly in the browser
- View request/response schemas
- See code examples

### Base URL
```
http://localhost:3000/api/v1
```

### Core Endpoints

#### Tasks
```bash
GET    /api/v1/tasks              # List tasks
POST   /api/v1/tasks              # Create task
GET    /api/v1/tasks/:id          # Get task details
PUT    /api/v1/tasks/:id          # Update task
DELETE /api/v1/tasks/:id          # Delete task
POST   /api/v1/tasks/:id/complete # Complete task
```

#### Temperature Monitoring
```bash
GET    /api/v1/temperatures           # List temperature logs
POST   /api/v1/temperatures           # Log temperature
GET    /api/v1/temperatures/alerts    # Get alerts
GET    /api/v1/temperatures/equipment/:id # Equipment history
```

#### Inventory
```bash
GET    /api/v1/inventory          # List inventory
POST   /api/v1/inventory/count    # Perform count
POST   /api/v1/inventory/waste    # Log waste
GET    /api/v1/inventory/variance # Get variance report
```

#### Invoices
```bash
GET    /api/v1/invoices              # List invoices
POST   /api/v1/invoices              # Capture new invoice
GET    /api/v1/invoices/:id          # Get invoice details
PUT    /api/v1/invoices/:id          # Update invoice
POST   /api/v1/invoices/:id/approve  # Approve invoice
POST   /api/v1/invoices/:id/reconcile # Reconcile invoice
POST   /api/v1/invoices/:id/ocr      # Record OCR data
```

#### Scheduling
```bash
GET    /api/v1/schedules              # List schedules
POST   /api/v1/schedules              # Create schedule
POST   /api/v1/schedules/:id/clock-in # Clock in
POST   /api/v1/schedules/:id/clock-out # Clock out
GET    /api/v1/schedules/forecast     # Labor forecast
```

#### Analytics
```bash
GET    /api/v1/analytics/dashboard     # Dashboard data
GET    /api/v1/analytics/locations     # Location comparison
GET    /api/v1/analytics/reports/:type # Generate report
GET    /api/v1/analytics/alerts        # AI alerts
```

#### Locations
```bash
GET    /api/v1/locations           # List locations
POST   /api/v1/locations           # Create location
GET    /api/v1/locations/:id       # Get location
GET    /api/v1/locations/:id/scorecard # Location scorecard
```

### Full Documentation
See [docs/API.md](./docs/API.md) for complete API documentation.

## 🏗️ Architecture

### Project Structure

```
PattyShack/
├── src/                    # Backend (Node.js/Express)
│   ├── server/             # Express server setup
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic layer
│   ├── middleware/         # Express middleware
│   ├── database/           # Database connection & migrations
│   ├── config/             # Configuration files
│   └── utils/              # Utility functions
├── client/                 # Frontend (React/Vite)
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components (Dashboard, Tasks, etc.)
│   │   ├── services/       # API service layer
│   │   ├── context/        # React context providers
│   │   ├── utils/          # Frontend utilities
│   │   └── App.jsx         # Main app component
│   └── public/             # Static assets
├── tests/                  # Backend tests (Jest/Supertest)
├── docs/                   # Documentation
└── public/                 # Shared static files
```

### Tech Stack

**Backend:**
- Node.js + Express.js
- PostgreSQL (production) / SQLite (development)
- JWT authentication
- OpenAPI/Swagger documentation

**Frontend:**
- React 18 + Vite
- React Router v6
- Tailwind CSS
- Axios for API calls
- Recharts for data visualization

## 🔐 Security

### Role-Based Access Control
- **Crew**: Basic task completion and logging
- **Manager**: Full location management
- **District**: Multi-location oversight
- **Regional**: Regional performance monitoring
- **Corporate**: Enterprise-wide access

### Authentication
All API endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <token>
```

## 📱 Mobile Support

PattyShack supports mobile operations with:
- Responsive web interface
- Offline-first architecture
- Mobile-optimized workflows
- Push notifications
- GPS/geofencing support

## 🔌 Integrations

### Supported Integrations
- **POS Systems**: Square, Toast, Clover, Aloha
- **Payroll**: ADP, Paychex, Gusto
- **Accounting**: QuickBooks, Xero, Sage
- **Delivery**: DoorDash, Uber Eats, Grubhub
- **IoT Sensors**: Bluetooth and wireless temperature sensors

### API Access
Full REST API with webhooks for real-time notifications.

## 🧪 Testing

Run tests:
```bash
npm test
```

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

## 📄 License

ISC License

## 📞 Support

For support, please contact the development team or open an issue on GitHub.

## 🗺️ Roadmap

- [ ] Advanced AI features
- [ ] Predictive ordering
- [ ] Computer vision for food quality
- [ ] Voice-activated task completion
- [ ] Enhanced mobile capabilities
- [ ] Additional integration options

---

Built with ❤️ for restaurant operators everywhere.
