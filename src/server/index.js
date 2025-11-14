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
const authRouter = require('../routes/auth');

const app = express();

// Middleware
app.use(cors(config.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve built frontend
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

// API routes
const tasksRouter = require('../routes/tasks');
const taskTemplatesRouter = require('../routes/taskTemplates');
const taskDependenciesRouter = require('../routes/taskDependencies');
const temperaturesRouter = require('../routes/temperatures');
const inventoryRouter = require('../routes/inventory');
const invoicesRouter = require('../routes/invoices');
const schedulesRouter = require('../routes/schedules');
const analyticsRouter = require('../routes/analytics');
const locationsRouter = require('../routes/locations');
const authRouter = require('../routes/auth');

app.use(`${config.apiPrefix}/auth`, authRouter);
app.use(`${config.apiPrefix}/tasks`, tasksRouter);
app.use(`${config.apiPrefix}/tasks`, taskDependenciesRouter);
app.use(`${config.apiPrefix}/task-templates`, taskTemplatesRouter);
app.use(`${config.apiPrefix}/temperatures`, temperaturesRouter);
app.use(`${config.apiPrefix}/inventory`, inventoryRouter);
app.use(`${config.apiPrefix}/invoices`, invoicesRouter);
app.use(`${config.apiPrefix}/schedules`, schedulesRouter);
app.use(`${config.apiPrefix}/analytics`, analyticsRouter);
app.use(`${config.apiPrefix}/locations`, locationsRouter);

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: config.env
  });
});

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
