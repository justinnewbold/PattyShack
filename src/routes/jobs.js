/**
 * Background Jobs API Routes
 *
 * Endpoints for job management, queue monitoring, and task scheduling.
 */

const express = require('express');
const router = express.Router();
const JobService = require('../services/JobService');

// Middleware to authenticate requests (placeholder)
const authenticate = (req, res, next) => {
  // TODO: Implement actual authentication
  req.user = { id: req.headers['x-user-id'] || 'system' };
  next();
};

// ============================================
// JOB MANAGEMENT
// ============================================

/**
 * POST /api/jobs
 * Enqueue a new job
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const jobId = await JobService.enqueueJob(req.body, req.user.id);
    res.status(201).json({ success: true, jobId });
  } catch (error) {
    console.error('[Jobs API] Error enqueueing job:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/jobs/:id
 * Get job status
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const job = await JobService.getJobStatus(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    res.json({ success: true, data: job });
  } catch (error) {
    console.error('[Jobs API] Error getting job:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/jobs/:id/logs
 * Get job logs
 */
router.get('/:id/logs', authenticate, async (req, res) => {
  try {
    const logs = await JobService.getJobLogs(req.params.id);
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('[Jobs API] Error getting logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/jobs/:id/cancel
 * Cancel a pending job
 */
router.post('/:id/cancel', authenticate, async (req, res) => {
  try {
    await JobService.cancelJob(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('[Jobs API] Error cancelling job:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/jobs/:id/retry
 * Retry a failed job
 */
router.post('/:id/retry', authenticate, async (req, res) => {
  try {
    await JobService.retryJob(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('[Jobs API] Error retrying job:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/jobs/:id/artifacts
 * Get job artifacts
 */
router.get('/:id/artifacts', authenticate, async (req, res) => {
  try {
    const artifacts = await JobService.getJobArtifacts(req.params.id);
    res.json({ success: true, data: artifacts });
  } catch (error) {
    console.error('[Jobs API] Error getting artifacts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// QUEUE MONITORING
// ============================================

/**
 * GET /api/jobs/stats/queues
 * Get queue statistics
 */
router.get('/stats/queues', authenticate, async (req, res) => {
  try {
    const stats = await JobService.getQueueStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('[Jobs API] Error getting queue stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/jobs/stats/performance
 * Get job performance metrics
 */
router.get('/stats/performance', authenticate, async (req, res) => {
  try {
    const performance = await JobService.getJobPerformance();
    res.json({ success: true, data: performance });
  } catch (error) {
    console.error('[Jobs API] Error getting performance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
