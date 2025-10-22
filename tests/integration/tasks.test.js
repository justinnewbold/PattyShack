/**
 * Tasks API Integration Tests
 */

const request = require('supertest');
const { createTestApp } = require('../helpers/testApp');
const {
  setupTestDatabase,
  clearTestDatabase,
  teardownTestDatabase,
  createTestUser,
  createTestLocation,
  createTestTask
} = require('../helpers/testDb');
const { initializePool } = require('../../src/database/pool');

describe('Tasks API', () => {
  let app;
  let testLocation;
  let testUser;

  beforeAll(async () => {
    // Initialize database pool
    initializePool();

    // Setup test database schema
    await setupTestDatabase();

    // Create test app
    app = createTestApp();
  });

  beforeEach(async () => {
    // Clear data before each test
    await clearTestDatabase();

    // Create test fixtures
    testLocation = await createTestLocation({
      id: 'test-location-1',
      code: 'TEST-001',
      name: 'Test Location'
    });

    testUser = await createTestUser({
      id: 'test-user-1',
      username: 'testmanager',
      email: 'manager@test.com',
      role: 'manager',
      location_id: testLocation.id
    });
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('POST /api/v1/tasks', () => {
    it('should create a new task', async () => {
      const taskData = {
        title: 'Morning Line Check',
        description: 'Check all equipment',
        type: 'line_check',
        category: 'food_safety',
        locationId: testLocation.id,
        assignedTo: testUser.id,
        priority: 'high',
        dueDate: new Date().toISOString()
      };

      const response = await request(app)
        .post('/api/v1/tasks')
        .send(taskData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe(taskData.title);
      expect(response.body.data.type).toBe(taskData.type);
      expect(response.body.data.status).toBe('pending');
    });

    it('should create a recurring task', async () => {
      const taskData = {
        title: 'Daily Opening Checklist',
        type: 'opening',
        locationId: testLocation.id,
        recurring: true,
        recurrencePattern: 'daily',
        dueDate: new Date().toISOString()
      };

      const response = await request(app)
        .post('/api/v1/tasks')
        .send(taskData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.recurring).toBe(true);
      expect(response.body.data.recurrencePattern).toBe('daily');
    });

    it('should reject task without required fields', async () => {
      const taskData = {
        title: 'Incomplete Task'
        // Missing locationId and type
      };

      const response = await request(app)
        .post('/api/v1/tasks')
        .send(taskData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/v1/tasks', () => {
    beforeEach(async () => {
      // Create multiple test tasks
      await createTestTask({
        id: 'task-1',
        title: 'Task 1',
        type: 'checklist',
        location_id: testLocation.id,
        status: 'pending'
      });

      await createTestTask({
        id: 'task-2',
        title: 'Task 2',
        type: 'line_check',
        location_id: testLocation.id,
        status: 'completed'
      });

      await createTestTask({
        id: 'task-3',
        title: 'Task 3',
        type: 'food_safety',
        location_id: testLocation.id,
        assigned_to: testUser.id,
        status: 'in_progress'
      });
    });

    it('should return all tasks', async () => {
      const response = await request(app)
        .get('/api/v1/tasks')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
    });

    it('should filter tasks by location', async () => {
      const response = await request(app)
        .get('/api/v1/tasks')
        .query({ locationId: testLocation.id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      response.body.data.forEach(task => {
        expect(task.locationId).toBe(testLocation.id);
      });
    });

    it('should filter tasks by status', async () => {
      const response = await request(app)
        .get('/api/v1/tasks')
        .query({ status: 'pending' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('pending');
    });

    it('should filter tasks by type', async () => {
      const response = await request(app)
        .get('/api/v1/tasks')
        .query({ type: 'line_check' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].type).toBe('line_check');
    });

    it('should filter tasks by assigned user', async () => {
      const response = await request(app)
        .get('/api/v1/tasks')
        .query({ assignedTo: testUser.id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].assignedTo).toBe(testUser.id);
    });
  });

  describe('GET /api/v1/tasks/:id', () => {
    let testTask;

    beforeEach(async () => {
      testTask = await createTestTask({
        id: 'task-detail-1',
        title: 'Detailed Task',
        type: 'checklist',
        location_id: testLocation.id
      });
    });

    it('should return task by id', async () => {
      const response = await request(app)
        .get(`/api/v1/tasks/${testTask.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testTask.id);
      expect(response.body.data.title).toBe(testTask.title);
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .get('/api/v1/tasks/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/tasks/:id', () => {
    let testTask;

    beforeEach(async () => {
      testTask = await createTestTask({
        id: 'task-update-1',
        title: 'Original Title',
        type: 'checklist',
        location_id: testLocation.id,
        priority: 'medium'
      });
    });

    it('should update task properties', async () => {
      const updates = {
        title: 'Updated Title',
        priority: 'high',
        notes: 'Updated notes'
      };

      const response = await request(app)
        .put(`/api/v1/tasks/${testTask.id}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updates.title);
      expect(response.body.data.priority).toBe(updates.priority);
      expect(response.body.data.notes).toBe(updates.notes);
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .put('/api/v1/tasks/non-existent-id')
        .send({ title: 'New Title' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/tasks/:id/complete', () => {
    let testTask;

    beforeEach(async () => {
      testTask = await createTestTask({
        id: 'task-complete-1',
        title: 'Task to Complete',
        type: 'checklist',
        location_id: testLocation.id,
        status: 'in_progress'
      });
    });

    it('should complete a task', async () => {
      const completionData = {
        userId: testUser.id,
        notes: 'Task completed successfully'
      };

      const response = await request(app)
        .post(`/api/v1/tasks/${testTask.id}/complete`)
        .send(completionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.completedBy).toBe(testUser.id);
      expect(response.body.data.completedAt).toBeDefined();
    });

    it('should complete a task with photos', async () => {
      const completionData = {
        userId: testUser.id,
        photos: ['photo1.jpg', 'photo2.jpg']
      };

      const response = await request(app)
        .post(`/api/v1/tasks/${testTask.id}/complete`)
        .send(completionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.photoUrls).toHaveLength(2);
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .post('/api/v1/tasks/non-existent-id/complete')
        .send({ userId: testUser.id })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    let testTask;

    beforeEach(async () => {
      testTask = await createTestTask({
        id: 'task-delete-1',
        title: 'Task to Delete',
        type: 'checklist',
        location_id: testLocation.id
      });
    });

    it('should delete a task', async () => {
      const response = await request(app)
        .delete(`/api/v1/tasks/${testTask.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify task is deleted
      const getResponse = await request(app)
        .get(`/api/v1/tasks/${testTask.id}`)
        .expect(404);
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .delete('/api/v1/tasks/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
