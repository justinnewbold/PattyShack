/**
 * Audit Log Service
 * Handles logging of user actions and security events for audit trail and compliance
 */

const { getPool } = require('../database/pool');

class AuditLogService {
  /**
   * Log an audit event
   * @param {Object} eventData - The event data to log
   * @param {string} eventData.userId - ID of the user performing the action
   * @param {string} eventData.username - Username of the user
   * @param {string} eventData.action - Action performed (e.g., 'login', 'logout', 'create', 'update', 'delete')
   * @param {string} eventData.resourceType - Type of resource affected (optional)
   * @param {string} eventData.resourceId - ID of the resource affected (optional)
   * @param {string} eventData.ipAddress - IP address of the request (optional)
   * @param {string} eventData.userAgent - User agent string (optional)
   * @param {Object} eventData.metadata - Additional context data (optional)
   * @returns {Promise<Object>} The created audit log entry
   */
  async logEvent(eventData) {
    const pool = getPool();

    if (!pool) {
      // If no database pool, log to console and return
      console.log('Audit event (no database):', eventData);
      return null;
    }

    try {
      const auditLog = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        user_id: eventData.userId || null,
        username: eventData.username || null,
        action: eventData.action,
        resource_type: eventData.resourceType || null,
        resource_id: eventData.resourceId || null,
        ip_address: eventData.ipAddress || null,
        user_agent: eventData.userAgent || null,
        metadata: JSON.stringify(eventData.metadata || {})
      };

      const result = await pool.query(
        `INSERT INTO audit_logs
        (id, user_id, username, action, resource_type, resource_id, ip_address, user_agent, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          auditLog.id,
          auditLog.user_id,
          auditLog.username,
          auditLog.action,
          auditLog.resource_type,
          auditLog.resource_id,
          auditLog.ip_address,
          auditLog.user_agent,
          auditLog.metadata
        ]
      );

      return result.rows[0];
    } catch (error) {
      // Log error but don't throw - audit logging should not break the main flow
      console.error('Failed to log audit event:', error.message);
      return null;
    }
  }

  /**
   * Log a login event
   */
  async logLogin(userId, username, req) {
    return this.logEvent({
      userId,
      username,
      action: 'login',
      ipAddress: this.getIpAddress(req),
      userAgent: req?.headers?.['user-agent'],
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log a logout event
   */
  async logLogout(userId, username, req) {
    return this.logEvent({
      userId,
      username,
      action: 'logout',
      ipAddress: this.getIpAddress(req),
      userAgent: req?.headers?.['user-agent'],
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log a failed login attempt
   */
  async logFailedLogin(username, req, reason) {
    return this.logEvent({
      username,
      action: 'login_failed',
      ipAddress: this.getIpAddress(req),
      userAgent: req?.headers?.['user-agent'],
      metadata: {
        reason,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Get audit logs for a user
   */
  async getUserAuditLogs(userId, limit = 100, offset = 0) {
    const pool = getPool();

    if (!pool) {
      return [];
    }

    try {
      const result = await pool.query(
        `SELECT * FROM audit_logs
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      return result.rows;
    } catch (error) {
      console.error('Failed to get audit logs:', error.message);
      return [];
    }
  }

  /**
   * Get audit logs by action type
   */
  async getAuditLogsByAction(action, limit = 100, offset = 0) {
    const pool = getPool();

    if (!pool) {
      return [];
    }

    try {
      const result = await pool.query(
        `SELECT * FROM audit_logs
        WHERE action = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3`,
        [action, limit, offset]
      );

      return result.rows;
    } catch (error) {
      console.error('Failed to get audit logs:', error.message);
      return [];
    }
  }

  /**
   * Extract IP address from request
   */
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
}

module.exports = new AuditLogService();
