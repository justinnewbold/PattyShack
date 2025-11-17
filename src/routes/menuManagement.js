/**
 * Menu Management API Routes
 *
 * Endpoints for menu items, recipes, and menu engineering.
 */

const express = require('express');
const router = express.Router();
const MenuManagementService = require('../services/MenuManagementService');

// Middleware to authenticate requests (placeholder)
const authenticate = (req, res, next) => {
  req.user = { id: req.headers['x-user-id'] || 'system' };
  next();
};

// ============================================
// MENU CATEGORIES
// ============================================

/**
 * GET /api/menu/categories
 * Get all menu categories
 */
router.get('/categories', authenticate, async (req, res) => {
  try {
    const { location_id } = req.query;
    const categories = await MenuManagementService.getCategories(location_id);
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('[Menu API] Error getting categories:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/menu/categories
 * Create menu category
 */
router.post('/categories', authenticate, async (req, res) => {
  try {
    const category = await MenuManagementService.createCategory(req.body, req.user.id);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    console.error('[Menu API] Error creating category:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// MENU ITEMS
// ============================================

/**
 * GET /api/menu/items
 * Get menu items
 */
router.get('/items', authenticate, async (req, res) => {
  try {
    const filters = {};
    if (req.query.location_id) filters.location_id = req.query.location_id;
    if (req.query.category_id) filters.category_id = req.query.category_id;
    if (req.query.is_available !== undefined) filters.is_available = req.query.is_available === 'true';
    if (req.query.is_featured !== undefined) filters.is_featured = req.query.is_featured === 'true';

    const items = await MenuManagementService.getMenuItems(filters);
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('[Menu API] Error getting items:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/menu/full
 * Get full menu with categories
 */
router.get('/full', authenticate, async (req, res) => {
  try {
    const { location_id } = req.query;
    const menu = await MenuManagementService.getFullMenu(location_id);
    res.json({ success: true, data: menu });
  } catch (error) {
    console.error('[Menu API] Error getting full menu:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/menu/items
 * Create menu item
 */
router.post('/items', authenticate, async (req, res) => {
  try {
    const item = await MenuManagementService.createMenuItem(req.body, req.user.id);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    console.error('[Menu API] Error creating item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/menu/items/:id
 * Update menu item
 */
router.put('/items/:id', authenticate, async (req, res) => {
  try {
    const item = await MenuManagementService.updateMenuItem(req.params.id, req.body, req.user.id);
    res.json({ success: true, data: item });
  } catch (error) {
    console.error('[Menu API] Error updating item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// RECIPES
// ============================================

/**
 * POST /api/menu/recipes
 * Create recipe
 */
router.post('/recipes', authenticate, async (req, res) => {
  try {
    const recipe = await MenuManagementService.createRecipe(req.body, req.user.id);
    res.status(201).json({ success: true, data: recipe });
  } catch (error) {
    console.error('[Menu API] Error creating recipe:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/menu/recipes/:id
 * Get recipe with ingredients
 */
router.get('/recipes/:id', authenticate, async (req, res) => {
  try {
    const recipe = await MenuManagementService.getRecipeById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ success: false, error: 'Recipe not found' });
    }
    res.json({ success: true, data: recipe });
  } catch (error) {
    console.error('[Menu API] Error getting recipe:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/menu/recipes/:id/calculate-cost
 * Recalculate recipe cost
 */
router.post('/recipes/:id/calculate-cost', authenticate, async (req, res) => {
  try {
    const cost = await MenuManagementService.calculateRecipeCost(req.params.id);
    res.json({ success: true, data: { cost } });
  } catch (error) {
    console.error('[Menu API] Error calculating cost:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// MENU ENGINEERING & ANALYTICS
// ============================================

/**
 * GET /api/menu/profitability
 * Get menu item profitability analysis
 */
router.get('/profitability', authenticate, async (req, res) => {
  try {
    const { location_id } = req.query;
    const profitability = await MenuManagementService.getMenuItemProfitability(location_id);
    res.json({ success: true, data: profitability });
  } catch (error) {
    console.error('[Menu API] Error getting profitability:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/menu/engineering-matrix
 * Get menu engineering matrix (stars, plow horses, puzzles, dogs)
 */
router.get('/engineering-matrix', authenticate, async (req, res) => {
  try {
    const { location_id, start_date, end_date } = req.query;

    if (!location_id || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'location_id, start_date, and end_date are required'
      });
    }

    const matrix = await MenuManagementService.getMenuEngineeringMatrix(
      location_id,
      start_date,
      end_date
    );
    res.json({ success: true, data: matrix });
  } catch (error) {
    console.error('[Menu API] Error getting engineering matrix:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/menu/performance
 * Record menu performance data
 */
router.post('/performance', authenticate, async (req, res) => {
  try {
    const performance = await MenuManagementService.recordMenuPerformance(req.body, req.user.id);
    res.status(201).json({ success: true, data: performance });
  } catch (error) {
    console.error('[Menu API] Error recording performance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/menu/items/:id/update-pricing
 * Update suggested pricing for menu item
 */
router.post('/items/:id/update-pricing', authenticate, async (req, res) => {
  try {
    const suggestedPrice = await MenuManagementService.updateSuggestedPricing(req.params.id);
    res.json({ success: true, data: { suggested_price: suggestedPrice } });
  } catch (error) {
    console.error('[Menu API] Error updating pricing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
