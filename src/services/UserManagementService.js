/**
 * User Management Service
 * Enhanced user profiles, RBAC, permissions, teams, and security features
 */

const { getPool } = require('../database/pool');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

class UserManagementService {
  // ===== USER PROFILE =====

  async getUserProfile(userId) {
    const pool = getPool();

    const result = await pool.query(`
      SELECT
        u.*,
        up.theme,
        up.language,
        up.timezone,
        up.notifications_enabled
      FROM users u
      LEFT JOIN user_preferences up ON u.id = up.user_id
      WHERE u.id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];

    // Remove sensitive fields
    delete user.password;
    delete user.two_factor_secret;

    return user;
  }

  async updateUserProfile(userId, profileData) {
    const pool = getPool();

    const updates = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'name', 'phone_number', 'profile_photo_url', 'job_title',
      'department', 'emergency_contact_name', 'emergency_contact_phone',
      'address', 'city', 'state', 'zip_code'
    ];

    allowedFields.forEach(field => {
      if (profileData[field] !== undefined) {
        updates.push(`${field} = $${paramCount++}`);
        values.push(profileData[field]);
      }
    });

    if (updates.length === 0) {
      return await this.getUserProfile(userId);
    }

    values.push(userId);

    const result = await pool.query(`
      UPDATE users
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    return await this.getUserProfile(userId);
  }

  async updateUserPreferences(userId, preferences) {
    const pool = getPool();

    const result = await pool.query(`
      INSERT INTO user_preferences (
        user_id, theme, language, timezone, date_format, time_format,
        temperature_unit, notifications_enabled, email_notifications,
        sms_notifications, push_notifications, notification_settings,
        dashboard_layout
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (user_id) DO UPDATE SET
        theme = EXCLUDED.theme,
        language = EXCLUDED.language,
        timezone = EXCLUDED.timezone,
        date_format = EXCLUDED.date_format,
        time_format = EXCLUDED.time_format,
        temperature_unit = EXCLUDED.temperature_unit,
        notifications_enabled = EXCLUDED.notifications_enabled,
        email_notifications = EXCLUDED.email_notifications,
        sms_notifications = EXCLUDED.sms_notifications,
        push_notifications = EXCLUDED.push_notifications,
        notification_settings = EXCLUDED.notification_settings,
        dashboard_layout = EXCLUDED.dashboard_layout,
        updated_at = NOW()
      RETURNING *
    `, [
      userId,
      preferences.theme || 'light',
      preferences.language || 'en',
      preferences.timezone || 'America/New_York',
      preferences.dateFormat || 'MM/DD/YYYY',
      preferences.timeFormat || '12h',
      preferences.temperatureUnit || 'fahrenheit',
      preferences.notificationsEnabled !== false,
      preferences.emailNotifications !== false,
      preferences.smsNotifications || false,
      preferences.pushNotifications !== false,
      JSON.stringify(preferences.notificationSettings || {}),
      JSON.stringify(preferences.dashboardLayout || {})
    ]);

    return result.rows[0];
  }

  // ===== ROLES & PERMISSIONS =====

  async getRoles() {
    const pool = getPool();

    const result = await pool.query(`
      SELECT
        r.*,
        COUNT(DISTINCT ur.user_id) as user_count,
        COUNT(DISTINCT rp.permission_id) as permission_count
      FROM roles r
      LEFT JOIN user_roles ur ON r.id = ur.role_id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      GROUP BY r.id
      ORDER BY r.level DESC
    `);

    return result.rows;
  }

  async getRole(roleId) {
    const pool = getPool();

    const roleResult = await pool.query(
      'SELECT * FROM roles WHERE id = $1',
      [roleId]
    );

    if (roleResult.rows.length === 0) {
      return null;
    }

    const role = roleResult.rows[0];

    // Get role permissions
    const permissionsResult = await pool.query(`
      SELECT p.* FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1
    `, [roleId]);

    role.permissions = permissionsResult.rows;

    return role;
  }

  async createRole(roleData) {
    const pool = getPool();
    const id = `role-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const result = await pool.query(`
      INSERT INTO roles (id, name, description, level, is_system_role)
      VALUES ($1, $2, $3, $4, false)
      RETURNING *
    `, [id, roleData.name, roleData.description || null, roleData.level || 0]);

    return result.rows[0];
  }

  async assignPermissionsToRole(roleId, permissionIds) {
    const pool = getPool();

    // Remove existing permissions
    await pool.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);

    // Add new permissions
    for (const permissionId of permissionIds) {
      await pool.query(
        'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
        [roleId, permissionId]
      );
    }

    return await this.getRole(roleId);
  }

  async getPermissions() {
    const pool = getPool();

    const result = await pool.query(`
      SELECT * FROM permissions
      ORDER BY resource, action
    `);

    return result.rows;
  }

  async assignRoleToUser(userId, roleId, locationId, assignedBy) {
    const pool = getPool();

    const result = await pool.query(`
      INSERT INTO user_roles (user_id, role_id, location_id, assigned_by)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, role_id, location_id) DO NOTHING
      RETURNING *
    `, [userId, roleId, locationId, assignedBy]);

    return result.rows[0];
  }

  async removeRoleFromUser(userId, roleId, locationId) {
    const pool = getPool();

    const result = await pool.query(
      'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2 AND location_id = $3 RETURNING *',
      [userId, roleId, locationId]
    );

    return result.rows[0];
  }

  async getUserRoles(userId) {
    const pool = getPool();

    const result = await pool.query(`
      SELECT
        r.*,
        ur.location_id,
        l.name as location_name,
        ur.assigned_at
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      LEFT JOIN locations l ON ur.location_id = l.id
      WHERE ur.user_id = $1
      ORDER BY r.level DESC
    `, [userId]);

    return result.rows;
  }

  async getUserPermissions(userId, locationId = null) {
    const pool = getPool();

    let query = `
      SELECT DISTINCT p.*
      FROM user_permissions_view upv
      JOIN permissions p ON upv.permission_id = p.id
      WHERE upv.user_id = $1
    `;

    const params = [userId];

    if (locationId) {
      query += ' AND (upv.location_id = $2 OR upv.location_id IS NULL)';
      params.push(locationId);
    }

    const result = await pool.query(query, params);

    return result.rows;
  }

  async checkPermission(userId, permissionName, locationId = null) {
    const pool = getPool();

    const result = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM user_permissions_view
        WHERE user_id = $1
          AND permission_name = $2
          AND ($3::VARCHAR IS NULL OR location_id = $3 OR location_id IS NULL)
      ) as has_permission
    `, [userId, permissionName, locationId]);

    return result.rows[0].has_permission;
  }

  // ===== TEAMS =====

  async createTeam(teamData) {
    const pool = getPool();
    const id = `team-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const result = await pool.query(`
      INSERT INTO teams (
        id, location_id, name, description, team_lead_id, color, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      id,
      teamData.locationId,
      teamData.name,
      teamData.description || null,
      teamData.teamLeadId || null,
      teamData.color || null,
      teamData.createdBy || null
    ]);

    return result.rows[0];
  }

  async getTeams(locationId) {
    const pool = getPool();

    const result = await pool.query(`
      SELECT
        t.*,
        u.name as team_lead_name,
        COUNT(DISTINCT tm.user_id) as member_count
      FROM teams t
      LEFT JOIN users u ON t.team_lead_id = u.id
      LEFT JOIN team_members tm ON t.id = tm.team_id
      WHERE t.location_id = $1 AND t.is_active = true
      GROUP BY t.id, u.name
      ORDER BY t.name
    `, [locationId]);

    return result.rows;
  }

  async getTeam(teamId) {
    const pool = getPool();

    const teamResult = await pool.query(
      'SELECT * FROM teams WHERE id = $1',
      [teamId]
    );

    if (teamResult.rows.length === 0) {
      return null;
    }

    const team = teamResult.rows[0];

    // Get team members
    const membersResult = await pool.query(`
      SELECT u.id, u.name, u.email, u.job_title, tm.joined_at
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = $1
      ORDER BY u.name
    `, [teamId]);

    team.members = membersResult.rows;

    return team;
  }

  async addTeamMember(teamId, userId) {
    const pool = getPool();

    const result = await pool.query(`
      INSERT INTO team_members (team_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (team_id, user_id) DO NOTHING
      RETURNING *
    `, [teamId, userId]);

    return result.rows[0];
  }

  async removeTeamMember(teamId, userId) {
    const pool = getPool();

    const result = await pool.query(
      'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2 RETURNING *',
      [teamId, userId]
    );

    return result.rows[0];
  }

  // ===== ACTIVITY LOGGING =====

  async logActivity(activityData) {
    const pool = getPool();
    const id = `activity-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const result = await pool.query(`
      INSERT INTO activity_logs (
        id, user_id, action, resource_type, resource_id,
        details, ip_address, user_agent, location_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      id,
      activityData.userId || null,
      activityData.action,
      activityData.resourceType || null,
      activityData.resourceId || null,
      JSON.stringify(activityData.details || {}),
      activityData.ipAddress || null,
      activityData.userAgent || null,
      activityData.locationId || null
    ]);

    return result.rows[0];
  }

  async getUserActivity(userId, limit = 50) {
    const pool = getPool();

    const result = await pool.query(`
      SELECT * FROM activity_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [userId, limit]);

    return result.rows;
  }

  async getRecentActivity(locationId, limit = 100) {
    const pool = getPool();

    let query = 'SELECT al.*, u.name as user_name FROM activity_logs al LEFT JOIN users u ON al.user_id = u.id';
    const params = [];

    if (locationId) {
      query += ' WHERE al.location_id = $1';
      params.push(locationId);
    }

    query += ' ORDER BY al.created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await pool.query(query, params);

    return result.rows;
  }

  // ===== PASSWORD & SECURITY =====

  async changePassword(userId, currentPassword, newPassword) {
    const pool = getPool();

    // Verify current password
    const userResult = await pool.query(
      'SELECT password FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const isValid = await bcrypt.compare(currentPassword, userResult.rows[0].password);

    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(`
      UPDATE users
      SET password = $1, password_changed_at = NOW()
      WHERE id = $2
    `, [hashedPassword, userId]);

    // Log activity
    await this.logActivity({
      userId,
      action: 'password_changed',
      resourceType: 'user',
      resourceId: userId
    });

    return { success: true };
  }

  async requestPasswordReset(email) {
    const pool = getPool();

    // Find user
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      // Don't reveal if user exists
      return { success: true };
    }

    const userId = userResult.rows[0].id;

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const id = `reset-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Store token (expires in 1 hour)
    await pool.query(`
      INSERT INTO password_reset_tokens (
        id, user_id, token_hash, expires_at
      ) VALUES ($1, $2, $3, NOW() + INTERVAL '1 hour')
    `, [id, userId, tokenHash]);

    // In production, send email with reset link
    // For now, return token (for development only)
    return {
      success: true,
      resetToken: token, // Remove in production
      resetUrl: `/reset-password?token=${token}`
    };
  }

  async resetPassword(token, newPassword) {
    const pool = getPool();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid token
    const tokenResult = await pool.query(`
      SELECT user_id FROM password_reset_tokens
      WHERE token_hash = $1
        AND expires_at > NOW()
        AND used_at IS NULL
    `, [tokenHash]);

    if (tokenResult.rows.length === 0) {
      throw new Error('Invalid or expired reset token');
    }

    const userId = tokenResult.rows[0].user_id;

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(`
      UPDATE users
      SET password = $1, password_changed_at = NOW()
      WHERE id = $2
    `, [hashedPassword, userId]);

    // Mark token as used
    await pool.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = $1',
      [tokenHash]
    );

    // Log activity
    await this.logActivity({
      userId,
      action: 'password_reset',
      resourceType: 'user',
      resourceId: userId
    });

    return { success: true };
  }

  async logLoginAttempt(email, ipAddress, success, failureReason = null, userAgent = null) {
    const pool = getPool();
    const id = `login-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    await pool.query(`
      INSERT INTO login_attempts (
        id, email, ip_address, success, failure_reason, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [id, email, ipAddress, success, failureReason, userAgent]);
  }

  async getFailedLoginAttempts(email, minutes = 15) {
    const pool = getPool();

    const result = await pool.query(`
      SELECT COUNT(*) as count
      FROM login_attempts
      WHERE email = $1
        AND success = false
        AND created_at >= NOW() - INTERVAL '1 minute' * $2
    `, [email, minutes]);

    return parseInt(result.rows[0].count);
  }
}

module.exports = new UserManagementService();
