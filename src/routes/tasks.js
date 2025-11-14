/**
 * Task Management Routes
 * Handles multi-location task management, checklists, and recurring tasks
 */

const express = require('express');
const multer = require('multer');
const TaskService = require('../services/TaskService');
const validators = require('../utils/validators');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and PDF allowed.'));
    }
  },
});

const normalizePagination = (value, defaultValue) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return defaultValue;
  }
  return parsed;
};

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: List tasks with filters
 *     description: Retrieve a paginated list of tasks with optional filtering by location, status, priority, type, and assignee
 *     tags: [Tasks]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: perPage
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: integer
 *         description: Filter by location ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, completed, overdue]
 *         description: Filter by task status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Filter by priority
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by task type
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: integer
 *         description: Filter by assigned user ID
 *     responses:
 *       200:
 *         description: Tasks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     tasks:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Task'
 *                     summary:
 *                       type: object
 *                       description: Task statistics summary
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         perPage:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 */
router.get('/', async (req, res, next) => {
  try {
    const { page: pageQuery, perPage: perPageQuery, ...filters } = req.query;

    const page = normalizePagination(pageQuery, 1);
    const perPage = normalizePagination(perPageQuery, 20);

    const tasks = await TaskService.getTasks(filters);
    const summary = await TaskService.getSummary(filters);

    const offset = (page - 1) * perPage;
    const paginatedTasks = tasks.slice(offset, offset + perPage);

    res.json({
      success: true,
      data: {
        tasks: paginatedTasks,
        summary,
        pagination: {
          page,
          perPage,
          total: tasks.length,
          totalPages: Math.max(1, Math.ceil(tasks.length / perPage))
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Get task by ID
 *     description: Retrieve detailed information about a specific task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const task = await TaskService.getTaskById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Create a new task
 *     description: Create a new task with title, type, and location
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - type
 *               - locationId
 *             properties:
 *               title:
 *                 type: string
 *                 description: Task title
 *                 example: Daily temperature check
 *               description:
 *                 type: string
 *                 description: Task description
 *                 example: Check all refrigeration equipment temperatures
 *               type:
 *                 type: string
 *                 description: Task type
 *                 example: temperature
 *               locationId:
 *                 type: integer
 *                 description: Location ID where task is assigned
 *                 example: 1
 *               assignedTo:
 *                 type: integer
 *                 description: User ID of assignee
 *                 example: 5
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 description: Task priority
 *                 example: high
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed, overdue]
 *                 description: Task status
 *                 example: pending
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 description: Due date
 *                 example: "2025-10-23T18:00:00Z"
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post('/', async (req, res, next) => {
  try {
    const taskData = req.body || {};

    const requiredFields = ['title', 'type', 'locationId'];
    if (!validators.hasRequiredFields(taskData, requiredFields)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, type, locationId'
      });
    }

    if (!validators.isValidTaskType(taskData.type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid task type'
      });
    }

    if (taskData.dueDate && !validators.isValidDate(taskData.dueDate)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid due date'
      });
    }

    if (taskData.status && !validators.isValidTaskStatus(taskData.status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid task status'
      });
    }

    const sanitizedTask = {
      ...taskData,
      title: validators.sanitizeString(taskData.title),
      description: validators.sanitizeString(taskData.description)
    };

    const task = await TaskService.createTask(sanitizedTask);

    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /tasks/{id}:
 *   put:
 *     summary: Update a task
 *     description: Update an existing task's properties
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed, overdue]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *               assignedTo:
 *                 type: integer
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Task updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};

    if (updates.type && !validators.isValidTaskType(updates.type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid task type'
      });
    }

    if (updates.status && !validators.isValidTaskStatus(updates.status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid task status'
      });
    }

    if (updates.dueDate && !validators.isValidDate(updates.dueDate)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid due date'
      });
    }

    const sanitizedUpdates = {
      ...updates,
      ...(updates.title && { title: validators.sanitizeString(updates.title) }),
      ...(updates.description && { description: validators.sanitizeString(updates.description) })
    };

    const task = await TaskService.updateTask(id, sanitizedUpdates);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /tasks/{id}/complete:
 *   post:
 *     summary: Complete a task
 *     description: Mark a task as completed with completion data
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: integer
 *                 description: ID of user completing the task
 *                 example: 5
 *               notes:
 *                 type: string
 *                 description: Completion notes
 *                 example: All temperatures within range
 *     responses:
 *       200:
 *         description: Task completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post('/:id/complete', async (req, res, next) => {
  try {
    const { id } = req.params;
    const completionData = req.body || {};

    if (!completionData.userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: userId'
      });
    }

    const task = await TaskService.completeTask(id, completionData);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     description: Permanently delete a task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Task deleted successfully
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await TaskService.deleteTask(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /tasks/{id}/photos:
 *   post:
 *     summary: Upload photo for a task
 *     description: Upload a photo attachment for task verification
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - photo
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Photo file (JPEG, PNG, GIF, or PDF, max 10MB)
 *     responses:
 *       200:
 *         description: Photo uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     photoUrl:
 *                       type: string
 *                       description: URL or path to uploaded photo
 *                     task:
 *                       $ref: '#/components/schemas/Task'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post('/:id/photos', upload.single('photo'), async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No photo file provided'
      });
    }

    // In production, you would upload to S3, Cloudinary, or similar
    // For now, we'll store the base64 encoded image
    const photoBase64 = req.file.buffer.toString('base64');
    const photoUrl = `data:${req.file.mimetype};base64,${photoBase64}`;

    const task = await TaskService.addPhoto(id, photoUrl);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    res.json({
      success: true,
      data: {
        photoUrl,
        task
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
