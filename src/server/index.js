/**
 * PattyShack Server
 * Restaurant Operations Platform API Server
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../config/swagger');
const config = require('../config/app');
const { errorHandler, notFound } = require('../middleware/errorHandler');
const { initializePool, testConnection, closePool } = require('../database/pool');
const { runMigrations } = require('../database/migrate');
const { seedDatabase } = require('../database/seeds');
const { autoSeedDemoUsers } = require('../../scripts/autoSeedOnStartup');

const app = express();

// Middleware
app.use(cors(config.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve built frontend
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

// API routes
const authRouter = require('../routes/auth');
const tasksRouter = require('../routes/tasks');
const taskTemplatesRouter = require('../routes/taskTemplates');
const taskDependenciesRouter = require('../routes/taskDependencies');
const taskEnhancementsRouter = require('../routes/taskEnhancements');
const temperaturesRouter = require('../routes/temperatures');
const enhancedTemperaturesRouter = require('../routes/enhancedTemperatures');
const inventoryRouter = require('../routes/inventory');
const enhancedInventoryRouter = require('../routes/enhancedInventory');
const invoicesRouter = require('../routes/invoices');
const schedulesRouter = require('../routes/schedules');
const schedulingRouter = require('../routes/scheduling');
const analyticsRouter = require('../routes/analytics');
const enhancedAnalyticsRouter = require('../routes/enhancedAnalytics');
const locationsRouter = require('../routes/locations');
const integrationsRouter = require('../routes/integrations');
const exportsRouter = require('../routes/exports');
const userManagementRouter = require('../routes/userManagement');
// Phase 9: Notifications & Communication
const notificationsRouter = require('../routes/notifications');
const messagingRouter = require('../routes/messaging');
const announcementsRouter = require('../routes/announcements');
// Phase 10: Compliance & Audit
const complianceRouter = require('../routes/compliance');
// Phase 11: Business Intelligence
const businessIntelligenceRouter = require('../routes/businessIntelligence');
// Phase 12: Predictive Analytics
const predictiveAnalyticsRouter = require('../routes/predictiveAnalytics');
// Phase 13: Real-time WebSocket
const realtimeRouter = require('../routes/realtime');
// Phase 14: Background Jobs
const jobsRouter = require('../routes/jobs');
// Phase 18: Menu Management
const menuManagementRouter = require('../routes/menuManagement');
// Phase 19: Customer Portal
const customerPortalRouter = require('../routes/customerPortal');
// Phase 20: Financial Management
const financialRouter = require('../routes/financial');
// Phase 21: Marketing Automation
const marketingRouter = require('../routes/marketing');
// Phase 22: Franchise Management
const franchiseRouter = require('../routes/franchise');

app.use(`${config.apiPrefix}/auth`, authRouter);
app.use(`${config.apiPrefix}/tasks`, tasksRouter);
app.use(`${config.apiPrefix}/tasks`, taskDependenciesRouter);
app.use(`${config.apiPrefix}/tasks`, taskEnhancementsRouter);
app.use(`${config.apiPrefix}/task-templates`, taskTemplatesRouter);
app.use(`${config.apiPrefix}/temperatures`, temperaturesRouter);
app.use(`${config.apiPrefix}/temperatures`, enhancedTemperaturesRouter);
app.use(`${config.apiPrefix}/inventory`, inventoryRouter);
app.use(`${config.apiPrefix}/inventory`, enhancedInventoryRouter);
app.use(`${config.apiPrefix}/invoices`, invoicesRouter);
app.use(`${config.apiPrefix}/schedules`, schedulesRouter);
app.use(`${config.apiPrefix}/scheduling`, schedulingRouter);
app.use(`${config.apiPrefix}/analytics`, analyticsRouter);
app.use(`${config.apiPrefix}/analytics`, enhancedAnalyticsRouter);
app.use(`${config.apiPrefix}/integrations`, integrationsRouter);
app.use(`${config.apiPrefix}/exports`, exportsRouter);
app.use(`${config.apiPrefix}/user-management`, userManagementRouter);
app.use(`${config.apiPrefix}/locations`, locationsRouter);
// Phase 9 routes
app.use(`${config.apiPrefix}/notifications`, notificationsRouter);
app.use(`${config.apiPrefix}/messaging`, messagingRouter);
app.use(`${config.apiPrefix}/announcements`, announcementsRouter);
// Phase 10 routes
app.use(`${config.apiPrefix}/compliance`, complianceRouter);
// Phase 11 routes
app.use(`${config.apiPrefix}/bi`, businessIntelligenceRouter);
// Phase 12 routes
app.use(`${config.apiPrefix}/ml`, predictiveAnalyticsRouter);
// Phase 13 routes
app.use(`${config.apiPrefix}/realtime`, realtimeRouter);
// Phase 14 routes
app.use(`${config.apiPrefix}/jobs`, jobsRouter);
// Phase 18 routes
app.use(`${config.apiPrefix}/menu`, menuManagementRouter);
// Phase 19 routes
app.use(`${config.apiPrefix}/customers`, customerPortalRouter);
// Phase 20 routes
app.use(`${config.apiPrefix}/financial`, financialRouter);
// Phase 21 routes
app.use(`${config.apiPrefix}/marketing`, marketingRouter);
// Phase 22 routes
app.use(`${config.apiPrefix}/franchise`, franchiseRouter);

// Health endpoint (both root and API namespace)
const healthHandler = (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env
  });
};

app.get('/health', healthHandler);
app.get(`${config.apiPrefix}/health`, healthHandler);

// API info
app.get('/api', (req, res) => {
  res.json({
    name: 'PattyShack API',
    version: '1.0.0',
    description: 'Restaurant Operations Platform',
    documentation: `${config.apiPrefix}/docs`,
    endpoints: {
      docs: `${config.apiPrefix}/docs`,
      docsJson: `${config.apiPrefix}/docs.json`,
      health: '/health'
    }
  });
});

// Fallback: serve frontend for non-API routes
app.get('*', (req, res, next) => {
  if (req.method !== 'GET') return next();
  if (req.path.startsWith('/api') || req.path.startsWith('/health')) return next();

  res.sendFile('index.html', { root: frontendDistPath }, (err) => {
    if (err) {
      next(err);
    }
  });
});

// Errors
app.use(notFound);
app.use(errorHandler);

// DB + server startup
async function startServer() {
  const PORT = config.port;
  try {
    console.log('\n🚀 Starting PattyShack server...\n');
    initializePool();
    const ok = await testConnection();
    if (!ok && config.env === 'production') throw new Error('Database connection failed');
    console.log('\n📦 Running database migrations...');
    await runMigrations();
    if (config.env === 'development' && process.env.SEED_DATABASE !== 'false') {
      console.log('\n🌱 Seeding demo data...');
      await seedDatabase();
    }
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

// graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n⚠️  SIGTERM received, shutting down gracefully...');
  await closePool();
  process.exit(0);
});
process.on('SIGINT', async () => {
  console.log('\n⚠️  SIGINT received, shutting down gracefully...');
  await closePool();
  process.exit(0);
});

startServer();
module.exports = app;
