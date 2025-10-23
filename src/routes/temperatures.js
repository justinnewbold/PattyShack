/**
 * Temperature Monitoring Routes
 * Handles HACCP-compliant temperature logging and IoT sensor integration
 */

const express = require('express');
const TemperatureService = require('../services/TemperatureService');

const router = express.Router();

/**
 * @swagger
 * /temperatures:
 *   get:
 *     summary: List temperature logs
 *     description: Retrieve temperature logs with optional filtering by location, equipment, and date range for HACCP compliance tracking
 *     tags: [Temperatures]
 *     parameters:
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: integer
 *         description: Filter by location ID
 *         example: 1
 *       - in: query
 *         name: equipmentId
 *         schema:
 *           type: string
 *         description: Filter by equipment ID
 *         example: "FRIDGE-001"
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs from this date (inclusive)
 *         example: "2025-10-01T00:00:00Z"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs until this date (inclusive)
 *         example: "2025-10-23T23:59:59Z"
 *     responses:
 *       200:
 *         description: Temperature logs retrieved successfully
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
 *                     $ref: '#/components/schemas/TemperatureLog'
 */
router.get('/', async (req, res, next) => {
  try {
    const { locationId, equipmentId, startDate, endDate } = req.query;

    const data = await TemperatureService.getLogs({
      locationId,
      equipmentId,
      startDate,
      endDate
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
 * /temperatures:
 *   post:
 *     summary: Log temperature reading
 *     description: Record a new temperature reading from manual entry or IoT sensor for HACCP compliance
 *     tags: [Temperatures]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - locationId
 *               - equipmentId
 *               - equipmentType
 *               - temperature
 *               - source
 *             properties:
 *               locationId:
 *                 type: integer
 *                 description: Location ID where equipment is located
 *                 example: 1
 *               equipmentId:
 *                 type: string
 *                 description: Unique equipment identifier
 *                 example: "FRIDGE-001"
 *               equipmentType:
 *                 type: string
 *                 description: Type of equipment
 *                 example: "walk-in cooler"
 *               temperature:
 *                 type: number
 *                 format: float
 *                 description: Temperature reading in Fahrenheit
 *                 example: 38.5
 *               source:
 *                 type: string
 *                 enum: [manual, iot]
 *                 description: Source of the temperature reading
 *                 example: "iot"
 *               recordedAt:
 *                 type: string
 *                 format: date-time
 *                 description: Timestamp when temperature was recorded (defaults to current time)
 *                 example: "2025-10-23T14:30:00Z"
 *               recordedBy:
 *                 type: integer
 *                 description: User ID who recorded the temperature (for manual entries)
 *                 example: 5
 *     responses:
 *       201:
 *         description: Temperature reading logged successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/TemperatureLog'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      locationId,
      equipmentId,
      equipmentType,
      temperature,
      source,
      recordedAt,
      recordedBy
    } = req.body;

    const entry = await TemperatureService.logReading({
      locationId,
      equipmentId,
      equipmentType,
      temperature,
      source,
      recordedAt,
      recordedBy
    });

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
 * /temperatures/alerts:
 *   get:
 *     summary: Get temperature alerts
 *     description: Retrieve temperature alerts with optional filtering by location and status. Alerts are generated when temperatures fall outside safe ranges.
 *     tags: [Temperatures]
 *     parameters:
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: integer
 *         description: Filter by location ID
 *         example: 1
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, acknowledged, resolved]
 *         description: Filter by alert status
 *         example: "open"
 *     responses:
 *       200:
 *         description: Temperature alerts retrieved successfully
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       locationId:
 *                         type: integer
 *                       equipmentId:
 *                         type: string
 *                       temperature:
 *                         type: number
 *                       status:
 *                         type: string
 *                         enum: [open, acknowledged, resolved]
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       acknowledgedAt:
 *                         type: string
 *                         format: date-time
 *                       resolvedAt:
 *                         type: string
 *                         format: date-time
 */
router.get('/alerts', async (req, res, next) => {
  try {
    const { locationId, status } = req.query;

    const data = await TemperatureService.getAlerts({
      locationId,
      status
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
 * /temperatures/alerts/{id}/acknowledge:
 *   post:
 *     summary: Acknowledge a temperature alert
 *     description: Acknowledge a temperature alert to indicate that staff is aware of the issue and taking action
 *     tags: [Temperatures]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Alert ID
 *         example: 1
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               acknowledgedBy:
 *                 type: integer
 *                 description: User ID who acknowledged the alert
 *                 example: 5
 *               note:
 *                 type: string
 *                 description: Acknowledgment note
 *                 example: "Investigating the temperature issue with cooler unit"
 *     responses:
 *       200:
 *         description: Alert acknowledged successfully
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
 *                     id:
 *                       type: integer
 *                     status:
 *                       type: string
 *                       example: "acknowledged"
 *                     acknowledgedBy:
 *                       type: integer
 *                     acknowledgedAt:
 *                       type: string
 *                       format: date-time
 *                     note:
 *                       type: string
 *       404:
 *         description: Alert not found
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
 *                   example: "Alert not found"
 */
router.post('/alerts/:id/acknowledge', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { acknowledgedBy, note } = req.body || {};

    const alert = await TemperatureService.acknowledgeAlert(id, {
      acknowledgedBy,
      note
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /temperatures/alerts/{id}/resolve:
 *   post:
 *     summary: Resolve a temperature alert
 *     description: Mark a temperature alert as resolved with resolution details and corrective actions taken
 *     tags: [Temperatures]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Alert ID
 *         example: 1
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resolvedBy:
 *                 type: integer
 *                 description: User ID who resolved the alert
 *                 example: 5
 *               note:
 *                 type: string
 *                 description: Resolution note
 *                 example: "Temperature returned to normal range after thermostat adjustment"
 *               resolution:
 *                 type: string
 *                 description: Detailed resolution and corrective actions taken
 *                 example: "Adjusted thermostat setting from 42F to 38F. Temperature stabilized within 30 minutes."
 *     responses:
 *       200:
 *         description: Alert resolved successfully
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
 *                     id:
 *                       type: integer
 *                     status:
 *                       type: string
 *                       example: "resolved"
 *                     resolvedBy:
 *                       type: integer
 *                     resolvedAt:
 *                       type: string
 *                       format: date-time
 *                     note:
 *                       type: string
 *                     resolution:
 *                       type: string
 *       404:
 *         description: Alert not found
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
 *                   example: "Alert not found"
 */
router.post('/alerts/:id/resolve', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resolvedBy, note, resolution } = req.body || {};

    const alert = await TemperatureService.resolveAlert(id, {
      resolvedBy,
      note,
      resolution
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /temperatures/equipment/{id}:
 *   get:
 *     summary: Get equipment temperature history
 *     description: Retrieve temperature history for a specific piece of equipment with optional time period filtering
 *     tags: [Temperatures]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Equipment ID
 *         example: "FRIDGE-001"
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [24h, 7d, 30d, 90d]
 *         description: Time period for history (defaults to 24h)
 *         example: "7d"
 *     responses:
 *       200:
 *         description: Equipment temperature history retrieved successfully
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
 *                     equipmentId:
 *                       type: string
 *                       example: "FRIDGE-001"
 *                     equipmentType:
 *                       type: string
 *                       example: "walk-in cooler"
 *                     period:
 *                       type: string
 *                       example: "7d"
 *                     readings:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/TemperatureLog'
 *                     statistics:
 *                       type: object
 *                       properties:
 *                         average:
 *                           type: number
 *                           example: 38.2
 *                         min:
 *                           type: number
 *                           example: 36.5
 *                         max:
 *                           type: number
 *                           example: 40.1
 *                         alertCount:
 *                           type: integer
 *                           example: 2
 */
router.get('/equipment/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { period } = req.query;

    const data = await TemperatureService.getEquipmentHistory(id, { period });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
