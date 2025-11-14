/**
 * Task Dependency Service
 * Manages task prerequisite chains and dependency relationships
 */

const { getPool } = require('../database/pool');

class TaskDependencyService {
  constructor() {
    // Database-backed service
  }

  async addDependency(taskId, dependsOnTaskId, dependencyType = 'blocks') {
    const pool = getPool();

    // Validate both tasks exist
    const tasksResult = await pool.query(
      'SELECT id FROM tasks WHERE id IN ($1, $2)',
      [taskId, dependsOnTaskId]
    );

    if (tasksResult.rows.length !== 2) {
      throw new Error('One or both tasks not found');
    }

    // Prevent self-dependency
    if (taskId === dependsOnTaskId) {
      throw new Error('A task cannot depend on itself');
    }

    // Check for circular dependency
    const wouldCreateCycle = await this.wouldCreateCycle(taskId, dependsOnTaskId);
    if (wouldCreateCycle) {
      throw new Error('Cannot create circular dependency');
    }

    const id = `dep-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const result = await pool.query(`
      INSERT INTO task_dependencies (id, task_id, depends_on_task_id, dependency_type)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (task_id, depends_on_task_id) DO UPDATE
        SET dependency_type = $4
      RETURNING *
    `, [id, taskId, dependsOnTaskId, dependencyType]);

    return this.formatDependency(result.rows[0]);
  }

  async removeDependency(taskId, dependsOnTaskId) {
    const pool = getPool();

    const result = await pool.query(
      `DELETE FROM task_dependencies
       WHERE task_id = $1 AND depends_on_task_id = $2
       RETURNING *`,
      [taskId, dependsOnTaskId]
    );

    return result.rows.length > 0;
  }

  async getDependencies(taskId) {
    const pool = getPool();

    const result = await pool.query(`
      SELECT
        td.*,
        t.title as depends_on_task_title,
        t.status as depends_on_task_status,
        t.priority as depends_on_task_priority,
        t.due_date as depends_on_task_due_date
      FROM task_dependencies td
      JOIN tasks t ON td.depends_on_task_id = t.id
      WHERE td.task_id = $1
      ORDER BY td.created_at ASC
    `, [taskId]);

    return result.rows.map(row => ({
      ...this.formatDependency(row),
      dependsOnTask: {
        id: row.depends_on_task_id,
        title: row.depends_on_task_title,
        status: row.depends_on_task_status,
        priority: row.depends_on_task_priority,
        dueDate: row.depends_on_task_due_date
      }
    }));
  }

  async getDependents(taskId) {
    const pool = getPool();

    // Get tasks that depend on this task
    const result = await pool.query(`
      SELECT
        td.*,
        t.title as task_title,
        t.status as task_status,
        t.priority as task_priority,
        t.due_date as task_due_date
      FROM task_dependencies td
      JOIN tasks t ON td.task_id = t.id
      WHERE td.depends_on_task_id = $1
      ORDER BY td.created_at ASC
    `, [taskId]);

    return result.rows.map(row => ({
      ...this.formatDependency(row),
      task: {
        id: row.task_id,
        title: row.task_title,
        status: row.task_status,
        priority: row.task_priority,
        dueDate: row.task_due_date
      }
    }));
  }

  async isTaskReady(taskId) {
    const pool = getPool();

    const result = await pool.query(`
      SELECT is_ready, blocking_count
      FROM task_readiness
      WHERE task_id = $1
    `, [taskId]);

    if (result.rows.length === 0) {
      return { ready: false, blockingCount: 0 };
    }

    return {
      ready: result.rows[0].is_ready,
      blockingCount: parseInt(result.rows[0].blocking_count)
    };
  }

  async getBlockedTasks(locationId = null) {
    const pool = getPool();

    let query = `
      SELECT
        tr.task_id,
        tr.title,
        tr.status,
        tr.is_ready,
        tr.blocking_count
      FROM task_readiness tr
      JOIN tasks t ON tr.task_id = t.id
      WHERE tr.is_ready = false
        AND tr.status IN ('pending', 'in_progress')
    `;

    const params = [];
    if (locationId) {
      query += ' AND t.location_id = $1';
      params.push(locationId);
    }

    query += ' ORDER BY tr.blocking_count DESC';

    const result = await pool.query(query, params);

    return result.rows.map(row => ({
      taskId: row.task_id,
      title: row.title,
      status: row.status,
      isReady: row.is_ready,
      blockingCount: parseInt(row.blocking_count)
    }));
  }

  async wouldCreateCycle(taskId, dependsOnTaskId) {
    const pool = getPool();

    // Use recursive CTE to check if adding this dependency would create a cycle
    const result = await pool.query(`
      WITH RECURSIVE dependency_chain AS (
        -- Start with the proposed new dependency
        SELECT
          $2::VARCHAR as task_id,
          $1::VARCHAR as depends_on_task_id,
          1 as depth
        UNION ALL
        -- Follow the chain of dependencies
        SELECT
          td.task_id,
          td.depends_on_task_id,
          dc.depth + 1
        FROM task_dependencies td
        JOIN dependency_chain dc ON td.task_id = dc.depends_on_task_id
        WHERE dc.depth < 20  -- Prevent infinite recursion
      )
      SELECT EXISTS (
        SELECT 1 FROM dependency_chain
        WHERE task_id = $1 AND depends_on_task_id = $2
      ) as would_cycle
    `, [taskId, dependsOnTaskId]);

    return result.rows[0].would_cycle;
  }

  async getDependencyChain(taskId, maxDepth = 10) {
    const pool = getPool();

    const result = await pool.query(`
      WITH RECURSIVE dependency_chain AS (
        -- Start with the task
        SELECT
          t.id,
          t.title,
          t.status,
          t.priority,
          0 as depth,
          ARRAY[t.id] as path
        FROM tasks t
        WHERE t.id = $1
        UNION ALL
        -- Follow dependencies
        SELECT
          dt.id,
          dt.title,
          dt.status,
          dt.priority,
          dc.depth + 1,
          dc.path || dt.id
        FROM task_dependencies td
        JOIN tasks dt ON td.depends_on_task_id = dt.id
        JOIN dependency_chain dc ON td.task_id = dc.id
        WHERE dc.depth < $2
          AND NOT (dt.id = ANY(dc.path))  -- Prevent cycles
      )
      SELECT * FROM dependency_chain
      ORDER BY depth ASC, title ASC
    `, [taskId, maxDepth]);

    return result.rows.map(row => ({
      id: row.id,
      title: row.title,
      status: row.status,
      priority: row.priority,
      depth: row.depth,
      path: row.path
    }));
  }

  formatDependency(row) {
    if (!row) return null;

    return {
      id: row.id,
      taskId: row.task_id,
      dependsOnTaskId: row.depends_on_task_id,
      dependencyType: row.dependency_type,
      createdAt: row.created_at
    };
  }
}

module.exports = new TaskDependencyService();
