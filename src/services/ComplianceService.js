/**
 * Compliance Service
 *
 * Manages compliance checklists, inspections, violations, and corrective actions.
 * Part of Phase 10: Compliance & Audit Trail System
 */

const pool = require('../database/pool').getPool();
const AuditLogService = require('./AuditLogService');

class ComplianceService {
  /**
   * Get all compliance checklists
   */
  async getChecklists(filters = {}) {
    try {
      let query = `
        SELECT * FROM compliance_checklists
        WHERE 1=1
      `;
      const params = [];
      let paramIndex = 1;

      if (filters.category) {
        query += ` AND category = $${paramIndex++}`;
        params.push(filters.category);
      }

      if (filters.frequency) {
        query += ` AND frequency = $${paramIndex++}`;
        params.push(filters.frequency);
      }

      if (filters.is_active !== undefined) {
        query += ` AND is_active = $${paramIndex++}`;
        params.push(filters.is_active);
      }

      query += ` ORDER BY name ASC`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('[ComplianceService] Error getting checklists:', error);
      throw error;
    }
  }

  /**
   * Get checklist by ID with items
   */
  async getChecklistById(checklistId) {
    try {
      const checklistResult = await pool.query(
        `SELECT * FROM compliance_checklists WHERE id = $1`,
        [checklistId]
      );

      if (checklistResult.rows.length === 0) {
        return null;
      }

      const itemsResult = await pool.query(
        `SELECT * FROM compliance_checklist_items
         WHERE checklist_id = $1
         ORDER BY sort_order ASC`,
        [checklistId]
      );

      return {
        ...checklistResult.rows[0],
        items: itemsResult.rows
      };
    } catch (error) {
      console.error('[ComplianceService] Error getting checklist:', error);
      throw error;
    }
  }

  /**
   * Create new compliance checklist
   */
  async createChecklist(checklistData, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { name, description, category, frequency, required_by_role, items } = checklistData;

      const checklistResult = await client.query(
        `INSERT INTO compliance_checklists
         (name, description, category, frequency, required_by_role, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [name, description, category, frequency, required_by_role, userId]
      );

      const checklist = checklistResult.rows[0];

      // Create checklist items if provided
      if (items && items.length > 0) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          await client.query(
            `INSERT INTO compliance_checklist_items
             (checklist_id, item_text, item_type, is_required, expected_value, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [checklist.id, item.item_text, item.item_type, item.is_required,
             item.expected_value, item.sort_order || i]
          );
        }
      }

      await AuditLogService.logCreate('compliance_checklist', checklist.id, checklist, userId);
      await client.query('COMMIT');

      return this.getChecklistById(checklist.id);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[ComplianceService] Error creating checklist:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create inspection from checklist
   */
  async createInspection(inspectionData, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { checklist_id, location_id, scheduled_date, inspector_name, inspection_type } = inspectionData;

      const result = await client.query(
        `INSERT INTO compliance_inspections
         (checklist_id, location_id, scheduled_date, inspector_name, inspection_type,
          created_by, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'scheduled')
         RETURNING *`,
        [checklist_id, location_id, scheduled_date, inspector_name, inspection_type, userId]
      );

      const inspection = result.rows[0];

      await AuditLogService.logCreate('compliance_inspection', inspection.id, inspection, userId, location_id);
      await client.query('COMMIT');

      return inspection;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[ComplianceService] Error creating inspection:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Start inspection
   */
  async startInspection(inspectionId, userId) {
    try {
      const before = await pool.query(
        `SELECT * FROM compliance_inspections WHERE id = $1`,
        [inspectionId]
      );

      const result = await pool.query(
        `UPDATE compliance_inspections
         SET status = 'in_progress', started_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [inspectionId]
      );

      if (result.rows.length === 0) {
        throw new Error('Inspection not found');
      }

      const inspection = result.rows[0];

      await AuditLogService.logUpdate(
        'compliance_inspection',
        inspectionId,
        before.rows[0],
        inspection,
        userId,
        inspection.location_id
      );

      return inspection;
    } catch (error) {
      console.error('[ComplianceService] Error starting inspection:', error);
      throw error;
    }
  }

  /**
   * Complete inspection with results
   */
  async completeInspection(inspectionId, completionData, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const before = await client.query(
        `SELECT * FROM compliance_inspections WHERE id = $1`,
        [inspectionId]
      );

      const { score, findings, passed, items_checked } = completionData;

      const result = await client.query(
        `UPDATE compliance_inspections
         SET status = 'completed',
             completed_at = CURRENT_TIMESTAMP,
             score = $1,
             findings = $2,
             passed = $3,
             items_checked = $4
         WHERE id = $5
         RETURNING *`,
        [score, JSON.stringify(findings), passed, items_checked, inspectionId]
      );

      const inspection = result.rows[0];

      // Create violations if any
      if (completionData.violations && completionData.violations.length > 0) {
        for (const violation of completionData.violations) {
          await client.query(
            `INSERT INTO violations
             (location_id, violation_type, severity, description, detected_date,
              detected_by, source_type, source_id, status)
             VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, 'inspection', $6, 'open')`,
            [inspection.location_id, violation.violation_type, violation.severity,
             violation.description, userId, inspectionId]
          );
        }
      }

      await AuditLogService.logUpdate(
        'compliance_inspection',
        inspectionId,
        before.rows[0],
        inspection,
        userId,
        inspection.location_id
      );

      await client.query('COMMIT');
      return inspection;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[ComplianceService] Error completing inspection:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get violations with filters
   */
  async getViolations(filters = {}) {
    try {
      let query = `
        SELECT v.*, l.name as location_name
        FROM violations v
        LEFT JOIN locations l ON v.location_id = l.id
        WHERE 1=1
      `;
      const params = [];
      let paramIndex = 1;

      if (filters.location_id) {
        query += ` AND v.location_id = $${paramIndex++}`;
        params.push(filters.location_id);
      }

      if (filters.status) {
        query += ` AND v.status = $${paramIndex++}`;
        params.push(filters.status);
      }

      if (filters.severity) {
        query += ` AND v.severity = $${paramIndex++}`;
        params.push(filters.severity);
      }

      if (filters.violation_type) {
        query += ` AND v.violation_type = $${paramIndex++}`;
        params.push(filters.violation_type);
      }

      query += ` ORDER BY v.detected_date DESC, v.severity DESC`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('[ComplianceService] Error getting violations:', error);
      throw error;
    }
  }

  /**
   * Create violation
   */
  async createViolation(violationData, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { location_id, violation_type, severity, description, source_type, source_id } = violationData;

      const result = await client.query(
        `INSERT INTO violations
         (location_id, violation_type, severity, description, detected_date,
          detected_by, source_type, source_id, status)
         VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6, $7, 'open')
         RETURNING *`,
        [location_id, violation_type, severity, description, userId, source_type, source_id]
      );

      const violation = result.rows[0];

      await AuditLogService.logCreate('violation', violation.id, violation, userId, location_id);
      await client.query('COMMIT');

      return violation;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[ComplianceService] Error creating violation:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create corrective action for violation
   */
  async createCorrectiveAction(actionData, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { violation_id, action_type, description, assigned_to, due_date } = actionData;

      const result = await client.query(
        `INSERT INTO corrective_actions
         (violation_id, action_type, description, assigned_to, due_date,
          created_by, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')
         RETURNING *`,
        [violation_id, action_type, description, assigned_to, due_date, userId]
      );

      const action = result.rows[0];

      // Update violation status to in_progress
      await client.query(
        `UPDATE violations
         SET status = 'in_progress'
         WHERE id = $1`,
        [violation_id]
      );

      await AuditLogService.logCreate('corrective_action', action.id, action, userId);
      await client.query('COMMIT');

      return action;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[ComplianceService] Error creating corrective action:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Complete corrective action
   */
  async completeCorrectiveAction(actionId, completionData, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const before = await client.query(
        `SELECT * FROM corrective_actions WHERE id = $1`,
        [actionId]
      );

      const { resolution_notes, is_effective } = completionData;

      const result = await client.query(
        `UPDATE corrective_actions
         SET status = 'completed',
             completed_at = CURRENT_TIMESTAMP,
             completed_by = $1,
             resolution_notes = $2,
             is_effective = $3
         WHERE id = $4
         RETURNING *`,
        [userId, resolution_notes, is_effective, actionId]
      );

      const action = result.rows[0];

      // Check if all actions for the violation are complete
      const openActions = await client.query(
        `SELECT COUNT(*) FROM corrective_actions
         WHERE violation_id = $1 AND status != 'completed'`,
        [action.violation_id]
      );

      if (parseInt(openActions.rows[0].count) === 0) {
        // Mark violation as resolved
        await client.query(
          `UPDATE violations
           SET status = 'resolved', resolved_date = CURRENT_DATE
           WHERE id = $1`,
          [action.violation_id]
        );
      }

      await AuditLogService.logUpdate(
        'corrective_action',
        actionId,
        before.rows[0],
        action,
        userId
      );

      await client.query('COMMIT');
      return action;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[ComplianceService] Error completing corrective action:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get documents with filters
   */
  async getDocuments(filters = {}) {
    try {
      let query = `
        SELECT d.*, l.name as location_name
        FROM documents d
        LEFT JOIN locations l ON d.location_id = l.id
        WHERE 1=1
      `;
      const params = [];
      let paramIndex = 1;

      if (filters.location_id) {
        query += ` AND d.location_id = $${paramIndex++}`;
        params.push(filters.location_id);
      }

      if (filters.document_type) {
        query += ` AND d.document_type = $${paramIndex++}`;
        params.push(filters.document_type);
      }

      if (filters.category) {
        query += ` AND d.category = $${paramIndex++}`;
        params.push(filters.category);
      }

      if (filters.is_active !== undefined) {
        query += ` AND d.is_active = $${paramIndex++}`;
        params.push(filters.is_active);
      }

      query += ` ORDER BY d.created_at DESC`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('[ComplianceService] Error getting documents:', error);
      throw error;
    }
  }

  /**
   * Create document
   */
  async createDocument(documentData, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { title, description, document_type, category, file_url, location_id,
              effective_date, review_frequency } = documentData;

      const result = await client.query(
        `INSERT INTO documents
         (title, description, document_type, category, file_url, location_id,
          version, effective_date, review_frequency, uploaded_by, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, '1.0', $7, $8, $9, true)
         RETURNING *`,
        [title, description, document_type, category, file_url, location_id,
         effective_date, review_frequency, userId]
      );

      const document = result.rows[0];

      await AuditLogService.logCreate('document', document.id, document, userId, location_id);
      await client.query('COMMIT');

      return document;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[ComplianceService] Error creating document:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get compliance dashboard data
   */
  async getDashboard(locationId = null, dateRange = 30) {
    try {
      const params = locationId ? [locationId, dateRange] : [dateRange];
      const locationFilter = locationId ? 'AND location_id = $1' : '';
      const dateParam = locationId ? '$2' : '$1';

      // Get violation summary
      const violationSummary = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'open') as open_violations,
           COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_violations,
           COUNT(*) FILTER (WHERE status = 'resolved') as resolved_violations,
           COUNT(*) FILTER (WHERE severity = 'critical') as critical_violations
         FROM violations
         WHERE detected_date >= CURRENT_DATE - INTERVAL '${dateParam} days' ${locationFilter}`,
        params
      );

      // Get inspection summary
      const inspectionSummary = await pool.query(
        `SELECT
           COUNT(*) as total_inspections,
           COUNT(*) FILTER (WHERE passed = true) as passed_inspections,
           AVG(score) as avg_score
         FROM compliance_inspections
         WHERE completed_at >= CURRENT_TIMESTAMP - INTERVAL '${dateParam} days' ${locationFilter}`,
        params
      );

      // Get pending corrective actions
      const pendingActions = await pool.query(
        `SELECT COUNT(*)
         FROM corrective_actions ca
         JOIN violations v ON ca.violation_id = v.id
         WHERE ca.status IN ('pending', 'in_progress')
           AND ca.due_date >= CURRENT_DATE ${locationFilter ? 'AND v.location_id = $1' : ''}`,
        locationId ? [locationId] : []
      );

      return {
        violations: violationSummary.rows[0],
        inspections: inspectionSummary.rows[0],
        pending_actions: parseInt(pendingActions.rows[0].count)
      };
    } catch (error) {
      console.error('[ComplianceService] Error getting dashboard:', error);
      throw error;
    }
  }

  /**
   * Get compliance trends
   */
  async getComplianceTrends(locationId, days = 90) {
    try {
      const result = await pool.query(
        `SELECT
           DATE(detected_date) as date,
           COUNT(*) as violation_count,
           COUNT(*) FILTER (WHERE severity = 'critical') as critical_count
         FROM violations
         WHERE location_id = $1
           AND detected_date >= CURRENT_DATE - INTERVAL '${days} days'
         GROUP BY DATE(detected_date)
         ORDER BY date ASC`,
        [locationId]
      );

      return result.rows;
    } catch (error) {
      console.error('[ComplianceService] Error getting trends:', error);
      throw error;
    }
  }
}

module.exports = new ComplianceService();
