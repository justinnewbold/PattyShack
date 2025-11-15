/**
 * Compliance API Routes
 *
 * Endpoints for managing compliance checklists, inspections, violations,
 * and corrective actions.
 */

const express = require('express');
const router = express.Router();
const ComplianceService = require('../services/ComplianceService');

// Middleware to authenticate requests (placeholder - implement based on your auth system)
const authenticate = (req, res, next) => {
  // TODO: Implement actual authentication
  req.user = { id: req.headers['x-user-id'] || 'system' };
  next();
};

// ============================================
// COMPLIANCE CHECKLISTS
// ============================================

/**
 * GET /api/compliance/checklists
 * Get all compliance checklists
 */
router.get('/checklists', authenticate, async (req, res) => {
  try {
    const { category, frequency, is_active } = req.query;
    const filters = {};

    if (category) filters.category = category;
    if (frequency) filters.frequency = frequency;
    if (is_active !== undefined) filters.is_active = is_active === 'true';

    const checklists = await ComplianceService.getChecklists(filters);
    res.json({ success: true, data: checklists });
  } catch (error) {
    console.error('[Compliance API] Error getting checklists:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/compliance/checklists/:id
 * Get checklist by ID with items
 */
router.get('/checklists/:id', authenticate, async (req, res) => {
  try {
    const checklist = await ComplianceService.getChecklistById(req.params.id);
    if (!checklist) {
      return res.status(404).json({ success: false, error: 'Checklist not found' });
    }
    res.json({ success: true, data: checklist });
  } catch (error) {
    console.error('[Compliance API] Error getting checklist:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/compliance/checklists
 * Create new compliance checklist
 */
router.post('/checklists', authenticate, async (req, res) => {
  try {
    const checklist = await ComplianceService.createChecklist(req.body, req.user.id);
    res.status(201).json({ success: true, data: checklist });
  } catch (error) {
    console.error('[Compliance API] Error creating checklist:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// COMPLIANCE INSPECTIONS
// ============================================

/**
 * POST /api/compliance/inspections
 * Create new inspection
 */
router.post('/inspections', authenticate, async (req, res) => {
  try {
    const inspection = await ComplianceService.createInspection(req.body, req.user.id);
    res.status(201).json({ success: true, data: inspection });
  } catch (error) {
    console.error('[Compliance API] Error creating inspection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/compliance/inspections/:id/start
 * Start an inspection
 */
router.put('/inspections/:id/start', authenticate, async (req, res) => {
  try {
    const inspection = await ComplianceService.startInspection(req.params.id, req.user.id);
    res.json({ success: true, data: inspection });
  } catch (error) {
    console.error('[Compliance API] Error starting inspection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/compliance/inspections/:id/complete
 * Complete an inspection with results
 */
router.put('/inspections/:id/complete', authenticate, async (req, res) => {
  try {
    const inspection = await ComplianceService.completeInspection(
      req.params.id,
      req.body,
      req.user.id
    );
    res.json({ success: true, data: inspection });
  } catch (error) {
    console.error('[Compliance API] Error completing inspection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// VIOLATIONS
// ============================================

/**
 * GET /api/compliance/violations
 * Get violations with filters
 */
router.get('/violations', authenticate, async (req, res) => {
  try {
    const { location_id, status, severity, violation_type } = req.query;
    const filters = {};

    if (location_id) filters.location_id = location_id;
    if (status) filters.status = status;
    if (severity) filters.severity = severity;
    if (violation_type) filters.violation_type = violation_type;

    const violations = await ComplianceService.getViolations(filters);
    res.json({ success: true, data: violations });
  } catch (error) {
    console.error('[Compliance API] Error getting violations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/compliance/violations
 * Create new violation
 */
router.post('/violations', authenticate, async (req, res) => {
  try {
    const violation = await ComplianceService.createViolation(req.body, req.user.id);
    res.status(201).json({ success: true, data: violation });
  } catch (error) {
    console.error('[Compliance API] Error creating violation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// CORRECTIVE ACTIONS
// ============================================

/**
 * POST /api/compliance/corrective-actions
 * Create corrective action for violation
 */
router.post('/corrective-actions', authenticate, async (req, res) => {
  try {
    const action = await ComplianceService.createCorrectiveAction(req.body, req.user.id);
    res.status(201).json({ success: true, data: action });
  } catch (error) {
    console.error('[Compliance API] Error creating corrective action:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/compliance/corrective-actions/:id/complete
 * Complete a corrective action
 */
router.put('/corrective-actions/:id/complete', authenticate, async (req, res) => {
  try {
    const action = await ComplianceService.completeCorrectiveAction(
      req.params.id,
      req.body,
      req.user.id
    );
    res.json({ success: true, data: action });
  } catch (error) {
    console.error('[Compliance API] Error completing corrective action:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// DOCUMENTS
// ============================================

/**
 * GET /api/compliance/documents
 * Get documents with filters
 */
router.get('/documents', authenticate, async (req, res) => {
  try {
    const { location_id, document_type, category, is_active } = req.query;
    const filters = {};

    if (location_id) filters.location_id = location_id;
    if (document_type) filters.document_type = document_type;
    if (category) filters.category = category;
    if (is_active !== undefined) filters.is_active = is_active === 'true';

    const documents = await ComplianceService.getDocuments(filters);
    res.json({ success: true, data: documents });
  } catch (error) {
    console.error('[Compliance API] Error getting documents:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/compliance/documents
 * Create new document
 */
router.post('/documents', authenticate, async (req, res) => {
  try {
    const document = await ComplianceService.createDocument(req.body, req.user.id);
    res.status(201).json({ success: true, data: document });
  } catch (error) {
    console.error('[Compliance API] Error creating document:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// DASHBOARD & ANALYTICS
// ============================================

/**
 * GET /api/compliance/dashboard
 * Get compliance dashboard summary
 */
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const { location_id, days } = req.query;
    const dashboard = await ComplianceService.getDashboard(
      location_id,
      days ? parseInt(days) : 30
    );
    res.json({ success: true, data: dashboard });
  } catch (error) {
    console.error('[Compliance API] Error getting dashboard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/compliance/trends
 * Get compliance trends over time
 */
router.get('/trends', authenticate, async (req, res) => {
  try {
    const { location_id, days } = req.query;
    if (!location_id) {
      return res.status(400).json({ success: false, error: 'location_id is required' });
    }
    const trends = await ComplianceService.getComplianceTrends(
      location_id,
      days ? parseInt(days) : 90
    );
    res.json({ success: true, data: trends });
  } catch (error) {
    console.error('[Compliance API] Error getting trends:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
