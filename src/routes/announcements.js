/**
 * Announcement Routes
 * Handles company-wide and location-specific announcements
 */

const express = require('express');
const router = express.Router();
const AnnouncementService = require('../services/AnnouncementService');
const { authenticate } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticate);

/**
 * POST /api/v1/announcements
 * Create new announcement
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      title,
      content,
      announcementType,
      priority,
      locationId,
      targetRoles,
      publishedAt,
      expiresAt,
      requiresAcknowledgment,
      attachments,
      isPinned
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    // TODO: Check if user has permission to create announcements

    const announcement = await AnnouncementService.createAnnouncement({
      title,
      content,
      announcementType,
      priority,
      locationId,
      targetRoles,
      publishedAt,
      expiresAt,
      requiresAcknowledgment,
      attachments,
      isPinned,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: announcement,
      message: 'Announcement created successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/announcements
 * Get announcements for user
 */
router.get('/', async (req, res, next) => {
  try {
    const { includeExpired, announcementType, locationId, limit, offset } = req.query;

    const announcements = await AnnouncementService.getAnnouncementsForUser(req.user.id, {
      includeExpired: includeExpired === 'true',
      announcementType,
      locationId,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    });

    res.json({
      success: true,
      data: announcements,
      count: announcements.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/announcements/all
 * Get all announcements (admin view)
 */
router.get('/all', async (req, res, next) => {
  try {
    // TODO: Check admin permission

    const { announcementType, locationId, includeExpired, limit, offset } = req.query;

    const announcements = await AnnouncementService.getAllAnnouncements({
      announcementType,
      locationId,
      includeExpired: includeExpired === 'true',
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    });

    res.json({
      success: true,
      data: announcements,
      count: announcements.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/announcements/pending
 * Get pending acknowledgments for user
 */
router.get('/pending', async (req, res, next) => {
  try {
    const pending = await AnnouncementService.getPendingAcknowledgments(req.user.id);

    res.json({
      success: true,
      data: pending,
      count: pending.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/announcements/stats
 * Get announcement statistics
 */
router.get('/stats', async (req, res, next) => {
  try {
    const { locationId } = req.query;

    const stats = await AnnouncementService.getAnnouncementStats(locationId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/announcements/:id
 * Get single announcement
 */
router.get('/:id', async (req, res, next) => {
  try {
    const announcement = await AnnouncementService.getAnnouncement(
      req.params.id,
      req.user.id
    );

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    res.json({
      success: true,
      data: announcement
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/announcements/:id
 * Update announcement
 */
router.put('/:id', async (req, res, next) => {
  try {
    const {
      title,
      content,
      announcementType,
      priority,
      expiresAt,
      isPinned,
      attachments
    } = req.body;

    const announcement = await AnnouncementService.updateAnnouncement(
      req.params.id,
      req.user.id,
      {
        title,
        content,
        announcementType,
        priority,
        expiresAt,
        isPinned,
        attachments
      }
    );

    res.json({
      success: true,
      data: announcement,
      message: 'Announcement updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/announcements/:id
 * Delete announcement
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await AnnouncementService.deleteAnnouncement(req.params.id, req.user.id);

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/announcements/:id/acknowledge
 * Acknowledge announcement
 */
router.post('/:id/acknowledge', async (req, res, next) => {
  try {
    const acknowledgment = await AnnouncementService.acknowledgeAnnouncement(
      req.params.id,
      req.user.id
    );

    res.json({
      success: true,
      data: acknowledgment,
      message: 'Announcement acknowledged'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/announcements/:id/acknowledgments
 * Get acknowledgment status for announcement
 */
router.get('/:id/acknowledgments', async (req, res, next) => {
  try {
    // TODO: Check admin permission

    const status = await AnnouncementService.getAcknowledgmentStatus(req.params.id);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/announcements/:id/schedule
 * Schedule announcement for future publishing
 */
router.put('/:id/schedule', async (req, res, next) => {
  try {
    const { publishedAt } = req.body;

    if (!publishedAt) {
      return res.status(400).json({
        success: false,
        message: 'Published date is required'
      });
    }

    const announcement = await AnnouncementService.scheduleAnnouncement(
      req.params.id,
      publishedAt
    );

    res.json({
      success: true,
      data: announcement,
      message: 'Announcement scheduled successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
