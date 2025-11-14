/**
 * Enhanced Temperature Monitoring Routes
 * Multi-sensor dashboard, alerts, maintenance, and compliance
 */

const express = require('express');
const EnhancedTemperatureService = require('../services/EnhancedTemperatureService');

const router = express.Router();

// ===== EQUIPMENT MANAGEMENT =====

router.post('/equipment', async (req, res, next) => {
  try {
    const equipment = await EnhancedTemperatureService.registerEquipment(req.body);
    res.status(201).json({ success: true, data: equipment });
  } catch (error) {
    next(error);
  }
});

router.get('/equipment/dashboard', async (req, res, next) => {
  try {
    const { locationId } = req.query;
    const dashboard = await EnhancedTemperatureService.getEquipmentDashboard(locationId);
    res.json({ success: true, data: dashboard });
  } catch (error) {
    next(error);
  }
});

router.post('/equipment/:id/threshold', async (req, res, next) => {
  try {
    const { id } = req.params;
    const threshold = await EnhancedTemperatureService.setCustomThreshold(id, req.body);
    res.status(201).json({ success: true, data: threshold });
  } catch (error) {
    next(error);
  }
});

router.put('/equipment/:id/battery', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { batteryLevel } = req.body;
    const equipment = await EnhancedTemperatureService.updateBatteryLevel(id, batteryLevel);
    res.json({ success: true, data: equipment });
  } catch (error) {
    next(error);
  }
});

router.get('/equipment/low-battery', async (req, res, next) => {
  try {
    const { locationId } = req.query;
    const equipment = await EnhancedTemperatureService.getLowBatteryEquipment(locationId);
    res.json({ success: true, data: equipment });
  } catch (error) {
    next(error);
  }
});

// ===== ALERTS =====

router.post('/alerts', async (req, res, next) => {
  try {
    const alert = await EnhancedTemperatureService.createAlert(req.body);
    res.status(201).json({ success: true, data: alert });
  } catch (error) {
    next(error);
  }
});

router.get('/alerts/active', async (req, res, next) => {
  try {
    const { locationId } = req.query;
    const alerts = await EnhancedTemperatureService.getActiveAlerts(locationId);
    res.json({ success: true, data: alerts });
  } catch (error) {
    next(error);
  }
});

router.post('/alerts/:id/acknowledge', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const alert = await EnhancedTemperatureService.acknowledgeAlert(id, userId);
    res.json({ success: true, data: alert });
  } catch (error) {
    next(error);
  }
});

router.post('/alerts/:id/resolve', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, resolutionNotes } = req.body;
    const alert = await EnhancedTemperatureService.resolveAlert(id, userId, resolutionNotes);
    res.json({ success: true, data: alert });
  } catch (error) {
    next(error);
  }
});

// ===== TRENDS & ANALYTICS =====

router.get('/equipment/:id/trends', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { hours = 24 } = req.query;
    const trends = await EnhancedTemperatureService.getTemperatureTrends(id, hours);
    res.json({ success: true, data: trends });
  } catch (error) {
    next(error);
  }
});

router.get('/equipment/:id/anomalies', async (req, res, next) => {
  try {
    const { id } = req.params;
    const anomalies = await EnhancedTemperatureService.detectAnomalies(id);
    res.json({ success: true, data: anomalies });
  } catch (error) {
    next(error);
  }
});

// ===== MAINTENANCE =====

router.post('/maintenance', async (req, res, next) => {
  try {
    const maintenance = await EnhancedTemperatureService.scheduleMaintenance(req.body);
    res.status(201).json({ success: true, data: maintenance });
  } catch (error) {
    next(error);
  }
});

router.get('/maintenance/schedule', async (req, res, next) => {
  try {
    const { locationId } = req.query;
    const schedule = await EnhancedTemperatureService.getMaintenanceSchedule(locationId);
    res.json({ success: true, data: schedule });
  } catch (error) {
    next(error);
  }
});

// ===== COLD CHAIN COMPLIANCE =====

router.post('/cold-chain/events', async (req, res, next) => {
  try {
    const event = await EnhancedTemperatureService.logColdChainEvent(req.body);
    res.status(201).json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
});

router.get('/cold-chain/report', async (req, res, next) => {
  try {
    const { locationId, startDate, endDate } = req.query;
    const report = await EnhancedTemperatureService.getColdChainReport(locationId, startDate, endDate);
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
