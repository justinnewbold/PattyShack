/**
 * Enhanced Temperature Monitoring Service
 * Multi-sensor dashboard, alerts, and predictive analytics
 */

const { getPool } = require('../database/pool');

class EnhancedTemperatureService {
  // Equipment Management
  async registerEquipment(equipmentData) {
    const pool = getPool();
    const id = `equip-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const result = await pool.query(`
      INSERT INTO equipment (
        id, location_id, name, equipment_type, manufacturer, model,
        serial_number, install_date, sensor_id, status, battery_level, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      id,
      equipmentData.locationId,
      equipmentData.name,
      equipmentData.equipmentType,
      equipmentData.manufacturer || null,
      equipmentData.model || null,
      equipmentData.serialNumber || null,
      equipmentData.installDate || null,
      equipmentData.sensorId || null,
      equipmentData.status || 'active',
      equipmentData.batteryLevel || 100,
      JSON.stringify(equipmentData.metadata || {})
    ]);

    return result.rows[0];
  }

  async getEquipmentDashboard(locationId = null) {
    const pool = getPool();

    let query = 'SELECT * FROM equipment_status_dashboard';
    const params = [];

    if (locationId) {
      query += ' WHERE location_id = $1';
      params.push(locationId);
    }

    query += ' ORDER BY temperature_status DESC, active_alerts DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Custom Thresholds
  async setCustomThreshold(equipmentId, thresholdData) {
    const pool = getPool();
    const id = `thresh-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Deactivate existing thresholds
    await pool.query(
      'UPDATE temperature_thresholds SET active = false WHERE equipment_id = $1',
      [equipmentId]
    );

    const result = await pool.query(`
      INSERT INTO temperature_thresholds (
        id, equipment_id, threshold_min, threshold_max,
        warning_min, warning_max, critical_duration_minutes, active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      RETURNING *
    `, [
      id,
      equipmentId,
      thresholdData.thresholdMin,
      thresholdData.thresholdMax,
      thresholdData.warningMin || thresholdData.thresholdMin + 1,
      thresholdData.warningMax || thresholdData.thresholdMax - 1,
      thresholdData.criticalDurationMinutes || 30
    ]);

    return result.rows[0];
  }

  // Alert Management
  async createAlert(alertData) {
    const pool = getPool();
    const id = `alert-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const result = await pool.query(`
      INSERT INTO temperature_alerts (
        id, equipment_id, temperature_log_id, alert_type, temperature,
        threshold_violated, severity, notify_roles, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
      RETURNING *
    `, [
      id,
      alertData.equipmentId,
      alertData.temperatureLogId || null,
      alertData.alertType,
      alertData.temperature || null,
      alertData.thresholdViolated || null,
      alertData.severity || 'medium',
      JSON.stringify(alertData.notifyRoles || ['manager'])
    ]);

    return result.rows[0];
  }

  async getActiveAlerts(locationId = null) {
    const pool = getPool();

    let query = `
      SELECT
        ta.*,
        e.name as equipment_name,
        e.equipment_type,
        e.location_id,
        l.name as location_name
      FROM temperature_alerts ta
      JOIN equipment e ON ta.equipment_id = e.id
      JOIN locations l ON e.location_id = l.id
      WHERE ta.status = 'active'
    `;

    const params = [];
    if (locationId) {
      query += ' AND e.location_id = $1';
      params.push(locationId);
    }

    query += ' ORDER BY ta.severity DESC, ta.created_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  async acknowledgeAlert(alertId, userId) {
    const pool = getPool();

    const result = await pool.query(`
      UPDATE temperature_alerts
      SET status = 'acknowledged',
          acknowledged_by = $1,
          acknowledged_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [userId, alertId]);

    return result.rows[0];
  }

  async resolveAlert(alertId, userId, resolutionNotes) {
    const pool = getPool();

    const result = await pool.query(`
      UPDATE temperature_alerts
      SET status = 'resolved',
          resolved_by = $1,
          resolved_at = NOW(),
          resolution_notes = $2
      WHERE id = $3
      RETURNING *
    `, [userId, resolutionNotes, alertId]);

    return result.rows[0];
  }

  // Temperature Trend Analysis
  async getTemperatureTrends(equipmentId, hours = 24) {
    const pool = getPool();

    const result = await pool.query(`
      SELECT
        DATE_TRUNC('hour', recorded_at) as hour,
        AVG(temperature) as avg_temp,
        MIN(temperature) as min_temp,
        MAX(temperature) as max_temp,
        COUNT(*) as reading_count,
        AVG(CASE WHEN is_anomaly THEN 1 ELSE 0 END) as anomaly_rate
      FROM temperature_logs
      WHERE equipment_id = $1
        AND recorded_at >= NOW() - INTERVAL '1 hour' * $2
      GROUP BY DATE_TRUNC('hour', recorded_at)
      ORDER BY hour DESC
    `, [equipmentId, hours]);

    return result.rows;
  }

  async detectAnomalies(equipmentId) {
    const pool = getPool();

    // Get recent readings and calculate statistics
    const statsResult = await pool.query(`
      SELECT
        AVG(temperature) as mean,
        STDDEV(temperature) as stddev
      FROM temperature_logs
      WHERE equipment_id = $1
        AND recorded_at >= NOW() - INTERVAL '7 days'
    `, [equipmentId]);

    const { mean, stddev } = statsResult.rows[0];

    if (!mean || !stddev) {
      return { anomalies: [], threshold: null };
    }

    // Mark readings outside 2 standard deviations as anomalies
    const anomalyThreshold = 2;
    const lowerBound = mean - (stddev * anomalyThreshold);
    const upperBound = mean + (stddev * anomalyThreshold);

    await pool.query(`
      UPDATE temperature_logs
      SET is_anomaly = true
      WHERE equipment_id = $1
        AND recorded_at >= NOW() - INTERVAL '24 hours'
        AND (temperature < $2 OR temperature > $3)
        AND is_anomaly = false
    `, [equipmentId, lowerBound, upperBound]);

    const anomaliesResult = await pool.query(`
      SELECT * FROM temperature_logs
      WHERE equipment_id = $1
        AND is_anomaly = true
        AND recorded_at >= NOW() - INTERVAL '24 hours'
      ORDER BY recorded_at DESC
    `, [equipmentId]);

    return {
      anomalies: anomaliesResult.rows,
      threshold: { mean, stddev, lowerBound, upperBound }
    };
  }

  // Equipment Maintenance
  async scheduleMainten ance(maintenanceData) {
    const pool = getPool();
    const id = `maint-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const result = await pool.query(`
      INSERT INTO equipment_maintenance (
        id, equipment_id, maintenance_type, scheduled_date,
        notes, next_maintenance_date, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'scheduled')
      RETURNING *
    `, [
      id,
      maintenanceData.equipmentId,
      maintenanceData.maintenanceType,
      maintenanceData.scheduledDate,
      maintenanceData.notes || null,
      maintenanceData.nextMaintenanceDate || null
    ]);

    // Update equipment next maintenance date
    await pool.query(
      'UPDATE equipment SET next_maintenance_date = $1 WHERE id = $2',
      [maintenanceData.nextMaintenanceDate, maintenanceData.equipmentId]
    );

    return result.rows[0];
  }

  async getMaintenanceSchedule(locationId = null) {
    const pool = getPool();

    let query = `
      SELECT
        em.*,
        e.name as equipment_name,
        e.equipment_type,
        e.location_id,
        l.name as location_name
      FROM equipment_maintenance em
      JOIN equipment e ON em.equipment_id = e.id
      JOIN locations l ON e.location_id = l.id
      WHERE em.status IN ('scheduled', 'overdue')
    `;

    const params = [];
    if (locationId) {
      query += ' AND e.location_id = $1';
      params.push(locationId);
    }

    query += ' ORDER BY em.scheduled_date ASC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Cold Chain Compliance
  async logColdChainEvent(eventData) {
    const pool = getPool();
    const id = `cc-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const result = await pool.query(`
      INSERT INTO cold_chain_events (
        id, location_id, equipment_id, event_type, start_time,
        end_time, duration_minutes, temperature_at_breach,
        max_temperature, affected_products, action_taken,
        reported_by, severity
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      id,
      eventData.locationId,
      eventData.equipmentId || null,
      eventData.eventType,
      eventData.startTime,
      eventData.endTime || null,
      eventData.durationMinutes || null,
      eventData.temperatureAtBreach || null,
      eventData.maxTemperature || null,
      JSON.stringify(eventData.affectedProducts || []),
      eventData.actionTaken || null,
      eventData.reportedBy || null,
      eventData.severity || 'medium'
    ]);

    return result.rows[0];
  }

  async getColdChainReport(locationId, startDate, endDate) {
    const pool = getPool();

    const result = await pool.query(`
      SELECT * FROM cold_chain_events
      WHERE location_id = $1
        AND start_time >= $2
        AND start_time <= $3
      ORDER BY start_time DESC
    `, [locationId, startDate, endDate]);

    return {
      events: result.rows,
      summary: {
        totalEvents: result.rows.length,
        breaches: result.rows.filter(e => e.event_type === 'breach').length,
        avgDuration: result.rows.reduce((sum, e) => sum + (e.duration_minutes || 0), 0) / result.rows.length || 0
      }
    };
  }

  // Battery Monitoring
  async updateBatteryLevel(equipmentId, batteryLevel) {
    const pool = getPool();

    const result = await pool.query(`
      UPDATE equipment
      SET battery_level = $1,
          last_battery_check = NOW()
      WHERE id = $2
      RETURNING *
    `, [batteryLevel, equipmentId]);

    // Create alert if battery is low
    if (batteryLevel < result.rows[0].battery_low_threshold) {
      await this.createAlert({
        equipmentId,
        alertType: 'sensor_offline',
        severity: 'high',
        notifyRoles: ['manager', 'maintenance']
      });
    }

    return result.rows[0];
  }

  async getLowBatteryEquipment(locationId = null) {
    const pool = getPool();

    let query = `
      SELECT * FROM equipment
      WHERE battery_level < battery_low_threshold
        AND status = 'active'
    `;

    const params = [];
    if (locationId) {
      query += ' AND location_id = $1';
      params.push(locationId);
    }

    query += ' ORDER BY battery_level ASC';

    const result = await pool.query(query, params);
    return result.rows;
  }
}

module.exports = new EnhancedTemperatureService();
