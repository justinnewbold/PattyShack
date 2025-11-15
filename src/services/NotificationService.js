/**
 * Notification Service
 * Handles creation, delivery, and management of notifications with real-time capabilities
 */

const pool = require('../database/pool').getPool();

class NotificationService {
  /**
   * Create and send a notification to a user
   */
  async createNotification(notificationData) {
    const {
      userId,
      locationId,
      notificationType,
      title,
      message,
      priority = 'medium',
      actionUrl,
      actionLabel,
      metadata = {},
      deliveryChannels = ['in_app']
    } = notificationData;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check user preferences
      const preferencesResult = await client.query(
        `SELECT * FROM notification_preferences
         WHERE user_id = $1 AND notification_type = $2`,
        [userId, notificationType]
      );

      let effectiveChannels = deliveryChannels;
      if (preferencesResult.rows.length > 0) {
        const prefs = preferencesResult.rows[0];

        // Check quiet hours
        const now = new Date();
        const currentTime = `${now.getHours()}:${now.getMinutes()}:00`;
        if (prefs.quiet_hours_start && prefs.quiet_hours_end) {
          if (currentTime >= prefs.quiet_hours_start && currentTime <= prefs.quiet_hours_end) {
            // During quiet hours, only send urgent notifications
            if (priority !== 'urgent') {
              effectiveChannels = ['in_app']; // Queue for later
            }
          }
        }

        // Filter channels based on preferences
        effectiveChannels = effectiveChannels.filter(channel => {
          if (channel === 'in_app') return prefs.in_app_enabled;
          if (channel === 'email') return prefs.email_enabled;
          if (channel === 'sms') return prefs.sms_enabled;
          if (channel === 'push') return prefs.push_enabled;
          return true;
        });
      }

      // Create notification
      const result = await client.query(
        `INSERT INTO notifications (
          user_id, location_id, notification_type, title, message,
          priority, action_url, action_label, metadata, delivery_channels
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          userId, locationId, notificationType, title, message,
          priority, actionUrl, actionLabel, JSON.stringify(metadata),
          effectiveChannels
        ]
      );

      const notification = result.rows[0];

      await client.query('COMMIT');

      // Trigger real-time push (handled by WebSocket service)
      if (effectiveChannels.includes('in_app') || effectiveChannels.includes('push')) {
        this.pushRealTimeNotification(userId, notification);
      }

      // Trigger email if needed
      if (effectiveChannels.includes('email')) {
        this.sendEmailNotification(userId, notification);
      }

      // Trigger SMS if needed
      if (effectiveChannels.includes('sms')) {
        this.sendSMSNotification(userId, notification);
      }

      return notification;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Bulk create notifications (e.g., for announcements)
   */
  async createBulkNotifications(userIds, notificationData) {
    const notifications = [];

    for (const userId of userIds) {
      try {
        const notification = await this.createNotification({
          ...notificationData,
          userId
        });
        notifications.push(notification);
      } catch (error) {
        console.error(`Failed to create notification for user ${userId}:`, error);
      }
    }

    return notifications;
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(userId, options = {}) {
    const {
      unreadOnly = false,
      priority,
      notificationType,
      limit = 50,
      offset = 0
    } = options;

    let query = `
      SELECT
        n.*,
        nr.read_at,
        nr.dismissed
      FROM notifications n
      LEFT JOIN notification_reads nr ON n.id = nr.notification_id AND n.user_id = nr.user_id
      WHERE n.user_id = $1
        AND (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)
    `;
    const params = [userId];
    let paramCount = 1;

    if (unreadOnly) {
      query += ` AND nr.id IS NULL`;
    }

    if (priority) {
      paramCount++;
      query += ` AND n.priority = $${paramCount}`;
      params.push(priority);
    }

    if (notificationType) {
      paramCount++;
      query += ` AND n.notification_type = $${paramCount}`;
      params.push(notificationType);
    }

    query += ` ORDER BY n.delivered_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId) {
    const result = await pool.query(
      `SELECT
        unread_count,
        urgent_count,
        latest_notification_at
       FROM unread_notifications_count
       WHERE user_id = $1`,
      [userId]
    );

    return result.rows[0] || { unread_count: 0, urgent_count: 0, latest_notification_at: null };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    const result = await pool.query(
      `INSERT INTO notification_reads (notification_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (notification_id, user_id) DO NOTHING
       RETURNING *`,
      [notificationId, userId]
    );

    return result.rows[0];
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId) {
    const result = await pool.query(
      `INSERT INTO notification_reads (notification_id, user_id)
       SELECT id, $1 FROM notifications
       WHERE user_id = $1
         AND NOT EXISTS (
           SELECT 1 FROM notification_reads
           WHERE notification_id = notifications.id AND user_id = $1
         )
       RETURNING *`,
      [userId]
    );

    return result.rowCount;
  }

  /**
   * Dismiss notification
   */
  async dismissNotification(notificationId, userId) {
    const result = await pool.query(
      `INSERT INTO notification_reads (notification_id, user_id, dismissed, dismissed_at)
       VALUES ($1, $2, true, CURRENT_TIMESTAMP)
       ON CONFLICT (notification_id, user_id)
       DO UPDATE SET dismissed = true, dismissed_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [notificationId, userId]
    );

    return result.rows[0];
  }

  /**
   * Get or create user notification preferences
   */
  async getPreferences(userId) {
    const result = await pool.query(
      `SELECT * FROM notification_preferences WHERE user_id = $1`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(userId, notificationType, preferences) {
    const {
      inAppEnabled = true,
      emailEnabled = true,
      smsEnabled = false,
      pushEnabled = true,
      quietHoursStart,
      quietHoursEnd
    } = preferences;

    const result = await pool.query(
      `INSERT INTO notification_preferences (
        user_id, notification_type, in_app_enabled, email_enabled,
        sms_enabled, push_enabled, quiet_hours_start, quiet_hours_end
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id, notification_type)
      DO UPDATE SET
        in_app_enabled = EXCLUDED.in_app_enabled,
        email_enabled = EXCLUDED.email_enabled,
        sms_enabled = EXCLUDED.sms_enabled,
        push_enabled = EXCLUDED.push_enabled,
        quiet_hours_start = EXCLUDED.quiet_hours_start,
        quiet_hours_end = EXCLUDED.quiet_hours_end,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [userId, notificationType, inAppEnabled, emailEnabled, smsEnabled, pushEnabled, quietHoursStart, quietHoursEnd]
    );

    return result.rows[0];
  }

  /**
   * Trigger notification based on event
   */
  async triggerEventNotification(eventType, eventData) {
    // Get applicable rules
    const rules = await this.getNotificationRules({ eventType });

    if (rules.length === 0) {
      return [];
    }

    const notifications = [];

    for (const rule of rules) {
      try {
        // Determine target users based on rule
        const targetUsers = await this.getTargetUsersForRule(rule, eventData);

        // Create notifications for each target user
        for (const userId of targetUsers) {
          const notification = await this.createNotification({
            userId,
            locationId: eventData.locationId || rule.location_id,
            notificationType: eventType,
            title: this.generateNotificationTitle(eventType, eventData),
            message: this.generateNotificationMessage(eventType, eventData),
            priority: rule.priority,
            actionUrl: eventData.actionUrl,
            actionLabel: eventData.actionLabel,
            metadata: eventData,
            deliveryChannels: rule.delivery_channels
          });

          notifications.push(notification);
        }
      } catch (error) {
        console.error(`Failed to process rule ${rule.id}:`, error);
      }
    }

    return notifications;
  }

  /**
   * Get notification rules
   */
  async getNotificationRules(filters = {}) {
    const { eventType, locationId, isActive = true } = filters;

    let query = `SELECT * FROM notification_rules WHERE is_active = $1`;
    const params = [isActive];
    let paramCount = 1;

    if (eventType) {
      paramCount++;
      query += ` AND event_type = $${paramCount}`;
      params.push(eventType);
    }

    if (locationId) {
      paramCount++;
      query += ` AND (location_id = $${paramCount} OR location_id IS NULL)`;
      params.push(locationId);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get target users for a notification rule
   */
  async getTargetUsersForRule(rule, eventData) {
    let query = `SELECT DISTINCT u.id FROM users u`;
    const params = [];
    const conditions = [];

    // Filter by location
    if (rule.location_id) {
      query += ` JOIN user_locations ul ON u.id = ul.user_id`;
      conditions.push(`ul.location_id = $${params.length + 1}`);
      params.push(rule.location_id);
    }

    // Filter by role
    if (rule.role_filter) {
      query += ` JOIN user_roles ur ON u.id = ur.user_id
                 JOIN roles r ON ur.role_id = r.id`;
      conditions.push(`r.name = $${params.length + 1}`);
      params.push(rule.role_filter);
    }

    // Handle event-specific targeting
    if (eventData.targetUserId) {
      conditions.push(`u.id = $${params.length + 1}`);
      params.push(eventData.targetUserId);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    const result = await pool.query(query, params);
    return result.rows.map(row => row.id);
  }

  /**
   * Generate notification title based on event type
   */
  generateNotificationTitle(eventType, eventData) {
    const titles = {
      task_assigned: `New Task: ${eventData.taskTitle || 'Assigned to you'}`,
      task_due_soon: `Task Due Soon: ${eventData.taskTitle || ''}`,
      task_overdue: `Overdue Task: ${eventData.taskTitle || ''}`,
      temperature_alert: `Temperature Alert: ${eventData.equipmentName || 'Equipment'}`,
      inventory_low: `Low Inventory: ${eventData.itemName || 'Item'}`,
      schedule_change: 'Your schedule has been updated',
      shift_reminder: `Shift starting soon`,
      new_announcement: `New Announcement: ${eventData.announcementTitle || ''}`
    };

    return titles[eventType] || 'New Notification';
  }

  /**
   * Generate notification message based on event type
   */
  generateNotificationMessage(eventType, eventData) {
    const messages = {
      task_assigned: `You have been assigned a new task${eventData.locationName ? ` at ${eventData.locationName}` : ''}.`,
      task_due_soon: `Task is due ${eventData.dueDate || 'soon'}. Please complete it promptly.`,
      task_overdue: `This task is now overdue. Immediate attention required.`,
      temperature_alert: `Temperature reading of ${eventData.temperature}°F is ${eventData.alertType || 'out of range'}.`,
      inventory_low: `Current stock: ${eventData.currentQuantity || 0} ${eventData.unit || 'units'}. Reorder point: ${eventData.reorderPoint || 0}.`,
      schedule_change: `Your schedule for ${eventData.date || 'upcoming shifts'} has been modified.`,
      shift_reminder: `Your shift starts ${eventData.startsIn || 'soon'} at ${eventData.locationName || 'your location'}.`,
      new_announcement: eventData.announcementSummary || 'A new announcement has been posted.'
    };

    return messages[eventType] || 'You have a new notification.';
  }

  /**
   * Push real-time notification via WebSocket (to be integrated)
   */
  async pushRealTimeNotification(userId, notification) {
    console.log(`[WebSocket] Pushing notification to user ${userId}:`, notification.id);
    // Integration point for WebSocket service
  }

  /**
   * Send email notification (to be integrated)
   */
  async sendEmailNotification(userId, notification) {
    console.log(`[Email] Sending notification to user ${userId}:`, notification.title);
    // Integration point for email service
  }

  /**
   * Send SMS notification (to be integrated)
   */
  async sendSMSNotification(userId, notification) {
    console.log(`[SMS] Sending notification to user ${userId}:`, notification.title);
    // Integration point for SMS service
  }

  /**
   * Legacy method for backward compatibility
   */
  async sendTemperatureAlert(temperatureLog) {
    return this.triggerEventNotification('temperature_alert', {
      equipmentName: temperatureLog.equipmentName,
      temperature: temperatureLog.temperature,
      alertType: temperatureLog.alertType,
      locationId: temperatureLog.locationId,
      targetUserId: temperatureLog.userId
    });
  }

  /**
   * Legacy method for backward compatibility
   */
  async sendTaskOverdueAlert(task) {
    return this.triggerEventNotification('task_overdue', {
      taskTitle: task.title,
      dueDate: task.dueDate,
      locationId: task.locationId,
      targetUserId: task.assignedTo
    });
  }

  /**
   * Legacy method for backward compatibility
   */
  async sendInventoryLowStockAlert(item) {
    return this.triggerEventNotification('inventory_low', {
      itemName: item.name,
      currentQuantity: item.currentQuantity,
      reorderPoint: item.reorderPoint,
      unit: item.unit,
      locationId: item.locationId
    });
  }

  /**
   * Clean up old notifications
   */
  async cleanupOldNotifications(daysToKeep = 90) {
    const result = await pool.query(
      `DELETE FROM notifications
       WHERE delivered_at < CURRENT_TIMESTAMP - INTERVAL '${daysToKeep} days'
       RETURNING id`,
      []
    );

    return result.rowCount;
  }
}

module.exports = new NotificationService();
