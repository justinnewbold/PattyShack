/**
 * Scheduling Routes
 * Handles shift scheduling, time tracking, and labor management
 */

const express = require('express');
const ScheduleService = require('../services/ScheduleService');
const validators = require('../utils/validators');

const router = express.Router();

// GET /api/v1/schedules - List schedules with optional filters
router.get('/', async (req, res, next) => {
  try {
    const { locationId, startDate, endDate, userId, status } = req.query;

    if (startDate && !validators.isValidDate(startDate)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid startDate provided'
      });
    }

    if (endDate && !validators.isValidDate(endDate)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid endDate provided'
      });
    }

    if (status && !validators.isValidScheduleStatus(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid schedule status filter'
      });
    }

    const data = await ScheduleService.getSchedules({
      locationId,
      startDate,
      endDate,
      userId,
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

// POST /api/v1/schedules - Create schedule
router.post('/', async (req, res, next) => {
  try {
    const scheduleData = req.body || {};
    const requiredFields = ['locationId', 'userId', 'date', 'startTime', 'endTime', 'position'];

    if (!validators.hasRequiredFields(scheduleData, requiredFields)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: locationId, userId, date, startTime, endTime, position'
      });
    }

    if (!validators.isValidDate(scheduleData.date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date provided'
      });
    }

    const startTime = String(scheduleData.startTime).trim();
    const endTime = String(scheduleData.endTime).trim();

    if (!validators.isValidTimeRange(startTime, endTime)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid start/end time range'
      });
    }

    if (scheduleData.status && !validators.isValidScheduleStatus(scheduleData.status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid schedule status'
      });
    }

    if (
      typeof scheduleData.breakDuration !== 'undefined' &&
      !validators.isValidDuration(scheduleData.breakDuration)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid break duration'
      });
    }

    if (
      typeof scheduleData.hourlyRate !== 'undefined' &&
      !validators.isNonNegativeNumber(scheduleData.hourlyRate)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid hourly rate'
      });
    }

    const sanitizedSchedule = {
      locationId: validators.sanitizeString(String(scheduleData.locationId)),
      userId: validators.sanitizeString(String(scheduleData.userId)),
      date: scheduleData.date,
      startTime,
      endTime,
      position: validators.sanitizeString(scheduleData.position),
      status: scheduleData.status || 'scheduled',
      breakDuration:
        typeof scheduleData.breakDuration !== 'undefined'
          ? Number(scheduleData.breakDuration)
          : undefined,
      hourlyRate:
        typeof scheduleData.hourlyRate !== 'undefined'
          ? Number(scheduleData.hourlyRate)
          : undefined,
      approvedBy: scheduleData.approvedBy
        ? validators.sanitizeString(String(scheduleData.approvedBy))
        : undefined,
      notes: scheduleData.notes ? validators.sanitizeString(scheduleData.notes) : undefined,
      metadata:
        scheduleData.metadata && typeof scheduleData.metadata === 'object'
          ? scheduleData.metadata
          : undefined
    };

    if (scheduleData.clockInTime) {
      if (!validators.isValidDate(scheduleData.clockInTime)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid clockInTime provided'
        });
      }
      sanitizedSchedule.clockInTime = scheduleData.clockInTime;
    }

    if (scheduleData.clockOutTime) {
      if (!validators.isValidDate(scheduleData.clockOutTime)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid clockOutTime provided'
        });
      }
      sanitizedSchedule.clockOutTime = scheduleData.clockOutTime;
    }

    const created = await ScheduleService.createSchedule(sanitizedSchedule);

    res.status(201).json({
      success: true,
      data: created
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/schedules/:id/clock-in - Clock in
router.post('/:id/clock-in', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { timestamp, location, notes, breakDuration } = req.body || {};

    if (timestamp && !validators.isValidDate(timestamp)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid timestamp provided'
      });
    }

    if (
      typeof breakDuration !== 'undefined' &&
      !validators.isValidDuration(breakDuration)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid break duration'
      });
    }

    const schedule = await ScheduleService.clockInSchedule(id, {
      timestamp,
      location,
      breakDuration,
      notes: notes ? validators.sanitizeString(notes) : undefined
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found'
      });
    }

    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/schedules/:id/clock-out - Clock out
router.post('/:id/clock-out', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { timestamp, notes, breakDuration } = req.body || {};

    if (timestamp && !validators.isValidDate(timestamp)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid timestamp provided'
      });
    }

    if (
      typeof breakDuration !== 'undefined' &&
      !validators.isValidDuration(breakDuration)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid break duration'
      });
    }

    const schedule = await ScheduleService.clockOutSchedule(id, {
      timestamp,
      breakDuration,
      notes: notes ? validators.sanitizeString(notes) : undefined
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found'
      });
    }

    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/schedules/forecast - Labor forecasting
router.get('/forecast', async (req, res, next) => {
  try {
    const { locationId, date } = req.query;

    if (date && !validators.isValidDate(date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date provided'
      });
    }

    const data = await ScheduleService.getForecast({ locationId, date });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
