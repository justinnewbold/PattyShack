/**
 * PattyShack Server
 * Restaurant Operations Platform API Server
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('../config/app');
const { errorHandler, notFound } = require('../middleware/errorHandler');

// Initialize Express app
const app = express();

// Middleware
app.use(cors(config.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../../public')));

// API Routes
const tasksRouter = require('../routes/tasks');
const temperaturesRouter = require('../routes/temperatures');
const inventoryRouter = require('../routes/inventory');
const invoicesRouter = require('../routes/invoices');
const schedulesRouter = require('../routes/schedules');
const analyticsRouter = require('../routes/analytics');
const locationsRouter = require('../routes/locations');

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

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║              PattyShack API Server                        ║
║        Restaurant Operations Platform                     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

Server running on port ${PORT}
Environment: ${config.env}
API Base URL: http://localhost:${PORT}${config.apiPrefix}

Available endpoints:
  - GET  /health
  - GET  ${config.apiPrefix}/tasks
  - GET  ${config.apiPrefix}/temperatures
  - GET  ${config.apiPrefix}/inventory
  - GET  ${config.apiPrefix}/invoices
  - GET  ${config.apiPrefix}/schedules
  - GET  ${config.apiPrefix}/analytics
  - GET  ${config.apiPrefix}/locations
  `);
});

module.exports = app;
