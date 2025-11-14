/**
 * Task Escalation Service
 * Manages priority escalation rules and automated escalation
 */

const { getPool } = require('../database/pool');

class TaskEscalationService {
  async processEscalations() {
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get all tasks needing escalation
      const tasksResult = await client.query(`
        SELECT DISTINCT ON (id)
          id, title, priority, rule_id, rule_name, escalate_to_priority, notify_roles
        FROM tasks_needing_escalation
        ORDER BY id, hours_since_last_escalation DESC
      `);

      const escalations = [];

      for (const task of tasksResult.rows) {
        // Escalate the task
        await client.query(`
          UPDATE tasks
          SET priority = $1,
              escalation_level = escalation_level + 1,
              last_escalated_at = NOW(),
              updated_at = NOW()
          WHERE id = $2
        `, [task.escalate_to_priority, task.id]);

        // Log the escalation
        const escalationId = `esc-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        await client.query(`
          INSERT INTO task_escalations (id, task_id, rule_id, previous_priority, new_priority, reason)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          escalationId,
          task.id,
          task.rule_id,
          task.priority,
          task.escalate_to_priority,
          `Auto-escalated by rule: ${task.rule_name}`
        ]);

        escalations.push({
          taskId: task.id,
          taskTitle: task.title,
          previousPriority: task.priority,
          newPriority: task.escalate_to_priority,
          notifyRoles: task.notify_roles
        });
      }

      await client.query('COMMIT');
      return escalations;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getEscalationHistory(taskId) {
    const pool = getPool();
    const result = await pool.query(`
      SELECT * FROM task_escalations
      WHERE task_id = $1
      ORDER BY escalated_at DESC
    `, [taskId]);

    return result.rows;
  }

  async getTasksNeedingEscalation(locationId = null) {
    const pool = getPool();

    let query = `
      SELECT * FROM tasks_needing_escalation tne
    `;

    const params = [];
    if (locationId) {
      query += ` JOIN tasks t ON tne.id = t.id WHERE t.location_id = $1`;
      params.push(locationId);
    }

    query += ` ORDER BY hours_since_last_escalation DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  }
}

module.exports = new TaskEscalationService();
