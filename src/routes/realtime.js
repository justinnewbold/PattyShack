/**
 * Realtime API Routes
 *
 * Endpoints for WebSocket connections, presence, and real-time events.
 */

const express = require('express');
const router = express.Router();
const RealtimeService = require('../services/RealtimeService');

// Middleware to authenticate requests (placeholder)
const authenticate = (req, res, next) => {
  // TODO: Implement actual authentication
  req.user = { id: req.headers['x-user-id'] || 'system' };
  next();
};

// ============================================
// PRESENCE
// ============================================

/**
 * GET /api/realtime/online-users
 * Get list of online users
 */
router.get('/online-users', authenticate, async (req, res) => {
  try {
    const { location_id } = req.query;
    const users = await RealtimeService.getOnlineUsers(location_id);
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('[Realtime API] Error getting online users:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/realtime/presence
 * Update current user's presence
 */
router.put('/presence', authenticate, async (req, res) => {
  try {
    const { status, status_message } = req.body;
    await RealtimeService.updatePresence(req.user.id, status, status_message);
    res.json({ success: true });
  } catch (error) {
    console.error('[Realtime API] Error updating presence:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// CONNECTIONS
// ============================================

/**
 * GET /api/realtime/connections
 * Get all active connections (admin only)
 */
router.get('/connections', authenticate, async (req, res) => {
  try {
    const connections = await RealtimeService.getActiveConnections();
    res.json({ success: true, data: connections });
  } catch (error) {
    console.error('[Realtime API] Error getting connections:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ROOM ACTIVITY
// ============================================

/**
 * GET /api/realtime/room-activity
 * Get activity stats for rooms
 */
router.get('/room-activity', authenticate, async (req, res) => {
  try {
    const { room_type } = req.query;
    const activity = await RealtimeService.getRoomActivity(room_type);
    res.json({ success: true, data: activity });
  } catch (error) {
    console.error('[Realtime API] Error getting room activity:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// EVENTS
// ============================================

/**
 * POST /api/realtime/broadcast
 * Broadcast event to users/rooms
 */
router.post('/broadcast', authenticate, async (req, res) => {
  try {
    const event = await RealtimeService.createEvent(req.body);
    res.status(201).json({ success: true, data: event });
  } catch (error) {
    console.error('[Realtime API] Error broadcasting event:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/realtime/broadcast/room
 * Broadcast to specific room
 */
router.post('/broadcast/room', authenticate, async (req, res) => {
  try {
    const { room_type, room_id, event_type, payload } = req.body;
    RealtimeService.broadcastToRoom(room_type, room_id, event_type, payload);
    res.json({ success: true });
  } catch (error) {
    console.error('[Realtime API] Error broadcasting to room:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/realtime/broadcast/user
 * Broadcast to specific user
 */
router.post('/broadcast/user', authenticate, async (req, res) => {
  try {
    const { user_id, event_type, payload } = req.body;
    await RealtimeService.broadcastToUser(user_id, event_type, payload);
    res.json({ success: true });
  } catch (error) {
    console.error('[Realtime API] Error broadcasting to user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ADMIN
// ============================================

/**
 * POST /api/realtime/cleanup
 * Manually trigger cleanup of stale connections
 */
router.post('/cleanup', authenticate, async (req, res) => {
  try {
    const cleaned = await RealtimeService.cleanupStaleConnections();
    res.json({ success: true, cleaned });
  } catch (error) {
    console.error('[Realtime API] Error cleaning up:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
