/**
 * Task Service
 * Business logic for task management operations
 */

class TaskService {
  constructor() {
    this.tasks = new Map(); // In-memory storage (replace with database)
  }

  async createTask(taskData) {
    const task = {
      id: Date.now(),
      ...taskData,
      status: taskData.status || 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.tasks.set(task.id, task);
    
    // Schedule recurring task if needed
    if (task.recurring) {
      this.scheduleRecurringTask(task);
    }
    
    return task;
  }

  async getTasks(filters = {}) {
    let tasks = Array.from(this.tasks.values());

    // Apply filters
    if (filters.locationId) {
      tasks = tasks.filter(t => String(t.locationId) === String(filters.locationId));
    }
    if (filters.status) {
      tasks = tasks.filter(t => t.status === filters.status);
    }
    if (filters.type) {
      tasks = tasks.filter(t => t.type === filters.type);
    }
    if (filters.assignedTo) {
      tasks = tasks.filter(t => String(t.assignedTo) === String(filters.assignedTo));
    }
    if (filters.dueDate) {
      const dueDate = new Date(filters.dueDate);
      tasks = tasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === dueDate.toDateString());
    }

    return tasks;
  }

  async getTaskById(id) {
    return this.tasks.get(parseInt(id));
  }

  async updateTask(id, updates) {
    const task = this.tasks.get(parseInt(id));
    if (!task) return null;
    
    const updatedTask = {
      ...task,
      ...updates,
      updatedAt: new Date()
    };
    
    this.tasks.set(parseInt(id), updatedTask);
    return updatedTask;
  }

  async completeTask(id, completionData) {
    const task = this.tasks.get(parseInt(id));
    if (!task) return null;
    
    const completedTask = {
      ...task,
      status: 'completed',
      completedAt: new Date(),
      completedBy: completionData.userId,
      photos: completionData.photos || [],
      signature: completionData.signature,
      notes: completionData.notes || '',
      updatedAt: new Date()
    };
    
    this.tasks.set(parseInt(id), completedTask);
    
    // Trigger next occurrence if recurring
    if (task.recurring) {
      this.createNextRecurrence(task);
    }
    
    return completedTask;
  }

  async deleteTask(id) {
    return this.tasks.delete(parseInt(id));
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

  createNextRecurrence(task) {
    // Create next occurrence based on recurrence pattern
    const nextTask = {
      ...task,
      id: undefined,
      status: 'pending',
      completedAt: null,
      completedBy: null,
      dueDate: this.calculateNextDueDate(task.dueDate, task.recurrencePattern)
    };
    
    this.createTask(nextTask);
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
    const now = new Date();
    return Array.from(this.tasks.values()).filter(task => 
      task.status !== 'completed' && 
      task.dueDate && 
      new Date(task.dueDate) < now
    );
  }

  async getTasksByHierarchy(hierarchyLevel, hierarchyId) {
    // Get tasks based on organizational hierarchy
    const tasks = Array.from(this.tasks.values());
    // Implementation would query based on location hierarchy
    return tasks;
  }
}

module.exports = new TaskService();
