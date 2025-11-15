/**
 * Business Intelligence API Routes
 *
 * Endpoints for KPIs, dashboards, goals, and reports.
 */

const express = require('express');
const router = express.Router();
const BusinessIntelligenceService = require('../services/BusinessIntelligenceService');

// Middleware to authenticate requests (placeholder)
const authenticate = (req, res, next) => {
  // TODO: Implement actual authentication
  req.user = { id: req.headers['x-user-id'] || 'system' };
  next();
};

// ============================================
// KPI MANAGEMENT
// ============================================

/**
 * GET /api/bi/kpis
 * Get all KPIs
 */
router.get('/kpis', authenticate, async (req, res) => {
  try {
    const { category, is_active } = req.query;
    const filters = {};

    if (category) filters.category = category;
    if (is_active !== undefined) filters.is_active = is_active === 'true';

    const kpis = await BusinessIntelligenceService.getKPIs(filters);
    res.json({ success: true, data: kpis });
  } catch (error) {
    console.error('[BI API] Error getting KPIs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/bi/kpis/:id
 * Get KPI by ID
 */
router.get('/kpis/:id', authenticate, async (req, res) => {
  try {
    const kpi = await BusinessIntelligenceService.getKPIById(req.params.id);
    if (!kpi) {
      return res.status(404).json({ success: false, error: 'KPI not found' });
    }
    res.json({ success: true, data: kpi });
  } catch (error) {
    console.error('[BI API] Error getting KPI:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/bi/kpis
 * Create custom KPI
 */
router.post('/kpis', authenticate, async (req, res) => {
  try {
    const kpi = await BusinessIntelligenceService.createKPI(req.body, req.user.id);
    res.status(201).json({ success: true, data: kpi });
  } catch (error) {
    console.error('[BI API] Error creating KPI:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/bi/kpis/:id/values
 * Record KPI value
 */
router.post('/kpis/:id/values', authenticate, async (req, res) => {
  try {
    const value = await BusinessIntelligenceService.recordKPIValue(
      { ...req.body, kpi_id: req.params.id },
      req.user.id
    );
    res.status(201).json({ success: true, data: value });
  } catch (error) {
    console.error('[BI API] Error recording KPI value:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/bi/kpis/:id/values
 * Get KPI values over time
 */
router.get('/kpis/:id/values', authenticate, async (req, res) => {
  try {
    const { location_id, start_date, end_date } = req.query;
    const filters = {};

    if (location_id) filters.location_id = location_id;
    if (start_date) filters.start_date = start_date;
    if (end_date) filters.end_date = end_date;

    const values = await BusinessIntelligenceService.getKPIValues(req.params.id, filters);
    res.json({ success: true, data: values });
  } catch (error) {
    console.error('[BI API] Error getting KPI values:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// DASHBOARDS
// ============================================

/**
 * GET /api/bi/dashboards
 * Get all dashboards
 */
router.get('/dashboards', authenticate, async (req, res) => {
  try {
    const { dashboard_type, target_role, is_template } = req.query;
    const filters = {};

    if (dashboard_type) filters.dashboard_type = dashboard_type;
    if (target_role) filters.target_role = target_role;
    if (is_template !== undefined) filters.is_template = is_template === 'true';

    const dashboards = await BusinessIntelligenceService.getDashboards(filters);
    res.json({ success: true, data: dashboards });
  } catch (error) {
    console.error('[BI API] Error getting dashboards:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/bi/dashboards/:id
 * Get dashboard by ID with widgets
 */
router.get('/dashboards/:id', authenticate, async (req, res) => {
  try {
    const dashboard = await BusinessIntelligenceService.getDashboardById(req.params.id);
    if (!dashboard) {
      return res.status(404).json({ success: false, error: 'Dashboard not found' });
    }
    res.json({ success: true, data: dashboard });
  } catch (error) {
    console.error('[BI API] Error getting dashboard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/bi/dashboards
 * Create custom dashboard
 */
router.post('/dashboards', authenticate, async (req, res) => {
  try {
    const dashboard = await BusinessIntelligenceService.createDashboard(req.body, req.user.id);
    res.status(201).json({ success: true, data: dashboard });
  } catch (error) {
    console.error('[BI API] Error creating dashboard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/bi/dashboards/:id/widgets
 * Add widget to dashboard
 */
router.post('/dashboards/:id/widgets', authenticate, async (req, res) => {
  try {
    const widget = await BusinessIntelligenceService.addWidget(
      { ...req.body, dashboard_id: req.params.id },
      req.user.id
    );
    res.status(201).json({ success: true, data: widget });
  } catch (error) {
    console.error('[BI API] Error adding widget:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/bi/my-dashboards
 * Get user's dashboards
 */
router.get('/my-dashboards', authenticate, async (req, res) => {
  try {
    const dashboards = await BusinessIntelligenceService.getUserDashboards(req.user.id);
    res.json({ success: true, data: dashboards });
  } catch (error) {
    console.error('[BI API] Error getting user dashboards:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/bi/dashboards/:id/set-default
 * Set user's default dashboard
 */
router.put('/dashboards/:id/set-default', authenticate, async (req, res) => {
  try {
    const result = await BusinessIntelligenceService.setDefaultDashboard(
      req.user.id,
      req.params.id
    );
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[BI API] Error setting default dashboard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// GOALS
// ============================================

/**
 * GET /api/bi/goals
 * Get goals with filters
 */
router.get('/goals', authenticate, async (req, res) => {
  try {
    const { location_id, status, goal_type } = req.query;
    const filters = {};

    if (location_id) filters.location_id = location_id;
    if (status) filters.status = status;
    if (goal_type) filters.goal_type = goal_type;

    const goals = await BusinessIntelligenceService.getGoals(filters);
    res.json({ success: true, data: goals });
  } catch (error) {
    console.error('[BI API] Error getting goals:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/bi/goals
 * Create new goal
 */
router.post('/goals', authenticate, async (req, res) => {
  try {
    const goal = await BusinessIntelligenceService.createGoal(req.body, req.user.id);
    res.status(201).json({ success: true, data: goal });
  } catch (error) {
    console.error('[BI API] Error creating goal:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/bi/goals/:id/progress
 * Update goal progress
 */
router.put('/goals/:id/progress', authenticate, async (req, res) => {
  try {
    const { current_value } = req.body;
    if (current_value === undefined) {
      return res.status(400).json({ success: false, error: 'current_value is required' });
    }
    const goal = await BusinessIntelligenceService.updateGoalProgress(
      req.params.id,
      current_value,
      req.user.id
    );
    res.json({ success: true, data: goal });
  } catch (error) {
    console.error('[BI API] Error updating goal progress:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// REPORTS
// ============================================

/**
 * GET /api/bi/reports
 * Get saved reports
 */
router.get('/reports', authenticate, async (req, res) => {
  try {
    const { report_type, is_scheduled } = req.query;
    const filters = {};

    if (report_type) filters.report_type = report_type;
    if (is_scheduled !== undefined) filters.is_scheduled = is_scheduled === 'true';

    const reports = await BusinessIntelligenceService.getSavedReports(req.user.id, filters);
    res.json({ success: true, data: reports });
  } catch (error) {
    console.error('[BI API] Error getting reports:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/bi/reports
 * Create saved report
 */
router.post('/reports', authenticate, async (req, res) => {
  try {
    const report = await BusinessIntelligenceService.createReport(req.body, req.user.id);
    res.status(201).json({ success: true, data: report });
  } catch (error) {
    console.error('[BI API] Error creating report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/bi/reports/:id/execute
 * Execute a report
 */
router.post('/reports/:id/execute', authenticate, async (req, res) => {
  try {
    const execution = await BusinessIntelligenceService.executeReport(
      req.params.id,
      req.user.id,
      req.body.parameters || {}
    );
    res.json({ success: true, data: execution });
  } catch (error) {
    console.error('[BI API] Error executing report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ANALYTICS & INSIGHTS
// ============================================

/**
 * GET /api/bi/business-summary
 * Get daily business summary
 */
router.get('/business-summary', authenticate, async (req, res) => {
  try {
    const { location_id } = req.query;
    const summary = await BusinessIntelligenceService.getBusinessSummary(location_id);
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('[BI API] Error getting business summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/bi/location-comparison
 * Get multi-location comparison
 */
router.get('/location-comparison', authenticate, async (req, res) => {
  try {
    const comparison = await BusinessIntelligenceService.getLocationComparison();
    res.json({ success: true, data: comparison });
  } catch (error) {
    console.error('[BI API] Error getting location comparison:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
