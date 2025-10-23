/**
 * Scheduling Routes
 * Handles shift scheduling, time tracking, and labor management
 */

const express = require('express');
const ScheduleService = require('../services/ScheduleService');
const validators = require('../utils/validators');

const router = express.Router();

/**
 * @swagger
 * /schedules:
 *   get:
 *     summary: List schedules with filters
 *     description: Retrieve a list of schedules with optional filtering by location, date range, user, and status
 *     tags: [Schedules]
 *     parameters:
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: integer
 *         description: Filter by location ID
 *         example: 1
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (inclusive)
 *         example: "2025-10-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (inclusive)
 *         example: "2025-10-31"
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filter by user ID
 *         example: 5
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, in_progress, completed, cancelled]
 *         description: Filter by schedule status
 *         example: scheduled
 *     responses:
 *       200:
 *         description: Schedules retrieved successfully
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
 *                     $ref: '#/components/schemas/Schedule'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
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

/**
 * @swagger
 * /schedules:
 *   post:
 *     summary: Create a new schedule
 *     description: Create a new shift schedule with employee assignment, time range, and position details
 *     tags: [Schedules]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - locationId
 *               - userId
 *               - date
 *               - startTime
 *               - endTime
 *               - position
 *             properties:
 *               locationId:
 *                 type: integer
 *                 description: Location ID where shift is scheduled
 *                 example: 1
 *               userId:
 *                 type: integer
 *                 description: User ID assigned to this shift
 *                 example: 5
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Date of the scheduled shift
 *                 example: "2025-10-23"
 *               startTime:
 *                 type: string
 *                 description: Start time in HH:MM format
 *                 example: "09:00"
 *               endTime:
 *                 type: string
 *                 description: End time in HH:MM format
 *                 example: "17:00"
 *               position:
 *                 type: string
 *                 description: Position/role for this shift
 *                 example: "Server"
 *               status:
 *                 type: string
 *                 enum: [scheduled, in_progress, completed, cancelled]
 *                 description: Schedule status (defaults to scheduled)
 *                 example: scheduled
 *               breakDuration:
 *                 type: number
 *                 description: Break duration in minutes
 *                 example: 30
 *               hourlyRate:
 *                 type: number
 *                 description: Hourly rate for this shift
 *                 example: 15.50
 *               approvedBy:
 *                 type: integer
 *                 description: User ID who approved this schedule
 *                 example: 2
 *               notes:
 *                 type: string
 *                 description: Additional notes for the shift
 *                 example: "Needs to close"
 *               clockInTime:
 *                 type: string
 *                 format: date-time
 *                 description: Actual clock-in timestamp
 *                 example: "2025-10-23T09:00:00Z"
 *               clockOutTime:
 *                 type: string
 *                 format: date-time
 *                 description: Actual clock-out timestamp
 *                 example: "2025-10-23T17:00:00Z"
 *               metadata:
 *                 type: object
 *                 description: Additional metadata for the schedule
 *     responses:
 *       201:
 *         description: Schedule created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Schedule'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
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

/**
 * @swagger
 * /schedules/{id}/clock-in:
 *   post:
 *     summary: Clock in to a schedule
 *     description: Record employee clock-in time for a scheduled shift
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Schedule ID
 *         example: 1
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: Clock-in timestamp (defaults to current time)
 *                 example: "2025-10-23T09:00:00Z"
 *               location:
 *                 type: string
 *                 description: Location information (GPS coordinates, IP address, etc.)
 *                 example: "40.7128,-74.0060"
 *               notes:
 *                 type: string
 *                 description: Clock-in notes
 *                 example: "Started early"
 *               breakDuration:
 *                 type: number
 *                 description: Expected break duration in minutes
 *                 example: 30
 *     responses:
 *       200:
 *         description: Clock-in recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Schedule'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
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

/**
 * @swagger
 * /schedules/{id}/clock-out:
 *   post:
 *     summary: Clock out from a schedule
 *     description: Record employee clock-out time for a scheduled shift
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Schedule ID
 *         example: 1
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: Clock-out timestamp (defaults to current time)
 *                 example: "2025-10-23T17:00:00Z"
 *               notes:
 *                 type: string
 *                 description: Clock-out notes
 *                 example: "Completed all tasks"
 *               breakDuration:
 *                 type: number
 *                 description: Actual break duration taken in minutes
 *                 example: 30
 *     responses:
 *       200:
 *         description: Clock-out recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Schedule'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
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

/**
 * @swagger
 * /schedules/forecast:
 *   get:
 *     summary: Get labor forecast
 *     description: Retrieve labor forecasting data including scheduled hours, costs, and staffing projections for a location and date
 *     tags: [Schedules]
 *     parameters:
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: integer
 *         description: Filter by location ID
 *         example: 1
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Date for forecast (defaults to current date)
 *         example: "2025-10-23"
 *     responses:
 *       200:
 *         description: Labor forecast retrieved successfully
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
 *                   description: Labor forecasting data including metrics like total hours, labor cost, and staffing levels
 *                   properties:
 *                     totalHours:
 *                       type: number
 *                       description: Total scheduled hours
 *                       example: 120
 *                     totalCost:
 *                       type: number
 *                       description: Total labor cost
 *                       example: 1860.00
 *                     employeeCount:
 *                       type: integer
 *                       description: Number of employees scheduled
 *                       example: 15
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
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
