/**
 * Task Model
 * Supports digital checklists, recurring tasks, and task management
 */

class Task {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.type = data.type; // 'checklist', 'line_check', 'food_safety', 'opening', 'closing', 'custom'
    this.category = data.category;
    this.locationId = data.locationId;
    this.assignedTo = data.assignedTo;
    this.priority = data.priority || 'medium'; // 'low', 'medium', 'high', 'critical'
    this.status = data.status || 'pending'; // 'pending', 'in_progress', 'completed', 'failed', 'overdue'
    this.dueDate = data.dueDate;
    this.completedAt = data.completedAt;
    this.completedBy = data.completedBy;
    this.recurring = data.recurring || false;
    this.recurrencePattern = data.recurrencePattern; // 'daily', 'weekly', 'monthly', 'custom'
    this.recurrenceInterval = data.recurrenceInterval;
    this.requiresPhotoVerification = data.requiresPhotoVerification || false;
    this.photoUrls = data.photoUrls || [];
    this.requiresSignature = data.requiresSignature || false;
    this.signatureUrl = data.signatureUrl;
    this.checklistItems = data.checklistItems || [];
    this.notes = data.notes || '';
    this.correctiveActions = data.correctiveActions || [];
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  isOverdue() {
    return this.status !== 'completed' && this.dueDate && new Date(this.dueDate) < new Date();
  }

  complete(userId, photos = [], signature = null) {
    this.status = 'completed';
    this.completedAt = new Date();
    this.completedBy = userId;
    if (photos.length > 0) this.photoUrls = photos;
    if (signature) this.signatureUrl = signature;
    this.updatedAt = new Date();
  }
}

module.exports = Task;
