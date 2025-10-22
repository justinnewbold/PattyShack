/**
 * Temperature Monitoring Routes
 * Handles HACCP-compliant temperature logging and IoT sensor integration
 */

const express = require('express');
const TemperatureService = require('../services/TemperatureService');

const router = express.Router();

// GET /api/v1/temperatures - List temperature logs
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

// POST /api/v1/temperatures - Log temperature reading
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

// GET /api/v1/temperatures/alerts - Get temperature alerts
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

// POST /api/v1/temperatures/alerts/:id/acknowledge - Acknowledge a temperature alert
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

// POST /api/v1/temperatures/alerts/:id/resolve - Resolve a temperature alert
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

// GET /api/v1/temperatures/equipment/:id - Get equipment temperature history
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
