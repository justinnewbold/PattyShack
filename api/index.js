/**
 * Vercel Serverless Function Entry Point
 * Handles all API routes for PattyShack
 */

const express = require('express');
const cors = require('cors');
const config = require('../src/config/app');
const { errorHandler, notFound } = require('../src/middleware/errorHandler');

const app = express();

// Middleware
app.use(cors(config.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
const tasksRouter = require('../src/routes/tasks');
const taskTemplatesRouter = require('../src/routes/taskTemplates');
const taskDependenciesRouter = require('../src/routes/taskDependencies');
const taskEnhancementsRouter = require('../src/routes/taskEnhancements');
const temperaturesRouter = require('../src/routes/temperatures');
const enhancedTemperaturesRouter = require('../src/routes/enhancedTemperatures');
const inventoryRouter = require('../src/routes/inventory');
const enhancedInventoryRouter = require('../src/routes/enhancedInventory');
const invoicesRouter = require('../src/routes/invoices');
const schedulesRouter = require('../src/routes/schedules');
const schedulingRouter = require('../src/routes/scheduling');
const analyticsRouter = require('../src/routes/analytics');
const enhancedAnalyticsRouter = require('../src/routes/enhancedAnalytics');
const locationsRouter = require('../src/routes/locations');
const integrationsRouter = require('../src/routes/integrations');
const exportsRouter = require('../src/routes/exports');
const userManagementRouter = require('../src/routes/userManagement');
const authRouter = require('../src/routes/auth');
const notificationsRouter = require('../src/routes/notifications');
const messagingRouter = require('../src/routes/messaging');
const announcementsRouter = require('../src/routes/announcements');

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
app.use(`${config.apiPrefix}/notifications`, notificationsRouter);
app.use(`${config.apiPrefix}/messaging`, messagingRouter);
app.use(`${config.apiPrefix}/announcements`, announcementsRouter);

// Health endpoint (root and API namespace)
const healthHandler = (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    environment: config.env,
    serverless: true
  });
};

app.get('/health', healthHandler);
app.get(`${config.apiPrefix}/health`, healthHandler);

// Errors
app.use(notFound);
app.use(errorHandler);

// Export for Vercel
module.exports = app;
