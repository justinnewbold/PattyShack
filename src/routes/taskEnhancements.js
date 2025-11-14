/**
 * Task Enhancements Routes
 * Escalation, Photo Annotations, and Analytics endpoints
 */

const express = require('express');
const TaskEscalationService = require('../services/TaskEscalationService');
const TaskService = require('../services/TaskService');
const { getPool } = require('../database/pool');

const router = express.Router();

// ===== ESCALATION ENDPOINTS =====

/**
 * @swagger
 * /tasks/escalations/process:
 *   post:
 *     summary: Process pending escalations
 *     description: Run escalation rules and escalate tasks
 *     tags: [Task Escalation]
 *     responses:
 *       200:
 *         description: Escalations processed
 */
router.post('/escalations/process', async (req, res, next) => {
  try {
    const escalations = await TaskEscalationService.processEscalations();

    res.json({
      success: true,
      data: {
        escalations,
        count: escalations.length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /tasks/{id}/escalations:
 *   get:
 *     summary: Get task escalation history
 *     tags: [Task Escalation]
 */
router.get('/:id/escalations', async (req, res, next) => {
  try {
    const { id } = req.params;
    const history = await TaskEscalationService.getEscalationHistory(id);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /tasks/escalations/pending:
 *   get:
 *     summary: Get tasks needing escalation
 *     tags: [Task Escalation]
 */
router.get('/escalations/pending', async (req, res, next) => {
  try {
    const { locationId } = req.query;
    const tasks = await TaskEscalationService.getTasksNeedingEscalation(locationId);

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    next(error);
  }
});

// ===== PHOTO ANNOTATION ENDPOINTS =====

/**
 * @swagger
 * /tasks/{id}/annotations:
 *   post:
 *     summary: Add photo annotation
 *     tags: [Task Photos]
 */
router.post('/:id/annotations', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { photoUrl, annotations, annotatedBy } = req.body;

    if (!photoUrl || !annotations) {
      return res.status(400).json({
        success: false,
        error: 'photoUrl and annotations are required'
      });
    }

    const pool = getPool();
    const annotationId = `ann-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const result = await pool.query(`
      INSERT INTO task_photo_annotations (id, task_id, photo_url, annotations, annotated_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [annotationId, id, photoUrl, JSON.stringify(annotations), annotatedBy]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /tasks/{id}/annotations:
 *   get:
 *     summary: Get photo annotations for task
 *     tags: [Task Photos]
 */
router.get('/:id/annotations', async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const result = await pool.query(`
      SELECT * FROM task_photo_annotations
      WHERE task_id = $1
      ORDER BY annotated_at DESC
    `, [id]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// ===== ANALYTICS ENDPOINTS =====

/**
 * @swagger
 * /tasks/analytics/overview:
 *   get:
 *     summary: Get comprehensive task analytics
 *     tags: [Task Analytics]
 */
router.get('/analytics/overview', async (req, res, next) => {
  try {
    const { locationId, startDate, endDate } = req.query;
    const pool = getPool();

    // Build date filter
    let dateFilter = '';
    const params = [];
    let paramIndex = 1;

    if (locationId) {
      dateFilter += ` AND location_id = $${paramIndex++}`;
      params.push(locationId);
    }
    if (startDate) {
      dateFilter += ` AND created_at >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      dateFilter += ` AND created_at <= $${paramIndex++}`;
      params.push(endDate);
    }

    // Get comprehensive stats
    const statsResult = await pool.query(`
      SELECT
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tasks,
        COUNT(*) FILTER (WHERE status = 'overdue') as overdue_tasks,
        COUNT(*) FILTER (WHERE priority = 'critical') as critical_tasks,
        COUNT(*) FILTER (WHERE priority = 'high') as high_priority_tasks,
        AVG(CASE WHEN status = 'completed' THEN EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600 END) as avg_completion_hours,
        AVG(escalation_level) as avg_escalation_level,
        COUNT(DISTINCT location_id) as locations_count,
        COUNT(DISTINCT assigned_to) as assignees_count
      FROM tasks
      WHERE 1=1 ${dateFilter}
    `, params);

    // Get by type
    const byTypeResult = await pool.query(`
      SELECT type, COUNT(*) as count
      FROM tasks
      WHERE 1=1 ${dateFilter}
      GROUP BY type
      ORDER BY count DESC
    `, params);

    // Get by category
    const byCategoryResult = await pool.query(`
      SELECT category, COUNT(*) as count
      FROM tasks
      WHERE category IS NOT NULL ${dateFilter}
      GROUP BY category
      ORDER BY count DESC
    `, params);

    // Get completion rate by priority
    const completionByPriorityResult = await pool.query(`
      SELECT
        priority,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed') / NULLIF(COUNT(*), 0), 2) as completion_rate
      FROM tasks
      WHERE 1=1 ${dateFilter}
      GROUP BY priority
      ORDER BY priority DESC
    `, params);

    // Get template usage
    const templateUsageResult = await pool.query(`
      SELECT
        t.template_id,
        tt.name as template_name,
        COUNT(*) as usage_count
      FROM tasks t
      LEFT JOIN task_templates tt ON t.template_id = tt.id
      WHERE t.template_id IS NOT NULL ${dateFilter}
      GROUP BY t.template_id, tt.name
      ORDER BY usage_count DESC
      LIMIT 10
    `, params);

    res.json({
      success: true,
      data: {
        overview: statsResult.rows[0],
        byType: byTypeResult.rows,
        byCategory: byCategoryResult.rows,
        completionByPriority: completionByPriorityResult.rows,
        topTemplates: templateUsageResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /tasks/analytics/trends:
 *   get:
 *     summary: Get task trends over time
 *     tags: [Task Analytics]
 */
router.get('/analytics/trends', async (req, res, next) => {
  try {
    const { locationId, days = 30 } = req.query;
    const pool = getPool();

    let locationFilter = '';
    const params = [days];

    if (locationId) {
      locationFilter = 'AND location_id = $2';
      params.push(locationId);
    }

    const result = await pool.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as tasks_created,
        COUNT(*) FILTER (WHERE status = 'completed') as tasks_completed,
        AVG(CASE WHEN status = 'completed' THEN EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600 END) as avg_completion_hours
      FROM tasks
      WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * $1
        ${locationFilter}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /tasks/analytics/performance:
 *   get:
 *     summary: Get user/location performance metrics
 *     tags: [Task Analytics]
 */
router.get('/analytics/performance', async (req, res, next) => {
  try {
    const { locationId, groupBy = 'user' } = req.query;
    const pool = getPool();

    let query;
    const params = [];

    if (groupBy === 'location') {
      query = `
        SELECT
          l.id,
          l.name,
          COUNT(t.*) as total_tasks,
          COUNT(*) FILTER (WHERE t.status = 'completed') as completed_tasks,
          ROUND(100.0 * COUNT(*) FILTER (WHERE t.status = 'completed') / NULLIF(COUNT(*), 0), 2) as completion_rate,
          AVG(CASE WHEN t.status = 'completed' THEN EXTRACT(EPOCH FROM (t.completed_at - t.created_at)) / 3600 END) as avg_completion_hours
        FROM locations l
        LEFT JOIN tasks t ON l.id = t.location_id
        GROUP BY l.id, l.name
        ORDER BY completion_rate DESC NULLS LAST
        LIMIT 20
      `;
    } else {
      query = `
        SELECT
          u.id,
          u.username,
          u.first_name,
          u.last_name,
          COUNT(t.*) as total_tasks,
          COUNT(*) FILTER (WHERE t.status = 'completed') as completed_tasks,
          ROUND(100.0 * COUNT(*) FILTER (WHERE t.status = 'completed') / NULLIF(COUNT(*), 0), 2) as completion_rate,
          AVG(CASE WHEN t.status = 'completed' THEN EXTRACT(EPOCH FROM (t.completed_at - t.created_at)) / 3600 END) as avg_completion_hours
        FROM users u
        LEFT JOIN tasks t ON u.id = t.assigned_to
        WHERE 1=1
      `;

      if (locationId) {
        query += ' AND t.location_id = $1';
        params.push(locationId);
      }

      query += `
        GROUP BY u.id, u.username, u.first_name, u.last_name
        HAVING COUNT(t.*) > 0
        ORDER BY completion_rate DESC
        LIMIT 20
      `;
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
