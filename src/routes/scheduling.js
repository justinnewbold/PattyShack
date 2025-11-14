/**
 * Scheduling Routes
 * Employee scheduling, availability, time-off, shift trades, and automated scheduling
 */

const express = require('express');
const SchedulingService = require('../services/SchedulingService');

const router = express.Router();

// ===== EMPLOYEE AVAILABILITY =====

router.post('/availability', async (req, res, next) => {
  try {
    const availability = await SchedulingService.setAvailability(req.body);
    res.status(201).json({ success: true, data: availability });
  } catch (error) {
    next(error);
  }
});

router.get('/availability/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { locationId } = req.query;
    const availability = await SchedulingService.getAvailability(userId, locationId);
    res.json({ success: true, data: availability });
  } catch (error) {
    next(error);
  }
});

router.delete('/availability/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const availability = await SchedulingService.deleteAvailability(id);
    res.json({ success: true, data: availability });
  } catch (error) {
    next(error);
  }
});

// ===== TIME-OFF REQUESTS =====

router.post('/time-off', async (req, res, next) => {
  try {
    const request = await SchedulingService.requestTimeOff(req.body);
    res.status(201).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
});

router.post('/time-off/:id/review', async (req, res, next) => {
  try {
    const { id } = req.params;
    const request = await SchedulingService.reviewTimeOffRequest(id, req.body);
    res.json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
});

router.get('/time-off', async (req, res, next) => {
  try {
    const { locationId, status } = req.query;
    const requests = await SchedulingService.getTimeOffRequests(locationId, status);
    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
});

// ===== SCHEDULE TEMPLATES =====

router.post('/templates', async (req, res, next) => {
  try {
    const template = await SchedulingService.createTemplate(req.body);
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
});

router.get('/templates/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const template = await SchedulingService.getTemplate(id);
    res.json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
});

router.get('/templates', async (req, res, next) => {
  try {
    const { locationId } = req.query;
    const templates = await SchedulingService.getTemplates(locationId);
    res.json({ success: true, data: templates });
  } catch (error) {
    next(error);
  }
});

// ===== SCHEDULES =====

router.post('/schedules', async (req, res, next) => {
  try {
    const schedule = await SchedulingService.createSchedule(req.body);
    res.status(201).json({ success: true, data: schedule });
  } catch (error) {
    next(error);
  }
});

router.post('/schedules/:id/generate', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { templateId } = req.body;
    const result = await SchedulingService.generateScheduleFromTemplate(id, templateId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/schedules/:id/publish', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { publishedBy } = req.body;
    const schedule = await SchedulingService.publishSchedule(id, publishedBy);
    res.json({ success: true, data: schedule });
  } catch (error) {
    next(error);
  }
});

router.post('/schedules/:id/auto-assign', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await SchedulingService.autoAssignShifts(id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/schedules/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const schedule = await SchedulingService.getSchedule(id);
    res.json({ success: true, data: schedule });
  } catch (error) {
    next(error);
  }
});

router.get('/schedules', async (req, res, next) => {
  try {
    const { locationId, weekStart, weekEnd } = req.query;
    const schedules = await SchedulingService.getSchedules(locationId, weekStart, weekEnd);
    res.json({ success: true, data: schedules });
  } catch (error) {
    next(error);
  }
});

router.get('/schedules/:id/conflicts', async (req, res, next) => {
  try {
    const { id } = req.params;
    const conflicts = await SchedulingService.getScheduleConflicts(id);
    res.json({ success: true, data: conflicts });
  } catch (error) {
    next(error);
  }
});

router.get('/schedules/:id/summary', async (req, res, next) => {
  try {
    const { locationId, weekStart, weekEnd } = req.query;
    const summary = await SchedulingService.getWeeklySummary(locationId, weekStart, weekEnd);
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
});

// ===== SHIFTS =====

router.post('/shifts', async (req, res, next) => {
  try {
    const shift = await SchedulingService.createShift(req.body);
    res.status(201).json({ success: true, data: shift });
  } catch (error) {
    next(error);
  }
});

router.post('/shifts/:id/assign', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const shift = await SchedulingService.assignShift(id, userId);
    res.json({ success: true, data: shift });
  } catch (error) {
    next(error);
  }
});

router.put('/shifts/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, userId } = req.body;
    const shift = await SchedulingService.updateShiftStatus(id, status, userId);
    res.json({ success: true, data: shift });
  } catch (error) {
    next(error);
  }
});

router.get('/shifts/employee/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    const shifts = await SchedulingService.getEmployeeShifts(userId, startDate, endDate);
    res.json({ success: true, data: shifts });
  } catch (error) {
    next(error);
  }
});

// ===== SHIFT TRADES =====

router.post('/shift-trades', async (req, res, next) => {
  try {
    const trade = await SchedulingService.requestShiftTrade(req.body);
    res.status(201).json({ success: true, data: trade });
  } catch (error) {
    next(error);
  }
});

router.post('/shift-trades/:id/respond', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, response } = req.body;
    const trade = await SchedulingService.respondToShiftTrade(id, userId, response);
    res.json({ success: true, data: trade });
  } catch (error) {
    next(error);
  }
});

router.post('/shift-trades/:id/approve', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;
    const trade = await SchedulingService.approveShiftTrade(id, approvedBy);
    res.json({ success: true, data: trade });
  } catch (error) {
    next(error);
  }
});

router.get('/shift-trades', async (req, res, next) => {
  try {
    const { locationId, status } = req.query;
    const trades = await SchedulingService.getShiftTrades(locationId, status);
    res.json({ success: true, data: trades });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
