/**
 * Messaging Routes
 * Handles team communication channels and messages
 */

const express = require('express');
const router = express.Router();
const MessagingService = require('../services/MessagingService');
const { authenticate } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticate);

/**
 * POST /api/v1/messaging/channels
 * Create a new channel
 */
router.post('/channels', async (req, res, next) => {
  try {
    const { name, description, channelType, locationId, metadata } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Channel name is required'
      });
    }

    const channel = await MessagingService.createChannel({
      name,
      description,
      channelType,
      locationId,
      createdBy: req.user.id,
      metadata
    });

    res.status(201).json({
      success: true,
      data: channel,
      message: 'Channel created successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/messaging/channels
 * Get channels accessible to user
 */
router.get('/channels', async (req, res, next) => {
  try {
    const { channelType, locationId, includeArchived } = req.query;

    const channels = await MessagingService.getChannels(req.user.id, {
      channelType,
      locationId,
      includeArchived: includeArchived === 'true'
    });

    res.json({
      success: true,
      data: channels,
      count: channels.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/messaging/channels/:id
 * Get channel details
 */
router.get('/channels/:id', async (req, res, next) => {
  try {
    const channels = await MessagingService.getChannels(req.user.id);
    const channel = channels.find(c => c.id === req.params.id);

    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found or access denied'
      });
    }

    res.json({
      success: true,
      data: channel
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/messaging/channels/:id/members
 * Add member to channel
 */
router.post('/channels/:id/members', async (req, res, next) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const member = await MessagingService.addMemberToChannel(
      req.params.id,
      userId,
      req.user.id
    );

    res.json({
      success: true,
      data: member,
      message: 'Member added to channel'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/messaging/channels/:id/members/:userId
 * Remove member from channel
 */
router.delete('/channels/:id/members/:userId', async (req, res, next) => {
  try {
    await MessagingService.removeMemberFromChannel(
      req.params.id,
      req.params.userId,
      req.user.id
    );

    res.json({
      success: true,
      message: 'Member removed from channel'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/messaging/channels/:id/members
 * Get channel members
 */
router.get('/channels/:id/members', async (req, res, next) => {
  try {
    const members = await MessagingService.getChannelMembers(req.params.id);

    res.json({
      success: true,
      data: members
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/messaging/channels/:id/archive
 * Archive channel
 */
router.put('/channels/:id/archive', async (req, res, next) => {
  try {
    const channel = await MessagingService.archiveChannel(req.params.id, req.user.id);

    res.json({
      success: true,
      data: channel,
      message: 'Channel archived successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/messaging/channels/:id/mute
 * Mute/unmute channel
 */
router.put('/channels/:id/mute', async (req, res, next) => {
  try {
    const { isMuted } = req.body;

    const result = await MessagingService.toggleChannelMute(
      req.params.id,
      req.user.id,
      isMuted
    );

    res.json({
      success: true,
      data: result,
      message: isMuted ? 'Channel muted' : 'Channel unmuted'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/messaging/direct
 * Get or create direct message channel
 */
router.post('/direct', async (req, res, next) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create direct message with yourself'
      });
    }

    const channel = await MessagingService.getOrCreateDirectChannel(req.user.id, userId);

    res.json({
      success: true,
      data: channel
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/messaging/channels/:channelId/messages
 * Send message in channel
 */
router.post('/channels/:channelId/messages', async (req, res, next) => {
  try {
    const { content, parentMessageId, messageType, attachments, mentions } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    const message = await MessagingService.sendMessage({
      channelId: req.params.channelId,
      userId: req.user.id,
      content,
      parentMessageId,
      messageType,
      attachments,
      mentions
    });

    res.status(201).json({
      success: true,
      data: message,
      message: 'Message sent successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/messaging/channels/:channelId/messages
 * Get messages from channel
 */
router.get('/channels/:channelId/messages', async (req, res, next) => {
  try {
    const { limit, offset, beforeMessageId, afterMessageId, parentMessageId } = req.query;

    const messages = await MessagingService.getMessages(
      req.params.channelId,
      req.user.id,
      {
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0,
        beforeMessageId,
        afterMessageId,
        parentMessageId
      }
    );

    res.json({
      success: true,
      data: messages,
      count: messages.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/messaging/messages/:messageId
 * Edit message
 */
router.put('/messages/:messageId', async (req, res, next) => {
  try {
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    const message = await MessagingService.editMessage(
      req.params.messageId,
      req.user.id,
      content
    );

    res.json({
      success: true,
      data: message,
      message: 'Message updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/messaging/messages/:messageId
 * Delete message
 */
router.delete('/messages/:messageId', async (req, res, next) => {
  try {
    await MessagingService.deleteMessage(req.params.messageId, req.user.id);

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/messaging/messages/:messageId/reactions
 * Add reaction to message
 */
router.post('/messages/:messageId/reactions', async (req, res, next) => {
  try {
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({
        success: false,
        message: 'Emoji is required'
      });
    }

    const reaction = await MessagingService.addReaction(
      req.params.messageId,
      req.user.id,
      emoji
    );

    res.json({
      success: true,
      data: reaction,
      message: 'Reaction added'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/messaging/messages/:messageId/reactions/:emoji
 * Remove reaction from message
 */
router.delete('/messages/:messageId/reactions/:emoji', async (req, res, next) => {
  try {
    await MessagingService.removeReaction(
      req.params.messageId,
      req.user.id,
      req.params.emoji
    );

    res.json({
      success: true,
      message: 'Reaction removed'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/messaging/channels/:channelId/read
 * Mark channel as read
 */
router.put('/channels/:channelId/read', async (req, res, next) => {
  try {
    await MessagingService.markChannelAsRead(req.params.channelId, req.user.id);

    res.json({
      success: true,
      message: 'Channel marked as read'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/messaging/search
 * Search messages
 */
router.get('/search', async (req, res, next) => {
  try {
    const { query, channelId, fromUserId, limit } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const messages = await MessagingService.searchMessages(req.user.id, query, {
      channelId,
      fromUserId,
      limit: limit ? parseInt(limit) : 50
    });

    res.json({
      success: true,
      data: messages,
      count: messages.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/messaging/mentions
 * Get user's mentions
 */
router.get('/mentions', async (req, res, next) => {
  try {
    const mentions = await MessagingService.getUserMentions(req.user.id);

    res.json({
      success: true,
      data: mentions
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
