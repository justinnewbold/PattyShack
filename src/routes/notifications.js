/**
 * Notification Routes
 * Handles notification management and user preferences
 */

const express = require('express');
const router = express.Router();
const NotificationService = require('../services/NotificationService');
const { authenticate } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticate);

/**
 * GET /api/v1/notifications
 * Get user's notifications
 */
router.get('/', async (req, res, next) => {
  try {
    const { unreadOnly, priority, type, limit, offset } = req.query;

    const notifications = await NotificationService.getUserNotifications(req.user.id, {
      unreadOnly: unreadOnly === 'true',
      priority,
      notificationType: type,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    });

    res.json({
      success: true,
      data: notifications,
      count: notifications.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/notifications/unread-count
 * Get unread notification count
 */
router.get('/unread-count', async (req, res, next) => {
  try {
    const counts = await NotificationService.getUnreadCount(req.user.id);

    res.json({
      success: true,
      data: counts
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/notifications/:id/read
 * Mark notification as read
 */
router.put('/:id/read', async (req, res, next) => {
  try {
    const read = await NotificationService.markAsRead(req.params.id, req.user.id);

    res.json({
      success: true,
      data: read,
      message: 'Notification marked as read'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/notifications/mark-all-read
 * Mark all notifications as read
 */
router.put('/mark-all-read', async (req, res, next) => {
  try {
    const count = await NotificationService.markAllAsRead(req.user.id);

    res.json({
      success: true,
      data: { count },
      message: `${count} notifications marked as read`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/notifications/:id/dismiss
 * Dismiss notification
 */
router.put('/:id/dismiss', async (req, res, next) => {
  try {
    const dismissed = await NotificationService.dismissNotification(req.params.id, req.user.id);

    res.json({
      success: true,
      data: dismissed,
      message: 'Notification dismissed'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/notifications/preferences
 * Get user's notification preferences
 */
router.get('/preferences', async (req, res, next) => {
  try {
    const preferences = await NotificationService.getPreferences(req.user.id);

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/notifications/preferences/:type
 * Update notification preferences for type
 */
router.put('/preferences/:type', async (req, res, next) => {
  try {
    const {
      inAppEnabled,
      emailEnabled,
      smsEnabled,
      pushEnabled,
      quietHoursStart,
      quietHoursEnd
    } = req.body;

    const preferences = await NotificationService.updatePreferences(
      req.user.id,
      req.params.type,
      {
        inAppEnabled,
        emailEnabled,
        smsEnabled,
        pushEnabled,
        quietHoursStart,
        quietHoursEnd
      }
    );

    res.json({
      success: true,
      data: preferences,
      message: 'Preferences updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/notifications/rules
 * Get notification rules (admin only)
 */
router.get('/rules', async (req, res, next) => {
  try {
    // TODO: Check admin permission
    const { eventType, locationId } = req.query;

    const rules = await NotificationService.getNotificationRules({
      eventType,
      locationId
    });

    res.json({
      success: true,
      data: rules
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/notifications/test
 * Send a test notification (for testing)
 */
router.post('/test', async (req, res, next) => {
  try {
    const {
      title = 'Test Notification',
      message = 'This is a test notification',
      priority = 'medium',
      notificationType = 'test'
    } = req.body;

    const notification = await NotificationService.createNotification({
      userId: req.user.id,
      notificationType,
      title,
      message,
      priority,
      deliveryChannels: ['in_app', 'push']
    });

    res.json({
      success: true,
      data: notification,
      message: 'Test notification sent'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
