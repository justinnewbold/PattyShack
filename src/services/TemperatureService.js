/**
 * Temperature Service
 * Provides in-memory temperature logging, alerting, and analytics.
 */

class TemperatureService {
  constructor() {
    this.logs = [];
    this.alerts = [];
    this.customThresholds = new Map();

    this.defaultThresholds = {
      freezer: { min: -10, max: 10 },
      fridge: { min: 33, max: 41 },
      coldHold: { min: 33, max: 41 },
      hotHold: { min: 135, max: 165 },
      ambient: { min: 65, max: 80 }
    };
  }

  getThreshold(equipmentId, equipmentType) {
    if (this.customThresholds.has(equipmentId)) {
      return this.customThresholds.get(equipmentId);
    }

    const normalizedType = equipmentType ? equipmentType.toLowerCase() : '';
    return this.defaultThresholds[normalizedType] || { min: 33, max: 165 };
  }

  setCustomThreshold(equipmentId, threshold) {
    this.customThresholds.set(equipmentId, threshold);
  }

  async logReading(reading) {
    const {
      locationId,
      equipmentId,
      equipmentType,
      temperature,
      source = 'manual',
      recordedAt = new Date(),
      recordedBy = null
    } = reading;

    const timestamp = new Date(recordedAt);
    const threshold = this.getThreshold(equipmentId, equipmentType);
    const isInRange = this.evaluateRange(temperature, threshold);

    const entry = {
      id: Date.now(),
      locationId,
      equipmentId,
      equipmentType,
      temperature,
      source,
      recordedBy,
      recordedAt: timestamp,
      threshold,
      isInRange
    };

    this.logs.push(entry);

    if (!isInRange) {
      this.createAlert(entry);
    }

    return entry;
  }

  async getLogs(filters = {}) {
    const { locationId, equipmentId, startDate, endDate } = filters;
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    let filtered = this.logs;

    if (locationId) {
      filtered = filtered.filter(log => log.locationId === locationId);
    }

    if (equipmentId) {
      filtered = filtered.filter(log => log.equipmentId === equipmentId);
    }

    if (start) {
      filtered = filtered.filter(log => log.recordedAt >= start);
    }

    if (end) {
      filtered = filtered.filter(log => log.recordedAt <= end);
    }

    const statistics = this.calculateStatistics(filtered);

    return {
      logs: filtered,
      statistics
    };
  }

  async getAlerts(filters = {}) {
    const { locationId, status } = filters;

    let filtered = this.alerts;

    if (locationId) {
      filtered = filtered.filter(alert => alert.locationId === locationId);
    }

    if (status) {
      filtered = filtered.filter(alert => alert.status === status);
    }

    const summary = {
      active: filtered.filter(alert => alert.status === 'active').length,
      acknowledged: filtered.filter(alert => alert.status === 'acknowledged').length,
      resolved: filtered.filter(alert => alert.status === 'resolved').length
    };

    return {
      alerts: filtered,
      summary
    };
  }

  async getEquipmentHistory(equipmentId, options = {}) {
    const { period } = options;
    const since = this.resolvePeriod(period);

    let readings = this.logs.filter(log => log.equipmentId === equipmentId);

    if (since) {
      readings = readings.filter(log => log.recordedAt >= since);
    }

    const trends = this.calculateTrends(readings);

    return {
      equipmentId,
      readings,
      trends
    };
  }

  evaluateRange(temperature, threshold) {
    const { min, max } = threshold;
    if (min !== undefined && temperature < min) {
      return false;
    }

    if (max !== undefined && temperature > max) {
      return false;
    }

    return true;
  }

  calculateStatistics(logs) {
    if (!logs.length) {
      return {
        totalReadings: 0,
        outOfRange: 0,
        averageTemp: null
      };
    }

    const totalReadings = logs.length;
    const outOfRange = logs.filter(log => !log.isInRange).length;
    const averageTemp = logs.reduce((sum, log) => sum + log.temperature, 0) / totalReadings;

    return {
      totalReadings,
      outOfRange,
      averageTemp: parseFloat(averageTemp.toFixed(2))
    };
  }

  calculateTrends(readings) {
    if (!readings.length) {
      return {
        average: null,
        min: null,
        max: null,
        latest: null
      };
    }

    const temperatures = readings.map(reading => reading.temperature);
    const average = temperatures.reduce((sum, temp) => sum + temp, 0) / readings.length;
    const min = Math.min(...temperatures);
    const max = Math.max(...temperatures);
    const latest = readings.reduce((latestReading, current) => {
      if (!latestReading || current.recordedAt > latestReading.recordedAt) {
        return current;
      }
      return latestReading;
    }, null);

    return {
      average: parseFloat(average.toFixed(2)),
      min,
      max,
      latest
    };
  }

  createAlert(logEntry) {
    const direction = logEntry.temperature < logEntry.threshold.min ? 'low' : 'high';

    const alert = {
      id: `alert-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      locationId: logEntry.locationId,
      equipmentId: logEntry.equipmentId,
      equipmentType: logEntry.equipmentType,
      temperature: logEntry.temperature,
      threshold: logEntry.threshold,
      direction,
      status: 'active',
      createdAt: logEntry.recordedAt,
      updatedAt: new Date(),
      acknowledgedAt: null,
      acknowledgedBy: null,
      resolvedAt: null,
      resolvedBy: null,
      resolution: null,
      notes: []
    };

    this.alerts.push(alert);
    return alert;
  }

  findAlertById(id) {
    return this.alerts.find(alert => alert.id === id) || null;
  }

  addAlertNote(alert, { message, author = null, type = 'general' }) {
    if (typeof message === 'undefined' || message === null) {
      return;
    }

    const normalizedMessage = String(message).trim();
    if (!normalizedMessage) {
      return;
    }

    alert.notes.push({
      id: `note-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      message: normalizedMessage,
      type,
      author,
      timestamp: new Date()
    });
  }

  async acknowledgeAlert(id, { acknowledgedBy, note } = {}) {
    const alert = this.findAlertById(id);
    if (!alert) {
      return null;
    }

    const normalizedUser =
      typeof acknowledgedBy !== 'undefined' && acknowledgedBy !== null
        ? String(acknowledgedBy).trim()
        : null;

    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = normalizedUser || null;
    alert.updatedAt = new Date();

    if (note) {
      this.addAlertNote(alert, {
        message: note,
        author: normalizedUser || null,
        type: 'acknowledged'
      });
    }

    return { ...alert };
  }

  async resolveAlert(id, { resolvedBy, note, resolution } = {}) {
    const alert = this.findAlertById(id);
    if (!alert) {
      return null;
    }

    const normalizedUser =
      typeof resolvedBy !== 'undefined' && resolvedBy !== null
        ? String(resolvedBy).trim()
        : null;

    const normalizedResolution =
      typeof resolution !== 'undefined' && resolution !== null
        ? String(resolution).trim()
        : null;

    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    alert.resolvedBy = normalizedUser || null;
    alert.resolution = normalizedResolution || alert.resolution;
    alert.updatedAt = new Date();

    if (!alert.acknowledgedAt) {
      alert.acknowledgedAt = new Date();
      alert.acknowledgedBy = normalizedUser || alert.acknowledgedBy || null;
    }

    if (note) {
      this.addAlertNote(alert, {
        message: note,
        author: normalizedUser || null,
        type: 'resolved'
      });
    }

    return { ...alert };
  }

  resolvePeriod(period) {
    if (!period) return null;

    const now = new Date();

    switch (period) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default: {
        const hours = parseInt(period, 10);
        if (!Number.isNaN(hours)) {
          return new Date(now.getTime() - hours * 60 * 60 * 1000);
        }
      }
    }

    return null;
  }
}

module.exports = new TemperatureService();
