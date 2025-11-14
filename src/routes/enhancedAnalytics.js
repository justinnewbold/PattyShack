/**
 * Enhanced Analytics Routes
 * Labor cost, sales tracking, food cost, waste tracking, forecasting, and performance metrics
 */

const express = require('express');
const EnhancedAnalyticsService = require('../services/EnhancedAnalyticsService');

const router = express.Router();

// ===== LABOR COST ANALYTICS =====

router.post('/labor/entries', async (req, res, next) => {
  try {
    const entry = await EnhancedAnalyticsService.recordLaborEntry(req.body);
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
});

router.post('/labor/entries/:id/approve', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;
    const entry = await EnhancedAnalyticsService.approveLaborEntry(id, approvedBy);
    res.json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
});

router.get('/labor/report', async (req, res, next) => {
  try {
    const { locationId, startDate, endDate } = req.query;
    const report = await EnhancedAnalyticsService.getLaborCostReport(locationId, startDate, endDate);
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

// ===== SALES TRACKING =====

router.post('/sales/entries', async (req, res, next) => {
  try {
    const entry = await EnhancedAnalyticsService.recordSalesEntry(req.body);
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
});

router.get('/sales/report', async (req, res, next) => {
  try {
    const { locationId, startDate, endDate } = req.query;
    const report = await EnhancedAnalyticsService.getSalesReport(locationId, startDate, endDate);
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

// ===== FOOD COST TRACKING =====

router.post('/food-cost/entries', async (req, res, next) => {
  try {
    const entry = await EnhancedAnalyticsService.recordFoodCost(req.body);
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
});

router.get('/food-cost/trend', async (req, res, next) => {
  try {
    const { locationId, months = 6 } = req.query;
    const trend = await EnhancedAnalyticsService.getFoodCostTrend(locationId, parseInt(months));
    res.json({ success: true, data: trend });
  } catch (error) {
    next(error);
  }
});

// ===== WASTE TRACKING =====

router.post('/waste/entries', async (req, res, next) => {
  try {
    const entry = await EnhancedAnalyticsService.recordWaste(req.body);
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
});

router.get('/waste/report', async (req, res, next) => {
  try {
    const { locationId, startDate, endDate } = req.query;
    const report = await EnhancedAnalyticsService.getWasteReport(locationId, startDate, endDate);
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

// ===== SALES FORECASTING =====

router.post('/forecast/generate', async (req, res, next) => {
  try {
    const { locationId, forecastDate, forecastType } = req.body;
    const forecast = await EnhancedAnalyticsService.generateSalesForecast(locationId, forecastDate, forecastType);
    res.status(201).json({ success: true, data: forecast });
  } catch (error) {
    next(error);
  }
});

router.get('/forecast/accuracy', async (req, res, next) => {
  try {
    const { locationId, startDate, endDate } = req.query;
    const accuracy = await EnhancedAnalyticsService.getForecastAccuracy(locationId, startDate, endDate);
    res.json({ success: true, data: accuracy });
  } catch (error) {
    next(error);
  }
});

// ===== PERFORMANCE METRICS =====

router.post('/metrics', async (req, res, next) => {
  try {
    const metric = await EnhancedAnalyticsService.recordPerformanceMetric(req.body);
    res.status(201).json({ success: true, data: metric });
  } catch (error) {
    next(error);
  }
});

router.get('/metrics/:metricType', async (req, res, next) => {
  try {
    const { metricType } = req.params;
    const { locationId, startDate, endDate } = req.query;
    const metrics = await EnhancedAnalyticsService.getPerformanceMetrics(locationId, metricType, startDate, endDate);
    res.json({ success: true, data: metrics });
  } catch (error) {
    next(error);
  }
});

// ===== DASHBOARD VIEWS =====

router.get('/dashboard/daily', async (req, res, next) => {
  try {
    const { locationId, date } = req.query;
    const dashboard = await EnhancedAnalyticsService.getDailyPerformanceDashboard(locationId, date);
    res.json({ success: true, data: dashboard });
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard/prime-cost', async (req, res, next) => {
  try {
    const { locationId, startDate, endDate } = req.query;
    const analysis = await EnhancedAnalyticsService.getPrimeCostAnalysis(locationId, startDate, endDate);
    res.json({ success: true, data: analysis });
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard/employee-productivity', async (req, res, next) => {
  try {
    const { locationId, startDate, endDate } = req.query;
    const productivity = await EnhancedAnalyticsService.getEmployeeProductivity(locationId, startDate, endDate);
    res.json({ success: true, data: productivity });
  } catch (error) {
    next(error);
  }
});

// ===== REPORT SNAPSHOTS =====

router.post('/snapshots', async (req, res, next) => {
  try {
    const snapshot = await EnhancedAnalyticsService.generateReportSnapshot(req.body);
    res.status(201).json({ success: true, data: snapshot });
  } catch (error) {
    next(error);
  }
});

router.get('/snapshots/:reportType/:reportPeriod', async (req, res, next) => {
  try {
    const { reportType, reportPeriod } = req.params;
    const { locationId } = req.query;
    const snapshot = await EnhancedAnalyticsService.getReportSnapshot(locationId, reportType, reportPeriod);
    res.json({ success: true, data: snapshot });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
