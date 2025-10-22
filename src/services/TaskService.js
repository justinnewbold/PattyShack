/**
 * Task Service
 * Business logic for task management operations
 */

const { getPool } = require('../database/pool');
const { v4: uuidv4 } = require('crypto').randomUUID ? { v4: () => require('crypto').randomUUID() } : require('crypto');

class TaskService {
  constructor() {
    // Database-backed service
  }

  async createTask(taskData) {
    const pool = getPool();

    const task = {
      id: `task-${Date.now()}`,
      title: taskData.title,
      description: taskData.description || null,
      type: taskData.type,
      category: taskData.category || null,
      location_id: taskData.locationId,
      assigned_to: taskData.assignedTo || null,
      priority: taskData.priority || 'medium',
      status: taskData.status || 'pending',
      due_date: taskData.dueDate || null,
      recurring: taskData.recurring || false,
      recurrence_pattern: taskData.recurrencePattern || null,
      recurrence_interval: taskData.recurrenceInterval || null,
      requires_photo_verification: taskData.requiresPhotoVerification || false,
      requires_signature: taskData.requiresSignature || false,
      checklist_items: JSON.stringify(taskData.checklistItems || []),
      notes: taskData.notes || '',
      metadata: JSON.stringify(taskData.metadata || {})
    };

    const result = await pool.query(`
      INSERT INTO tasks (
        id, title, description, type, category, location_id, assigned_to,
        priority, status, due_date, recurring, recurrence_pattern, recurrence_interval,
        requires_photo_verification, requires_signature, checklist_items, notes, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `, [
      task.id, task.title, task.description, task.type, task.category,
      task.location_id, task.assigned_to, task.priority, task.status, task.due_date,
      task.recurring, task.recurrence_pattern, task.recurrence_interval,
      task.requires_photo_verification, task.requires_signature,
      task.checklist_items, task.notes, task.metadata
    ]);

    return this.formatTask(result.rows[0]);
  }

  async getTasks(filters = {}) {
    const pool = getPool();

    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    // Apply filters
    if (filters.locationId) {
      query += ` AND location_id = $${paramIndex++}`;
      params.push(filters.locationId);
    }
    if (filters.status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(filters.status);
    }
    if (filters.type) {
      query += ` AND type = $${paramIndex++}`;
      params.push(filters.type);
    }
    if (filters.assignedTo) {
      query += ` AND assigned_to = $${paramIndex++}`;
      params.push(filters.assignedTo);
    }
    if (filters.dueDate) {
      query += ` AND DATE(due_date) = DATE($${paramIndex++})`;
      params.push(filters.dueDate);
    }

    query += ' ORDER BY due_date ASC, priority DESC';

    const result = await pool.query(query, params);
    return result.rows.map(row => this.formatTask(row));
  }

  async getTaskById(id) {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);

    if (result.rows.length === 0) return null;
    return this.formatTask(result.rows[0]);
  }

  async updateTask(id, updates) {
    const pool = getPool();

    const setClauses = [];
    const params = [];
    let paramIndex = 1;

    if (updates.title !== undefined) {
      setClauses.push(`title = $${paramIndex++}`);
      params.push(updates.title);
    }
    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      params.push(updates.description);
    }
    if (updates.type !== undefined) {
      setClauses.push(`type = $${paramIndex++}`);
      params.push(updates.type);
    }
    if (updates.priority !== undefined) {
      setClauses.push(`priority = $${paramIndex++}`);
      params.push(updates.priority);
    }
    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      params.push(updates.status);
    }
    if (updates.assignedTo !== undefined) {
      setClauses.push(`assigned_to = $${paramIndex++}`);
      params.push(updates.assignedTo);
    }
    if (updates.dueDate !== undefined) {
      setClauses.push(`due_date = $${paramIndex++}`);
      params.push(updates.dueDate);
    }
    if (updates.notes !== undefined) {
      setClauses.push(`notes = $${paramIndex++}`);
      params.push(updates.notes);
    }

    if (setClauses.length === 0) {
      return await this.getTaskById(id);
    }

    setClauses.push(`updated_at = NOW()`);
    params.push(id);

    const query = `
      UPDATE tasks
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, params);
    if (result.rows.length === 0) return null;

    return this.formatTask(result.rows[0]);
  }

  async completeTask(id, completionData) {
    const pool = getPool();

    // Get the task first to check if it's recurring
    const task = await this.getTaskById(id);
    if (!task) return null;

    const result = await pool.query(`
      UPDATE tasks
      SET
        status = 'completed',
        completed_at = NOW(),
        completed_by = $1,
        photo_urls = $2,
        signature_url = $3,
        notes = $4,
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [
      completionData.userId,
      JSON.stringify(completionData.photos || []),
      completionData.signature || null,
      completionData.notes || '',
      id
    ]);

    // Trigger next occurrence if recurring
    if (task.recurring) {
      await this.createNextRecurrence(task);
    }

    return this.formatTask(result.rows[0]);
  }

  async deleteTask(id) {
    const pool = getPool();
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [id]);
    return result.rows.length > 0;
  }

  async getSummary(filters = {}) {
    const tasks = await this.getTasks(filters);

    const summary = {
      total: tasks.length,
      byStatus: {},
      byType: {},
      overdue: 0
    };

    const now = new Date();

    tasks.forEach(task => {
      summary.byStatus[task.status] = (summary.byStatus[task.status] || 0) + 1;
      summary.byType[task.type] = (summary.byType[task.type] || 0) + 1;

      if (
        task.status !== 'completed' &&
        task.dueDate &&
        new Date(task.dueDate) < now
      ) {
        summary.overdue += 1;
      }
    });

    return summary;
  }

  scheduleRecurringTask(task) {
    // Logic to schedule next occurrence
    console.log(`Scheduling recurring task: ${task.title}`);
  }

  async createNextRecurrence(task) {
    // Create next occurrence based on recurrence pattern
    const nextDueDate = this.calculateNextDueDate(task.dueDate, task.recurrencePattern);

    await this.createTask({
      title: task.title,
      description: task.description,
      type: task.type,
      category: task.category,
      locationId: task.locationId,
      assignedTo: task.assignedTo,
      priority: task.priority,
      dueDate: nextDueDate,
      recurring: task.recurring,
      recurrencePattern: task.recurrencePattern,
      recurrenceInterval: task.recurrenceInterval,
      requiresPhotoVerification: task.requiresPhotoVerification,
      requiresSignature: task.requiresSignature,
      checklistItems: task.checklistItems,
      metadata: task.metadata
    });
  }

  calculateNextDueDate(currentDueDate, pattern) {
    const date = new Date(currentDueDate);

    switch (pattern) {
      case 'daily':
        date.setDate(date.getDate() + 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      default:
        date.setDate(date.getDate() + 1);
    }

    return date;
  }

  async getOverdueTasks() {
    const pool = getPool();
    const result = await pool.query(`
      SELECT * FROM tasks
      WHERE status != 'completed'
        AND due_date < NOW()
      ORDER BY due_date ASC
    `);

    return result.rows.map(row => this.formatTask(row));
  }

  async getTasksByHierarchy(hierarchyLevel, hierarchyId) {
    const pool = getPool();

    // Get tasks based on organizational hierarchy
    let query = `
      SELECT t.* FROM tasks t
      JOIN locations l ON t.location_id = l.id
      WHERE 1=1
    `;

    const params = [hierarchyId];

    switch (hierarchyLevel) {
      case 'location':
        query += ' AND l.id = $1';
        break;
      case 'district':
        query += ' AND l.district_id = $1';
        break;
      case 'region':
        query += ' AND l.region_id = $1';
        break;
      case 'brand':
        query += ' AND l.brand_id = $1';
        break;
    }

    const result = await pool.query(query, params);
    return result.rows.map(row => this.formatTask(row));
  }

  // Helper method to format database row to API response format
  formatTask(row) {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      category: row.category,
      locationId: row.location_id,
      assignedTo: row.assigned_to,
      priority: row.priority,
      status: row.status,
      dueDate: row.due_date,
      completedAt: row.completed_at,
      completedBy: row.completed_by,
      recurring: row.recurring,
      recurrencePattern: row.recurrence_pattern,
      recurrenceInterval: row.recurrence_interval,
      requiresPhotoVerification: row.requires_photo_verification,
      photoUrls: row.photo_urls || [],
      requiresSignature: row.requires_signature,
      signatureUrl: row.signature_url,
      checklistItems: row.checklist_items || [],
      notes: row.notes,
      correctiveActions: row.corrective_actions || [],
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

module.exports = new TaskService();
