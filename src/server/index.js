/**
 * PattyShack Server
 * Restaurant Operations Platform API Server
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('../config/app');
const { errorHandler, notFound } = require('../middleware/errorHandler');
const { initializePool, testConnection, closePool } = require('../database/pool');
const { runMigrations } = require('../database/migrate');
const { seedDatabase } = require('../database/seeds');

// Initialize Express app
const app = express();

// Middleware
app.use(cors(config.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../../public')));

// API Routes
const authRouter = require('../routes/auth');
const tasksRouter = require('../routes/tasks');
const temperaturesRouter = require('../routes/temperatures');
const inventoryRouter = require('../routes/inventory');
const invoicesRouter = require('../routes/invoices');
const schedulesRouter = require('../routes/schedules');
const analyticsRouter = require('../routes/analytics');
const locationsRouter = require('../routes/locations');

app.use(`${config.apiPrefix}/auth`, authRouter);
app.use(`${config.apiPrefix}/tasks`, tasksRouter);
app.use(`${config.apiPrefix}/temperatures`, temperaturesRouter);
app.use(`${config.apiPrefix}/inventory`, inventoryRouter);
app.use(`${config.apiPrefix}/invoices`, invoicesRouter);
app.use(`${config.apiPrefix}/schedules`, schedulesRouter);
app.use(`${config.apiPrefix}/analytics`, analyticsRouter);
app.use(`${config.apiPrefix}/locations`, locationsRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: config.env
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'PattyShack API',
    version: '1.0.0',
    description: 'Restaurant Operations Platform',
    documentation: '/api/v1/docs'
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Database and server initialization
async function startServer() {
  const PORT = config.port;

  try {
    console.log('\n🚀 Starting PattyShack server...\n');

    // Initialize database connection
    console.log('📊 Initializing database connection...');
    initializePool();

    // Test database connection
    const connectionOk = await testConnection();
    if (!connectionOk && config.env === 'production') {
      throw new Error('Database connection failed');
    }

    // Run migrations
    console.log('\n📦 Running database migrations...');
    await runMigrations();

    // Seed demo data in development
    if (config.env === 'development' && process.env.SEED_DATABASE !== 'false') {
      console.log('\n🌱 Seeding demo data...');
      await seedDatabase();
    }

    // Start Express server
    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║              PattyShack API Server                        ║
║        Restaurant Operations Platform                     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

✅ Server running on port ${PORT}
📍 Environment: ${config.env}
🌐 API Base URL: http://localhost:${PORT}${config.apiPrefix}

Available endpoints:
  - GET  /health
  - POST ${config.apiPrefix}/auth/register
  - POST ${config.apiPrefix}/auth/login
  - GET  ${config.apiPrefix}/tasks
  - GET  ${config.apiPrefix}/temperatures
  - GET  ${config.apiPrefix}/inventory
  - GET  ${config.apiPrefix}/invoices
  - GET  ${config.apiPrefix}/schedules
  - GET  ${config.apiPrefix}/analytics
  - GET  ${config.apiPrefix}/locations
      `);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Handle graceful shutdown
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

// Start the server
startServer();

module.exports = app;
