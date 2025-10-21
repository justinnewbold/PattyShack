/**
 * Schedule Service
 * Provides in-memory labor scheduling, time tracking, and forecasting utilities.
 */

const Schedule = require('../models/Schedule');

class ScheduleService {
  constructor() {
    this.schedules = new Map();
    this.seedDemoData();
  }

  seedDemoData() {
    const today = new Date();
    const startOfWeek = this.startOfWeek(today);

    const demoSchedules = [
      {
        id: 'sched-100',
        locationId: 'store-100',
        userId: 'employee-501',
        date: this.formatDate(startOfWeek),
        startTime: '08:00',
        endTime: '16:00',
        breakDuration: 30,
        position: 'cook',
        status: 'completed',
        hourlyRate: 18.5,
        clockInTime: this.combineDateTime(startOfWeek, '07:55'),
        clockOutTime: this.combineDateTime(startOfWeek, '16:10'),
        metadata: {
          actualSales: 5200,
          daypart: 'lunch'
        }
      },
      {
        id: 'sched-101',
        locationId: 'store-100',
        userId: 'employee-502',
        date: this.formatDate(this.addDays(startOfWeek, 1)),
        startTime: '10:00',
        endTime: '18:00',
        breakDuration: 45,
        position: 'cashier',
        status: 'completed',
        hourlyRate: 16,
        clockInTime: this.combineDateTime(this.addDays(startOfWeek, 1), '09:58'),
        clockOutTime: this.combineDateTime(this.addDays(startOfWeek, 1), '18:15'),
        metadata: {
          actualSales: 6100,
          daypart: 'full_day'
        }
      },
      {
        id: 'sched-102',
        locationId: 'store-200',
        userId: 'employee-601',
        date: this.formatDate(this.addDays(startOfWeek, 2)),
        startTime: '09:00',
        endTime: '17:00',
        breakDuration: 30,
        position: 'manager',
        status: 'confirmed',
        hourlyRate: 24,
        metadata: {
          projectedSales: 7000,
          daypart: 'day'
        }
      },
      {
        id: 'sched-103',
        locationId: 'store-100',
        userId: 'unassigned',
        date: this.formatDate(this.addDays(startOfWeek, 3)),
        startTime: '16:00',
        endTime: '22:00',
        breakDuration: 20,
        position: 'line',
        status: 'open',
        hourlyRate: 15,
        metadata: {
          projectedSales: 4800,
          daypart: 'dinner'
        }
      }
    ];

    demoSchedules.forEach(schedule => {
      this.createSchedule(schedule);
    });
  }

  async createSchedule(data) {
    const schedule = new Schedule({
      ...data,
      id: String(data.id || this.generateId()),
      clockInTime: data.clockInTime ? new Date(data.clockInTime) : data.clockInTime,
      clockOutTime: data.clockOutTime ? new Date(data.clockOutTime) : data.clockOutTime,
      metadata: this.normalizeMetadata(data.metadata)
    });

    schedule.hourlyRate = this.resolveHourlyRate(data);
    schedule.scheduledHours = this.roundToTwo(
      schedule.scheduledHours || schedule.calculateScheduledHours()
    );
    schedule.actualHours = this.roundToTwo(
      schedule.actualHours || schedule.calculateActualHours()
    );
    schedule.laborCost = this.calculateLaborCost(schedule);
    schedule.updatedAt = new Date();

    this.schedules.set(schedule.id, schedule);
    return this.serializeSchedule(schedule);
  }

  async getSchedules(filters = {}) {
    const { locationId, startDate, endDate, userId, status } = filters;

    let schedules = Array.from(this.schedules.values());

    if (locationId) {
      schedules = schedules.filter(s => s.locationId === String(locationId));
    }

    if (userId) {
      schedules = schedules.filter(s => String(s.userId) === String(userId));
    }

    if (status) {
      schedules = schedules.filter(s => s.status === status);
    }

    const start = this.normalizeDate(startDate);
    const end = this.normalizeDate(endDate);

    if (start) {
      schedules = schedules.filter(schedule => {
        const scheduleDate = this.normalizeDate(schedule.date);
        return scheduleDate && scheduleDate >= start;
      });
    }

    if (end) {
      schedules = schedules.filter(schedule => {
        const scheduleDate = this.normalizeDate(schedule.date);
        return scheduleDate && scheduleDate <= end;
      });
    }

    const summary = this.calculateLaborSummary(schedules);

    return {
      schedules: schedules.map(schedule => this.serializeSchedule(schedule)),
      laborSummary: summary
    };
  }

  async clockInSchedule(id, options = {}) {
    const schedule = this.getScheduleById(id);
    if (!schedule) return null;

    if (typeof options.breakDuration !== 'undefined') {
      schedule.breakDuration = Number(options.breakDuration) || 0;
    }

    if (options.timestamp) {
      schedule.clockInTime = new Date(options.timestamp);
      schedule.status = 'in_progress';
    } else if (!schedule.clockInTime) {
      schedule.clockIn(options.location);
    } else {
      schedule.status = 'in_progress';
    }

    if (options.location) {
      schedule.clockInLocation = options.location;
    }

    schedule.notes = this.appendNote(schedule.notes, options.notes);
    schedule.actualHours = this.roundToTwo(schedule.calculateActualHours());
    schedule.laborCost = this.calculateLaborCost(schedule);
    schedule.updatedAt = new Date();

    return this.serializeSchedule(schedule);
  }

  async clockOutSchedule(id, options = {}) {
    const schedule = this.getScheduleById(id);
    if (!schedule) return null;

    if (typeof options.breakDuration !== 'undefined') {
      schedule.breakDuration = Number(options.breakDuration) || 0;
    }

    if (!schedule.clockInTime && options.timestamp) {
      schedule.clockInTime = new Date(options.timestamp);
    }

    schedule.clockOut();

    if (options.timestamp) {
      schedule.clockOutTime = new Date(options.timestamp);
    }

    schedule.notes = this.appendNote(schedule.notes, options.notes);
    schedule.actualHours = this.roundToTwo(schedule.calculateActualHours());
    schedule.laborCost = this.calculateLaborCost(schedule);
    schedule.updatedAt = new Date();

    return this.serializeSchedule(schedule);
  }

  async getForecast(options = {}) {
    const { locationId, date } = options;
    const targetDate = this.normalizeDate(date) || this.normalizeDate(new Date());
    const dayOfWeek = targetDate.getUTCDay();

    const relevantSchedules = Array.from(this.schedules.values()).filter(schedule => {
      const scheduleDate = this.normalizeDate(schedule.date);
      if (!scheduleDate) return false;
      const matchesLocation = locationId ? schedule.locationId === String(locationId) : true;
      const matchesDay = scheduleDate.getUTCDay() === dayOfWeek;
      return matchesLocation && matchesDay;
    });

    const historicalSampleSize = relevantSchedules.length;
    const averageScheduledHours = this.average(
      relevantSchedules.map(schedule => schedule.scheduledHours || schedule.calculateScheduledHours())
    );
    const averageActualHours = this.average(relevantSchedules.map(schedule => schedule.actualHours));
    const hoursBaseline = averageActualHours || averageScheduledHours;
    const recommendedLaborHours = this.roundToTwo(hoursBaseline * 1.05);

    const totalSales = relevantSchedules.reduce((sum, schedule) => {
      const sales = schedule.metadata?.actualSales ?? schedule.metadata?.projectedSales ?? 0;
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

  getScheduleById(id) {
    if (id === undefined || id === null) return null;
    return this.schedules.get(String(id)) || null;
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
      const scheduleScheduledHours = schedule.scheduledHours || schedule.calculateScheduledHours();
      const scheduleActualHours = schedule.actualHours || 0;
      const hoursForCost = scheduleActualHours || scheduleScheduledHours;
      const hourlyRate = schedule.hourlyRate || 0;

      scheduledHours += scheduleScheduledHours;
      actualHours += scheduleActualHours;
      totalCost += schedule.laborCost || (hoursForCost * hourlyRate);

      if (scheduleActualHours > 8) {
        overtimeHours += scheduleActualHours - 8;
      }

      const sales = schedule.metadata?.actualSales ?? schedule.metadata?.projectedSales ?? 0;
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

      coverage[key].scheduledHours += schedule.scheduledHours || schedule.calculateScheduledHours();
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

  calculateLaborCost(schedule) {
    const hourlyRate = schedule.hourlyRate || 0;
    if (!hourlyRate) return this.roundToTwo(schedule.laborCost || 0);

    const hours = schedule.actualHours || schedule.calculateActualHours();
    const fallbackHours = hours || schedule.scheduledHours || schedule.calculateScheduledHours();
    return this.roundToTwo(fallbackHours * hourlyRate);
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

  normalizeMetadata(metadata) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return {};
    }

    return { ...metadata };
  }

  serializeSchedule(schedule) {
    return {
      id: schedule.id,
      locationId: schedule.locationId,
      userId: schedule.userId,
      date: schedule.date,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      breakDuration: schedule.breakDuration,
      position: schedule.position,
      status: schedule.status,
      clockInTime: schedule.clockInTime ? schedule.clockInTime.toISOString() : null,
      clockOutTime: schedule.clockOutTime ? schedule.clockOutTime.toISOString() : null,
      clockInLocation: schedule.clockInLocation || null,
      scheduledHours: this.roundToTwo(schedule.scheduledHours),
      actualHours: this.roundToTwo(schedule.actualHours),
      hourlyRate: schedule.hourlyRate,
      laborCost: this.roundToTwo(schedule.laborCost),
      approvedBy: schedule.approvedBy || null,
      notes: schedule.notes || '',
      metadata: schedule.metadata,
      createdAt: schedule.createdAt ? schedule.createdAt.toISOString() : null,
      updatedAt: schedule.updatedAt ? schedule.updatedAt.toISOString() : null
    };
  }

  roundToTwo(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.round(value * 100) / 100;
  }

  generateId() {
    return `sched-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  formatDate(date) {
    if (!(date instanceof Date)) return String(date || '');
    return date.toISOString().split('T')[0];
  }

  combineDateTime(date, time) {
    if (!(date instanceof Date) || typeof time !== 'string') return null;
    const [hours, minutes] = time.split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(hours || 0, minutes || 0, 0, 0);
    return combined;
  }

  addDays(date, days) {
    const clone = new Date(date);
    clone.setDate(clone.getDate() + days);
    return clone;
  }

  startOfWeek(date) {
    const clone = new Date(date);
    const day = clone.getDay();
    const diff = clone.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
    clone.setDate(diff);
    clone.setHours(0, 0, 0, 0);
    return clone;
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
}

module.exports = new ScheduleService();
