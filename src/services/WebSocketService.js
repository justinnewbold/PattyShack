/**
 * WebSocket Service (Integration Guide)
 *
 * This service provides real-time communication capabilities for:
 * - Push notifications
 * - Live messaging
 * - Channel updates
 * - Presence tracking
 *
 * IMPLEMENTATION NOTES:
 * =====================
 *
 * This is a stub/documentation file. To fully implement WebSocket support:
 *
 * 1. Install dependencies:
 *    npm install socket.io
 *
 * 2. Update src/server/index.js to initialize Socket.IO:
 *
 *    const http = require('http');
 *    const socketIo = require('socket.io');
 *    const WebSocketService = require('./services/WebSocketService');
 *
 *    const server = http.createServer(app);
 *    const io = socketIo(server, {
 *      cors: { origin: config.cors.origin }
 *    });
 *
 *    WebSocketService.initialize(io);
 *
 *    server.listen(port);
 *
 * 3. Client-side integration:
 *
 *    import io from 'socket.io-client';
 *
 *    const socket = io('http://localhost:3000', {
 *      auth: { token: authToken }
 *    });
 *
 *    socket.on('notification', (notification) => {
 *      // Handle notification
 *    });
 *
 *    socket.on('message', (message) => {
 *      // Handle message
 *    });
 *
 * 4. For Vercel deployment, consider:
 *    - Using a separate WebSocket server (Railway, Fly.io)
 *    - Using Pusher, Ably, or similar managed service
 *    - Implementing long-polling fallback
 */

const pool = require('../database/pool').getPool();

class WebSocketService {
  constructor() {
    this.io = null;
    this.connections = new Map(); // userId -> socket
  }

  /**
   * Initialize WebSocket server
   */
  initialize(io) {
    this.io = io;

    // Authentication middleware
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;

        if (!token) {
          return next(new Error('Authentication required'));
        }

        // Verify JWT token (implement actual verification)
        // const decoded = jwt.verify(token, config.jwtSecret);
        // socket.userId = decoded.id;

        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });

    // Connection handler
    io.on('connection', (socket) => {
      console.log(`[WebSocket] User connected: ${socket.userId}`);

      this.handleConnection(socket);
    });

    console.log('[WebSocket] Service initialized');
  }

  /**
   * Handle new connection
   */
  handleConnection(socket) {
    const userId = socket.userId;

    // Store connection
    this.connections.set(userId, socket);

    // Track session in database
    this.trackSession(userId, socket.id, {
      userAgent: socket.handshake.headers['user-agent'],
      ip: socket.handshake.address
    });

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Subscribe to user's channels
    this.subscribeToUserChannels(socket, userId);

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`[WebSocket] User disconnected: ${userId}`);
      this.connections.delete(userId);
      this.endSession(userId, socket.id);
    });

    // Handle channel join
    socket.on('join_channel', (channelId) => {
      socket.join(`channel:${channelId}`);
      console.log(`[WebSocket] User ${userId} joined channel ${channelId}`);
    });

    // Handle channel leave
    socket.on('leave_channel', (channelId) => {
      socket.leave(`channel:${channelId}`);
      console.log(`[WebSocket] User ${userId} left channel ${channelId}`);
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      socket.to(`channel:${data.channelId}`).emit('user_typing', {
        userId,
        channelId: data.channelId
      });
    });

    // Handle ping for presence
    socket.on('ping', () => {
      this.updateSessionPing(userId, socket.id);
      socket.emit('pong');
    });
  }

  /**
   * Subscribe user to their channels
   */
  async subscribeToUserChannels(socket, userId) {
    try {
      const result = await pool.query(
        `SELECT channel_id FROM channel_members WHERE user_id = $1`,
        [userId]
      );

      result.rows.forEach(row => {
        socket.join(`channel:${row.channel_id}`);
      });

      console.log(`[WebSocket] User ${userId} subscribed to ${result.rows.length} channels`);
    } catch (error) {
      console.error('[WebSocket] Error subscribing to channels:', error);
    }
  }

  /**
   * Emit notification to user
   */
  emitToUser(userId, event, data) {
    if (!this.io) {
      console.log(`[WebSocket] Not initialized - would emit to user ${userId}:`, event);
      return;
    }

    this.io.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Emit message to channel
   */
  emitToChannel(channelId, event, data, excludeUserId = null) {
    if (!this.io) {
      console.log(`[WebSocket] Not initialized - would emit to channel ${channelId}:`, event);
      return;
    }

    if (excludeUserId) {
      const socket = this.connections.get(excludeUserId);
      if (socket) {
        socket.to(`channel:${channelId}`).emit(event, data);
      }
    } else {
      this.io.to(`channel:${channelId}`).emit(event, data);
    }
  }

  /**
   * Broadcast to all connected users
   */
  broadcast(event, data) {
    if (!this.io) {
      console.log(`[WebSocket] Not initialized - would broadcast:`, event);
      return;
    }

    this.io.emit(event, data);
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId) {
    return this.connections.has(userId);
  }

  /**
   * Get online users
   */
  getOnlineUsers() {
    return Array.from(this.connections.keys());
  }

  /**
   * Track WebSocket session in database
   */
  async trackSession(userId, sessionToken, deviceInfo) {
    try {
      await pool.query(
        `INSERT INTO websocket_sessions (user_id, session_token, device_info)
         VALUES ($1, $2, $3)`,
        [userId, sessionToken, JSON.stringify(deviceInfo)]
      );
    } catch (error) {
      console.error('[WebSocket] Error tracking session:', error);
    }
  }

  /**
   * Update session ping timestamp
   */
  async updateSessionPing(userId, sessionToken) {
    try {
      await pool.query(
        `UPDATE websocket_sessions
         SET last_ping_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND session_token = $2`,
        [userId, sessionToken]
      );
    } catch (error) {
      console.error('[WebSocket] Error updating ping:', error);
    }
  }

  /**
   * End WebSocket session
   */
  async endSession(userId, sessionToken) {
    try {
      await pool.query(
        `UPDATE websocket_sessions
         SET disconnected_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND session_token = $2`,
        [userId, sessionToken]
      );
    } catch (error) {
      console.error('[WebSocket] Error ending session:', error);
    }
  }

  /**
   * Clean up stale sessions
   */
  async cleanupStaleSessions() {
    try {
      const result = await pool.query(
        `UPDATE websocket_sessions
         SET disconnected_at = CURRENT_TIMESTAMP
         WHERE disconnected_at IS NULL
           AND last_ping_at < CURRENT_TIMESTAMP - INTERVAL '5 minutes'
         RETURNING id`
      );

      console.log(`[WebSocket] Cleaned up ${result.rowCount} stale sessions`);
      return result.rowCount;
    } catch (error) {
      console.error('[WebSocket] Error cleaning up sessions:', error);
      return 0;
    }
  }
}

// Export singleton instance
module.exports = new WebSocketService();

/**
 * USAGE EXAMPLES:
 * ===============
 *
 * // Send notification to user
 * WebSocketService.emitToUser(userId, 'notification', {
 *   id: notification.id,
 *   title: notification.title,
 *   message: notification.message
 * });
 *
 * // Send message to channel (except sender)
 * WebSocketService.emitToChannel(channelId, 'message', message, senderId);
 *
 * // Broadcast system announcement
 * WebSocketService.broadcast('announcement', {
 *   title: 'System Maintenance',
 *   message: 'Scheduled for tonight at 2 AM'
 * });
 *
 * // Check if user is online
 * if (WebSocketService.isUserOnline(userId)) {
 *   // User is online
 * }
 */
