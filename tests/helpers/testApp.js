/**
 * Test App Helper
 * Creates Express app instance for testing without starting server
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('../../src/config/app');
const { errorHandler, notFound } = require('../../src/middleware/errorHandler');

function createTestApp() {
  const app = express();

  // Middleware
  app.use(cors(config.cors));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Routes
  const tasksRouter = require('../../src/routes/tasks');
  const temperaturesRouter = require('../../src/routes/temperatures');
  const inventoryRouter = require('../../src/routes/inventory');
  const invoicesRouter = require('../../src/routes/invoices');
  const schedulesRouter = require('../../src/routes/schedules');
  const analyticsRouter = require('../../src/routes/analytics');
  const locationsRouter = require('../../src/routes/locations');

  app.use(`${config.apiPrefix}/tasks`, tasksRouter);
  app.use(`${config.apiPrefix}/temperatures`, temperaturesRouter);
  app.use(`${config.apiPrefix}/inventory`, inventoryRouter);
  app.use(`${config.apiPrefix}/invoices`, invoicesRouter);
  app.use(`${config.apiPrefix}/schedules`, schedulesRouter);
  app.use(`${config.apiPrefix}/analytics`, analyticsRouter);
  app.use(`${config.apiPrefix}/locations`, locationsRouter);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
  });

  // Error handling
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createTestApp };
