/**
 * Messaging Service
 * Handles team communication via channels and direct messages
 */

const pool = require('../database/pool').getPool();

class MessagingService {
  /**
   * Create a new channel
   */
  async createChannel(channelData) {
    const {
      name,
      description,
      channelType = 'public',
      locationId,
      createdBy,
      metadata = {}
    } = channelData;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create channel
      const channelResult = await client.query(
        `INSERT INTO channels (name, description, channel_type, location_id, created_by, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [name, description, channelType, locationId, createdBy, JSON.stringify(metadata)]
      );

      const channel = channelResult.rows[0];

      // Add creator as admin member
      await client.query(
        `INSERT INTO channel_members (channel_id, user_id, role)
         VALUES ($1, $2, 'admin')`,
        [channel.id, createdBy]
      );

      await client.query('COMMIT');
      return channel;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get channels accessible to user
   */
  async getChannels(userId, filters = {}) {
    const { channelType, locationId, includeArchived = false } = filters;

    let query = `
      SELECT DISTINCT
        c.*,
        cm.role as user_role,
        cm.is_muted,
        cm.last_read_at,
        (
          SELECT COUNT(*) FROM messages
          WHERE channel_id = c.id
            AND created_at > COALESCE(cm.last_read_at, '1970-01-01'::timestamp)
            AND user_id != $1
            AND is_deleted = false
        ) as unread_count
      FROM channels c
      LEFT JOIN channel_members cm ON c.id = cm.channel_id AND cm.user_id = $1
      WHERE (
        c.channel_type = 'public'
        OR cm.user_id = $1
        OR c.created_by = $1
      )
    `;
    const params = [userId];
    let paramCount = 1;

    if (!includeArchived) {
      query += ` AND c.is_archived = false`;
    }

    if (channelType) {
      paramCount++;
      query += ` AND c.channel_type = $${paramCount}`;
      params.push(channelType);
    }

    if (locationId) {
      paramCount++;
      query += ` AND (c.location_id = $${paramCount} OR c.location_id IS NULL)`;
      params.push(locationId);
    }

    query += ` ORDER BY c.created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get or create direct message channel between two users
   */
  async getOrCreateDirectChannel(userId1, userId2) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if direct channel already exists
      const existingResult = await client.query(
        `SELECT c.* FROM channels c
         JOIN channel_members cm1 ON c.id = cm1.channel_id AND cm1.user_id = $1
         JOIN channel_members cm2 ON c.id = cm2.channel_id AND cm2.user_id = $2
         WHERE c.channel_type = 'direct'
         LIMIT 1`,
        [userId1, userId2]
      );

      if (existingResult.rows.length > 0) {
        await client.query('COMMIT');
        return existingResult.rows[0];
      }

      // Create new direct channel
      const channelResult = await client.query(
        `INSERT INTO channels (name, channel_type, created_by)
         VALUES ('Direct Message', 'direct', $1)
         RETURNING *`,
        [userId1]
      );

      const channel = channelResult.rows[0];

      // Add both users as members
      await client.query(
        `INSERT INTO channel_members (channel_id, user_id, role)
         VALUES ($1, $2, 'member'), ($1, $3, 'member')`,
        [channel.id, userId1, userId2]
      );

      await client.query('COMMIT');
      return channel;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Add user to channel
   */
  async addMemberToChannel(channelId, userId, addedBy) {
    // Verify addedBy is admin
    const permissionCheck = await pool.query(
      `SELECT role FROM channel_members WHERE channel_id = $1 AND user_id = $2`,
      [channelId, addedBy]
    );

    if (permissionCheck.rows.length === 0 || permissionCheck.rows[0].role !== 'admin') {
      throw new Error('Only admins can add members');
    }

    const result = await pool.query(
      `INSERT INTO channel_members (channel_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (channel_id, user_id) DO NOTHING
       RETURNING *`,
      [channelId, userId]
    );

    return result.rows[0];
  }

  /**
   * Remove user from channel
   */
  async removeMemberFromChannel(channelId, userId, removedBy) {
    // Users can remove themselves, or admins can remove others
    const permissionCheck = await pool.query(
      `SELECT role FROM channel_members WHERE channel_id = $1 AND user_id = $2`,
      [channelId, removedBy]
    );

    if (userId !== removedBy) {
      if (permissionCheck.rows.length === 0 || permissionCheck.rows[0].role !== 'admin') {
        throw new Error('Only admins can remove other members');
      }
    }

    const result = await pool.query(
      `DELETE FROM channel_members
       WHERE channel_id = $1 AND user_id = $2
       RETURNING *`,
      [channelId, userId]
    );

    return result.rows[0];
  }

  /**
   * Send message in channel
   */
  async sendMessage(messageData) {
    const {
      channelId,
      userId,
      content,
      parentMessageId,
      messageType = 'text',
      attachments = [],
      mentions = []
    } = messageData;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify user is member of channel
      const memberCheck = await client.query(
        `SELECT 1 FROM channel_members WHERE channel_id = $1 AND user_id = $2`,
        [channelId, userId]
      );

      if (memberCheck.rows.length === 0) {
        throw new Error('User is not a member of this channel');
      }

      // Create message
      const result = await client.query(
        `INSERT INTO messages (
          channel_id, user_id, content, parent_message_id,
          message_type, attachments, mentions
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          channelId, userId, content, parentMessageId,
          messageType, JSON.stringify(attachments), mentions
        ]
      );

      const message = result.rows[0];

      // Update sender's last_read_at
      await client.query(
        `UPDATE channel_members
         SET last_read_at = CURRENT_TIMESTAMP
         WHERE channel_id = $1 AND user_id = $2`,
        [channelId, userId]
      );

      await client.query('COMMIT');

      // Trigger real-time push to channel members
      this.pushMessageToChannel(channelId, message, userId);

      // Send notifications for mentions
      if (mentions.length > 0) {
        this.notifyMentionedUsers(message, mentions);
      }

      return message;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get messages from channel
   */
  async getMessages(channelId, userId, options = {}) {
    const {
      limit = 50,
      offset = 0,
      beforeMessageId,
      afterMessageId,
      parentMessageId
    } = options;

    // Verify user is member
    const memberCheck = await pool.query(
      `SELECT 1 FROM channel_members WHERE channel_id = $1 AND user_id = $2`,
      [channelId, userId]
    );

    if (memberCheck.rows.length === 0) {
      throw new Error('User is not a member of this channel');
    }

    let query = `
      SELECT
        m.*,
        u.name as user_name,
        u.email as user_email,
        (
          SELECT COUNT(*) FROM message_reactions
          WHERE message_id = m.id
        ) as reaction_count,
        (
          SELECT json_agg(json_build_object(
            'emoji', emoji,
            'count', count,
            'users', users
          ))
          FROM (
            SELECT
              emoji,
              COUNT(*) as count,
              array_agg(user_id) as users
            FROM message_reactions
            WHERE message_id = m.id
            GROUP BY emoji
          ) reactions
        ) as reactions
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.channel_id = $1 AND m.is_deleted = false
    `;
    const params = [channelId];
    let paramCount = 1;

    if (parentMessageId !== undefined) {
      paramCount++;
      if (parentMessageId === null) {
        query += ` AND m.parent_message_id IS NULL`;
      } else {
        query += ` AND m.parent_message_id = $${paramCount}`;
        params.push(parentMessageId);
      }
    }

    if (beforeMessageId) {
      paramCount++;
      query += ` AND m.created_at < (SELECT created_at FROM messages WHERE id = $${paramCount})`;
      params.push(beforeMessageId);
    }

    if (afterMessageId) {
      paramCount++;
      query += ` AND m.created_at > (SELECT created_at FROM messages WHERE id = $${paramCount})`;
      params.push(afterMessageId);
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows.reverse(); // Return in chronological order
  }

  /**
   * Edit message
   */
  async editMessage(messageId, userId, newContent) {
    const result = await pool.query(
      `UPDATE messages
       SET content = $1, is_edited = true, edited_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3 AND is_deleted = false
       RETURNING *`,
      [newContent, messageId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Message not found or unauthorized');
    }

    const message = result.rows[0];

    // Push update to channel
    this.pushMessageUpdate(message.channel_id, message);

    return message;
  }

  /**
   * Delete message
   */
  async deleteMessage(messageId, userId) {
    const result = await pool.query(
      `UPDATE messages
       SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [messageId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Message not found or unauthorized');
    }

    const message = result.rows[0];

    // Push update to channel
    this.pushMessageUpdate(message.channel_id, message);

    return message;
  }

  /**
   * Add reaction to message
   */
  async addReaction(messageId, userId, emoji) {
    const result = await pool.query(
      `INSERT INTO message_reactions (message_id, user_id, emoji)
       VALUES ($1, $2, $3)
       ON CONFLICT (message_id, user_id, emoji) DO NOTHING
       RETURNING *`,
      [messageId, userId, emoji]
    );

    if (result.rows.length > 0) {
      // Get channel_id for real-time update
      const messageResult = await pool.query(
        `SELECT channel_id FROM messages WHERE id = $1`,
        [messageId]
      );

      this.pushReactionUpdate(messageResult.rows[0].channel_id, messageId, emoji, 'add');
    }

    return result.rows[0];
  }

  /**
   * Remove reaction from message
   */
  async removeReaction(messageId, userId, emoji) {
    const result = await pool.query(
      `DELETE FROM message_reactions
       WHERE message_id = $1 AND user_id = $2 AND emoji = $3
       RETURNING *`,
      [messageId, userId, emoji]
    );

    if (result.rows.length > 0) {
      // Get channel_id for real-time update
      const messageResult = await pool.query(
        `SELECT channel_id FROM messages WHERE id = $1`,
        [messageId]
      );

      this.pushReactionUpdate(messageResult.rows[0].channel_id, messageId, emoji, 'remove');
    }

    return result.rows[0];
  }

  /**
   * Mark channel as read for user
   */
  async markChannelAsRead(channelId, userId) {
    const result = await pool.query(
      `UPDATE channel_members
       SET last_read_at = CURRENT_TIMESTAMP
       WHERE channel_id = $1 AND user_id = $2
       RETURNING *`,
      [channelId, userId]
    );

    return result.rows[0];
  }

  /**
   * Mute/unmute channel
   */
  async toggleChannelMute(channelId, userId, isMuted) {
    const result = await pool.query(
      `UPDATE channel_members
       SET is_muted = $1
       WHERE channel_id = $2 AND user_id = $3
       RETURNING *`,
      [isMuted, channelId, userId]
    );

    return result.rows[0];
  }

  /**
   * Get channel members
   */
  async getChannelMembers(channelId) {
    const result = await pool.query(
      `SELECT
        cm.*,
        u.name,
        u.email,
        u.role as user_role
       FROM channel_members cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.channel_id = $1
       ORDER BY cm.joined_at DESC`,
      [channelId]
    );

    return result.rows;
  }

  /**
   * Search messages
   */
  async searchMessages(userId, searchQuery, filters = {}) {
    const { channelId, fromUserId, limit = 50 } = filters;

    let query = `
      SELECT
        m.*,
        u.name as user_name,
        c.name as channel_name
      FROM messages m
      JOIN users u ON m.user_id = u.id
      JOIN channels c ON m.channel_id = c.id
      JOIN channel_members cm ON c.id = cm.channel_id AND cm.user_id = $1
      WHERE m.is_deleted = false
        AND m.content ILIKE $2
    `;
    const params = [userId, `%${searchQuery}%`];
    let paramCount = 2;

    if (channelId) {
      paramCount++;
      query += ` AND m.channel_id = $${paramCount}`;
      params.push(channelId);
    }

    if (fromUserId) {
      paramCount++;
      query += ` AND m.user_id = $${paramCount}`;
      params.push(fromUserId);
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${paramCount + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get user mentions (unread)
   */
  async getUserMentions(userId) {
    const result = await pool.query(
      `SELECT * FROM user_mentions
       WHERE mentioned_user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Push message to channel members (WebSocket)
   */
  pushMessageToChannel(channelId, message, excludeUserId) {
    console.log(`[WebSocket] Pushing message to channel ${channelId}:`, message.id);
    // Integration point for WebSocket service
    // WebSocketService.emitToChannel(channelId, 'message', message, excludeUserId);
  }

  /**
   * Push message update to channel
   */
  pushMessageUpdate(channelId, message) {
    console.log(`[WebSocket] Pushing message update to channel ${channelId}:`, message.id);
    // Integration point for WebSocket service
  }

  /**
   * Push reaction update to channel
   */
  pushReactionUpdate(channelId, messageId, emoji, action) {
    console.log(`[WebSocket] Pushing reaction ${action} to channel ${channelId}:`, messageId, emoji);
    // Integration point for WebSocket service
  }

  /**
   * Notify mentioned users
   */
  async notifyMentionedUsers(message, mentions) {
    console.log(`[Notifications] Notifying ${mentions.length} mentioned users`);
    // This would integrate with NotificationService
    // for (const userId of mentions) {
    //   await NotificationService.createNotification({
    //     userId,
    //     notificationType: 'mention',
    //     title: 'You were mentioned',
    //     message: `${message.user_name} mentioned you in ${message.channel_name}`,
    //     actionUrl: `/channels/${message.channel_id}`,
    //     metadata: { messageId: message.id }
    //   });
    // }
  }

  /**
   * Archive channel
   */
  async archiveChannel(channelId, userId) {
    // Verify user is admin
    const permissionCheck = await pool.query(
      `SELECT role FROM channel_members WHERE channel_id = $1 AND user_id = $2`,
      [channelId, userId]
    );

    if (permissionCheck.rows.length === 0 || permissionCheck.rows[0].role !== 'admin') {
      throw new Error('Only admins can archive channels');
    }

    const result = await pool.query(
      `UPDATE channels
       SET is_archived = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [channelId]
    );

    return result.rows[0];
  }
}

module.exports = new MessagingService();
