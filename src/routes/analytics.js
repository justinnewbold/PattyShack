/**
 * Analytics and Reporting Routes
 * Handles dashboards, KPIs, and performance metrics
 */

const express = require('express');
const AnalyticsService = require('../services/AnalyticsService');

const router = express.Router();

/**
 * @swagger
 * /analytics/dashboard:
 *   get:
 *     summary: Get dashboard data
 *     description: Retrieve analytics dashboard data with key metrics and statistics for a specific location and time period
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: integer
 *         description: Filter dashboard data by location ID
 *         example: 1
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, quarter, year]
 *         description: Time period for dashboard metrics
 *         example: week
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Dashboard metrics and statistics
 *                   properties:
 *                     metrics:
 *                       type: object
 *                       description: Key performance indicators
 *                     charts:
 *                       type: object
 *                       description: Chart data for visualizations
 *                     summary:
 *                       type: object
 *                       description: Summary statistics
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
// GET /api/v1/analytics/dashboard - Get dashboard data
router.get('/dashboard', async (req, res, next) => {
  try {
    const { locationId, period } = req.query;
    const data = await AnalyticsService.getDashboard({ locationId, period });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /analytics/locations:
 *   get:
 *     summary: Location comparison analytics
 *     description: Compare performance metrics across multiple locations for a specified time period
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: metric
 *         schema:
 *           type: string
 *           enum: [sales, tasks, efficiency, quality, waste]
 *         description: Metric to compare across locations
 *         example: sales
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, quarter, year]
 *         description: Time period for comparison
 *         example: month
 *     responses:
 *       200:
 *         description: Location comparison data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Comparison data across locations
 *                   properties:
 *                     locations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           locationId:
 *                             type: integer
 *                             example: 1
 *                           locationName:
 *                             type: string
 *                             example: Main Street Store
 *                           metricValue:
 *                             type: number
 *                             example: 15420.50
 *                           rank:
 *                             type: integer
 *                             example: 1
 *                     aggregates:
 *                       type: object
 *                       description: Aggregate statistics
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
// GET /api/v1/analytics/locations - Location comparison
router.get('/locations', async (req, res, next) => {
  try {
    const { metric, period } = req.query;
    const data = await AnalyticsService.getLocationComparison({ metric, period });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /analytics/reports/{type}:
 *   get:
 *     summary: Generate analytics report
 *     description: Generate a specific type of analytics report for a location and date range
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [sales, tasks, inventory, labor, operations, compliance]
 *         description: Type of report to generate
 *         example: sales
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: integer
 *         description: Location ID for the report
 *         example: 1
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Report start date (YYYY-MM-DD)
 *         example: "2025-10-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Report end date (YYYY-MM-DD)
 *         example: "2025-10-23"
 *     responses:
 *       200:
 *         description: Report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Generated report data
 *                   properties:
 *                     reportType:
 *                       type: string
 *                       example: sales
 *                     period:
 *                       type: object
 *                       properties:
 *                         startDate:
 *                           type: string
 *                           example: "2025-10-01"
 *                         endDate:
 *                           type: string
 *                           example: "2025-10-23"
 *                     location:
 *                       type: object
 *                       description: Location information
 *                     metrics:
 *                       type: object
 *                       description: Report metrics and data
 *                     summary:
 *                       type: object
 *                       description: Report summary
 *       400:
 *         description: Invalid report type or parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Invalid report type
 */
// GET /api/v1/analytics/reports/:type - Generate report
router.get('/reports/:type', async (req, res, next) => {
  try {
    const { type } = req.params;
    const { locationId, startDate, endDate } = req.query;

    const data = await AnalyticsService.generateReport(type, {
      locationId,
      startDate,
      endDate
    });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
});

/**
 * @swagger
 * /analytics/alerts:
 *   get:
 *     summary: Get AI-driven anomaly alerts
 *     description: Retrieve AI-detected anomaly alerts for operational issues, performance deviations, and potential problems
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: integer
 *         description: Filter alerts by location ID
 *         example: 1
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Filter alerts by severity level
 *         example: high
 *     responses:
 *       200:
 *         description: Alerts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Anomaly alerts and notifications
 *                   properties:
 *                     alerts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 42
 *                           type:
 *                             type: string
 *                             example: temperature_spike
 *                           severity:
 *                             type: string
 *                             enum: [low, medium, high, critical]
 *                             example: high
 *                           locationId:
 *                             type: integer
 *                             example: 1
 *                           message:
 *                             type: string
 *                             example: Refrigeration temperature exceeded threshold
 *                           detectedAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-10-23T14:30:00Z"
 *                           confidence:
 *                             type: number
 *                             format: float
 *                             example: 0.95
 *                           metadata:
 *                             type: object
 *                             description: Additional alert context
 *                     summary:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 12
 *                         bySeverity:
 *                           type: object
 *                           properties:
 *                             critical:
 *                               type: integer
 *                               example: 1
 *                             high:
 *                               type: integer
 *                               example: 3
 *                             medium:
 *                               type: integer
 *                               example: 5
 *                             low:
 *                               type: integer
 *                               example: 3
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
// GET /api/v1/analytics/alerts - Get AI-driven anomaly alerts
router.get('/alerts', async (req, res, next) => {
  try {
    const { locationId, severity } = req.query;
    const data = await AnalyticsService.getAlerts({ locationId, severity });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
