/**
 * Location Management API Integration Tests
 */

const request = require('supertest');
const { createTestApp } = require('../helpers/testApp');
const {
  setupTestDatabase,
  clearTestDatabase,
  teardownTestDatabase,
  createTestUser,
  createTestLocation,
  createTestTask,
  getTestPool
} = require('../helpers/testDb');

describe('Location Management API', () => {
  let app;
  let managerToken;
  let regionalToken;
  let crewToken;
  let testManager;
  let testRegional;
  let testCrew;

  beforeAll(async () => {
    // Setup test database schema
    await setupTestDatabase();

    // Create test app
    app = createTestApp();
  });

  beforeEach(async () => {
    // Clear data before each test
    await clearTestDatabase();

    // Create test users with different roles and get tokens
    const managerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: 'testmanager',
        email: 'manager@test.com',
        password: 'password123',
        role: 'manager',
        firstName: 'Test',
        lastName: 'Manager'
      });

    managerToken = managerResponse.body.data.accessToken;
    testManager = managerResponse.body.data.user;

    const regionalResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: 'testregional',
        email: 'regional@test.com',
        password: 'password123',
        role: 'regional',
        firstName: 'Test',
        lastName: 'Regional'
      });

    regionalToken = regionalResponse.body.data.accessToken;
    testRegional = regionalResponse.body.data.user;

    const crewResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: 'testcrew',
        email: 'crew@test.com',
        password: 'password123',
        role: 'crew',
        firstName: 'Test',
        lastName: 'Crew'
      });

    crewToken = crewResponse.body.data.accessToken;
    testCrew = crewResponse.body.data.user;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('GET /api/v1/locations', () => {
    beforeEach(async () => {
      // Create test locations with different hierarchy levels
      await createTestLocation({
        id: 'loc-1',
        code: 'LOC-001',
        name: 'Location 1',
        type: 'corporate',
        brand_id: 'brand-a',
        district_id: 'district-1',
        region_id: 'region-1',
        active: true
      });

      await createTestLocation({
        id: 'loc-2',
        code: 'LOC-002',
        name: 'Location 2',
        type: 'franchise',
        brand_id: 'brand-a',
        district_id: 'district-1',
        region_id: 'region-1',
        active: true
      });

      await createTestLocation({
        id: 'loc-3',
        code: 'LOC-003',
        name: 'Location 3',
        type: 'corporate',
        brand_id: 'brand-a',
        district_id: 'district-2',
        region_id: 'region-1',
        active: true
      });

      await createTestLocation({
        id: 'loc-4',
        code: 'LOC-004',
        name: 'Location 4',
        type: 'corporate',
        brand_id: 'brand-b',
        district_id: 'district-3',
        region_id: 'region-2',
        active: true
      });

      await createTestLocation({
        id: 'loc-5',
        code: 'LOC-005',
        name: 'Location 5 (Inactive)',
        type: 'corporate',
        brand_id: 'brand-a',
        district_id: 'district-1',
        region_id: 'region-1',
        active: false
      });
    });

    it('should return all active locations', async () => {
      const response = await request(app)
        .get('/api/v1/locations')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.locations).toHaveLength(4);
      expect(response.body.data.hierarchy).toBeDefined();
      expect(response.body.data.hierarchy.brands).toContain('brand-a');
      expect(response.body.data.hierarchy.brands).toContain('brand-b');
    });

    it('should filter locations by district', async () => {
      const response = await request(app)
        .get('/api/v1/locations')
        .query({ districtId: 'district-1' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.locations).toHaveLength(2);
      response.body.data.locations.forEach(loc => {
        expect(loc.districtId).toBe('district-1');
      });
    });

    it('should filter locations by region', async () => {
      const response = await request(app)
        .get('/api/v1/locations')
        .query({ regionId: 'region-1' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.locations).toHaveLength(3);
      response.body.data.locations.forEach(loc => {
        expect(loc.regionId).toBe('region-1');
      });
    });

    it('should filter locations by brand', async () => {
      const response = await request(app)
        .get('/api/v1/locations')
        .query({ brandId: 'brand-a' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.locations).toHaveLength(3);
      response.body.data.locations.forEach(loc => {
        expect(loc.brandId).toBe('brand-a');
      });
    });

    it('should filter locations by type', async () => {
      const response = await request(app)
        .get('/api/v1/locations')
        .query({ type: 'franchise' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.locations).toHaveLength(1);
      expect(response.body.data.locations[0].type).toBe('franchise');
    });

    it('should filter locations by active status', async () => {
      const response = await request(app)
        .get('/api/v1/locations')
        .query({ active: 'false' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.locations).toHaveLength(1);
      expect(response.body.data.locations[0].active).toBe(false);
    });

    it('should filter locations by manager', async () => {
      await createTestLocation({
        id: 'loc-6',
        code: 'LOC-006',
        name: 'Location 6',
        manager_id: testManager.id,
        active: true
      });

      const response = await request(app)
        .get('/api/v1/locations')
        .query({ managerId: testManager.id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.locations).toHaveLength(1);
      expect(response.body.data.locations[0].managerId).toBe(testManager.id);
    });

    it('should combine multiple filters', async () => {
      const response = await request(app)
        .get('/api/v1/locations')
        .query({
          brandId: 'brand-a',
          districtId: 'district-1',
          type: 'corporate'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.locations).toHaveLength(1);
      expect(response.body.data.locations[0].code).toBe('LOC-001');
    });
  });

  describe('GET /api/v1/locations/:id', () => {
    let testLocation;

    beforeEach(async () => {
      testLocation = await createTestLocation({
        id: 'test-location-1',
        code: 'TEST-001',
        name: 'Test Location',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zip: '12345',
        phone: '555-1234',
        type: 'corporate',
        brand_id: 'brand-1',
        district_id: 'district-1',
        region_id: 'region-1',
        timezone: 'America/New_York',
        active: true
      });
    });

    it('should return location by id', async () => {
      const response = await request(app)
        .get(`/api/v1/locations/${testLocation.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testLocation.id);
      expect(response.body.data.name).toBe(testLocation.name);
      expect(response.body.data.code).toBe(testLocation.code);
      expect(response.body.data.address).toBe(testLocation.address);
      expect(response.body.data.city).toBe(testLocation.city);
      expect(response.body.data.state).toBe(testLocation.state);
      expect(response.body.data.zip).toBe(testLocation.zip);
      expect(response.body.data.type).toBe(testLocation.type);
      expect(response.body.data.brandId).toBe(testLocation.brand_id);
      expect(response.body.data.districtId).toBe(testLocation.district_id);
      expect(response.body.data.regionId).toBe(testLocation.region_id);
    });

    it('should return 404 for non-existent location', async () => {
      const response = await request(app)
        .get('/api/v1/locations/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Location not found');
    });

    it('should return inactive locations', async () => {
      const inactiveLocation = await createTestLocation({
        id: 'inactive-location',
        code: 'INACTIVE-001',
        name: 'Inactive Location',
        active: false
      });

      const response = await request(app)
        .get(`/api/v1/locations/${inactiveLocation.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.active).toBe(false);
    });
  });

  describe('POST /api/v1/locations', () => {
    it('should create a new location with manager role', async () => {
      const locationData = {
        name: 'New Location',
        code: 'NEW-001',
        address: '456 New St',
        city: 'New City',
        state: 'NC',
        zip: '54321',
        phone: '555-5678',
        type: 'corporate',
        brandId: 'brand-1',
        districtId: 'district-1',
        regionId: 'region-1',
        timezone: 'America/Chicago'
      };

      const response = await request(app)
        .post('/api/v1/locations')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(locationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(locationData.name);
      expect(response.body.data.code).toBe(locationData.code);
      expect(response.body.data.address).toBe(locationData.address);
      expect(response.body.data.type).toBe(locationData.type);
      expect(response.body.data.active).toBe(true);
      expect(response.body.message).toBe('Location created successfully');
    });

    it('should create a new location with regional role', async () => {
      const locationData = {
        name: 'Regional Location',
        code: 'REG-001'
      };

      const response = await request(app)
        .post('/api/v1/locations')
        .set('Authorization', `Bearer ${regionalToken}`)
        .send(locationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(locationData.name);
    });

    it('should create franchise location', async () => {
      const locationData = {
        name: 'Franchise Location',
        code: 'FRAN-001',
        type: 'franchise'
      };

      const response = await request(app)
        .post('/api/v1/locations')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(locationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('franchise');
    });

    it('should use default values for optional fields', async () => {
      const locationData = {
        name: 'Minimal Location',
        code: 'MIN-001'
      };

      const response = await request(app)
        .post('/api/v1/locations')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(locationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('corporate');
      expect(response.body.data.timezone).toBe('America/New_York');
      expect(response.body.data.active).toBe(true);
    });

    it('should reject location without name', async () => {
      const locationData = {
        code: 'NO-NAME-001'
      };

      const response = await request(app)
        .post('/api/v1/locations')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(locationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Name and code are required');
    });

    it('should reject location without code', async () => {
      const locationData = {
        name: 'No Code Location'
      };

      const response = await request(app)
        .post('/api/v1/locations')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(locationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Name and code are required');
    });

    it('should reject creation without authentication', async () => {
      const locationData = {
        name: 'Unauthorized Location',
        code: 'UNAUTH-001'
      };

      const response = await request(app)
        .post('/api/v1/locations')
        .send(locationData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject creation with crew role', async () => {
      const locationData = {
        name: 'Crew Location',
        code: 'CREW-001'
      };

      const response = await request(app)
        .post('/api/v1/locations')
        .set('Authorization', `Bearer ${crewToken}`)
        .send(locationData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should store metadata as JSON', async () => {
      const locationData = {
        name: 'Metadata Location',
        code: 'META-001',
        metadata: {
          seatingCapacity: 50,
          driveThru: true,
          parkingSpaces: 20
        }
      };

      const response = await request(app)
        .post('/api/v1/locations')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(locationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.metadata).toEqual(locationData.metadata);
    });
  });

  describe('PUT /api/v1/locations/:id', () => {
    let testLocation;

    beforeEach(async () => {
      testLocation = await createTestLocation({
        id: 'update-location-1',
        code: 'UPDATE-001',
        name: 'Original Name',
        address: 'Original Address',
        type: 'corporate',
        active: true
      });
    });

    it('should update location properties with manager role', async () => {
      const updates = {
        name: 'Updated Name',
        address: 'Updated Address',
        phone: '555-9999'
      };

      const response = await request(app)
        .put(`/api/v1/locations/${testLocation.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updates.name);
      expect(response.body.data.address).toBe(updates.address);
      expect(response.body.data.phone).toBe(updates.phone);
      expect(response.body.message).toBe('Location updated successfully');
    });

    it('should update location with regional role', async () => {
      const updates = {
        name: 'Regional Updated'
      };

      const response = await request(app)
        .put(`/api/v1/locations/${testLocation.id}`)
        .set('Authorization', `Bearer ${regionalToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updates.name);
    });

    it('should update location type', async () => {
      const updates = {
        type: 'franchise'
      };

      const response = await request(app)
        .put(`/api/v1/locations/${testLocation.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('franchise');
    });

    it('should update manager assignment', async () => {
      const updates = {
        managerId: testManager.id
      };

      const response = await request(app)
        .put(`/api/v1/locations/${testLocation.id}`)
        .set('Authorization', `Bearer ${regionalToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.managerId).toBe(testManager.id);
    });

    it('should update metadata', async () => {
      const updates = {
        metadata: {
          renovated: true,
          renovationDate: '2024-01-15'
        }
      };

      const response = await request(app)
        .put(`/api/v1/locations/${testLocation.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.metadata).toEqual(updates.metadata);
    });

    it('should preserve unchanged fields', async () => {
      const updates = {
        name: 'New Name Only'
      };

      const response = await request(app)
        .put(`/api/v1/locations/${testLocation.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updates.name);
      expect(response.body.data.code).toBe(testLocation.code);
      expect(response.body.data.type).toBe(testLocation.type);
    });

    it('should return 404 for non-existent location', async () => {
      const response = await request(app)
        .put('/api/v1/locations/non-existent-id')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: 'New Name' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Location not found');
    });

    it('should reject update without authentication', async () => {
      const response = await request(app)
        .put(`/api/v1/locations/${testLocation.id}`)
        .send({ name: 'Unauthorized Update' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject update with crew role', async () => {
      const response = await request(app)
        .put(`/api/v1/locations/${testLocation.id}`)
        .set('Authorization', `Bearer ${crewToken}`)
        .send({ name: 'Crew Update' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/locations/:id', () => {
    let testLocation;

    beforeEach(async () => {
      testLocation = await createTestLocation({
        id: 'delete-location-1',
        code: 'DELETE-001',
        name: 'Location to Delete',
        active: true
      });
    });

    it('should soft delete location with regional role', async () => {
      const response = await request(app)
        .delete(`/api/v1/locations/${testLocation.id}`)
        .set('Authorization', `Bearer ${regionalToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Location deactivated successfully');

      // Verify location is deactivated
      const getResponse = await request(app)
        .get(`/api/v1/locations/${testLocation.id}`)
        .expect(200);

      expect(getResponse.body.data.active).toBe(false);
    });

    it('should return 404 for non-existent location', async () => {
      const response = await request(app)
        .delete('/api/v1/locations/non-existent-id')
        .set('Authorization', `Bearer ${regionalToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Location not found');
    });

    it('should reject deletion without authentication', async () => {
      const response = await request(app)
        .delete(`/api/v1/locations/${testLocation.id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject deletion with manager role', async () => {
      const response = await request(app)
        .delete(`/api/v1/locations/${testLocation.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should reject deletion with crew role', async () => {
      const response = await request(app)
        .delete(`/api/v1/locations/${testLocation.id}`)
        .set('Authorization', `Bearer ${crewToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/locations/:id/scorecard', () => {
    let testLocation;

    beforeEach(async () => {
      testLocation = await createTestLocation({
        id: 'scorecard-location-1',
        code: 'SCORE-001',
        name: 'Scorecard Location'
      });
    });

    it('should return scorecard with default metrics when no data exists', async () => {
      const response = await request(app)
        .get(`/api/v1/locations/${testLocation.id}/scorecard`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.locationId).toBe(testLocation.id);
      expect(response.body.data.period).toBeDefined();
      expect(response.body.data.period.label).toBe('7d');
      expect(response.body.data.scores).toBeDefined();
      expect(response.body.data.scores.compliance).toBe(100);
      expect(response.body.data.scores.foodSafety).toBe(100);
      expect(response.body.data.scores.operations).toBe(100);
      expect(response.body.data.scores.inventoryAccuracy).toBe(100);
      expect(response.body.data.scores.overall).toBe(100);
      expect(response.body.data.metrics).toBeDefined();
    });

    it('should calculate compliance score based on task completion', async () => {
      const pool = getTestPool();

      // Create tasks: 3 completed, 2 pending
      await createTestTask({
        id: 'task-1',
        title: 'Task 1',
        type: 'checklist',
        location_id: testLocation.id,
        status: 'completed'
      });

      await createTestTask({
        id: 'task-2',
        title: 'Task 2',
        type: 'checklist',
        location_id: testLocation.id,
        status: 'completed'
      });

      await createTestTask({
        id: 'task-3',
        title: 'Task 3',
        type: 'checklist',
        location_id: testLocation.id,
        status: 'completed'
      });

      await createTestTask({
        id: 'task-4',
        title: 'Task 4',
        type: 'checklist',
        location_id: testLocation.id,
        status: 'pending'
      });

      await createTestTask({
        id: 'task-5',
        title: 'Task 5',
        type: 'checklist',
        location_id: testLocation.id,
        status: 'in_progress'
      });

      const response = await request(app)
        .get(`/api/v1/locations/${testLocation.id}/scorecard`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.scores.compliance).toBe(60); // 3/5 = 60%
      expect(response.body.data.metrics.tasksTotal).toBe(5);
      expect(response.body.data.metrics.tasksCompleted).toBe(3);
    });

    it('should calculate food safety score based on temperature compliance', async () => {
      const pool = getTestPool();

      // Create temperature logs: 4 in range, 1 out of range
      await pool.query(`
        INSERT INTO temperature_logs (id, location_id, equipment_id, equipment_type, temperature, unit, threshold_min, threshold_max, is_in_range, recorded_by)
        VALUES
          ('temp-1', $1, 'fridge-1', 'refrigerator', 38, 'F', 33, 41, true, $2),
          ('temp-2', $1, 'fridge-1', 'refrigerator', 39, 'F', 33, 41, true, $2),
          ('temp-3', $1, 'fridge-1', 'refrigerator', 37, 'F', 33, 41, true, $2),
          ('temp-4', $1, 'fridge-1', 'refrigerator', 36, 'F', 33, 41, true, $2),
          ('temp-5', $1, 'fridge-1', 'refrigerator', 50, 'F', 33, 41, false, $2)
      `, [testLocation.id, testManager.id]);

      const response = await request(app)
        .get(`/api/v1/locations/${testLocation.id}/scorecard`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.scores.foodSafety).toBe(80); // 4/5 = 80%
      expect(response.body.data.metrics.temperatureReadings).toBe(5);
      expect(response.body.data.metrics.temperatureCompliance).toBe(4);
    });

    it('should calculate operations score based on schedules', async () => {
      const pool = getTestPool();

      // Create schedules: 7 completed, 2 no-shows, 1 open shift
      for (let i = 1; i <= 7; i++) {
        await pool.query(`
          INSERT INTO schedules (id, location_id, user_id, shift_date, shift_start, shift_end, role, status)
          VALUES ($1, $2, $3, CURRENT_DATE, '09:00', '17:00', 'crew', 'completed')
        `, [`schedule-${i}`, testLocation.id, testManager.id]);
      }

      await pool.query(`
        INSERT INTO schedules (id, location_id, user_id, shift_date, shift_start, shift_end, role, status)
        VALUES
          ('schedule-8', $1, $2, CURRENT_DATE, '09:00', '17:00', 'crew', 'no_show'),
          ('schedule-9', $1, $2, CURRENT_DATE, '09:00', '17:00', 'crew', 'no_show')
      `, [testLocation.id, testManager.id]);

      await pool.query(`
        INSERT INTO schedules (id, location_id, shift_date, shift_start, shift_end, role, status)
        VALUES ('schedule-10', $1, CURRENT_DATE, '09:00', '17:00', 'crew', 'open')
      `, [testLocation.id]);

      const response = await request(app)
        .get(`/api/v1/locations/${testLocation.id}/scorecard`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // 7/10 = 70%, minus (2 no-shows * 10) + (1 open * 5) = 70 - 25 = 45
      expect(response.body.data.scores.operations).toBe(45);
    });

    it('should calculate inventory accuracy based on waste', async () => {
      const pool = getTestPool();

      // Create inventory items
      await pool.query(`
        INSERT INTO inventory_items (id, location_id, name, category, unit_of_measure, current_quantity, reorder_point)
        VALUES
          ('item-1', $1, 'Item 1', 'food', 'lb', 100, 20),
          ('item-2', $1, 'Item 2', 'food', 'lb', 50, 10)
      `, [testLocation.id]);

      // Create waste logs (5 waste entries)
      for (let i = 1; i <= 5; i++) {
        await pool.query(`
          INSERT INTO inventory_counts (id, location_id, inventory_item_id, count_type, quantity, recorded_by, reason)
          VALUES ($1, $2, 'item-1', 'waste', 2, $3, 'Spoilage')
        `, [`waste-${i}`, testLocation.id, testManager.id]);
      }

      const response = await request(app)
        .get(`/api/v1/locations/${testLocation.id}/scorecard`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // 5 waste entries * 2 penalty = 10, 100 - 10 = 90
      expect(response.body.data.scores.inventoryAccuracy).toBe(90);
      expect(response.body.data.metrics.wasteCount).toBe(5);
    });

    it('should calculate overall score as average of all scores', async () => {
      const pool = getTestPool();

      // Create mixed data for realistic overall score
      // 2 tasks: 1 completed (50% compliance)
      await createTestTask({
        id: 'task-overall-1',
        location_id: testLocation.id,
        status: 'completed'
      });
      await createTestTask({
        id: 'task-overall-2',
        location_id: testLocation.id,
        status: 'pending'
      });

      // 2 temp readings: both in range (100% food safety)
      await pool.query(`
        INSERT INTO temperature_logs (id, location_id, equipment_id, equipment_type, temperature, unit, threshold_min, threshold_max, is_in_range, recorded_by)
        VALUES
          ('temp-overall-1', $1, 'fridge-1', 'refrigerator', 38, 'F', 33, 41, true, $2),
          ('temp-overall-2', $1, 'fridge-1', 'refrigerator', 39, 'F', 33, 41, true, $2)
      `, [testLocation.id, testManager.id]);

      // 3 schedules: all completed (100% operations, no penalties)
      for (let i = 1; i <= 3; i++) {
        await pool.query(`
          INSERT INTO schedules (id, location_id, user_id, shift_date, shift_start, shift_end, role, status)
          VALUES ($1, $2, $3, CURRENT_DATE, '09:00', '17:00', 'crew', 'completed')
        `, [`schedule-overall-${i}`, testLocation.id, testManager.id]);
      }

      // 2 waste entries (96% inventory accuracy)
      await pool.query(`
        INSERT INTO inventory_items (id, location_id, name, category, unit_of_measure, current_quantity, reorder_point)
        VALUES ('item-overall-1', $1, 'Item 1', 'food', 'lb', 100, 20)
      `, [testLocation.id]);

      await pool.query(`
        INSERT INTO inventory_counts (id, location_id, inventory_item_id, count_type, quantity, recorded_by, reason)
        VALUES
          ('waste-overall-1', $1, 'item-overall-1', 'waste', 1, $2, 'Spoilage'),
          ('waste-overall-2', $1, 'item-overall-1', 'waste', 1, $2, 'Spoilage')
      `, [testLocation.id, testManager.id]);

      const response = await request(app)
        .get(`/api/v1/locations/${testLocation.id}/scorecard`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Compliance: 50%, Food Safety: 100%, Operations: 100%, Inventory: 96%
      // Overall: (50 + 100 + 100 + 96) / 4 = 86.5 -> rounded to 87
      expect(response.body.data.scores.overall).toBeGreaterThanOrEqual(85);
      expect(response.body.data.scores.overall).toBeLessThanOrEqual(87);
    });

    it('should support different time periods (24h)', async () => {
      const response = await request(app)
        .get(`/api/v1/locations/${testLocation.id}/scorecard`)
        .query({ period: '24h' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.period.label).toBe('24h');
    });

    it('should support different time periods (30d)', async () => {
      const response = await request(app)
        .get(`/api/v1/locations/${testLocation.id}/scorecard`)
        .query({ period: '30d' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.period.label).toBe('30d');
    });

    it('should include detailed metrics in response', async () => {
      const response = await request(app)
        .get(`/api/v1/locations/${testLocation.id}/scorecard`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.metrics).toHaveProperty('tasksCompleted');
      expect(response.body.data.metrics).toHaveProperty('tasksTotal');
      expect(response.body.data.metrics).toHaveProperty('tasksOverdue');
      expect(response.body.data.metrics).toHaveProperty('temperatureReadings');
      expect(response.body.data.metrics).toHaveProperty('temperatureCompliance');
      expect(response.body.data.metrics).toHaveProperty('temperatureAlertsActive');
      expect(response.body.data.metrics).toHaveProperty('laborHoursScheduled');
      expect(response.body.data.metrics).toHaveProperty('laborCost');
      expect(response.body.data.metrics).toHaveProperty('wasteCount');
      expect(response.body.data.metrics).toHaveProperty('wasteCost');
    });

    it('should handle location with no data gracefully', async () => {
      const emptyLocation = await createTestLocation({
        id: 'empty-location',
        code: 'EMPTY-001',
        name: 'Empty Location'
      });

      const response = await request(app)
        .get(`/api/v1/locations/${emptyLocation.id}/scorecard`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.scores.overall).toBe(100);
      expect(response.body.data.metrics.tasksTotal).toBe(0);
      expect(response.body.data.metrics.temperatureReadings).toBe(0);
    });
  });

  describe('GET /api/v1/locations/hierarchy/:level/:id', () => {
    beforeEach(async () => {
      // Create hierarchical structure
      await createTestLocation({
        id: 'brand-a-region-1-district-1-loc-1',
        code: 'BA-R1-D1-L1',
        name: 'Brand A, Region 1, District 1, Location 1',
        brand_id: 'brand-a',
        region_id: 'region-1',
        district_id: 'district-1',
        active: true
      });

      await createTestLocation({
        id: 'brand-a-region-1-district-1-loc-2',
        code: 'BA-R1-D1-L2',
        name: 'Brand A, Region 1, District 1, Location 2',
        brand_id: 'brand-a',
        region_id: 'region-1',
        district_id: 'district-1',
        active: true
      });

      await createTestLocation({
        id: 'brand-a-region-1-district-2-loc-1',
        code: 'BA-R1-D2-L1',
        name: 'Brand A, Region 1, District 2, Location 1',
        brand_id: 'brand-a',
        region_id: 'region-1',
        district_id: 'district-2',
        active: true
      });

      await createTestLocation({
        id: 'brand-a-region-2-district-3-loc-1',
        code: 'BA-R2-D3-L1',
        name: 'Brand A, Region 2, District 3, Location 1',
        brand_id: 'brand-a',
        region_id: 'region-2',
        district_id: 'district-3',
        active: true
      });

      await createTestLocation({
        id: 'brand-b-region-3-district-4-loc-1',
        code: 'BB-R3-D4-L1',
        name: 'Brand B, Region 3, District 4, Location 1',
        brand_id: 'brand-b',
        region_id: 'region-3',
        district_id: 'district-4',
        active: true
      });

      // Inactive location should not be included
      await createTestLocation({
        id: 'brand-a-region-1-district-1-loc-3',
        code: 'BA-R1-D1-L3',
        name: 'Brand A, Region 1, District 1, Location 3 (Inactive)',
        brand_id: 'brand-a',
        region_id: 'region-1',
        district_id: 'district-1',
        active: false
      });
    });

    it('should get locations by brand', async () => {
      const response = await request(app)
        .get('/api/v1/locations/hierarchy/brand/brand-a')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.level).toBe('brand');
      expect(response.body.data.id).toBe('brand-a');
      expect(response.body.data.locations).toHaveLength(4);
      response.body.data.locations.forEach(loc => {
        expect(loc.brandId).toBe('brand-a');
        expect(loc.active).toBe(true);
      });
    });

    it('should get locations by region', async () => {
      const response = await request(app)
        .get('/api/v1/locations/hierarchy/region/region-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.level).toBe('region');
      expect(response.body.data.id).toBe('region-1');
      expect(response.body.data.locations).toHaveLength(3);
      response.body.data.locations.forEach(loc => {
        expect(loc.regionId).toBe('region-1');
        expect(loc.active).toBe(true);
      });
    });

    it('should get locations by district', async () => {
      const response = await request(app)
        .get('/api/v1/locations/hierarchy/district/district-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.level).toBe('district');
      expect(response.body.data.id).toBe('district-1');
      expect(response.body.data.locations).toHaveLength(2);
      response.body.data.locations.forEach(loc => {
        expect(loc.districtId).toBe('district-1');
        expect(loc.active).toBe(true);
      });
    });

    it('should return empty array for non-existent hierarchy id', async () => {
      const response = await request(app)
        .get('/api/v1/locations/hierarchy/brand/non-existent-brand')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.locations).toHaveLength(0);
    });

    it('should reject invalid hierarchy level', async () => {
      const response = await request(app)
        .get('/api/v1/locations/hierarchy/invalid-level/some-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid hierarchy level');
    });

    it('should only return active locations', async () => {
      const response = await request(app)
        .get('/api/v1/locations/hierarchy/district/district-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.locations).toHaveLength(2);
      response.body.data.locations.forEach(loc => {
        expect(loc.active).toBe(true);
      });
    });

    it('should return locations sorted by name', async () => {
      const response = await request(app)
        .get('/api/v1/locations/hierarchy/brand/brand-a')
        .expect(200);

      expect(response.body.success).toBe(true);
      const names = response.body.data.locations.map(loc => loc.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });
  });

  describe('Authorization and Permissions', () => {
    let testLocation;

    beforeEach(async () => {
      testLocation = await createTestLocation({
        id: 'auth-test-location',
        code: 'AUTH-001',
        name: 'Auth Test Location'
      });
    });

    it('should allow manager to create and update locations', async () => {
      // Create
      const createResponse = await request(app)
        .post('/api/v1/locations')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: 'Manager Location', code: 'MGR-001' })
        .expect(201);

      expect(createResponse.body.success).toBe(true);

      // Update
      const updateResponse = await request(app)
        .put(`/api/v1/locations/${testLocation.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: 'Updated by Manager' })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
    });

    it('should prevent manager from deleting locations', async () => {
      const response = await request(app)
        .delete(`/api/v1/locations/${testLocation.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should allow regional to create, update, and delete locations', async () => {
      // Create
      const createResponse = await request(app)
        .post('/api/v1/locations')
        .set('Authorization', `Bearer ${regionalToken}`)
        .send({ name: 'Regional Location', code: 'REG-001' })
        .expect(201);

      expect(createResponse.body.success).toBe(true);

      // Update
      const updateResponse = await request(app)
        .put(`/api/v1/locations/${testLocation.id}`)
        .set('Authorization', `Bearer ${regionalToken}`)
        .send({ name: 'Updated by Regional' })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);

      // Delete
      const deleteResponse = await request(app)
        .delete(`/api/v1/locations/${testLocation.id}`)
        .set('Authorization', `Bearer ${regionalToken}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);
    });

    it('should prevent crew from any location management operations', async () => {
      // Create
      const createResponse = await request(app)
        .post('/api/v1/locations')
        .set('Authorization', `Bearer ${crewToken}`)
        .send({ name: 'Crew Location', code: 'CREW-001' })
        .expect(403);

      expect(createResponse.body.success).toBe(false);

      // Update
      const updateResponse = await request(app)
        .put(`/api/v1/locations/${testLocation.id}`)
        .set('Authorization', `Bearer ${crewToken}`)
        .send({ name: 'Updated by Crew' })
        .expect(403);

      expect(updateResponse.body.success).toBe(false);

      // Delete
      const deleteResponse = await request(app)
        .delete(`/api/v1/locations/${testLocation.id}`)
        .set('Authorization', `Bearer ${crewToken}`)
        .expect(403);

      expect(deleteResponse.body.success).toBe(false);
    });

    it('should allow unauthenticated access to read operations', async () => {
      // List locations
      const listResponse = await request(app)
        .get('/api/v1/locations')
        .expect(200);

      expect(listResponse.body.success).toBe(true);

      // Get location by id
      const getResponse = await request(app)
        .get(`/api/v1/locations/${testLocation.id}`)
        .expect(200);

      expect(getResponse.body.success).toBe(true);

      // Get scorecard
      const scorecardResponse = await request(app)
        .get(`/api/v1/locations/${testLocation.id}/scorecard`)
        .expect(200);

      expect(scorecardResponse.body.success).toBe(true);

      // Get hierarchy
      const hierarchyResponse = await request(app)
        .get('/api/v1/locations/hierarchy/brand/brand-1')
        .expect(200);

      expect(hierarchyResponse.body.success).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed location id gracefully', async () => {
      const response = await request(app)
        .get('/api/v1/locations/malformed-id-with-special-chars-!@#$%')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should handle very long location names', async () => {
      const longName = 'A'.repeat(500);
      const response = await request(app)
        .post('/api/v1/locations')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: longName, code: 'LONG-001' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(longName);
    });

    it('should handle empty filters in list query', async () => {
      await createTestLocation({
        id: 'edge-case-location',
        code: 'EDGE-001',
        name: 'Edge Case Location'
      });

      const response = await request(app)
        .get('/api/v1/locations')
        .query({ districtId: '', regionId: '', brandId: '' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.locations.length).toBeGreaterThan(0);
    });

    it('should handle concurrent location updates', async () => {
      const testLocation = await createTestLocation({
        id: 'concurrent-location',
        code: 'CONC-001',
        name: 'Concurrent Location'
      });

      // Simulate concurrent updates
      const updates1 = request(app)
        .put(`/api/v1/locations/${testLocation.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: 'Update 1' });

      const updates2 = request(app)
        .put(`/api/v1/locations/${testLocation.id}`)
        .set('Authorization', `Bearer ${regionalToken}`)
        .send({ address: '123 Concurrent St' });

      const [response1, response2] = await Promise.all([updates1, updates2]);

      expect(response1.body.success).toBe(true);
      expect(response2.body.success).toBe(true);
    });

    it('should preserve location data integrity after soft delete', async () => {
      const testLocation = await createTestLocation({
        id: 'delete-integrity-location',
        code: 'DEL-INT-001',
        name: 'Delete Integrity Location',
        address: '123 Delete St',
        manager_id: testManager.id
      });

      // Delete location
      await request(app)
        .delete(`/api/v1/locations/${testLocation.id}`)
        .set('Authorization', `Bearer ${regionalToken}`)
        .expect(200);

      // Verify all data is preserved except active flag
      const response = await request(app)
        .get(`/api/v1/locations/${testLocation.id}`)
        .expect(200);

      expect(response.body.data.active).toBe(false);
      expect(response.body.data.name).toBe(testLocation.name);
      expect(response.body.data.code).toBe(testLocation.code);
      expect(response.body.data.address).toBe(testLocation.address);
      expect(response.body.data.managerId).toBe(testLocation.manager_id);
    });
  });
});
