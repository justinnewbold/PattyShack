/**
 * Task Template Routes
 * Handles CRUD operations for reusable task templates
 */

const express = require('express');
const TaskTemplateService = require('../services/TaskTemplateService');
const validators = require('../utils/validators');

const router = express.Router();

/**
 * @swagger
 * /task-templates:
 *   get:
 *     summary: List task templates
 *     description: Retrieve a list of task templates with optional filtering
 *     tags: [Task Templates]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by task type
 *       - in: query
 *         name: isPublic
 *         schema:
 *           type: boolean
 *         description: Filter by public/private status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name and description
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: perPage
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Templates retrieved successfully
 */
router.get('/', async (req, res, next) => {
  try {
    const filters = {
      category: req.query.category,
      type: req.query.type,
      isPublic: req.query.isPublic,
      brandId: req.query.brandId,
      search: req.query.search,
      page: req.query.page,
      perPage: req.query.perPage
    };

    const templates = await TaskTemplateService.getTemplates(filters);

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /task-templates/{id}:
 *   get:
 *     summary: Get template by ID
 *     description: Retrieve a single task template
 *     tags: [Task Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template retrieved successfully
 *       404:
 *         description: Template not found
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const template = await TaskTemplateService.getTemplateById(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /task-templates:
 *   post:
 *     summary: Create a new template
 *     description: Create a new reusable task template
 *     tags: [Task Templates]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               type:
 *                 type: string
 *               priority:
 *                 type: string
 *               checklistItems:
 *                 type: array
 *     responses:
 *       201:
 *         description: Template created successfully
 *       400:
 *         description: Validation error
 */
router.post('/', async (req, res, next) => {
  try {
    const templateData = req.body;

    // Validation
    if (!templateData.name || !templateData.name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Template name is required'
      });
    }

    if (!templateData.type) {
      return res.status(400).json({
        success: false,
        error: 'Template type is required'
      });
    }

    if (templateData.type && !validators.isValidTaskType(templateData.type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid task type'
      });
    }

    if (templateData.priority && !['low', 'medium', 'high', 'critical'].includes(templateData.priority)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid priority'
      });
    }

    const template = await TaskTemplateService.createTemplate(templateData);

    res.status(201).json({
      success: true,
      data: template
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /task-templates/{id}:
 *   put:
 *     summary: Update a template
 *     description: Update an existing task template
 *     tags: [Task Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Template updated successfully
 *       404:
 *         description: Template not found
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.type && !validators.isValidTaskType(updates.type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid task type'
      });
    }

    const template = await TaskTemplateService.updateTemplate(id, updates);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /task-templates/{id}:
 *   delete:
 *     summary: Delete a template
 *     description: Soft delete a task template
 *     tags: [Task Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template deleted successfully
 *       404:
 *         description: Template not found
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await TaskTemplateService.deleteTemplate(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /task-templates/{id}/use:
 *   post:
 *     summary: Create task from template
 *     description: Create a new task using a template as base
 *     tags: [Task Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - locationId
 *             properties:
 *               locationId:
 *                 type: string
 *               assignedTo:
 *                 type: string
 *               dueDate:
 *                 type: string
 *     responses:
 *       201:
 *         description: Task created from template successfully
 *       404:
 *         description: Template not found
 */
router.post('/:id/use', async (req, res, next) => {
  try {
    const { id } = req.params;
    const taskData = req.body;

    if (!taskData.locationId) {
      return res.status(400).json({
        success: false,
        error: 'Location ID is required'
      });
    }

    const task = await TaskTemplateService.createTaskFromTemplate(id, taskData);

    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    if (error.message === 'Template not found') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
});

/**
 * @swagger
 * /task-templates/{id}/use-bulk:
 *   post:
 *     summary: Create tasks from template across multiple locations
 *     description: Bulk create tasks from a template for multiple locations
 *     tags: [Task Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - locations
 *             properties:
 *               locations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - locationId
 *                   properties:
 *                     locationId:
 *                       type: string
 *                     assignedTo:
 *                       type: string
 *                     dueDate:
 *                       type: string
 *                     priority:
 *                       type: string
 *     responses:
 *       201:
 *         description: Tasks created from template successfully
 *       404:
 *         description: Template not found
 */
router.post('/:id/use-bulk', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { locations } = req.body;

    if (!locations || !Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'locations array is required and must not be empty'
      });
    }

    // Validate each location entry has locationId
    for (const location of locations) {
      if (!location.locationId) {
        return res.status(400).json({
          success: false,
          error: 'All location entries must have a locationId'
        });
      }
    }

    const tasks = await TaskTemplateService.createTasksFromTemplateBulk(id, locations);

    res.status(201).json({
      success: true,
      data: {
        tasks,
        count: tasks.length
      }
    });
  } catch (error) {
    if (error.message === 'Template not found') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
});

/**
 * @swagger
 * /task-templates/{id}/stats:
 *   get:
 *     summary: Get template usage statistics
 *     description: Get statistics about how a template has been used
 *     tags: [Task Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/:id/stats', async (req, res, next) => {
  try {
    const { id } = req.params;
    const stats = await TaskTemplateService.getTemplateUsageStats(id);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
