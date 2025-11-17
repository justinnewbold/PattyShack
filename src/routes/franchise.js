/**
 * Franchise Management API Routes
 * Phase 22
 *
 * Endpoints for franchise operations, royalties, compliance, and multi-brand management
 */

const express = require('express');
const router = express.Router();
const FranchiseService = require('../services/FranchiseService');

// Middleware
const authenticate = (req, res, next) => {
  req.user = { id: req.headers['x-user-id'] || 'system' };
  next();
};

// ============================================
// BRANDS
// ============================================

/**
 * POST /api/franchise/brands
 * Create brand
 */
router.post('/brands', authenticate, async (req, res) => {
  try {
    const brand = await FranchiseService.createBrand(req.body, req.user.id);
    res.status(201).json({ success: true, data: brand });
  } catch (error) {
    console.error('[Franchise API] Error creating brand:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/franchise/brands
 * Get all brands
 */
router.get('/brands', authenticate, async (req, res) => {
  try {
    const brands = await FranchiseService.getBrands();
    res.json({ success: true, data: brands });
  } catch (error) {
    console.error('[Franchise API] Error getting brands:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/franchise/brands/:id
 * Get brand by ID
 */
router.get('/brands/:id', authenticate, async (req, res) => {
  try {
    const brand = await FranchiseService.getBrandById(req.params.id);
    if (!brand) {
      return res.status(404).json({ success: false, error: 'Brand not found' });
    }
    res.json({ success: true, data: brand });
  } catch (error) {
    console.error('[Franchise API] Error getting brand:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// FRANCHISE AGREEMENTS
// ============================================

/**
 * POST /api/franchise/agreements
 * Create franchise agreement
 */
router.post('/agreements', authenticate, async (req, res) => {
  try {
    const agreement = await FranchiseService.createFranchiseAgreement(req.body, req.user.id);
    res.status(201).json({ success: true, data: agreement });
  } catch (error) {
    console.error('[Franchise API] Error creating agreement:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/franchise/agreements
 * Get franchise agreements
 */
router.get('/agreements', authenticate, async (req, res) => {
  try {
    const agreements = await FranchiseService.getFranchiseAgreements(req.query);
    res.json({ success: true, data: agreements });
  } catch (error) {
    console.error('[Franchise API] Error getting agreements:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/franchise/agreements/:id
 * Get franchise agreement by ID
 */
router.get('/agreements/:id', authenticate, async (req, res) => {
  try {
    const agreement = await FranchiseService.getFranchiseAgreementById(req.params.id);
    if (!agreement) {
      return res.status(404).json({ success: false, error: 'Agreement not found' });
    }
    res.json({ success: true, data: agreement });
  } catch (error) {
    console.error('[Franchise API] Error getting agreement:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ROYALTY MANAGEMENT
// ============================================

/**
 * POST /api/franchise/royalties/calculate
 * Calculate royalty
 */
router.post('/royalties/calculate', authenticate, async (req, res) => {
  try {
    const { agreement_id, location_id, period_start, period_end, gross_sales } = req.body;
    const royalty = await FranchiseService.calculateRoyalty(
      agreement_id,
      location_id,
      period_start,
      period_end,
      gross_sales
    );
    res.json({ success: true, data: { royalty } });
  } catch (error) {
    console.error('[Franchise API] Error calculating royalty:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/franchise/royalties
 * Get royalty calculations
 */
router.get('/royalties', authenticate, async (req, res) => {
  try {
    const royalties = await FranchiseService.getRoyaltyCalculations(req.query);
    res.json({ success: true, data: royalties });
  } catch (error) {
    console.error('[Franchise API] Error getting royalties:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/franchise/royalties/payment-status
 * Get royalty payment status
 */
router.get('/royalties/payment-status', authenticate, async (req, res) => {
  try {
    const status = await FranchiseService.getRoyaltyPaymentStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    console.error('[Franchise API] Error getting payment status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/franchise/royalties/:id/mark-paid
 * Mark royalty as paid
 */
router.post('/royalties/:id/mark-paid', authenticate, async (req, res) => {
  try {
    const { payment_date } = req.body;
    const royalty = await FranchiseService.markRoyaltyPaid(req.params.id, payment_date);
    res.json({ success: true, data: royalty });
  } catch (error) {
    console.error('[Franchise API] Error marking royalty paid:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// BRAND STANDARDS & COMPLIANCE
// ============================================

/**
 * POST /api/franchise/standards
 * Create brand standard
 */
router.post('/standards', authenticate, async (req, res) => {
  try {
    const standard = await FranchiseService.createBrandStandard(req.body, req.user.id);
    res.status(201).json({ success: true, data: standard });
  } catch (error) {
    console.error('[Franchise API] Error creating standard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/franchise/standards
 * Get brand standards
 */
router.get('/standards', authenticate, async (req, res) => {
  try {
    const { brand_id } = req.query;
    if (!brand_id) {
      return res.status(400).json({ success: false, error: 'brand_id is required' });
    }
    const standards = await FranchiseService.getBrandStandards(brand_id);
    res.json({ success: true, data: standards });
  } catch (error) {
    console.error('[Franchise API] Error getting standards:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/franchise/inspections
 * Create inspection
 */
router.post('/inspections', authenticate, async (req, res) => {
  try {
    const inspection = await FranchiseService.createInspection(req.body, req.user.id);
    res.status(201).json({ success: true, data: inspection });
  } catch (error) {
    console.error('[Franchise API] Error creating inspection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/franchise/inspections
 * Get inspections for location
 */
router.get('/inspections', authenticate, async (req, res) => {
  try {
    const { location_id } = req.query;
    if (!location_id) {
      return res.status(400).json({ success: false, error: 'location_id is required' });
    }
    const inspections = await FranchiseService.getInspections(location_id);
    res.json({ success: true, data: inspections });
  } catch (error) {
    console.error('[Franchise API] Error getting inspections:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// FRANCHISE SUPPORT
// ============================================

/**
 * POST /api/franchise/support-tickets
 * Create support ticket
 */
router.post('/support-tickets', authenticate, async (req, res) => {
  try {
    const ticket = await FranchiseService.createSupportTicket(req.body, req.user.id);
    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    console.error('[Franchise API] Error creating support ticket:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/franchise/support-tickets
 * Get support tickets
 */
router.get('/support-tickets', authenticate, async (req, res) => {
  try {
    const tickets = await FranchiseService.getSupportTickets(req.query);
    res.json({ success: true, data: tickets });
  } catch (error) {
    console.error('[Franchise API] Error getting support tickets:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/franchise/support-tickets/:id/resolve
 * Resolve support ticket
 */
router.post('/support-tickets/:id/resolve', authenticate, async (req, res) => {
  try {
    const { resolution_notes } = req.body;
    const ticket = await FranchiseService.resolveSupportTicket(
      req.params.id,
      resolution_notes,
      req.user.id
    );
    res.json({ success: true, data: ticket });
  } catch (error) {
    console.error('[Franchise API] Error resolving ticket:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// PERFORMANCE & REPORTING
// ============================================

/**
 * GET /api/franchise/performance/franchisee
 * Get franchise performance summary
 */
router.get('/performance/franchisee', authenticate, async (req, res) => {
  try {
    const { agreement_id } = req.query;
    const performance = await FranchiseService.getFranchisePerformanceSummary(agreement_id);
    res.json({ success: true, data: performance });
  } catch (error) {
    console.error('[Franchise API] Error getting franchisee performance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/franchise/performance/brand
 * Get brand performance overview
 */
router.get('/performance/brand', authenticate, async (req, res) => {
  try {
    const { brand_id } = req.query;
    const performance = await FranchiseService.getBrandPerformanceOverview(brand_id);
    res.json({ success: true, data: performance });
  } catch (error) {
    console.error('[Franchise API] Error getting brand performance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
