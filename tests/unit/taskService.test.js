/**
 * TaskService Unit Tests
 * Tests business logic for task management operations
 */

const TaskService = require('../../src/services/TaskService');
const {
  setupTestDatabase,
  clearTestDatabase,
  teardownTestDatabase,
  createTestLocation,
  createTestUser
} = require('../helpers/testDb');
const { initializePool } = require('../../src/database/pool');

describe('TaskService', () => {
  let testLocation;
  let testUser;

  beforeAll(async () => {
    initializePool();
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    testLocation = await createTestLocation({
      id: 'test-location-1',
      code: 'TEST-001'
    });

    testUser = await createTestUser({
      id: 'test-user-1',
      role: 'manager',
      location_id: testLocation.id
    });
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('getSummary', () => {
    it('should calculate summary for empty task list', async () => {
      const summary = await TaskService.getSummary({
        locationId: testLocation.id
      });

      expect(summary).toEqual({
        total: 0,
        byStatus: {},
        byType: {},
        overdue: 0
      });
    });

    it('should count tasks by status', async () => {
      await TaskService.createTask({
        title: 'Task 1',
        type: 'checklist',
        locationId: testLocation.id,
        status: 'pending'
      });

      await TaskService.createTask({
        title: 'Task 2',
        type: 'checklist',
        locationId: testLocation.id,
        status: 'pending'
      });

      await TaskService.createTask({
        title: 'Task 3',
        type: 'checklist',
        locationId: testLocation.id,
        status: 'completed'
      });

      const summary = await TaskService.getSummary({
        locationId: testLocation.id
      });

      expect(summary.total).toBe(3);
      expect(summary.byStatus).toEqual({
        pending: 2,
        completed: 1
      });
    });

    it('should count tasks by type', async () => {
      await TaskService.createTask({
        title: 'Task 1',
        type: 'checklist',
        locationId: testLocation.id
      });

      await TaskService.createTask({
        title: 'Task 2',
        type: 'line_check',
        locationId: testLocation.id
      });

      await TaskService.createTask({
        title: 'Task 3',
        type: 'line_check',
        locationId: testLocation.id
      });

      const summary = await TaskService.getSummary({
        locationId: testLocation.id
      });

      expect(summary.byType).toEqual({
        checklist: 1,
        line_check: 2
      });
    });

    it('should count overdue tasks', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Overdue task
      await TaskService.createTask({
        title: 'Overdue Task',
        type: 'checklist',
        locationId: testLocation.id,
        status: 'pending',
        dueDate: yesterday.toISOString()
      });

      // Not overdue (future)
      await TaskService.createTask({
        title: 'Future Task',
        type: 'checklist',
        locationId: testLocation.id,
        status: 'pending',
        dueDate: tomorrow.toISOString()
      });

      // Completed (doesn't count as overdue)
      await TaskService.createTask({
        title: 'Completed Task',
        type: 'checklist',
        locationId: testLocation.id,
        status: 'completed',
        dueDate: yesterday.toISOString()
      });

      const summary = await TaskService.getSummary({
        locationId: testLocation.id
      });

      expect(summary.overdue).toBe(1);
    });

    it('should not count completed tasks as overdue', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await TaskService.createTask({
        title: 'Completed Task',
        type: 'checklist',
        locationId: testLocation.id,
        status: 'completed',
        dueDate: yesterday.toISOString()
      });

      const summary = await TaskService.getSummary({
        locationId: testLocation.id
      });

      expect(summary.overdue).toBe(0);
    });
  });

  describe('calculateNextDueDate', () => {
    it('should calculate next daily occurrence', () => {
      const currentDate = new Date('2025-10-20T10:00:00Z');
      const nextDate = TaskService.calculateNextDueDate(currentDate, 'daily');

      expect(nextDate.toISOString()).toBe(new Date('2025-10-21T10:00:00Z').toISOString());
    });

    it('should calculate next weekly occurrence', () => {
      const currentDate = new Date('2025-10-20T10:00:00Z');
      const nextDate = TaskService.calculateNextDueDate(currentDate, 'weekly');

      expect(nextDate.toISOString()).toBe(new Date('2025-10-27T10:00:00Z').toISOString());
    });

    it('should calculate next monthly occurrence', () => {
      const currentDate = new Date('2025-10-20T10:00:00Z');
      const nextDate = TaskService.calculateNextDueDate(currentDate, 'monthly');

      expect(nextDate.getMonth()).toBe(10); // November (0-indexed)
      expect(nextDate.getDate()).toBe(20);
    });

    it('should default to daily for unknown pattern', () => {
      const currentDate = new Date('2025-10-20T10:00:00Z');
      const nextDate = TaskService.calculateNextDueDate(currentDate, 'unknown');

      expect(nextDate.toISOString()).toBe(new Date('2025-10-21T10:00:00Z').toISOString());
    });
  });

  describe('getOverdueTasks', () => {
    it('should return only overdue tasks', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Overdue
      await TaskService.createTask({
        title: 'Overdue 1',
        type: 'checklist',
        locationId: testLocation.id,
        status: 'pending',
        dueDate: yesterday.toISOString()
      });

      // Not overdue
      await TaskService.createTask({
        title: 'Future',
        type: 'checklist',
        locationId: testLocation.id,
        status: 'pending',
        dueDate: tomorrow.toISOString()
      });

      // Completed (not included)
      await TaskService.createTask({
        title: 'Completed',
        type: 'checklist',
        locationId: testLocation.id,
        status: 'completed',
        dueDate: yesterday.toISOString()
      });

      const overdueTasks = await TaskService.getOverdueTasks();

      expect(overdueTasks).toHaveLength(1);
      expect(overdueTasks[0].title).toBe('Overdue 1');
    });

    it('should return empty array when no overdue tasks', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await TaskService.createTask({
        title: 'Future Task',
        type: 'checklist',
        locationId: testLocation.id,
        status: 'pending',
        dueDate: tomorrow.toISOString()
      });

      const overdueTasks = await TaskService.getOverdueTasks();

      expect(overdueTasks).toHaveLength(0);
    });

    it('should sort by due date ascending', async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      await TaskService.createTask({
        title: 'More Overdue',
        type: 'checklist',
        locationId: testLocation.id,
        status: 'pending',
        dueDate: threeDaysAgo.toISOString()
      });

      await TaskService.createTask({
        title: 'Less Overdue',
        type: 'checklist',
        locationId: testLocation.id,
        status: 'pending',
        dueDate: oneDayAgo.toISOString()
      });

      const overdueTasks = await TaskService.getOverdueTasks();

      expect(overdueTasks).toHaveLength(2);
      expect(overdueTasks[0].title).toBe('More Overdue');
      expect(overdueTasks[1].title).toBe('Less Overdue');
    });
  });

  describe('formatTask', () => {
    it('should convert database row to API format', () => {
      const dbRow = {
        id: 'task-1',
        title: 'Test Task',
        description: 'Description',
        type: 'checklist',
        category: 'food_safety',
        location_id: 'loc-1',
        assigned_to: 'user-1',
        priority: 'high',
        status: 'pending',
        due_date: '2025-10-25',
        completed_at: null,
        completed_by: null,
        recurring: true,
        recurrence_pattern: 'daily',
        recurrence_interval: 1,
        requires_photo_verification: true,
        photo_urls: ['photo1.jpg'],
        requires_signature: false,
        signature_url: null,
        checklist_items: ['item1', 'item2'],
        notes: 'Test notes',
        corrective_actions: [],
        metadata: { key: 'value' },
        created_at: '2025-10-20',
        updated_at: '2025-10-20'
      };

      const formatted = TaskService.formatTask(dbRow);

      expect(formatted).toEqual({
        id: 'task-1',
        title: 'Test Task',
        description: 'Description',
        type: 'checklist',
        category: 'food_safety',
        locationId: 'loc-1',
        assignedTo: 'user-1',
        priority: 'high',
        status: 'pending',
        dueDate: '2025-10-25',
        completedAt: null,
        completedBy: null,
        recurring: true,
        recurrencePattern: 'daily',
        recurrenceInterval: 1,
        requiresPhotoVerification: true,
        photoUrls: ['photo1.jpg'],
        requiresSignature: false,
        signatureUrl: null,
        checklistItems: ['item1', 'item2'],
        notes: 'Test notes',
        correctiveActions: [],
        metadata: { key: 'value' },
        createdAt: '2025-10-20',
        updatedAt: '2025-10-20'
      });
    });

    it('should handle null and empty values', () => {
      const dbRow = {
        id: 'task-1',
        title: 'Test Task',
        description: null,
        type: 'checklist',
        category: null,
        location_id: 'loc-1',
        assigned_to: null,
        priority: 'medium',
        status: 'pending',
        due_date: null,
        completed_at: null,
        completed_by: null,
        recurring: false,
        recurrence_pattern: null,
        recurrence_interval: null,
        requires_photo_verification: false,
        photo_urls: null,
        requires_signature: false,
        signature_url: null,
        checklist_items: null,
        notes: '',
        corrective_actions: null,
        metadata: null,
        created_at: '2025-10-20',
        updated_at: '2025-10-20'
      };

      const formatted = TaskService.formatTask(dbRow);

      expect(formatted.description).toBeNull();
      expect(formatted.assignedTo).toBeNull();
      expect(formatted.photoUrls).toEqual([]);
      expect(formatted.checklistItems).toEqual([]);
      expect(formatted.correctiveActions).toEqual([]);
      expect(formatted.metadata).toEqual({});
    });
  });

  describe('createNextRecurrence', () => {
    it('should create next occurrence for daily task', async () => {
      const task = await TaskService.createTask({
        title: 'Daily Opening',
        type: 'opening',
        locationId: testLocation.id,
        dueDate: '2025-10-20T09:00:00Z',
        recurring: true,
        recurrencePattern: 'daily'
      });

      await TaskService.createNextRecurrence(task);

      const tasks = await TaskService.getTasks({ locationId: testLocation.id });

      // Should have 2 tasks: original + next occurrence
      expect(tasks.length).toBeGreaterThanOrEqual(2);

      const nextTask = tasks.find(t => t.id !== task.id && t.title === task.title);
      expect(nextTask).toBeDefined();
    });

    it('should preserve task properties in recurrence', async () => {
      const task = await TaskService.createTask({
        title: 'Weekly Check',
        description: 'Weekly safety check',
        type: 'checklist',
        category: 'food_safety',
        locationId: testLocation.id,
        assignedTo: testUser.id,
        priority: 'high',
        dueDate: '2025-10-20T09:00:00Z',
        recurring: true,
        recurrencePattern: 'weekly',
        requiresPhotoVerification: true
      });

      await TaskService.createNextRecurrence(task);

      const tasks = await TaskService.getTasks({ locationId: testLocation.id });
      const nextTask = tasks.find(t => t.id !== task.id && t.title === task.title);

      expect(nextTask).toMatchObject({
        title: task.title,
        description: task.description,
        type: task.type,
        category: task.category,
        assignedTo: task.assignedTo,
        priority: task.priority,
        recurring: true,
        recurrencePattern: 'weekly',
        requiresPhotoVerification: true
      });
    });
  });

  describe('completeTask', () => {
    it('should mark task as completed', async () => {
      const task = await TaskService.createTask({
        title: 'Task to Complete',
        type: 'checklist',
        locationId: testLocation.id
      });

      const completed = await TaskService.completeTask(task.id, {
        userId: testUser.id,
        notes: 'All done'
      });

      expect(completed.status).toBe('completed');
      expect(completed.completedBy).toBe(testUser.id);
      expect(completed.completedAt).toBeDefined();
    });

    it('should create next recurrence for recurring tasks', async () => {
      const task = await TaskService.createTask({
        title: 'Recurring Task',
        type: 'checklist',
        locationId: testLocation.id,
        dueDate: '2025-10-20T09:00:00Z',
        recurring: true,
        recurrencePattern: 'daily'
      });

      await TaskService.completeTask(task.id, {
        userId: testUser.id
      });

      const tasks = await TaskService.getTasks({ locationId: testLocation.id });

      // Should have at least 2 tasks: completed + next occurrence
      expect(tasks.length).toBeGreaterThanOrEqual(2);

      const completedTask = tasks.find(t => t.id === task.id);
      expect(completedTask.status).toBe('completed');

      const nextTask = tasks.find(t => t.id !== task.id && t.title === task.title);
      expect(nextTask).toBeDefined();
      expect(nextTask.status).toBe('pending');
    });

    it('should not create recurrence for non-recurring tasks', async () => {
      const task = await TaskService.createTask({
        title: 'One-time Task',
        type: 'checklist',
        locationId: testLocation.id,
        recurring: false
      });

      await TaskService.completeTask(task.id, {
        userId: testUser.id
      });

      const tasks = await TaskService.getTasks({ locationId: testLocation.id });

      // Should only have 1 task
      expect(tasks).toHaveLength(1);
      expect(tasks[0].status).toBe('completed');
    });

    it('should store photos and signature', async () => {
      const task = await TaskService.createTask({
        title: 'Task with verification',
        type: 'checklist',
        locationId: testLocation.id,
        requiresPhotoVerification: true,
        requiresSignature: true
      });

      const completed = await TaskService.completeTask(task.id, {
        userId: testUser.id,
        photos: ['photo1.jpg', 'photo2.jpg'],
        signature: 'signature.png',
        notes: 'Verified'
      });

      expect(completed.photoUrls).toEqual(['photo1.jpg', 'photo2.jpg']);
      expect(completed.signatureUrl).toBe('signature.png');
    });

    it('should return null for non-existent task', async () => {
      const result = await TaskService.completeTask('non-existent-id', {
        userId: testUser.id
      });

      expect(result).toBeNull();
    });
  });

  describe('getTasks with filters', () => {
    beforeEach(async () => {
      await TaskService.createTask({
        title: 'Task 1',
        type: 'checklist',
        locationId: testLocation.id,
        status: 'pending',
        assignedTo: testUser.id,
        dueDate: '2025-10-25'
      });

      await TaskService.createTask({
        title: 'Task 2',
        type: 'line_check',
        locationId: testLocation.id,
        status: 'completed',
        dueDate: '2025-10-26'
      });
    });

    it('should filter by status', async () => {
      const tasks = await TaskService.getTasks({
        locationId: testLocation.id,
        status: 'pending'
      });

      expect(tasks).toHaveLength(1);
      expect(tasks[0].status).toBe('pending');
    });

    it('should filter by type', async () => {
      const tasks = await TaskService.getTasks({
        locationId: testLocation.id,
        type: 'line_check'
      });

      expect(tasks).toHaveLength(1);
      expect(tasks[0].type).toBe('line_check');
    });

    it('should filter by assignedTo', async () => {
      const tasks = await TaskService.getTasks({
        locationId: testLocation.id,
        assignedTo: testUser.id
      });

      expect(tasks).toHaveLength(1);
      expect(tasks[0].assignedTo).toBe(testUser.id);
    });

    it('should filter by dueDate', async () => {
      const tasks = await TaskService.getTasks({
        locationId: testLocation.id,
        dueDate: '2025-10-25'
      });

      expect(tasks).toHaveLength(1);
    });

    it('should sort by due date and priority', async () => {
      await TaskService.createTask({
        title: 'High Priority Late',
        type: 'checklist',
        locationId: testLocation.id,
        priority: 'high',
        dueDate: '2025-10-30'
      });

      await TaskService.createTask({
        title: 'Low Priority Early',
        type: 'checklist',
        locationId: testLocation.id,
        priority: 'low',
        dueDate: '2025-10-23'
      });

      const tasks = await TaskService.getTasks({
        locationId: testLocation.id
      });

      // Should be sorted by due date ASC, then priority DESC
      expect(tasks[0].title).toBe('Low Priority Early');
    });
  });
});
