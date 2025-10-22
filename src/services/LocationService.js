/**
 * Location Service
 * Business logic for location management and hierarchy operations
 */

const { getPool } = require('../database/pool');
const TaskService = require('./TaskService');
const TemperatureService = require('./TemperatureService');
const InventoryService = require('./InventoryService');
const ScheduleService = require('./ScheduleService');

class LocationService {
  /**
   * Get all locations with optional filtering
   */
  async getLocations(filters = {}) {
    const pool = getPool();

    let query = 'SELECT * FROM locations WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    // Apply filters
    if (filters.districtId) {
      query += ` AND district_id = $${paramIndex++}`;
      params.push(filters.districtId);
    }

    if (filters.regionId) {
      query += ` AND region_id = $${paramIndex++}`;
      params.push(filters.regionId);
    }

    if (filters.brandId) {
      query += ` AND brand_id = $${paramIndex++}`;
      params.push(filters.brandId);
    }

    if (filters.type) {
      query += ` AND type = $${paramIndex++}`;
      params.push(filters.type);
    }

    if (filters.active !== undefined) {
      query += ` AND active = $${paramIndex++}`;
      params.push(filters.active);
    }

    if (filters.managerId) {
      query += ` AND manager_id = $${paramIndex++}`;
      params.push(filters.managerId);
    }

    query += ' ORDER BY name ASC';

    const result = await pool.query(query, params);

    return result.rows.map(row => this.formatLocation(row));
  }

  /**
   * Get location by ID
   */
  async getLocationById(id) {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM locations WHERE id = $1', [id]);

    if (result.rows.length === 0) return null;

    return this.formatLocation(result.rows[0]);
  }

  /**
   * Create new location
   */
  async createLocation(locationData) {
    const pool = getPool();

    const location = {
      id: `location-${Date.now()}`,
      name: locationData.name,
      code: locationData.code,
      address: locationData.address || null,
      city: locationData.city || null,
      state: locationData.state || null,
      zip: locationData.zip || null,
      phone: locationData.phone || null,
      type: locationData.type || 'corporate',
      brand_id: locationData.brandId || null,
      district_id: locationData.districtId || null,
      region_id: locationData.regionId || null,
      manager_id: locationData.managerId || null,
      timezone: locationData.timezone || 'America/New_York',
      active: locationData.active !== undefined ? locationData.active : true,
      opening_date: locationData.openingDate || null,
      metadata: JSON.stringify(locationData.metadata || {})
    };

    const result = await pool.query(`
      INSERT INTO locations (
        id, name, code, address, city, state, zip, phone, type,
        brand_id, district_id, region_id, manager_id, timezone, active, opening_date, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
      location.id, location.name, location.code, location.address, location.city,
      location.state, location.zip, location.phone, location.type, location.brand_id,
      location.district_id, location.region_id, location.manager_id, location.timezone,
      location.active, location.opening_date, location.metadata
    ]);

    return this.formatLocation(result.rows[0]);
  }

  /**
   * Update location
   */
  async updateLocation(id, updates) {
    const pool = getPool();

    const setClauses = [];
    const params = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      params.push(updates.name);
    }

    if (updates.code !== undefined) {
      setClauses.push(`code = $${paramIndex++}`);
      params.push(updates.code);
    }

    if (updates.address !== undefined) {
      setClauses.push(`address = $${paramIndex++}`);
      params.push(updates.address);
    }

    if (updates.city !== undefined) {
      setClauses.push(`city = $${paramIndex++}`);
      params.push(updates.city);
    }

    if (updates.state !== undefined) {
      setClauses.push(`state = $${paramIndex++}`);
      params.push(updates.state);
    }

    if (updates.zip !== undefined) {
      setClauses.push(`zip = $${paramIndex++}`);
      params.push(updates.zip);
    }

    if (updates.phone !== undefined) {
      setClauses.push(`phone = $${paramIndex++}`);
      params.push(updates.phone);
    }

    if (updates.type !== undefined) {
      setClauses.push(`type = $${paramIndex++}`);
      params.push(updates.type);
    }

    if (updates.managerId !== undefined) {
      setClauses.push(`manager_id = $${paramIndex++}`);
      params.push(updates.managerId);
    }

    if (updates.active !== undefined) {
      setClauses.push(`active = $${paramIndex++}`);
      params.push(updates.active);
    }

    if (updates.timezone !== undefined) {
      setClauses.push(`timezone = $${paramIndex++}`);
      params.push(updates.timezone);
    }

    if (updates.metadata !== undefined) {
      setClauses.push(`metadata = $${paramIndex++}`);
      params.push(JSON.stringify(updates.metadata));
    }

    if (setClauses.length === 0) {
      return await this.getLocationById(id);
    }

    setClauses.push(`updated_at = NOW()`);
    params.push(id);

    const query = `
      UPDATE locations
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) return null;

    return this.formatLocation(result.rows[0]);
  }

  /**
   * Delete location (soft delete - set active = false)
   */
  async deleteLocation(id) {
    const pool = getPool();
    const result = await pool.query(
      'UPDATE locations SET active = false, updated_at = NOW() WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows.length > 0;
  }

  /**
   * Get location hierarchy information
   */
  async getHierarchy() {
    const pool = getPool();

    const result = await pool.query(`
      SELECT
        DISTINCT brand_id,
        DISTINCT region_id,
        DISTINCT district_id,
        COUNT(*) as location_count
      FROM locations
      WHERE active = true
      GROUP BY brand_id, region_id, district_id
      ORDER BY brand_id, region_id, district_id
    `);

    // Extract unique values
    const brands = [...new Set(result.rows.map(r => r.brand_id).filter(Boolean))];
    const regions = [...new Set(result.rows.map(r => r.region_id).filter(Boolean))];
    const districts = [...new Set(result.rows.map(r => r.district_id).filter(Boolean))];

    return {
      brands,
      regions,
      districts
    };
  }

  /**
   * Get locations by hierarchy level
   */
  async getLocationsByHierarchy(level, id) {
    const pool = getPool();

    let query = 'SELECT * FROM locations WHERE active = true';
    const params = [id];

    switch (level) {
      case 'brand':
        query += ' AND brand_id = $1';
        break;
      case 'region':
        query += ' AND region_id = $1';
        break;
      case 'district':
        query += ' AND district_id = $1';
        break;
      default:
        throw new Error(`Invalid hierarchy level: ${level}`);
    }

    query += ' ORDER BY name ASC';

    const result = await pool.query(query, params);
    return result.rows.map(row => this.formatLocation(row));
  }

  /**
   * Get location scorecard with metrics
   */
  async getLocationScorecard(locationId, options = {}) {
    const period = options.period || '7d';
    const range = this.resolvePeriod(period);

    // Get metrics from all services in parallel
    const [tasks, temperatureLogs, schedules, wasteData] = await Promise.all([
      TaskService.getTasks({ locationId }),
      TemperatureService.getLogs({
        locationId,
        startDate: range.start?.toISOString(),
        endDate: range.end?.toISOString()
      }),
      ScheduleService.getSchedules({
        locationId,
        startDate: range.start?.toISOString(),
        endDate: range.end?.toISOString()
      }),
      this.getWasteDataForLocation(locationId, range.start, range.end)
    ]);

    // Calculate scores
    const complianceScore = this.calculateComplianceScore(tasks);
    const foodSafetyScore = this.calculateFoodSafetyScore(temperatureLogs.logs || []);
    const operationsScore = this.calculateOperationsScore(schedules.schedules || [], schedules.laborSummary || {});
    const inventoryAccuracy = this.calculateInventoryAccuracy(wasteData);

    const overallScore = Math.round(
      (complianceScore + foodSafetyScore + operationsScore + inventoryAccuracy) / 4
    );

    return {
      locationId,
      period: {
        label: period,
        start: range.start?.toISOString(),
        end: range.end?.toISOString()
      },
      scores: {
        compliance: complianceScore,
        foodSafety: foodSafetyScore,
        operations: operationsScore,
        inventoryAccuracy,
        overall: overallScore
      },
      metrics: {
        tasksCompleted: tasks.filter(t => t.status === 'completed').length,
        tasksTotal: tasks.length,
        tasksOverdue: tasks.filter(t => t.status === 'overdue' || (t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed')).length,
        temperatureReadings: temperatureLogs.logs?.length || 0,
        temperatureCompliance: temperatureLogs.logs?.filter(l => l.isInRange).length || 0,
        temperatureAlertsActive: temperatureLogs.stats?.outOfRange || 0,
        laborHoursScheduled: schedules.laborSummary?.totalHours || 0,
        laborCost: schedules.laborSummary?.totalCost || 0,
        wasteCount: wasteData.count,
        wasteCost: wasteData.totalCost
      }
    };
  }

  /**
   * Get waste data for location
   */
  async getWasteDataForLocation(locationId, startDate, endDate) {
    try {
      const wasteLogs = await InventoryService.getWasteLogs({ locationId });

      const filteredLogs = wasteLogs.filter(log => {
        const logDate = new Date(log.recordedAt);
        return (!startDate || logDate >= startDate) && (!endDate || logDate <= endDate);
      });

      return {
        count: filteredLogs.length,
        totalCost: filteredLogs.reduce((sum, log) => sum + (log.cost || 0), 0)
      };
    } catch (error) {
      return { count: 0, totalCost: 0 };
    }
  }

  /**
   * Calculate compliance score based on task completion
   */
  calculateComplianceScore(tasks) {
    if (tasks.length === 0) return 100;

    const completed = tasks.filter(t => t.status === 'completed').length;
    const score = Math.round((completed / tasks.length) * 100);

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate food safety score based on temperature compliance
   */
  calculateFoodSafetyScore(temperatureLogs) {
    if (temperatureLogs.length === 0) return 100;

    const inRange = temperatureLogs.filter(log => log.isInRange).length;
    const score = Math.round((inRange / temperatureLogs.length) * 100);

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate operations score based on labor and scheduling
   */
  calculateOperationsScore(schedules, laborSummary) {
    if (schedules.length === 0) return 100;

    // Factors: on-time arrivals, overtime management, coverage
    const onTime = schedules.filter(s =>
      s.status === 'completed' || s.status === 'in_progress'
    ).length;

    const noShows = schedules.filter(s => s.status === 'no_show').length;
    const openShifts = schedules.filter(s => s.status === 'open').length;

    // Penalize no-shows and open shifts
    const penalties = (noShows * 10) + (openShifts * 5);
    const baseScore = Math.round((onTime / schedules.length) * 100);
    const score = Math.max(0, baseScore - penalties);

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate inventory accuracy (inverse of waste)
   */
  calculateInventoryAccuracy(wasteData) {
    if (wasteData.count === 0) return 100;

    // Score degrades with waste count and cost
    // Assume baseline of 100, reduce by waste impact
    const wastePenalty = Math.min(50, wasteData.count * 2); // Up to 50 points penalty
    const score = 100 - wastePenalty;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Resolve period to date range
   */
  resolvePeriod(period) {
    const now = new Date();
    let start, end;

    switch (period) {
      case '24h':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        end = now;
        break;
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        end = now;
        break;
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        end = now;
        break;
      default:
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        end = now;
    }

    return { start, end };
  }

  /**
   * Format location for API response
   */
  formatLocation(row) {
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      address: row.address,
      city: row.city,
      state: row.state,
      zip: row.zip,
      phone: row.phone,
      type: row.type,
      brandId: row.brand_id,
      districtId: row.district_id,
      regionId: row.region_id,
      managerId: row.manager_id,
      timezone: row.timezone,
      active: row.active,
      openingDate: row.opening_date,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

module.exports = new LocationService();
