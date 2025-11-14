/**
 * Task Dependencies Routes
 * Handles task prerequisite chains and dependency management
 */

const express = require('express');
const TaskDependencyService = require('../services/TaskDependencyService');

const router = express.Router();

/**
 * @swagger
 * /tasks/{id}/dependencies:
 *   get:
 *     summary: Get task dependencies
 *     description: Get all tasks that this task depends on
 *     tags: [Task Dependencies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dependencies retrieved successfully
 */
router.get('/:id/dependencies', async (req, res, next) => {
  try {
    const { id } = req.params;
    const dependencies = await TaskDependencyService.getDependencies(id);

    res.json({
      success: true,
      data: dependencies
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /tasks/{id}/dependents:
 *   get:
 *     summary: Get dependent tasks
 *     description: Get all tasks that depend on this task
 *     tags: [Task Dependencies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dependents retrieved successfully
 */
router.get('/:id/dependents', async (req, res, next) => {
  try {
    const { id } = req.params;
    const dependents = await TaskDependencyService.getDependents(id);

    res.json({
      success: true,
      data: dependents
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /tasks/{id}/dependencies:
 *   post:
 *     summary: Add task dependency
 *     description: Add a prerequisite task dependency
 *     tags: [Task Dependencies]
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
 *               - dependsOnTaskId
 *             properties:
 *               dependsOnTaskId:
 *                 type: string
 *               dependencyType:
 *                 type: string
 *                 enum: [blocks, related]
 *                 default: blocks
 *     responses:
 *       201:
 *         description: Dependency added successfully
 *       400:
 *         description: Validation error or circular dependency
 */
router.post('/:id/dependencies', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { dependsOnTaskId, dependencyType } = req.body;

    if (!dependsOnTaskId) {
      return res.status(400).json({
        success: false,
        error: 'dependsOnTaskId is required'
      });
    }

    const dependency = await TaskDependencyService.addDependency(
      id,
      dependsOnTaskId,
      dependencyType || 'blocks'
    );

    res.status(201).json({
      success: true,
      data: dependency
    });
  } catch (error) {
    if (
      error.message.includes('not found') ||
      error.message.includes('cannot depend on itself') ||
      error.message.includes('circular dependency')
    ) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
});

/**
 * @swagger
 * /tasks/{id}/dependencies/{dependsOnTaskId}:
 *   delete:
 *     summary: Remove task dependency
 *     description: Remove a prerequisite task dependency
 *     tags: [Task Dependencies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: dependsOnTaskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dependency removed successfully
 *       404:
 *         description: Dependency not found
 */
router.delete('/:id/dependencies/:dependsOnTaskId', async (req, res, next) => {
  try {
    const { id, dependsOnTaskId } = req.params;
    const removed = await TaskDependencyService.removeDependency(id, dependsOnTaskId);

    if (!removed) {
      return res.status(404).json({
        success: false,
        error: 'Dependency not found'
      });
    }

    res.json({
      success: true,
      message: 'Dependency removed successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /tasks/{id}/ready:
 *   get:
 *     summary: Check if task is ready
 *     description: Check if task prerequisites are completed
 *     tags: [Task Dependencies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task readiness status
 */
router.get('/:id/ready', async (req, res, next) => {
  try {
    const { id } = req.params;
    const readiness = await TaskDependencyService.isTaskReady(id);

    res.json({
      success: true,
      data: readiness
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /tasks/{id}/chain:
 *   get:
 *     summary: Get dependency chain
 *     description: Get the full dependency chain for a task
 *     tags: [Task Dependencies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: maxDepth
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Dependency chain retrieved successfully
 */
router.get('/:id/chain', async (req, res, next) => {
  try {
    const { id } = req.params;
    const maxDepth = parseInt(req.query.maxDepth) || 10;
    const chain = await TaskDependencyService.getDependencyChain(id, maxDepth);

    res.json({
      success: true,
      data: chain
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /tasks/blocked:
 *   get:
 *     summary: Get blocked tasks
 *     description: Get all tasks that are blocked by incomplete prerequisites
 *     tags: [Task Dependencies]
 *     parameters:
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Blocked tasks retrieved successfully
 */
router.get('/blocked', async (req, res, next) => {
  try {
    const { locationId } = req.query;
    const blockedTasks = await TaskDependencyService.getBlockedTasks(locationId);

    res.json({
      success: true,
      data: blockedTasks
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
