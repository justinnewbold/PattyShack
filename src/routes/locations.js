/**
 * Location Management Routes
 * Handles multi-location hierarchy and organization
 */

const express = require('express');
const router = express.Router();
const LocationService = require('../services/LocationService');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @swagger
 * /locations:
 *   get:
 *     summary: List locations with filters
 *     description: Retrieve all locations with optional filtering by district, region, brand, type, status, and manager. Also returns the complete location hierarchy.
 *     tags: [Locations]
 *     parameters:
 *       - in: query
 *         name: districtId
 *         schema:
 *           type: integer
 *         description: Filter by district ID
 *         example: 1
 *       - in: query
 *         name: regionId
 *         schema:
 *           type: integer
 *         description: Filter by region ID
 *         example: 2
 *       - in: query
 *         name: brandId
 *         schema:
 *           type: integer
 *         description: Filter by brand ID
 *         example: 1
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by location type
 *         example: restaurant
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *         example: true
 *       - in: query
 *         name: managerId
 *         schema:
 *           type: integer
 *         description: Filter by manager user ID
 *         example: 5
 *     responses:
 *       200:
 *         description: Locations retrieved successfully
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
 *                   properties:
 *                     locations:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Location'
 *                     hierarchy:
 *                       type: object
 *                       description: Complete location hierarchy structure
 *       500:
 *         description: Server error
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
 *                   example: Internal server error
 */
router.get('/', async (req, res) => {
  try {
    const { districtId, regionId, brandId, type, active, managerId } = req.query;

    const locations = await LocationService.getLocations({
      districtId,
      regionId,
      brandId,
      type,
      active: active !== undefined ? active === 'true' : undefined,
      managerId
    });

    const hierarchy = await LocationService.getHierarchy();

    res.json({
      success: true,
      data: {
        locations,
        hierarchy
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /locations/hierarchy/{level}/{id}:
 *   get:
 *     summary: Get locations by hierarchy level
 *     description: Retrieve all locations under a specific hierarchy level (brand, region, or district)
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: level
 *         required: true
 *         schema:
 *           type: string
 *           enum: [brand, region, district]
 *         description: Hierarchy level to filter by
 *         example: district
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the hierarchy entity
 *         example: 1
 *     responses:
 *       200:
 *         description: Locations retrieved successfully
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
 *                   properties:
 *                     level:
 *                       type: string
 *                       example: district
 *                     id:
 *                       type: string
 *                       example: "1"
 *                     locations:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Location'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.get('/hierarchy/:level/:id', async (req, res) => {
  try {
    const { level, id } = req.params;

    const locations = await LocationService.getLocationsByHierarchy(level, id);

    res.json({
      success: true,
      data: {
        level,
        id,
        locations
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /locations/{id}/scorecard:
 *   get:
 *     summary: Get location scorecard
 *     description: Retrieve performance scorecard data for a specific location, including metrics and statistics for a given time period
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Location ID
 *         example: 1
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, quarter, year]
 *         description: Time period for scorecard data
 *         example: week
 *     responses:
 *       200:
 *         description: Scorecard data retrieved successfully
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
 *                   description: Scorecard data with performance metrics
 *                   properties:
 *                     locationId:
 *                       type: integer
 *                       example: 1
 *                     period:
 *                       type: string
 *                       example: week
 *                     metrics:
 *                       type: object
 *                       description: Performance metrics and KPIs
 *       500:
 *         description: Server error
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
 *                   example: Internal server error
 */
router.get('/:id/scorecard', async (req, res) => {
  try {
    const { id } = req.params;
    const { period } = req.query;

    const scorecard = await LocationService.getLocationScorecard(id, { period });

    res.json({
      success: true,
      data: scorecard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /locations/{id}:
 *   get:
 *     summary: Get location by ID
 *     description: Retrieve detailed information about a specific location
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Location ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Location retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Location'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         description: Server error
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
 *                   example: Internal server error
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const location = await LocationService.getLocationById(id);

    if (!location) {
      return res.status(404).json({
        success: false,
        error: 'Location not found'
      });
    }

    res.json({
      success: true,
      data: location
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /locations:
 *   post:
 *     summary: Create a new location
 *     description: Create a new location with required information. Requires authentication and manager-level or higher authorization.
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - code
 *             properties:
 *               name:
 *                 type: string
 *                 description: Location name
 *                 example: Downtown Store #101
 *               code:
 *                 type: string
 *                 description: Unique location code
 *                 example: DT101
 *               address:
 *                 type: string
 *                 description: Street address
 *                 example: 123 Main Street
 *               city:
 *                 type: string
 *                 description: City name
 *                 example: Springfield
 *               state:
 *                 type: string
 *                 description: State or province
 *                 example: IL
 *               zip:
 *                 type: string
 *                 description: ZIP or postal code
 *                 example: "62701"
 *               phone:
 *                 type: string
 *                 description: Contact phone number
 *                 example: "+12175551234"
 *               type:
 *                 type: string
 *                 description: Location type
 *                 example: restaurant
 *               brandId:
 *                 type: integer
 *                 description: Brand ID
 *                 example: 1
 *               districtId:
 *                 type: integer
 *                 description: District ID
 *                 example: 3
 *               regionId:
 *                 type: integer
 *                 description: Region ID
 *                 example: 2
 *               managerId:
 *                 type: integer
 *                 description: Manager user ID
 *                 example: 5
 *               timezone:
 *                 type: string
 *                 description: Timezone identifier
 *                 example: America/Chicago
 *               openingDate:
 *                 type: string
 *                 format: date
 *                 description: Location opening date
 *                 example: "2025-01-15"
 *               metadata:
 *                 type: object
 *                 description: Additional metadata as JSON
 *                 example: { "seatingCapacity": 50, "parkingSpaces": 20 }
 *     responses:
 *       201:
 *         description: Location created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Location'
 *                 message:
 *                   type: string
 *                   example: Location created successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Forbidden - Insufficient permissions
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
 *                   example: Insufficient permissions
 */
router.post('/', authenticate, authorize('manager', 'district', 'regional', 'corporate'), async (req, res) => {
  try {
    const { name, code, address, city, state, zip, phone, type, brandId, districtId, regionId, managerId, timezone, openingDate, metadata } = req.body;

    // Validate required fields
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        error: 'Name and code are required'
      });
    }

    const location = await LocationService.createLocation({
      name,
      code,
      address,
      city,
      state,
      zip,
      phone,
      type,
      brandId,
      districtId,
      regionId,
      managerId,
      timezone,
      openingDate,
      metadata
    });

    res.status(201).json({
      success: true,
      data: location,
      message: 'Location created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /locations/{id}:
 *   put:
 *     summary: Update a location
 *     description: Update an existing location's properties. Requires authentication and manager-level or higher authorization.
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Location ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Location name
 *                 example: Downtown Store #101 - Updated
 *               code:
 *                 type: string
 *                 description: Unique location code
 *                 example: DT101
 *               address:
 *                 type: string
 *                 description: Street address
 *                 example: 123 Main Street
 *               city:
 *                 type: string
 *                 description: City name
 *                 example: Springfield
 *               state:
 *                 type: string
 *                 description: State or province
 *                 example: IL
 *               zip:
 *                 type: string
 *                 description: ZIP or postal code
 *                 example: "62701"
 *               phone:
 *                 type: string
 *                 description: Contact phone number
 *                 example: "+12175551234"
 *               type:
 *                 type: string
 *                 description: Location type
 *                 example: restaurant
 *               brandId:
 *                 type: integer
 *                 description: Brand ID
 *                 example: 1
 *               districtId:
 *                 type: integer
 *                 description: District ID
 *                 example: 3
 *               regionId:
 *                 type: integer
 *                 description: Region ID
 *                 example: 2
 *               managerId:
 *                 type: integer
 *                 description: Manager user ID
 *                 example: 5
 *               timezone:
 *                 type: string
 *                 description: Timezone identifier
 *                 example: America/Chicago
 *               active:
 *                 type: boolean
 *                 description: Active status
 *                 example: true
 *               metadata:
 *                 type: object
 *                 description: Additional metadata as JSON
 *                 example: { "seatingCapacity": 60, "parkingSpaces": 25 }
 *     responses:
 *       200:
 *         description: Location updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Location'
 *                 message:
 *                   type: string
 *                   example: Location updated successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Forbidden - Insufficient permissions
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
 *                   example: Insufficient permissions
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.put('/:id', authenticate, authorize('manager', 'district', 'regional', 'corporate'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const location = await LocationService.updateLocation(id, updates);

    if (!location) {
      return res.status(404).json({
        success: false,
        error: 'Location not found'
      });
    }

    res.json({
      success: true,
      data: location,
      message: 'Location updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /locations/{id}:
 *   delete:
 *     summary: Delete a location
 *     description: Soft delete (deactivate) a location. Requires authentication and regional-level or higher authorization.
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Location ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Location deactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Location deactivated successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Forbidden - Insufficient permissions
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
 *                   example: Insufficient permissions
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         description: Server error
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
 *                   example: Internal server error
 */
router.delete('/:id', authenticate, authorize('regional', 'corporate'), async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await LocationService.deleteLocation(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Location not found'
      });
    }

    res.json({
      success: true,
      message: 'Location deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
