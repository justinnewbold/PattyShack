/**
 * Realtime Service
 *
 * Manages WebSocket connections, real-time events, presence tracking,
 * and live updates across the platform.
 * Part of Phase 13: Real-time WebSocket Server
 */

const pool = require('../database/pool').getPool();

class RealtimeService {
  constructor() {
    this.io = null; // Socket.IO instance (set by server)
    this.connections = new Map(); // socketId -> connection data
  }

  /**
   * Initialize Socket.IO server
   */
  initialize(io) {
    this.io = io;
    console.log('[RealtimeService] WebSocket server initialized');

    // Setup Socket.IO event handlers
    this.setupSocketHandlers();

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Setup Socket.IO event handlers
   */
  setupSocketHandlers() {
    if (!this.io) return;

    this.io.on('connection', async (socket) => {
      console.log(`[WebSocket] New connection: ${socket.id}`);

      // Authentication
      const user = await this.authenticateSocket(socket);
      if (!user) {
        console.log(`[WebSocket] Unauthenticated connection rejected: ${socket.id}`);
        socket.disconnect(true);
        return;
      }

      // Register connection
      await this.registerConnection(socket, user);

      // Setup socket event listeners
      this.setupSocketEvents(socket, user);
    });
  }

  /**
   * Authenticate socket connection
   */
  async authenticateSocket(socket) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) return null;

      // TODO: Implement JWT verification
      // For now, accept user_id from handshake
      const userId = socket.handshake.auth.userId || socket.handshake.query.userId;
      if (!userId) return null;

      const result = await pool.query(
        `SELECT id, first_name, last_name, email, role FROM users WHERE id = $1`,
        [userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('[WebSocket] Auth error:', error);
      return null;
    }
  }

  /**
   * Register new WebSocket connection
   */
  async registerConnection(socket, user) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const deviceType = socket.handshake.query.deviceType || 'web';
      const locationId = socket.handshake.query.locationId || null;
      const ipAddress = socket.handshake.address;
      const deviceInfo = {
        userAgent: socket.handshake.headers['user-agent'],
        platform: socket.handshake.query.platform
      };

      // Insert connection record
      const connResult = await client.query(
        `INSERT INTO websocket_connections
         (socket_id, user_id, location_id, device_type, device_info, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [socket.id, user.id, locationId, deviceType, JSON.stringify(deviceInfo), ipAddress]
      );

      const connection = connResult.rows[0];

      // Update user presence
      await client.query(
        `INSERT INTO user_presence (user_id, status, current_location_id, last_seen_at)
         VALUES ($1, 'online', $2, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id)
         DO UPDATE SET status = 'online',
                       current_location_id = $2,
                       last_seen_at = CURRENT_TIMESTAMP`,
        [user.id, locationId]
      );

      await client.query('COMMIT');

      // Store in memory
      this.connections.set(socket.id, {
        id: connection.id,
        userId: user.id,
        user,
        locationId,
        subscriptions: new Set()
      });

      // Emit connection success
      socket.emit('connected', {
        connectionId: connection.id,
        user: {
          id: user.id,
          name: `${user.first_name} ${user.last_name}`,
          email: user.email
        }
      });

      // Broadcast user online status
      this.broadcastUserPresence(user.id, 'online');

      console.log(`[WebSocket] User ${user.id} connected: ${socket.id}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[WebSocket] Registration error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Setup socket event listeners
   */
  setupSocketEvents(socket, user) {
    // Ping/pong for connection health
    socket.on('ping', async () => {
      await this.updateLastPing(socket.id);
      socket.emit('pong');
    });

    // Subscribe to room
    socket.on('subscribe', async (data) => {
      await this.subscribeToRoom(socket, data.roomType, data.roomId);
    });

    // Unsubscribe from room
    socket.on('unsubscribe', async (data) => {
      await this.unsubscribeFromRoom(socket, data.roomType, data.roomId);
    });

    // Typing indicator
    socket.on('typing', async (data) => {
      await this.handleTyping(socket, user.id, data.channelId, true);
    });

    socket.on('stop_typing', async (data) => {
      await this.handleTyping(socket, user.id, data.channelId, false);
    });

    // Presence update
    socket.on('presence', async (data) => {
      await this.updatePresence(user.id, data.status, data.statusMessage);
    });

    // Acknowledge event
    socket.on('acknowledge', async (data) => {
      await this.acknowledgeEvent(data.eventId, user.id);
    });

    // Disconnect
    socket.on('disconnect', async (reason) => {
      console.log(`[WebSocket] User ${user.id} disconnected: ${reason}`);
      await this.handleDisconnect(socket, user);
    });
  }

  /**
   * Update last ping timestamp
   */
  async updateLastPing(socketId) {
    try {
      await pool.query(
        `UPDATE websocket_connections
         SET last_ping_at = CURRENT_TIMESTAMP
         WHERE socket_id = $1`,
        [socketId]
      );
    } catch (error) {
      console.error('[WebSocket] Ping update error:', error);
    }
  }

  /**
   * Subscribe to room
   */
  async subscribeToRoom(socket, roomType, roomId) {
    try {
      const conn = this.connections.get(socket.id);
      if (!conn) return;

      // Add to database
      await pool.query(
        `INSERT INTO websocket_subscriptions (connection_id, room_type, room_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (connection_id, room_type, room_id) DO NOTHING`,
        [conn.id, roomType, roomId]
      );

      // Join Socket.IO room
      const roomName = `${roomType}:${roomId}`;
      socket.join(roomName);
      conn.subscriptions.add(roomName);

      socket.emit('subscribed', { roomType, roomId });
      console.log(`[WebSocket] ${conn.userId} subscribed to ${roomName}`);
    } catch (error) {
      console.error('[WebSocket] Subscribe error:', error);
      socket.emit('error', { message: 'Failed to subscribe' });
    }
  }

  /**
   * Unsubscribe from room
   */
  async unsubscribeFromRoom(socket, roomType, roomId) {
    try {
      const conn = this.connections.get(socket.id);
      if (!conn) return;

      // Remove from database
      await pool.query(
        `DELETE FROM websocket_subscriptions
         WHERE connection_id = $1 AND room_type = $2 AND room_id = $3`,
        [conn.id, roomType, roomId]
      );

      // Leave Socket.IO room
      const roomName = `${roomType}:${roomId}`;
      socket.leave(roomName);
      conn.subscriptions.delete(roomName);

      socket.emit('unsubscribed', { roomType, roomId });
    } catch (error) {
      console.error('[WebSocket] Unsubscribe error:', error);
    }
  }

  /**
   * Handle typing indicator
   */
  async handleTyping(socket, userId, channelId, isTyping) {
    try {
      if (isTyping) {
        // Insert/update typing indicator
        await pool.query(
          `INSERT INTO typing_indicators (channel_id, user_id, expires_at)
           VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '10 seconds')
           ON CONFLICT (channel_id, user_id)
           DO UPDATE SET started_at = CURRENT_TIMESTAMP,
                         expires_at = CURRENT_TIMESTAMP + INTERVAL '10 seconds'`,
          [channelId, userId]
        );
      } else {
        // Remove typing indicator
        await pool.query(
          `DELETE FROM typing_indicators WHERE channel_id = $1 AND user_id = $2`,
          [channelId, userId]
        );
      }

      // Broadcast to channel room
      this.broadcastToRoom('channel', channelId, 'typing', {
        userId,
        channelId,
        isTyping
      }, socket.id);
    } catch (error) {
      console.error('[WebSocket] Typing indicator error:', error);
    }
  }

  /**
   * Update user presence
   */
  async updatePresence(userId, status, statusMessage = null) {
    try {
      await pool.query(
        `UPDATE user_presence
         SET status = $1, status_message = $2, last_seen_at = CURRENT_TIMESTAMP
         WHERE user_id = $3`,
        [status, statusMessage, userId]
      );

      this.broadcastUserPresence(userId, status, statusMessage);
    } catch (error) {
      console.error('[WebSocket] Presence update error:', error);
    }
  }

  /**
   * Broadcast user presence change
   */
  broadcastUserPresence(userId, status, statusMessage = null) {
    if (!this.io) return;

    this.io.emit('user_presence', {
      userId,
      status,
      statusMessage,
      timestamp: new Date()
    });
  }

  /**
   * Handle disconnect
   */
  async handleDisconnect(socket, user) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const conn = this.connections.get(socket.id);
      if (conn) {
        // Mark connection as disconnected
        await client.query(
          `UPDATE websocket_connections
           SET status = 'disconnected'
           WHERE socket_id = $1`,
          [socket.id]
        );

        // Check if user has other active connections
        const activeResult = await client.query(
          `SELECT COUNT(*) FROM websocket_connections
           WHERE user_id = $1 AND status = 'active' AND socket_id != $2`,
          [user.id, socket.id]
        );

        const hasOtherConnections = parseInt(activeResult.rows[0].count) > 0;

        if (!hasOtherConnections) {
          // Update presence to offline
          await client.query(
            `UPDATE user_presence
             SET status = 'offline', last_seen_at = CURRENT_TIMESTAMP
             WHERE user_id = $1`,
            [user.id]
          );

          // Broadcast offline status
          this.broadcastUserPresence(user.id, 'offline');
        }

        this.connections.delete(socket.id);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[WebSocket] Disconnect error:', error);
    } finally {
      client.release();
    }
  }

  /**
   * Broadcast to room
   */
  broadcastToRoom(roomType, roomId, eventType, payload, excludeSocketId = null) {
    if (!this.io) return;

    const roomName = `${roomType}:${roomId}`;
    const event = {
      type: eventType,
      roomType,
      roomId,
      payload,
      timestamp: new Date()
    };

    if (excludeSocketId) {
      this.io.to(roomName).except(excludeSocketId).emit('event', event);
    } else {
      this.io.to(roomName).emit('event', event);
    }
  }

  /**
   * Broadcast to user
   */
  async broadcastToUser(userId, eventType, payload) {
    if (!this.io) return;

    // Get all active sockets for user
    const result = await pool.query(
      `SELECT socket_id FROM websocket_connections
       WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    const event = {
      type: eventType,
      payload,
      timestamp: new Date()
    };

    result.rows.forEach(row => {
      this.io.to(row.socket_id).emit('event', event);
    });
  }

  /**
   * Broadcast to multiple users
   */
  async broadcastToUsers(userIds, eventType, payload) {
    for (const userId of userIds) {
      await this.broadcastToUser(userId, eventType, payload);
    }
  }

  /**
   * Create and broadcast realtime event
   */
  async createEvent(eventData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { eventType, eventCategory, payload, targetUsers, targetRoles,
              targetLocations, priority, expiresAt } = eventData;

      const result = await client.query(
        `INSERT INTO realtime_events
         (event_type, event_category, payload, target_users, target_roles,
          target_locations, priority, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [eventType, eventCategory, JSON.stringify(payload), targetUsers,
         targetRoles, targetLocations, priority || 'normal', expiresAt]
      );

      const event = result.rows[0];

      await client.query('COMMIT');

      // Broadcast to target users
      if (targetUsers && targetUsers.length > 0) {
        await this.broadcastToUsers(targetUsers, eventType, payload);
      }

      return event;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[WebSocket] Create event error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Acknowledge event
   */
  async acknowledgeEvent(eventId, userId) {
    try {
      await pool.query(
        `UPDATE realtime_events
         SET acknowledged_by = array_append(acknowledged_by, $1)
         WHERE id = $2 AND NOT ($1 = ANY(acknowledged_by))`,
        [userId, eventId]
      );
    } catch (error) {
      console.error('[WebSocket] Acknowledge error:', error);
    }
  }

  /**
   * Get online users
   */
  async getOnlineUsers(locationId = null) {
    try {
      let query = `SELECT * FROM online_users`;
      const params = [];

      if (locationId) {
        query += ` WHERE current_location_id = $1`;
        params.push(locationId);
      }

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('[WebSocket] Get online users error:', error);
      return [];
    }
  }

  /**
   * Get active connections
   */
  async getActiveConnections() {
    try {
      const result = await pool.query(`SELECT * FROM active_connections`);
      return result.rows;
    } catch (error) {
      console.error('[WebSocket] Get connections error:', error);
      return [];
    }
  }

  /**
   * Get room activity
   */
  async getRoomActivity(roomType = null) {
    try {
      let query = `SELECT * FROM room_activity`;
      const params = [];

      if (roomType) {
        query += ` WHERE room_type = $1`;
        params.push(roomType);
      }

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('[WebSocket] Get room activity error:', error);
      return [];
    }
  }

  /**
   * Cleanup stale connections
   */
  async cleanupStaleConnections() {
    try {
      const result = await pool.query(`SELECT cleanup_stale_connections()`);
      const cleaned = result.rows[0].cleanup_stale_connections;
      console.log(`[WebSocket] Cleaned up ${cleaned} stale connections`);
      return cleaned;
    } catch (error) {
      console.error('[WebSocket] Cleanup error:', error);
      return 0;
    }
  }

  /**
   * Start periodic cleanup
   */
  startCleanupInterval() {
    // Cleanup every 5 minutes
    setInterval(() => {
      this.cleanupStaleConnections();
    }, 5 * 60 * 1000);
  }
}

module.exports = new RealtimeService();
