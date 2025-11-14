/**
 * Enhanced Inventory Routes
 */

const express = require('express');
const EnhancedInventoryService = require('../services/EnhancedInventoryService');

const router = express.Router();

// Reordering
router.post('/:itemId/calculate-reorder', async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { locationId } = req.body;
    const result = await EnhancedInventoryService.calculateReorderPoint(itemId, locationId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/needing-reorder', async (req, res, next) => {
  try {
    const { locationId } = req.query;
    const items = await EnhancedInventoryService.getItemsNeedingReorder(locationId);
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
});

// Vendors
router.post('/vendors', async (req, res, next) => {
  try {
    const vendor = await EnhancedInventoryService.addVendor(req.body);
    res.status(201).json({ success: true, data: vendor });
  } catch (error) {
    next(error);
  }
});

router.get('/vendors/:itemId/pricing', async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const pricing = await EnhancedInventoryService.compareVendorPricing(itemId);
    res.json({ success: true, data: pricing });
  } catch (error) {
    next(error);
  }
});

router.post('/vendor-pricing', async (req, res, next) => {
  try {
    const pricing = await EnhancedInventoryService.addVendorPricing(req.body);
    res.status(201).json({ success: true, data: pricing });
  } catch (error) {
    next(error);
  }
});

// Recipes
router.post('/recipes', async (req, res, next) => {
  try {
    const recipe = await EnhancedInventoryService.createRecipe(req.body);
    res.status(201).json({ success: true, data: recipe });
  } catch (error) {
    next(error);
  }
});

router.get('/recipes/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const recipe = await EnhancedInventoryService.getRecipeWithCosting(id);
    res.json({ success: true, data: recipe });
  } catch (error) {
    next(error);
  }
});

// Transfers
router.post('/transfers', async (req, res, next) => {
  try {
    const transfer = await EnhancedInventoryService.createTransfer(req.body);
    res.status(201).json({ success: true, data: transfer });
  } catch (error) {
    next(error);
  }
});

router.post('/transfers/:id/approve', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;
    const transfer = await EnhancedInventoryService.approveTransfer(id, approvedBy);
    res.json({ success: true, data: transfer });
  } catch (error) {
    next(error);
  }
});

router.post('/transfers/:id/complete', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await EnhancedInventoryService.completeTransfer(id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Forecasting
router.post('/forecast', async (req, res, next) => {
  try {
    const { locationId, itemId, forecastDays } = req.body;
    const forecast = await EnhancedInventoryService.generateForecast(locationId, itemId, forecastDays);
    res.json({ success: true, data: forecast });
  } catch (error) {
    next(error);
  }
});

// Purchase Orders
router.post('/purchase-orders', async (req, res, next) => {
  try {
    const po = await EnhancedInventoryService.createPurchaseOrder(req.body);
    res.status(201).json({ success: true, data: po });
  } catch (error) {
    next(error);
  }
});

router.get('/purchase-orders', async (req, res, next) => {
  try {
    const { locationId, status } = req.query;
    const pos = await EnhancedInventoryService.getPurchaseOrders(locationId, status);
    res.json({ success: true, data: pos });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
