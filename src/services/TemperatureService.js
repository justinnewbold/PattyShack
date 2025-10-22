/**
 * Temperature Service
 * Business logic for temperature logging, alerting, and analytics.
 */

const { getPool } = require('../database/pool');

class TemperatureService {
  constructor() {
    // Database-backed service
    this.defaultThresholds = {
      freezer: { min: -10, max: 10 },
      fridge: { min: 33, max: 41 },
      coldHold: { min: 33, max: 41 },
      hotHold: { min: 135, max: 165 },
      ambient: { min: 65, max: 80 }
    };
  }

  getThreshold(equipmentType, customMin, customMax) {
    if (customMin !== undefined && customMax !== undefined) {
      return { min: customMin, max: customMax };
    }

    const normalizedType = equipmentType ? equipmentType.toLowerCase() : '';
    return this.defaultThresholds[normalizedType] || { min: 33, max: 165 };
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

  async logReading(reading) {
    const pool = getPool();
    const {
      locationId,
      equipmentId,
      equipmentType,
      temperature,
      unit = 'F',
      source = 'manual',
      sensorId = null,
      recordedAt = new Date(),
      recordedBy = null,
      notes = null,
      correctiveAction = null
    } = reading;

    const timestamp = new Date(recordedAt);
    const threshold = this.getThreshold(equipmentType);
    const isInRange = this.evaluateRange(temperature, threshold);

    const log = {
      id: `temp-${Date.now()}`,
      location_id: locationId,
      equipment_id: equipmentId,
      equipment_type: equipmentType,
      temperature,
      unit,
      threshold_min: threshold.min,
      threshold_max: threshold.max,
      is_in_range: isInRange,
      source,
      sensor_id: sensorId,
      recorded_by: recordedBy,
      recorded_at: timestamp,
      notes,
      corrective_action: correctiveAction,
      alert_sent: false,
      metadata: JSON.stringify({})
    };

    const result = await pool.query(`
      INSERT INTO temperature_logs (
        id, location_id, equipment_id, equipment_type, temperature, unit,
        threshold_min, threshold_max, is_in_range, source, sensor_id,
        recorded_by, recorded_at, notes, corrective_action, alert_sent, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
      log.id, log.location_id, log.equipment_id, log.equipment_type,
      log.temperature, log.unit, log.threshold_min, log.threshold_max,
      log.is_in_range, log.source, log.sensor_id, log.recorded_by,
      log.recorded_at, log.notes, log.corrective_action, log.alert_sent, log.metadata
    ]);

    const entry = this.formatTemperatureLog(result.rows[0]);

    if (!isInRange) {
      await this.createAlert(result.rows[0]);
    }

    return entry;
  }

  async getLogs(filters = {}) {
    const pool = getPool();
    const { locationId, equipmentId, startDate, endDate } = filters;

    let query = 'SELECT * FROM temperature_logs WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (locationId) {
      query += ` AND location_id = $${paramIndex++}`;
      params.push(locationId);
    }

    if (equipmentId) {
      query += ` AND equipment_id = $${paramIndex++}`;
      params.push(equipmentId);
    }

    if (startDate) {
      query += ` AND recorded_at >= $${paramIndex++}`;
      params.push(new Date(startDate));
    }

    if (endDate) {
      query += ` AND recorded_at <= $${paramIndex++}`;
      params.push(new Date(endDate));
    }

    query += ' ORDER BY recorded_at DESC';

    const result = await pool.query(query, params);
    const logs = result.rows.map(row => this.formatTemperatureLog(row));

    const statistics = this.calculateStatistics(logs);

    return {
      logs,
      statistics
    };
  }

  async getAlerts(filters = {}) {
    const pool = getPool();
    const { locationId, status } = filters;

    let query = 'SELECT * FROM temperature_alerts WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (locationId) {
      query += ` AND location_id = $${paramIndex++}`;
      params.push(locationId);
    }

    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    const alerts = result.rows.map(row => this.formatAlert(row));

    const summary = {
      active: alerts.filter(alert => alert.status === 'active').length,
      acknowledged: alerts.filter(alert => alert.status === 'acknowledged').length,
      resolved: alerts.filter(alert => alert.status === 'resolved').length
    };

    return {
      alerts,
      summary
    };
  }

  async getEquipmentHistory(equipmentId, options = {}) {
    const pool = getPool();
    const { period } = options;
    const since = this.resolvePeriod(period);

    let query = 'SELECT * FROM temperature_logs WHERE equipment_id = $1';
    const params = [equipmentId];

    if (since) {
      query += ' AND recorded_at >= $2';
      params.push(since);
    }

    query += ' ORDER BY recorded_at DESC';

    const result = await pool.query(query, params);
    const readings = result.rows.map(row => this.formatTemperatureLog(row));
    const trends = this.calculateTrends(readings);

    return {
      equipmentId,
      readings,
      trends
    };
  }

  async createAlert(logRow) {
    const pool = getPool();
    const direction = logRow.temperature < logRow.threshold_min ? 'low' : 'high';

    const alert = {
      id: `alert-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      temperature_log_id: logRow.id,
      location_id: logRow.location_id,
      equipment_id: logRow.equipment_id,
      equipment_type: logRow.equipment_type,
      temperature: logRow.temperature,
      threshold_min: logRow.threshold_min,
      threshold_max: logRow.threshold_max,
      direction,
      status: 'active',
      severity: 'warning',
      notes: JSON.stringify([])
    };

    const result = await pool.query(`
      INSERT INTO temperature_alerts (
        id, temperature_log_id, location_id, equipment_id, equipment_type,
        temperature, threshold_min, threshold_max, direction, status, severity, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      alert.id, alert.temperature_log_id, alert.location_id, alert.equipment_id,
      alert.equipment_type, alert.temperature, alert.threshold_min,
      alert.threshold_max, alert.direction, alert.status, alert.severity, alert.notes
    ]);

    return this.formatAlert(result.rows[0]);
  }

  async acknowledgeAlert(id, { acknowledgedBy, note } = {}) {
    const pool = getPool();

    // Get the alert first to add notes
    const alertResult = await pool.query('SELECT * FROM temperature_alerts WHERE id = $1', [id]);
    if (alertResult.rows.length === 0) {
      return null;
    }

    const alert = alertResult.rows[0];
    let notes = alert.notes || [];

    if (note) {
      const normalizedUser =
        typeof acknowledgedBy !== 'undefined' && acknowledgedBy !== null
          ? String(acknowledgedBy).trim()
          : null;

      notes.push({
        id: `note-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        message: String(note).trim(),
        type: 'acknowledged',
        author: normalizedUser,
        timestamp: new Date()
      });
    }

    const normalizedUser =
      typeof acknowledgedBy !== 'undefined' && acknowledgedBy !== null
        ? String(acknowledgedBy).trim()
        : null;

    const result = await pool.query(`
      UPDATE temperature_alerts
      SET
        status = 'acknowledged',
        acknowledged_at = NOW(),
        acknowledged_by = $1,
        notes = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [normalizedUser, JSON.stringify(notes), id]);

    if (result.rows.length === 0) return null;
    return this.formatAlert(result.rows[0]);
  }

  async resolveAlert(id, { resolvedBy, note, resolution } = {}) {
    const pool = getPool();

    // Get the alert first to add notes
    const alertResult = await pool.query('SELECT * FROM temperature_alerts WHERE id = $1', [id]);
    if (alertResult.rows.length === 0) {
      return null;
    }

    const alert = alertResult.rows[0];
    let notes = alert.notes || [];

    if (note) {
      const normalizedUser =
        typeof resolvedBy !== 'undefined' && resolvedBy !== null
          ? String(resolvedBy).trim()
          : null;

      notes.push({
        id: `note-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        message: String(note).trim(),
        type: 'resolved',
        author: normalizedUser,
        timestamp: new Date()
      });
    }

    const normalizedUser =
      typeof resolvedBy !== 'undefined' && resolvedBy !== null
        ? String(resolvedBy).trim()
        : null;

    const normalizedResolution =
      typeof resolution !== 'undefined' && resolution !== null
        ? String(resolution).trim()
        : null;

    // If not acknowledged yet, set acknowledged fields
    const acknowledgedBy = alert.acknowledged_by || normalizedUser;
    const acknowledgedAt = alert.acknowledged_at || new Date();

    const result = await pool.query(`
      UPDATE temperature_alerts
      SET
        status = 'resolved',
        resolved_at = NOW(),
        resolved_by = $1,
        resolution_notes = $2,
        acknowledged_by = $3,
        acknowledged_at = $4,
        notes = $5,
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [normalizedUser, normalizedResolution, acknowledgedBy, acknowledgedAt, JSON.stringify(notes), id]);

    if (result.rows.length === 0) return null;
    return this.formatAlert(result.rows[0]);
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
      if (!latestReading || new Date(current.recordedAt) > new Date(latestReading.recordedAt)) {
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

  // Helper method to format database row to API response format
  formatTemperatureLog(row) {
    return {
      id: row.id,
      locationId: row.location_id,
      equipmentId: row.equipment_id,
      equipmentType: row.equipment_type,
      temperature: parseFloat(row.temperature),
      unit: row.unit,
      threshold: {
        min: row.threshold_min ? parseFloat(row.threshold_min) : null,
        max: row.threshold_max ? parseFloat(row.threshold_max) : null
      },
      isInRange: row.is_in_range,
      source: row.source,
      sensorId: row.sensor_id,
      recordedBy: row.recorded_by,
      recordedAt: row.recorded_at,
      notes: row.notes,
      correctiveAction: row.corrective_action,
      alertSent: row.alert_sent,
      metadata: row.metadata || {},
      createdAt: row.created_at
    };
  }

  // Helper method to format alert database row to API response format
  formatAlert(row) {
    return {
      id: row.id,
      temperatureLogId: row.temperature_log_id,
      locationId: row.location_id,
      equipmentId: row.equipment_id,
      equipmentType: row.equipment_type,
      temperature: row.temperature ? parseFloat(row.temperature) : null,
      threshold: {
        min: row.threshold_min ? parseFloat(row.threshold_min) : null,
        max: row.threshold_max ? parseFloat(row.threshold_max) : null
      },
      direction: row.direction,
      status: row.status,
      severity: row.severity,
      acknowledgedBy: row.acknowledged_by,
      acknowledgedAt: row.acknowledged_at,
      resolvedBy: row.resolved_by,
      resolvedAt: row.resolved_at,
      resolution: row.resolution_notes,
      notes: row.notes || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

module.exports = new TemperatureService();
