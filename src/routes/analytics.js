/**
 * Analytics and Reporting Routes
 * Handles dashboards, KPIs, and performance metrics
 */

const express = require('express');
const AnalyticsService = require('../services/AnalyticsService');

const router = express.Router();

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
