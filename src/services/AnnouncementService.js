/**
 * Announcement Service
 * Handles company-wide and location-specific announcements
 */

const pool = require('../database/pool').getPool();

class AnnouncementService {
  /**
   * Create new announcement
   */
  async createAnnouncement(announcementData) {
    const {
      title,
      content,
      announcementType = 'general',
      priority = 'medium',
      locationId,
      targetRoles,
      publishedAt,
      expiresAt,
      requiresAcknowledgment = false,
      attachments = [],
      isPinned = false,
      createdBy
    } = announcementData;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create announcement
      const result = await client.query(
        `INSERT INTO announcements (
          title, content, announcement_type, priority, location_id,
          target_roles, published_at, expires_at, requires_acknowledgment,
          attachments, is_pinned, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          title, content, announcementType, priority, locationId,
          targetRoles, publishedAt || new Date(), expiresAt, requiresAcknowledgment,
          JSON.stringify(attachments), isPinned, createdBy
        ]
      );

      const announcement = result.rows[0];

      await client.query('COMMIT');

      // Trigger notifications for published announcements
      if (new Date(announcement.published_at) <= new Date()) {
        this.notifyTargetUsers(announcement);
      }

      return announcement;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get announcements for user
   */
  async getAnnouncementsForUser(userId, options = {}) {
    const {
      includeExpired = false,
      announcementType,
      locationId,
      limit = 50,
      offset = 0
    } = options;

    let query = `
      SELECT DISTINCT
        a.*,
        aa.acknowledged_at,
        u.name as created_by_name,
        CASE WHEN aa.id IS NOT NULL THEN true ELSE false END as is_acknowledged
      FROM announcements a
      LEFT JOIN announcement_acknowledgments aa ON a.id = aa.announcement_id AND aa.user_id = $1
      LEFT JOIN users u ON a.created_by = u.id
      LEFT JOIN user_locations ul ON a.location_id = ul.location_id AND ul.user_id = $1
      LEFT JOIN user_roles ur ON ur.user_id = $1
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE a.published_at <= CURRENT_TIMESTAMP
        AND (
          a.location_id IS NULL
          OR ul.location_id IS NOT NULL
          OR a.created_by = $1
        )
        AND (
          a.target_roles IS NULL
          OR r.name = ANY(a.target_roles)
          OR a.created_by = $1
        )
    `;
    const params = [userId];
    let paramCount = 1;

    if (!includeExpired) {
      query += ` AND (a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)`;
    }

    if (announcementType) {
      paramCount++;
      query += ` AND a.announcement_type = $${paramCount}`;
      params.push(announcementType);
    }

    if (locationId) {
      paramCount++;
      query += ` AND (a.location_id = $${paramCount} OR a.location_id IS NULL)`;
      params.push(locationId);
    }

    query += ` ORDER BY a.is_pinned DESC, a.published_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get all announcements (admin view)
   */
  async getAllAnnouncements(filters = {}) {
    const {
      announcementType,
      locationId,
      includeExpired = false,
      limit = 50,
      offset = 0
    } = filters;

    let query = `
      SELECT
        a.*,
        u.name as created_by_name,
        (
          SELECT COUNT(*) FROM announcement_acknowledgments
          WHERE announcement_id = a.id
        ) as acknowledgment_count,
        (
          SELECT COUNT(DISTINCT user_id)
          FROM announcement_acknowledgments aa
          WHERE aa.announcement_id = a.id
        ) as unique_acknowledgments
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (!includeExpired) {
      query += ` AND (a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)`;
    }

    if (announcementType) {
      paramCount++;
      query += ` AND a.announcement_type = $${paramCount}`;
      params.push(announcementType);
    }

    if (locationId) {
      paramCount++;
      query += ` AND (a.location_id = $${paramCount} OR a.location_id IS NULL)`;
      params.push(locationId);
    }

    query += ` ORDER BY a.is_pinned DESC, a.published_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get single announcement
   */
  async getAnnouncement(announcementId, userId = null) {
    let query = `
      SELECT
        a.*,
        u.name as created_by_name,
        (
          SELECT COUNT(*) FROM announcement_acknowledgments
          WHERE announcement_id = a.id
        ) as acknowledgment_count
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.id = $1
    `;
    const params = [announcementId];

    if (userId) {
      query = `
        SELECT
          a.*,
          u.name as created_by_name,
          aa.acknowledged_at,
          CASE WHEN aa.id IS NOT NULL THEN true ELSE false END as is_acknowledged,
          (
            SELECT COUNT(*) FROM announcement_acknowledgments
            WHERE announcement_id = a.id
          ) as acknowledgment_count
        FROM announcements a
        LEFT JOIN users u ON a.created_by = u.id
        LEFT JOIN announcement_acknowledgments aa ON a.id = aa.announcement_id AND aa.user_id = $2
        WHERE a.id = $1
      `;
      params.push(userId);
    }

    const result = await pool.query(query, params);
    return result.rows[0];
  }

  /**
   * Update announcement
   */
  async updateAnnouncement(announcementId, userId, updates) {
    const {
      title,
      content,
      announcementType,
      priority,
      expiresAt,
      isPinned,
      attachments
    } = updates;

    const setClauses = [];
    const params = [announcementId];
    let paramCount = 1;

    if (title !== undefined) {
      paramCount++;
      setClauses.push(`title = $${paramCount}`);
      params.push(title);
    }

    if (content !== undefined) {
      paramCount++;
      setClauses.push(`content = $${paramCount}`);
      params.push(content);
    }

    if (announcementType !== undefined) {
      paramCount++;
      setClauses.push(`announcement_type = $${paramCount}`);
      params.push(announcementType);
    }

    if (priority !== undefined) {
      paramCount++;
      setClauses.push(`priority = $${paramCount}`);
      params.push(priority);
    }

    if (expiresAt !== undefined) {
      paramCount++;
      setClauses.push(`expires_at = $${paramCount}`);
      params.push(expiresAt);
    }

    if (isPinned !== undefined) {
      paramCount++;
      setClauses.push(`is_pinned = $${paramCount}`);
      params.push(isPinned);
    }

    if (attachments !== undefined) {
      paramCount++;
      setClauses.push(`attachments = $${paramCount}`);
      params.push(JSON.stringify(attachments));
    }

    if (setClauses.length === 0) {
      throw new Error('No valid fields to update');
    }

    setClauses.push('updated_at = CURRENT_TIMESTAMP');

    const result = await pool.query(
      `UPDATE announcements
       SET ${setClauses.join(', ')}
       WHERE id = $1 AND created_by = $${paramCount + 1}
       RETURNING *`,
      [...params, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Announcement not found or unauthorized');
    }

    return result.rows[0];
  }

  /**
   * Delete announcement
   */
  async deleteAnnouncement(announcementId, userId) {
    const result = await pool.query(
      `DELETE FROM announcements
       WHERE id = $1 AND created_by = $2
       RETURNING *`,
      [announcementId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Announcement not found or unauthorized');
    }

    return result.rows[0];
  }

  /**
   * Acknowledge announcement
   */
  async acknowledgeAnnouncement(announcementId, userId) {
    const result = await pool.query(
      `INSERT INTO announcement_acknowledgments (announcement_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (announcement_id, user_id) DO NOTHING
       RETURNING *`,
      [announcementId, userId]
    );

    return result.rows[0];
  }

  /**
   * Get pending acknowledgments for user
   */
  async getPendingAcknowledgments(userId) {
    const result = await pool.query(
      `SELECT * FROM pending_acknowledgments WHERE user_id = $1`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Get acknowledgment status for announcement
   */
  async getAcknowledgmentStatus(announcementId) {
    const result = await pool.query(
      `SELECT
        a.id,
        a.title,
        a.requires_acknowledgment,
        COUNT(aa.id) as acknowledgment_count,
        COUNT(DISTINCT aa.user_id) as unique_users,
        array_agg(DISTINCT json_build_object(
          'user_id', u.id,
          'user_name', u.name,
          'acknowledged_at', aa.acknowledged_at
        )) FILTER (WHERE aa.id IS NOT NULL) as acknowledged_users
      FROM announcements a
      LEFT JOIN announcement_acknowledgments aa ON a.id = aa.announcement_id
      LEFT JOIN users u ON aa.user_id = u.id
      WHERE a.id = $1
      GROUP BY a.id, a.title, a.requires_acknowledgment`,
      [announcementId]
    );

    return result.rows[0];
  }

  /**
   * Get target users for announcement
   */
  async getTargetUsers(announcement) {
    let query = `SELECT DISTINCT u.id, u.name, u.email FROM users u`;
    const params = [];
    const conditions = [];

    // Filter by location
    if (announcement.location_id) {
      query += ` JOIN user_locations ul ON u.id = ul.user_id`;
      conditions.push(`ul.location_id = $${params.length + 1}`);
      params.push(announcement.location_id);
    }

    // Filter by roles
    if (announcement.target_roles && announcement.target_roles.length > 0) {
      query += ` JOIN user_roles ur ON u.id = ur.user_id
                 JOIN roles r ON ur.role_id = r.id`;
      conditions.push(`r.name = ANY($${params.length + 1})`);
      params.push(announcement.target_roles);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Notify target users about new announcement
   */
  async notifyTargetUsers(announcement) {
    const targetUsers = await this.getTargetUsers(announcement);

    console.log(`[Notifications] Notifying ${targetUsers.length} users about announcement: ${announcement.title}`);

    // Integration point for NotificationService
    // for (const user of targetUsers) {
    //   await NotificationService.createNotification({
    //     userId: user.id,
    //     notificationType: 'new_announcement',
    //     title: `New Announcement: ${announcement.title}`,
    //     message: announcement.content.substring(0, 200),
    //     priority: announcement.priority,
    //     actionUrl: `/announcements/${announcement.id}`,
    //     metadata: { announcementId: announcement.id }
    //   });
    // }
  }

  /**
   * Schedule announcement for future publishing
   */
  async scheduleAnnouncement(announcementId, publishedAt) {
    const result = await pool.query(
      `UPDATE announcements
       SET published_at = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [publishedAt, announcementId]
    );

    return result.rows[0];
  }

  /**
   * Get announcement statistics
   */
  async getAnnouncementStats(locationId = null) {
    let query = `
      SELECT
        COUNT(*) as total_announcements,
        COUNT(*) FILTER (WHERE published_at <= CURRENT_TIMESTAMP) as published_count,
        COUNT(*) FILTER (WHERE requires_acknowledgment = true) as requires_ack_count,
        COUNT(*) FILTER (WHERE is_pinned = true) as pinned_count,
        COUNT(*) FILTER (WHERE announcement_type = 'urgent') as urgent_count
      FROM announcements
      WHERE (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `;
    const params = [];

    if (locationId) {
      query += ` AND (location_id = $1 OR location_id IS NULL)`;
      params.push(locationId);
    }

    const result = await pool.query(query, params);
    return result.rows[0];
  }

  /**
   * Clean up expired announcements
   */
  async cleanupExpiredAnnouncements(daysAfterExpiry = 30) {
    const result = await pool.query(
      `DELETE FROM announcements
       WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '${daysAfterExpiry} days'
       RETURNING id`,
      []
    );

    return result.rowCount;
  }
}

module.exports = new AnnouncementService();
