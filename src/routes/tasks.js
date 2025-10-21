/**
 * Task Management Routes
 * Handles multi-location task management, checklists, and recurring tasks
 */

const express = require('express');
const TaskService = require('../services/TaskService');
const validators = require('../utils/validators');

const router = express.Router();

const normalizePagination = (value, defaultValue) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return defaultValue;
  }
  return parsed;
};

// GET /api/v1/tasks - List tasks with filters
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

// GET /api/v1/tasks/:id - Get task details
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

// POST /api/v1/tasks - Create new task
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

// PUT /api/v1/tasks/:id - Update task
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

// POST /api/v1/tasks/:id/complete - Complete task
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

// DELETE /api/v1/tasks/:id - Delete task
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

module.exports = router;
