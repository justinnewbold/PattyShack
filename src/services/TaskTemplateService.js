/**
 * Task Template Service
 * Business logic for managing reusable task templates
 */

const { getPool } = require('../database/pool');

class TaskTemplateService {
  constructor() {
    // Database-backed service
  }

  async createTemplate(templateData) {
    const pool = getPool();

    const template = {
      id: `template-${Date.now()}`,
      name: templateData.name,
      description: templateData.description || null,
      category: templateData.category || null,
      type: templateData.type,
      priority: templateData.priority || 'medium',
      estimated_duration: templateData.estimatedDuration || null,
      requires_photo_verification: templateData.requiresPhotoVerification || false,
      requires_signature: templateData.requiresSignature || false,
      checklist_items: JSON.stringify(templateData.checklistItems || []),
      instructions: templateData.instructions || null,
      tags: JSON.stringify(templateData.tags || []),
      is_public: templateData.isPublic || false,
      created_by: templateData.createdBy || null,
      brand_id: templateData.brandId || null,
      active: templateData.active !== undefined ? templateData.active : true,
      metadata: JSON.stringify(templateData.metadata || {})
    };

    const result = await pool.query(`
      INSERT INTO task_templates (
        id, name, description, category, type, priority, estimated_duration,
        requires_photo_verification, requires_signature, checklist_items,
        instructions, tags, is_public, created_by, brand_id, active, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
      template.id, template.name, template.description, template.category,
      template.type, template.priority, template.estimated_duration,
      template.requires_photo_verification, template.requires_signature,
      template.checklist_items, template.instructions, template.tags,
      template.is_public, template.created_by, template.brand_id,
      template.active, template.metadata
    ]);

    return this.formatTemplate(result.rows[0]);
  }

  async getTemplates(filters = {}) {
    const pool = getPool();

    let query = 'SELECT * FROM task_templates WHERE active = true';
    const params = [];
    let paramIndex = 1;

    // Apply filters
    if (filters.category) {
      query += ` AND category = $${paramIndex++}`;
      params.push(filters.category);
    }
    if (filters.type) {
      query += ` AND type = $${paramIndex++}`;
      params.push(filters.type);
    }
    if (filters.isPublic !== undefined) {
      query += ` AND is_public = $${paramIndex++}`;
      params.push(filters.isPublic);
    }
    if (filters.brandId) {
      query += ` AND (brand_id = $${paramIndex++} OR brand_id IS NULL)`;
      params.push(filters.brandId);
    }
    if (filters.createdBy) {
      query += ` AND created_by = $${paramIndex++}`;
      params.push(filters.createdBy);
    }
    if (filters.search) {
      query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Pagination
    const page = parseInt(filters.page) || 1;
    const perPage = parseInt(filters.perPage) || 20;
    const offset = (page - 1) * perPage;

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(perPage, offset);

    const result = await pool.query(query, params);
    return result.rows.map(row => this.formatTemplate(row));
  }

  async getTemplateById(id) {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM task_templates WHERE id = $1 AND active = true',
      [id]
    );

    return result.rows.length > 0 ? this.formatTemplate(result.rows[0]) : null;
  }

  async updateTemplate(id, updates) {
    const pool = getPool();

    const fields = [];
    const params = [];
    let paramIndex = 1;

    // Build dynamic update query
    if (updates.name) {
      fields.push(`name = $${paramIndex++}`);
      params.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      params.push(updates.description);
    }
    if (updates.category !== undefined) {
      fields.push(`category = $${paramIndex++}`);
      params.push(updates.category);
    }
    if (updates.type) {
      fields.push(`type = $${paramIndex++}`);
      params.push(updates.type);
    }
    if (updates.priority) {
      fields.push(`priority = $${paramIndex++}`);
      params.push(updates.priority);
    }
    if (updates.estimatedDuration !== undefined) {
      fields.push(`estimated_duration = $${paramIndex++}`);
      params.push(updates.estimatedDuration);
    }
    if (updates.requiresPhotoVerification !== undefined) {
      fields.push(`requires_photo_verification = $${paramIndex++}`);
      params.push(updates.requiresPhotoVerification);
    }
    if (updates.requiresSignature !== undefined) {
      fields.push(`requires_signature = $${paramIndex++}`);
      params.push(updates.requiresSignature);
    }
    if (updates.checklistItems) {
      fields.push(`checklist_items = $${paramIndex++}`);
      params.push(JSON.stringify(updates.checklistItems));
    }
    if (updates.instructions !== undefined) {
      fields.push(`instructions = $${paramIndex++}`);
      params.push(updates.instructions);
    }
    if (updates.tags) {
      fields.push(`tags = $${paramIndex++}`);
      params.push(JSON.stringify(updates.tags));
    }
    if (updates.isPublic !== undefined) {
      fields.push(`is_public = $${paramIndex++}`);
      params.push(updates.isPublic);
    }
    if (updates.active !== undefined) {
      fields.push(`active = $${paramIndex++}`);
      params.push(updates.active);
    }

    if (fields.length === 0) {
      return this.getTemplateById(id);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const query = `
      UPDATE task_templates
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, params);
    return result.rows.length > 0 ? this.formatTemplate(result.rows[0]) : null;
  }

  async deleteTemplate(id) {
    const pool = getPool();
    // Soft delete by setting active = false
    const result = await pool.query(
      'UPDATE task_templates SET active = false WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows.length > 0;
  }

  async createTaskFromTemplate(templateId, taskData) {
    const template = await this.getTemplateById(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const TaskService = require('./TaskService');

    // Merge template data with provided task data
    const mergedTaskData = {
      title: taskData.title || template.name,
      description: taskData.description || template.description,
      type: template.type,
      category: template.category,
      priority: taskData.priority || template.priority,
      requiresPhotoVerification: template.requiresPhotoVerification,
      requiresSignature: template.requiresSignature,
      checklistItems: template.checklistItems,
      notes: template.instructions,
      templateId: templateId,
      metadata: {
        ...template.metadata,
        fromTemplate: templateId,
        templateName: template.name
      },
      // Required task-specific fields
      locationId: taskData.locationId,
      assignedTo: taskData.assignedTo || null,
      dueDate: taskData.dueDate || null,
      recurring: taskData.recurring || false,
      recurrencePattern: taskData.recurrencePattern || null,
      recurrenceInterval: taskData.recurrenceInterval || null
    };

    return await TaskService.createTask(mergedTaskData);
  }

  async createTasksFromTemplateBulk(templateId, locationsData) {
    const template = await this.getTemplateById(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const TaskService = require('./TaskService');

    // Create task data for each location
    const tasksData = locationsData.map(locationData => ({
      title: locationData.title || template.name,
      description: locationData.description || template.description,
      type: template.type,
      category: template.category,
      priority: locationData.priority || template.priority,
      requiresPhotoVerification: template.requiresPhotoVerification,
      requiresSignature: template.requiresSignature,
      checklistItems: template.checklistItems,
      notes: template.instructions,
      templateId: templateId,
      metadata: {
        ...template.metadata,
        fromTemplate: templateId,
        templateName: template.name
      },
      // Location-specific fields
      locationId: locationData.locationId,
      assignedTo: locationData.assignedTo || null,
      dueDate: locationData.dueDate || null,
      recurring: locationData.recurring || false,
      recurrencePattern: locationData.recurrencePattern || null,
      recurrenceInterval: locationData.recurrenceInterval || null
    }));

    return await TaskService.createBulkTasks(tasksData);
  }

  async getTemplateUsageStats(templateId) {
    const pool = getPool();

    const result = await pool.query(`
      SELECT
        COUNT(*) as total_uses,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 60) as avg_completion_time_minutes
      FROM tasks
      WHERE template_id = $1
    `, [templateId]);

    return result.rows[0] || {
      total_uses: 0,
      completed_count: 0,
      in_progress_count: 0,
      pending_count: 0,
      avg_completion_time_minutes: null
    };
  }

  formatTemplate(row) {
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      type: row.type,
      priority: row.priority,
      estimatedDuration: row.estimated_duration,
      requiresPhotoVerification: row.requires_photo_verification,
      requiresSignature: row.requires_signature,
      checklistItems: row.checklist_items || [],
      instructions: row.instructions,
      tags: row.tags || [],
      isPublic: row.is_public,
      createdBy: row.created_by,
      brandId: row.brand_id,
      active: row.active,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

module.exports = new TaskTemplateService();
