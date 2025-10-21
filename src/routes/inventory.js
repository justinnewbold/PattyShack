/**
 * Inventory Management Routes
 * Handles real-time inventory tracking, barcode scanning, and waste logging
 */

const express = require('express');
const InventoryService = require('../services/InventoryService');

const router = express.Router();

// GET /api/v1/inventory - List inventory items
router.get('/', async (req, res, next) => {
  try {
    const { locationId, category, lowStock } = req.query;

    const data = await InventoryService.getInventory({
      locationId,
      category,
      lowStock
    });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/inventory/count - Perform inventory count
router.post('/count', async (req, res, next) => {
  try {
    const countRecord = await InventoryService.performCount(req.body);

    res.status(201).json({
      success: true,
      data: countRecord
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/inventory/waste - Log waste
router.post('/waste', async (req, res, next) => {
  try {
    const entry = await InventoryService.logWaste(req.body);

    res.status(201).json({
      success: true,
      data: entry
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/inventory/variance - Get actual vs theoretical variance
router.get('/variance', async (req, res, next) => {
  try {
    const { locationId, startDate, endDate } = req.query;
    const data = await InventoryService.getVariance({ locationId, startDate, endDate });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
