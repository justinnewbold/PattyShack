/**
 * Audit Log Service
 * Provides comprehensive audit trail logging for compliance and security
 */

const pool = require('../database/pool').getPool();

class AuditLogService {
  /**
   * Log an audit event
   */
  async log(auditData) {
    const {
      entityType,
      entityId,
      action,
      userId,
      locationId,
      changes = {},
      metadata = {},
      severity = 'info'
    } = auditData;

    try {
      const result = await pool.query(
        `INSERT INTO audit_logs (
          entity_type, entity_id, action, user_id, location_id,
          changes, metadata, severity
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          entityType,
          entityId,
          action,
          userId,
          locationId,
          JSON.stringify(changes),
          JSON.stringify(metadata),
          severity
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('[AuditLog] Failed to create audit log:', error);
      return null;
    }
  }

  /**
   * Log entity creation
   */
  async logCreate(entityType, entityId, entity, userId, locationId = null, metadata = {}) {
    return this.log({
      entityType,
      entityId,
      action: 'create',
      userId,
      locationId,
      changes: { after: entity },
      metadata,
      severity: 'info'
    });
  }

  /**
   * Log entity update
   */
  async logUpdate(entityType, entityId, before, after, userId, locationId = null, metadata = {}) {
    const changes = this.calculateChanges(before, after);

    return this.log({
      entityType,
      entityId,
      action: 'update',
      userId,
      locationId,
      changes: { before, after, changed: changes },
      metadata,
      severity: 'info'
    });
  }

  /**
   * Log entity deletion
   */
  async logDelete(entityType, entityId, entity, userId, locationId = null, metadata = {}) {
    return this.log({
      entityType,
      entityId,
      action: 'delete',
      userId,
      locationId,
      changes: { before: entity },
      metadata,
      severity: 'warning'
    });
  }

  /**
   * Log security event
   */
  async logSecurityEvent(eventType, details, userId = null, metadata = {}) {
    return this.log({
      entityType: 'security',
      entityId: `security-${Date.now()}`,
      action: eventType,
      userId,
      metadata: { ...metadata, details },
      severity: 'critical'
    });
  }

  /**
   * Get audit logs with filtering
   */
  async getLogs(filters = {}) {
    const {
      entityType,
      entityId,
      action,
      userId,
      locationId,
      severity,
      startDate,
      endDate,
      limit = 100,
      offset = 0
    } = filters;

    let query = `
      SELECT
        al.*,
        u.name as user_name,
        u.email as user_email,
        l.name as location_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN locations l ON al.location_id = l.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (entityType) {
      paramCount++;
      query += ` AND al.entity_type = $${paramCount}`;
      params.push(entityType);
    }

    if (entityId) {
      paramCount++;
      query += ` AND al.entity_id = $${paramCount}`;
      params.push(entityId);
    }

    if (action) {
      paramCount++;
      query += ` AND al.action = $${paramCount}`;
      params.push(action);
    }

    if (userId) {
      paramCount++;
      query += ` AND al.user_id = $${paramCount}`;
      params.push(userId);
    }

    if (locationId) {
      paramCount++;
      query += ` AND al.location_id = $${paramCount}`;
      params.push(locationId);
    }

    if (severity) {
      paramCount++;
      query += ` AND al.severity = $${paramCount}`;
      params.push(severity);
    }

    if (startDate) {
      paramCount++;
      query += ` AND al.timestamp >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND al.timestamp <= $${paramCount}`;
      params.push(endDate);
    }

    query += ` ORDER BY al.timestamp DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get entity audit trail
   */
  async getEntityAuditTrail(entityType, entityId) {
    return this.getLogs({ entityType, entityId, limit: 1000 });
  }

  /**
   * Get user activity
   */
  async getUserActivity(userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    return this.getLogs({ userId, startDate, limit: 500 });
  }

  /**
   * Calculate changes between objects
   */
  calculateChanges(before, after) {
    const changes = {};
    const allKeys = new Set([
      ...Object.keys(before || {}),
      ...Object.keys(after || {})
    ]);

    allKeys.forEach(key => {
      const beforeValue = before?.[key];
      const afterValue = after?.[key];

      if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
        changes[key] = {
          from: beforeValue,
          to: afterValue
        };
      }
    });

    return changes;
  }

  /**
   * Legacy methods for backward compatibility
   */
  async logEvent(eventData) {
    return this.log({
      entityType: eventData.resourceType || 'system',
      entityId: eventData.resourceId || `event-${Date.now()}`,
      action: eventData.action,
      userId: eventData.userId,
      metadata: {
        username: eventData.username,
        ipAddress: eventData.ipAddress,
        userAgent: eventData.userAgent,
        ...eventData.metadata
      }
    });
  }

  async logLogin(userId, username, req) {
    return this.logSecurityEvent('login', { username }, userId, {
      ipAddress: this.getIpAddress(req),
      userAgent: req?.headers?.['user-agent']
    });
  }

  async logLogout(userId, username, req) {
    return this.logSecurityEvent('logout', { username }, userId, {
      ipAddress: this.getIpAddress(req),
      userAgent: req?.headers?.['user-agent']
    });
  }

  async logFailedLogin(username, req, reason) {
    return this.logSecurityEvent('login_failed', { username, reason }, null, {
      ipAddress: this.getIpAddress(req),
      userAgent: req?.headers?.['user-agent']
    });
  }

  async getUserAuditLogs(userId, limit = 100, offset = 0) {
    return this.getLogs({ userId, limit, offset });
  }

  async getAuditLogsByAction(action, limit = 100, offset = 0) {
    return this.getLogs({ action, limit, offset });
  }

  getIpAddress(req) {
    if (!req) return null;
    return (
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      null
    );
  }

  /**
   * Clean up old logs
   */
  async cleanupOldLogs(retentionDays = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await pool.query(
      `DELETE FROM audit_logs
       WHERE timestamp < $1 AND severity != 'critical'
       RETURNING id`,
      [cutoffDate]
    );

    return result.rowCount;
  }
}

module.exports = new AuditLogService();
