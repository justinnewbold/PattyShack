/**
 * Inventory Management Routes
 * Handles real-time inventory tracking, barcode scanning, and waste logging
 */

const express = require('express');
const InventoryService = require('../services/InventoryService');

const router = express.Router();

/**
 * @swagger
 * /inventory:
 *   get:
 *     summary: List inventory items
 *     description: Retrieve a list of inventory items with optional filtering by location, category, and low stock status
 *     tags: [Inventory]
 *     parameters:
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: integer
 *         description: Filter by location ID
 *         example: 1
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by product category
 *         example: produce
 *       - in: query
 *         name: lowStock
 *         schema:
 *           type: boolean
 *         description: Filter for items with low stock levels
 *         example: true
 *     responses:
 *       200:
 *         description: Inventory items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/InventoryItem'
 */
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

/**
 * @swagger
 * /inventory/count:
 *   post:
 *     summary: Perform inventory count
 *     description: Record a physical inventory count for tracking and variance analysis
 *     tags: [Inventory]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemId
 *               - locationId
 *               - quantity
 *             properties:
 *               itemId:
 *                 type: integer
 *                 description: Inventory item ID
 *                 example: 42
 *               locationId:
 *                 type: integer
 *                 description: Location ID where count is performed
 *                 example: 1
 *               quantity:
 *                 type: number
 *                 description: Physical count quantity
 *                 example: 150
 *               countedBy:
 *                 type: integer
 *                 description: User ID of person performing count
 *                 example: 5
 *               notes:
 *                 type: string
 *                 description: Optional notes about the count
 *                 example: Weekly inventory check
 *     responses:
 *       201:
 *         description: Inventory count recorded successfully
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
 *                   description: Count record with timestamp and variance details
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
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

/**
 * @swagger
 * /inventory/waste:
 *   post:
 *     summary: Log waste
 *     description: Record waste or spoilage for inventory tracking and cost analysis
 *     tags: [Inventory]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemId
 *               - locationId
 *               - quantity
 *               - reason
 *             properties:
 *               itemId:
 *                 type: integer
 *                 description: Inventory item ID
 *                 example: 42
 *               locationId:
 *                 type: integer
 *                 description: Location ID where waste occurred
 *                 example: 1
 *               quantity:
 *                 type: number
 *                 description: Quantity wasted
 *                 example: 5
 *               reason:
 *                 type: string
 *                 description: Reason for waste
 *                 example: spoilage
 *               loggedBy:
 *                 type: integer
 *                 description: User ID of person logging waste
 *                 example: 5
 *               notes:
 *                 type: string
 *                 description: Additional details about waste
 *                 example: Past expiration date
 *     responses:
 *       201:
 *         description: Waste logged successfully
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
 *                   description: Waste log entry with timestamp and cost impact
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
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

/**
 * @swagger
 * /inventory/variance:
 *   get:
 *     summary: Get inventory variance
 *     description: Retrieve actual vs theoretical inventory variance analysis for a location and date range
 *     tags: [Inventory]
 *     parameters:
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: integer
 *         description: Location ID for variance analysis
 *         example: 1
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for variance period (ISO 8601 format)
 *         example: "2025-10-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for variance period (ISO 8601 format)
 *         example: "2025-10-23"
 *     responses:
 *       200:
 *         description: Variance data retrieved successfully
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
 *                   description: Variance analysis including actual counts, theoretical inventory, and discrepancies
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
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
