/**
 * Schedule Service
 * Business logic for labor scheduling, time tracking, and forecasting utilities.
 */

const { getPool } = require('../database/pool');

class ScheduleService {
  constructor() {
    // Database-backed service
  }

  async createSchedule(data) {
    const pool = getPool();

    const scheduledHours = this.calculateScheduledHoursFromTimes(data.startTime, data.endTime, data.breakDuration);
    const actualHours = data.clockInTime && data.clockOutTime
      ? this.calculateActualHoursFromTimestamps(data.clockInTime, data.clockOutTime, data.breakDuration)
      : 0;
    const hourlyRate = this.resolveHourlyRate(data);
    const laborCost = this.calculateLaborCost(actualHours || scheduledHours, hourlyRate);

    const schedule = {
      id: String(data.id || this.generateId()),
      location_id: data.locationId,
      user_id: data.userId,
      date: data.date,
      start_time: data.startTime,
      end_time: data.endTime,
      position: data.position || null,
      status: data.status || 'scheduled',
      clock_in_time: data.clockInTime ? new Date(data.clockInTime) : null,
      clock_out_time: data.clockOutTime ? new Date(data.clockOutTime) : null,
      clock_in_location: data.clockInLocation || null,
      break_duration: data.breakDuration || 0,
      actual_hours: actualHours,
      scheduled_hours: scheduledHours,
      labor_cost: laborCost,
      hourly_rate: hourlyRate,
      approved_by: data.approvedBy || null,
      notes: data.notes || null,
      metadata: JSON.stringify(data.metadata || {})
    };

    const result = await pool.query(`
      INSERT INTO schedules (
        id, location_id, user_id, date, start_time, end_time, position, status,
        clock_in_time, clock_out_time, clock_in_location, break_duration,
        actual_hours, scheduled_hours, labor_cost, hourly_rate, approved_by, notes, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `, [
      schedule.id, schedule.location_id, schedule.user_id, schedule.date,
      schedule.start_time, schedule.end_time, schedule.position, schedule.status,
      schedule.clock_in_time, schedule.clock_out_time, schedule.clock_in_location,
      schedule.break_duration, schedule.actual_hours, schedule.scheduled_hours,
      schedule.labor_cost, schedule.hourly_rate, schedule.approved_by,
      schedule.notes, schedule.metadata
    ]);

    return this.formatSchedule(result.rows[0]);
  }

  async getSchedules(filters = {}) {
    const pool = getPool();
    const { locationId, startDate, endDate, userId, status } = filters;

    let query = 'SELECT * FROM schedules WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (locationId) {
      query += ` AND location_id = $${paramIndex++}`;
      params.push(String(locationId));
    }

    if (userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(String(userId));
    }

    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    if (startDate) {
      query += ` AND date >= $${paramIndex++}`;
      params.push(this.normalizeDate(startDate).toISOString().split('T')[0]);
    }

    if (endDate) {
      query += ` AND date <= $${paramIndex++}`;
      params.push(this.normalizeDate(endDate).toISOString().split('T')[0]);
    }

    query += ' ORDER BY date ASC, start_time ASC';

    const result = await pool.query(query, params);
    const schedules = result.rows.map(row => this.formatSchedule(row));

    const summary = this.calculateLaborSummary(schedules);

    return {
      schedules,
      laborSummary: summary
    };
  }

  async getScheduleById(id) {
    const pool = getPool();
    if (id === undefined || id === null) return null;

    const result = await pool.query('SELECT * FROM schedules WHERE id = $1', [String(id)]);

    if (result.rows.length === 0) return null;
    return this.formatSchedule(result.rows[0]);
  }

  async clockInSchedule(id, options = {}) {
    const pool = getPool();

    const schedule = await this.getScheduleById(id);
    if (!schedule) return null;

    const clockInTime = options.timestamp ? new Date(options.timestamp) : new Date();
    const breakDuration = typeof options.breakDuration !== 'undefined'
      ? Number(options.breakDuration) || 0
      : schedule.breakDuration;

    const result = await pool.query(`
      UPDATE schedules
      SET
        clock_in_time = $1,
        clock_in_location = $2,
        break_duration = $3,
        status = 'in_progress',
        notes = $4,
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [
      clockInTime,
      options.location || schedule.clockInLocation,
      breakDuration,
      this.appendNote(schedule.notes, options.notes),
      String(id)
    ]);

    if (result.rows.length === 0) return null;
    return this.formatSchedule(result.rows[0]);
  }

  async clockOutSchedule(id, options = {}) {
    const pool = getPool();

    const schedule = await this.getScheduleById(id);
    if (!schedule) return null;

    const clockOutTime = options.timestamp ? new Date(options.timestamp) : new Date();
    const clockInTime = schedule.clockInTime ? new Date(schedule.clockInTime) : (options.timestamp ? new Date(options.timestamp) : new Date());
    const breakDuration = typeof options.breakDuration !== 'undefined'
      ? Number(options.breakDuration) || 0
      : schedule.breakDuration;

    const actualHours = this.calculateActualHoursFromTimestamps(clockInTime, clockOutTime, breakDuration);
    const laborCost = this.calculateLaborCost(actualHours, schedule.hourlyRate);

    const result = await pool.query(`
      UPDATE schedules
      SET
        clock_in_time = $1,
        clock_out_time = $2,
        break_duration = $3,
        actual_hours = $4,
        labor_cost = $5,
        status = 'completed',
        notes = $6,
        updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `, [
      clockInTime,
      clockOutTime,
      breakDuration,
      actualHours,
      laborCost,
      this.appendNote(schedule.notes, options.notes),
      String(id)
    ]);

    if (result.rows.length === 0) return null;
    return this.formatSchedule(result.rows[0]);
  }

  async getForecast(options = {}) {
    const pool = getPool();
    const { locationId, date } = options;
    const targetDate = this.normalizeDate(date) || this.normalizeDate(new Date());
    const dayOfWeek = targetDate.getUTCDay();

    // Get historical schedules for the same day of week
    let query = 'SELECT * FROM schedules WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (locationId) {
      query += ` AND location_id = $${paramIndex++}`;
      params.push(String(locationId));
    }

    const result = await pool.query(query, params);
    const allSchedules = result.rows.map(row => this.formatSchedule(row));

    // Filter by day of week
    const relevantSchedules = allSchedules.filter(schedule => {
      const scheduleDate = this.normalizeDate(schedule.date);
      if (!scheduleDate) return false;
      return scheduleDate.getUTCDay() === dayOfWeek;
    });

    const historicalSampleSize = relevantSchedules.length;
    const averageScheduledHours = this.average(
      relevantSchedules.map(schedule => schedule.scheduledHours)
    );
    const averageActualHours = this.average(relevantSchedules.map(schedule => schedule.actualHours));
    const hoursBaseline = averageActualHours || averageScheduledHours;
    const recommendedLaborHours = this.roundToTwo(hoursBaseline * 1.05);

    const totalSales = relevantSchedules.reduce((sum, schedule) => {
      const metadata = schedule.metadata || {};
      const sales = metadata.actualSales ?? metadata.projectedSales ?? 0;
      return sum + (Number.isFinite(sales) ? sales : 0);
    }, 0);
    const forecastedSales = historicalSampleSize ? totalSales / historicalSampleSize : 0;

    const coverageByPosition = this.buildCoverageByPosition(relevantSchedules);
    const suggestedStaffing = this.buildStaffingSuggestions(coverageByPosition, recommendedLaborHours);

    return {
      date: targetDate.toISOString().split('T')[0],
      locationId: locationId ? String(locationId) : null,
      historicalSampleSize,
      forecastedSales: this.roundToTwo(forecastedSales),
      recommendedLaborHours,
      suggestedStaffing,
      confidence: this.resolveConfidence(historicalSampleSize)
    };
  }

  calculateLaborSummary(schedules) {
    if (!schedules.length) {
      return {
        totalShifts: 0,
        scheduledHours: 0,
        actualHours: 0,
        totalHours: 0,
        totalCost: 0,
        laborPercent: null,
        overtimeHours: 0,
        openShifts: 0,
        coverageByPosition: {}
      };
    }

    let scheduledHours = 0;
    let actualHours = 0;
    let totalCost = 0;
    let overtimeHours = 0;
    let totalSales = 0;

    schedules.forEach(schedule => {
      const scheduleScheduledHours = schedule.scheduledHours || 0;
      const scheduleActualHours = schedule.actualHours || 0;

      scheduledHours += scheduleScheduledHours;
      actualHours += scheduleActualHours;
      totalCost += schedule.laborCost || 0;

      if (scheduleActualHours > 8) {
        overtimeHours += scheduleActualHours - 8;
      }

      const metadata = schedule.metadata || {};
      const sales = metadata.actualSales ?? metadata.projectedSales ?? 0;
      if (Number.isFinite(sales)) {
        totalSales += sales;
      }
    });

    const coverageByPosition = this.buildCoverageByPosition(schedules);
    const effectiveHours = actualHours || scheduledHours;
    const laborPercent = totalSales ? (totalCost / totalSales) * 100 : null;

    return {
      totalShifts: schedules.length,
      scheduledHours: this.roundToTwo(scheduledHours),
      actualHours: this.roundToTwo(actualHours),
      totalHours: this.roundToTwo(effectiveHours),
      totalCost: this.roundToTwo(totalCost),
      laborPercent: laborPercent === null ? null : this.roundToTwo(laborPercent),
      overtimeHours: this.roundToTwo(overtimeHours),
      openShifts: schedules.filter(schedule => schedule.status === 'open').length,
      coverageByPosition
    };
  }

  buildCoverageByPosition(schedules) {
    const coverage = {};

    schedules.forEach(schedule => {
      if (!schedule.position) return;

      const key = schedule.position;
      if (!coverage[key]) {
        coverage[key] = {
          scheduledHours: 0,
          actualHours: 0,
          headcount: 0
        };
      }

      coverage[key].scheduledHours += schedule.scheduledHours || 0;
      coverage[key].actualHours += schedule.actualHours || 0;
      coverage[key].headcount += 1;
    });

    Object.keys(coverage).forEach(position => {
      coverage[position] = {
        scheduledHours: this.roundToTwo(coverage[position].scheduledHours),
        actualHours: this.roundToTwo(coverage[position].actualHours),
        headcount: coverage[position].headcount
      };
    });

    return coverage;
  }

  buildStaffingSuggestions(coverageByPosition, recommendedLaborHours) {
    const entries = Object.entries(coverageByPosition);
    if (!entries.length) return [];

    const totalScheduled = entries.reduce(
      (sum, [, value]) => sum + (value.scheduledHours || 0),
      0
    );

    return entries.map(([position, value]) => {
      const weight = totalScheduled ? value.scheduledHours / totalScheduled : 0;
      const hoursForPosition = this.roundToTwo(recommendedLaborHours * weight);
      const averageShiftLength = value.headcount ? value.scheduledHours / value.headcount : 0;
      const recommendedHeadcount = averageShiftLength
        ? Math.max(1, Math.round(hoursForPosition / averageShiftLength))
        : value.headcount || 1;

      return {
        position,
        hours: hoursForPosition,
        averageShiftLength: this.roundToTwo(averageShiftLength),
        recommendedHeadcount
      };
    });
  }

  calculateScheduledHoursFromTimes(startTime, endTime, breakDuration = 0) {
    if (!startTime || !endTime) return 0;

    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    const totalMinutes = endTotalMinutes - startTotalMinutes;
    const hours = (totalMinutes - (breakDuration || 0)) / 60;

    return this.roundToTwo(Math.max(0, hours));
  }

  calculateActualHoursFromTimestamps(clockInTime, clockOutTime, breakDuration = 0) {
    if (!clockInTime || !clockOutTime) return 0;

    const inTime = new Date(clockInTime);
    const outTime = new Date(clockOutTime);

    const totalMilliseconds = outTime - inTime;
    const totalMinutes = totalMilliseconds / (1000 * 60);
    const hours = (totalMinutes - (breakDuration || 0)) / 60;

    return this.roundToTwo(Math.max(0, hours));
  }

  calculateLaborCost(hours, hourlyRate) {
    return this.roundToTwo((hours || 0) * (hourlyRate || 0));
  }

  resolveHourlyRate(data) {
    if (typeof data.hourlyRate !== 'undefined' && Number.isFinite(Number(data.hourlyRate))) {
      return Number(data.hourlyRate);
    }

    if (data.metadata && Number.isFinite(Number(data.metadata.hourlyRate))) {
      return Number(data.metadata.hourlyRate);
    }

    return 0;
  }

  normalizeDate(value) {
    if (!value) return null;
    const date = value instanceof Date ? new Date(value) : new Date(String(value));
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  average(values) {
    const filtered = values.filter(value => Number.isFinite(value));
    if (!filtered.length) return 0;
    const total = filtered.reduce((sum, value) => sum + value, 0);
    return total / filtered.length;
  }

  resolveConfidence(sampleSize) {
    if (sampleSize >= 7) return 'high';
    if (sampleSize >= 3) return 'medium';
    if (sampleSize >= 1) return 'low';
    return 'insufficient-data';
  }

  appendNote(existing, addition) {
    if (!addition) return existing || '';
    const trimmed = typeof addition === 'string' ? addition.trim() : '';
    if (!trimmed) return existing || '';

    if (!existing) {
      return trimmed;
    }

    return `${existing}\n${trimmed}`;
  }

  roundToTwo(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.round(value * 100) / 100;
  }

  generateId() {
    return `sched-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  // Helper method to format database row to API response format
  formatSchedule(row) {
    return {
      id: row.id,
      locationId: row.location_id,
      userId: row.user_id,
      date: row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      breakDuration: row.break_duration,
      position: row.position,
      status: row.status,
      clockInTime: row.clock_in_time ? row.clock_in_time.toISOString() : null,
      clockOutTime: row.clock_out_time ? row.clock_out_time.toISOString() : null,
      clockInLocation: row.clock_in_location,
      scheduledHours: this.roundToTwo(row.scheduled_hours),
      actualHours: this.roundToTwo(row.actual_hours),
      hourlyRate: parseFloat(row.hourly_rate),
      laborCost: this.roundToTwo(row.labor_cost),
      approvedBy: row.approved_by,
      notes: row.notes || '',
      metadata: row.metadata || {},
      createdAt: row.created_at ? row.created_at.toISOString() : null,
      updatedAt: row.updated_at ? row.updated_at.toISOString() : null
    };
  }
}

module.exports = new ScheduleService();
