/**
 * Business Intelligence Service
 *
 * Manages KPIs, dashboards, goals, and custom reports.
 * Part of Phase 11: Business Intelligence & Executive Dashboard System
 */

const pool = require('../database/pool').getPool();
const AuditLogService = require('./AuditLogService');

class BusinessIntelligenceService {
  /**
   * Get all KPIs
   */
  async getKPIs(filters = {}) {
    try {
      let query = `SELECT * FROM kpis WHERE 1=1`;
      const params = [];
      let paramIndex = 1;

      if (filters.category) {
        query += ` AND category = $${paramIndex++}`;
        params.push(filters.category);
      }

      if (filters.is_active !== undefined) {
        query += ` AND is_active = $${paramIndex++}`;
        params.push(filters.is_active);
      }

      query += ` ORDER BY category, name ASC`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('[BusinessIntelligence] Error getting KPIs:', error);
      throw error;
    }
  }

  /**
   * Get KPI by ID
   */
  async getKPIById(kpiId) {
    try {
      const result = await pool.query(
        `SELECT * FROM kpis WHERE id = $1`,
        [kpiId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('[BusinessIntelligence] Error getting KPI:', error);
      throw error;
    }
  }

  /**
   * Create custom KPI
   */
  async createKPI(kpiData, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { name, description, category, metric_type, calculation_method,
              target_value, unit, is_higher_better, frequency } = kpiData;

      const result = await client.query(
        `INSERT INTO kpis
         (name, description, category, metric_type, calculation_method,
          target_value, unit, is_higher_better, frequency, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [name, description, category, metric_type, calculation_method,
         target_value, unit, is_higher_better, frequency, userId]
      );

      const kpi = result.rows[0];

      await AuditLogService.logCreate('kpi', kpi.id, kpi, userId);
      await client.query('COMMIT');

      return kpi;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[BusinessIntelligence] Error creating KPI:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Record KPI value
   */
  async recordKPIValue(valueData, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { kpi_id, location_id, period_start, period_end, value, target_value, metadata } = valueData;

      // Calculate variance
      const variance = target_value ? value - target_value : null;
      const variance_percentage = target_value && target_value !== 0
        ? ((value - target_value) / target_value) * 100
        : null;

      const result = await client.query(
        `INSERT INTO kpi_values
         (kpi_id, location_id, period_start, period_end, value, target_value,
          variance, variance_percentage, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [kpi_id, location_id, period_start, period_end, value, target_value,
         variance, variance_percentage, JSON.stringify(metadata || {})]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[BusinessIntelligence] Error recording KPI value:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get KPI values over time
   */
  async getKPIValues(kpiId, filters = {}) {
    try {
      let query = `
        SELECT kv.*, l.name as location_name
        FROM kpi_values kv
        LEFT JOIN locations l ON kv.location_id = l.id
        WHERE kv.kpi_id = $1
      `;
      const params = [kpiId];
      let paramIndex = 2;

      if (filters.location_id) {
        query += ` AND kv.location_id = $${paramIndex++}`;
        params.push(filters.location_id);
      }

      if (filters.start_date) {
        query += ` AND kv.period_start >= $${paramIndex++}`;
        params.push(filters.start_date);
      }

      if (filters.end_date) {
        query += ` AND kv.period_end <= $${paramIndex++}`;
        params.push(filters.end_date);
      }

      query += ` ORDER BY kv.period_start DESC`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('[BusinessIntelligence] Error getting KPI values:', error);
      throw error;
    }
  }

  /**
   * Get all dashboards
   */
  async getDashboards(filters = {}) {
    try {
      let query = `SELECT * FROM dashboards WHERE 1=1`;
      const params = [];
      let paramIndex = 1;

      if (filters.dashboard_type) {
        query += ` AND dashboard_type = $${paramIndex++}`;
        params.push(filters.dashboard_type);
      }

      if (filters.target_role) {
        query += ` AND target_role = $${paramIndex++}`;
        params.push(filters.target_role);
      }

      if (filters.is_template !== undefined) {
        query += ` AND is_template = $${paramIndex++}`;
        params.push(filters.is_template);
      }

      query += ` ORDER BY name ASC`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('[BusinessIntelligence] Error getting dashboards:', error);
      throw error;
    }
  }

  /**
   * Get dashboard by ID with widgets
   */
  async getDashboardById(dashboardId) {
    try {
      const dashboardResult = await pool.query(
        `SELECT * FROM dashboards WHERE id = $1`,
        [dashboardId]
      );

      if (dashboardResult.rows.length === 0) {
        return null;
      }

      const widgetsResult = await pool.query(
        `SELECT * FROM dashboard_widgets
         WHERE dashboard_id = $1
         ORDER BY sort_order ASC, position_y ASC, position_x ASC`,
        [dashboardId]
      );

      return {
        ...dashboardResult.rows[0],
        widgets: widgetsResult.rows
      };
    } catch (error) {
      console.error('[BusinessIntelligence] Error getting dashboard:', error);
      throw error;
    }
  }

  /**
   * Create custom dashboard
   */
  async createDashboard(dashboardData, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { name, description, dashboard_type, target_role, layout_config,
              refresh_interval, widgets } = dashboardData;

      const result = await client.query(
        `INSERT INTO dashboards
         (name, description, dashboard_type, target_role, layout_config,
          refresh_interval, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [name, description, dashboard_type, target_role,
         JSON.stringify(layout_config || {}), refresh_interval, userId]
      );

      const dashboard = result.rows[0];

      // Create widgets if provided
      if (widgets && widgets.length > 0) {
        for (let i = 0; i < widgets.length; i++) {
          const widget = widgets[i];
          await client.query(
            `INSERT INTO dashboard_widgets
             (dashboard_id, widget_type, title, data_source, source_config,
              display_config, position_x, position_y, width, height, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [dashboard.id, widget.widget_type, widget.title, widget.data_source,
             JSON.stringify(widget.source_config), JSON.stringify(widget.display_config || {}),
             widget.position_x, widget.position_y, widget.width || 4, widget.height || 4,
             widget.sort_order || i]
          );
        }
      }

      await AuditLogService.logCreate('dashboard', dashboard.id, dashboard, userId);
      await client.query('COMMIT');

      return this.getDashboardById(dashboard.id);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[BusinessIntelligence] Error creating dashboard:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Add widget to dashboard
   */
  async addWidget(widgetData, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { dashboard_id, widget_type, title, data_source, source_config,
              display_config, position_x, position_y, width, height } = widgetData;

      const result = await client.query(
        `INSERT INTO dashboard_widgets
         (dashboard_id, widget_type, title, data_source, source_config,
          display_config, position_x, position_y, width, height)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [dashboard_id, widget_type, title, data_source,
         JSON.stringify(source_config), JSON.stringify(display_config || {}),
         position_x, position_y, width || 4, height || 4]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[BusinessIntelligence] Error adding widget:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get user's dashboards
   */
  async getUserDashboards(userId) {
    try {
      const result = await pool.query(
        `SELECT d.*, ud.is_default, ud.is_favorite, ud.custom_filters,
                ud.last_viewed_at
         FROM dashboards d
         JOIN user_dashboards ud ON d.id = ud.dashboard_id
         WHERE ud.user_id = $1
         ORDER BY ud.is_default DESC, ud.is_favorite DESC, d.name ASC`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error('[BusinessIntelligence] Error getting user dashboards:', error);
      throw error;
    }
  }

  /**
   * Set user's default dashboard
   */
  async setDefaultDashboard(userId, dashboardId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Unset current default
      await client.query(
        `UPDATE user_dashboards
         SET is_default = false
         WHERE user_id = $1`,
        [userId]
      );

      // Set new default or create if not exists
      const result = await client.query(
        `INSERT INTO user_dashboards (user_id, dashboard_id, is_default)
         VALUES ($1, $2, true)
         ON CONFLICT (user_id, dashboard_id)
         DO UPDATE SET is_default = true
         RETURNING *`,
        [userId, dashboardId]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[BusinessIntelligence] Error setting default dashboard:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get goals
   */
  async getGoals(filters = {}) {
    try {
      let query = `
        SELECT g.*, k.name as kpi_name, l.name as location_name,
               u.first_name || ' ' || u.last_name as owner_name
        FROM goals g
        LEFT JOIN kpis k ON g.kpi_id = k.id
        LEFT JOIN locations l ON g.location_id = l.id
        LEFT JOIN users u ON g.owner_user_id = u.id
        WHERE 1=1
      `;
      const params = [];
      let paramIndex = 1;

      if (filters.location_id) {
        query += ` AND g.location_id = $${paramIndex++}`;
        params.push(filters.location_id);
      }

      if (filters.status) {
        query += ` AND g.status = $${paramIndex++}`;
        params.push(filters.status);
      }

      if (filters.goal_type) {
        query += ` AND g.goal_type = $${paramIndex++}`;
        params.push(filters.goal_type);
      }

      query += ` ORDER BY g.end_date ASC, g.created_at DESC`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('[BusinessIntelligence] Error getting goals:', error);
      throw error;
    }
  }

  /**
   * Create goal
   */
  async createGoal(goalData, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { title, description, goal_type, kpi_id, location_id, target_value,
              start_date, end_date, owner_user_id, milestones } = goalData;

      const result = await client.query(
        `INSERT INTO goals
         (title, description, goal_type, kpi_id, location_id, target_value,
          start_date, end_date, owner_user_id, created_by, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')
         RETURNING *`,
        [title, description, goal_type, kpi_id, location_id, target_value,
         start_date, end_date, owner_user_id, userId]
      );

      const goal = result.rows[0];

      // Create milestones if provided
      if (milestones && milestones.length > 0) {
        for (const milestone of milestones) {
          await client.query(
            `INSERT INTO goal_milestones
             (goal_id, title, target_date, target_value)
             VALUES ($1, $2, $3, $4)`,
            [goal.id, milestone.title, milestone.target_date, milestone.target_value]
          );
        }
      }

      await AuditLogService.logCreate('goal', goal.id, goal, userId, location_id);
      await client.query('COMMIT');

      return goal;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[BusinessIntelligence] Error creating goal:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update goal progress
   */
  async updateGoalProgress(goalId, currentValue, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const goalResult = await client.query(
        `SELECT * FROM goals WHERE id = $1`,
        [goalId]
      );

      if (goalResult.rows.length === 0) {
        throw new Error('Goal not found');
      }

      const goal = goalResult.rows[0];
      const progress = (currentValue / goal.target_value) * 100;

      // Determine status
      let status = goal.status;
      if (progress >= 100) {
        status = 'achieved';
      } else if (new Date() > new Date(goal.end_date)) {
        status = 'failed';
      } else if (progress < 50 && new Date() > new Date((new Date(goal.start_date).getTime() + new Date(goal.end_date).getTime()) / 2)) {
        status = 'at_risk';
      }

      const result = await client.query(
        `UPDATE goals
         SET current_value = $1, progress_percentage = $2, status = $3
         WHERE id = $4
         RETURNING *`,
        [currentValue, progress, status, goalId]
      );

      await AuditLogService.logUpdate('goal', goalId, goal, result.rows[0], userId, goal.location_id);
      await client.query('COMMIT');

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[BusinessIntelligence] Error updating goal progress:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get saved reports
   */
  async getSavedReports(userId, filters = {}) {
    try {
      let query = `
        SELECT * FROM saved_reports
        WHERE (created_by = $1 OR is_public = true)
      `;
      const params = [userId];
      let paramIndex = 2;

      if (filters.report_type) {
        query += ` AND report_type = $${paramIndex++}`;
        params.push(filters.report_type);
      }

      if (filters.is_scheduled !== undefined) {
        query += ` AND is_scheduled = $${paramIndex++}`;
        params.push(filters.is_scheduled);
      }

      query += ` ORDER BY name ASC`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('[BusinessIntelligence] Error getting saved reports:', error);
      throw error;
    }
  }

  /**
   * Create saved report
   */
  async createReport(reportData, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { name, description, report_type, query_config, schedule_config,
              is_scheduled, is_public } = reportData;

      const result = await client.query(
        `INSERT INTO saved_reports
         (name, description, report_type, query_config, schedule_config,
          is_scheduled, is_public, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [name, description, report_type, JSON.stringify(query_config),
         JSON.stringify(schedule_config || {}), is_scheduled, is_public, userId]
      );

      const report = result.rows[0];

      await AuditLogService.logCreate('saved_report', report.id, report, userId);
      await client.query('COMMIT');

      return report;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[BusinessIntelligence] Error creating report:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute report
   */
  async executeReport(reportId, userId, parameters = {}) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const startTime = Date.now();

      // Create execution record
      const executionResult = await client.query(
        `INSERT INTO report_executions
         (report_id, executed_by, execution_status, parameters, started_at)
         VALUES ($1, $2, 'running', $3, CURRENT_TIMESTAMP)
         RETURNING *`,
        [reportId, userId, JSON.stringify(parameters)]
      );

      const execution = executionResult.rows[0];

      // TODO: Execute actual report query based on query_config
      // This would involve building dynamic SQL from the report configuration
      // For now, marking as completed

      const executionTime = Date.now() - startTime;

      await client.query(
        `UPDATE report_executions
         SET execution_status = 'completed',
             completed_at = CURRENT_TIMESTAMP,
             execution_time_ms = $1
         WHERE id = $2`,
        [executionTime, execution.id]
      );

      // Update report last_run_at
      await client.query(
        `UPDATE saved_reports
         SET last_run_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [reportId]
      );

      await client.query('COMMIT');
      return execution;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[BusinessIntelligence] Error executing report:', error);

      // Mark execution as failed
      await pool.query(
        `UPDATE report_executions
         SET execution_status = 'failed',
             error_message = $1,
             completed_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [error.message, execution?.id]
      );

      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get business summary (daily snapshot)
   */
  async getBusinessSummary(locationId = null) {
    try {
      let query = `SELECT * FROM daily_business_summary`;
      const params = [];

      if (locationId) {
        query += ` WHERE location_id = $1`;
        params.push(locationId);
      }

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('[BusinessIntelligence] Error getting business summary:', error);
      throw error;
    }
  }

  /**
   * Get location comparison metrics
   */
  async getLocationComparison() {
    try {
      const result = await pool.query(`SELECT * FROM location_comparison`);
      return result.rows;
    } catch (error) {
      console.error('[BusinessIntelligence] Error getting location comparison:', error);
      throw error;
    }
  }
}

module.exports = new BusinessIntelligenceService();
