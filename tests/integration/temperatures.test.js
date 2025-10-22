/**
 * Temperature API Integration Tests
 */

const request = require('supertest');
const { createTestApp } = require('../helpers/testApp');
const {
  setupTestDatabase,
  clearTestDatabase,
  teardownTestDatabase,
  createTestUser,
  createTestLocation,
  getTestPool
} = require('../helpers/testDb');
const { initializePool } = require('../../src/database/pool');

describe('Temperature API', () => {
  let app;
  let testLocation;
  let testUser;

  beforeAll(async () => {
    initializePool();
    await setupTestDatabase();
    app = createTestApp();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    testLocation = await createTestLocation({
      id: 'test-location-1',
      code: 'TEST-001'
    });

    testUser = await createTestUser({
      id: 'test-user-1',
      role: 'crew',
      location_id: testLocation.id
    });
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('POST /api/v1/temperatures', () => {
    it('should log a temperature reading within range', async () => {
      const reading = {
        locationId: testLocation.id,
        equipmentId: 'fridge-1',
        equipmentType: 'refrigerator',
        temperature: 38,
        unit: 'F',
        recordedBy: testUser.id
      };

      const response = await request(app)
        .post('/api/v1/temperatures')
        .send(reading)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.temperature).toBe(reading.temperature);
      expect(response.body.data.isInRange).toBe(true);
      expect(response.body.data.equipmentType).toBe('refrigerator');
    });

    it('should create alert for temperature out of range', async () => {
      const reading = {
        locationId: testLocation.id,
        equipmentId: 'fridge-1',
        equipmentType: 'refrigerator',
        temperature: 50, // Above threshold (33-41°F)
        unit: 'F',
        recordedBy: testUser.id
      };

      const response = await request(app)
        .post('/api/v1/temperatures')
        .send(reading)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isInRange).toBe(false);
      expect(response.body.data.alertCreated).toBe(true);
    });

    it('should log freezer temperature', async () => {
      const reading = {
        locationId: testLocation.id,
        equipmentId: 'freezer-1',
        equipmentType: 'freezer',
        temperature: 0,
        unit: 'F',
        recordedBy: testUser.id
      };

      const response = await request(app)
        .post('/api/v1/temperatures')
        .send(reading)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.temperature).toBe(0);
      expect(response.body.data.isInRange).toBe(true);
    });

    it('should reject reading without required fields', async () => {
      const reading = {
        locationId: testLocation.id,
        temperature: 38
        // Missing equipmentId and equipmentType
      };

      const response = await request(app)
        .post('/api/v1/temperatures')
        .send(reading)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/temperatures', () => {
    beforeEach(async () => {
      const pool = getTestPool();

      // Create multiple temperature logs
      await pool.query(`
        INSERT INTO temperature_logs (id, location_id, equipment_id, equipment_type, temperature, unit, threshold_min, threshold_max, is_in_range, recorded_by, recorded_at)
        VALUES
          ('log-1', $1, 'fridge-1', 'refrigerator', 38, 'F', 33, 41, true, $2, NOW() - INTERVAL '1 hour'),
          ('log-2', $1, 'fridge-1', 'refrigerator', 39, 'F', 33, 41, true, $2, NOW() - INTERVAL '2 hours'),
          ('log-3', $1, 'freezer-1', 'freezer', 0, 'F', -10, 10, true, $2, NOW() - INTERVAL '3 hours'),
          ('log-4', $1, 'fridge-2', 'refrigerator', 45, 'F', 33, 41, false, $2, NOW() - INTERVAL '30 minutes')
      `, [testLocation.id, testUser.id]);
    });

    it('should return all temperature logs', async () => {
      const response = await request(app)
        .get('/api/v1/temperatures')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.logs).toHaveLength(4);
    });

    it('should filter by location', async () => {
      const response = await request(app)
        .get('/api/v1/temperatures')
        .query({ locationId: testLocation.id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.logs).toHaveLength(4);
    });

    it('should filter by equipment', async () => {
      const response = await request(app)
        .get('/api/v1/temperatures')
        .query({ equipmentId: 'fridge-1' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.logs).toHaveLength(2);
    });

    it('should filter by equipment type', async () => {
      const response = await request(app)
        .get('/api/v1/temperatures')
        .query({ equipmentType: 'freezer' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.logs).toHaveLength(1);
      expect(response.body.data.logs[0].equipmentType).toBe('freezer');
    });
  });

  describe('GET /api/v1/temperatures/equipment/:id', () => {
    beforeEach(async () => {
      const pool = getTestPool();

      // Create temperature history for an equipment
      for (let i = 0; i < 5; i++) {
        await pool.query(`
          INSERT INTO temperature_logs (id, location_id, equipment_id, equipment_type, temperature, unit, threshold_min, threshold_max, is_in_range, recorded_by, recorded_at)
          VALUES ($1, $2, 'fridge-1', 'refrigerator', $3, 'F', 33, 41, true, $4, NOW() - INTERVAL '${i} hours')
        `, [`log-hist-${i}`, testLocation.id, 35 + i, testUser.id]);
      }
    });

    it('should return equipment history with trends', async () => {
      const response = await request(app)
        .get('/api/v1/temperatures/equipment/fridge-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('equipmentId');
      expect(response.body.data).toHaveProperty('logs');
      expect(response.body.data).toHaveProperty('trends');
      expect(response.body.data.logs).toHaveLength(5);
      expect(response.body.data.trends).toHaveProperty('average');
      expect(response.body.data.trends).toHaveProperty('min');
      expect(response.body.data.trends).toHaveProperty('max');
    });

    it('should filter by time period', async () => {
      const response = await request(app)
        .get('/api/v1/temperatures/equipment/fridge-1')
        .query({ period: '2h' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.logs.length).toBeLessThanOrEqual(3);
    });
  });

  describe('GET /api/v1/temperatures/alerts', () => {
    beforeEach(async () => {
      const pool = getTestPool();

      // Create temperature log and alert
      await pool.query(`
        INSERT INTO temperature_logs (id, location_id, equipment_id, equipment_type, temperature, unit, threshold_min, threshold_max, is_in_range, recorded_by)
        VALUES ('log-alert-1', $1, 'fridge-1', 'refrigerator', 50, 'F', 33, 41, false, $2)
      `, [testLocation.id, testUser.id]);

      await pool.query(`
        INSERT INTO temperature_alerts (id, temperature_log_id, location_id, equipment_id, equipment_type, temperature, threshold_min, threshold_max, direction, status)
        VALUES ('alert-1', 'log-alert-1', $1, 'fridge-1', 'refrigerator', 50, 33, 41, 'high', 'active')
      `, [testLocation.id]);
    });

    it('should return all alerts', async () => {
      const response = await request(app)
        .get('/api/v1/temperatures/alerts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.alerts).toHaveLength(1);
      expect(response.body.data.alerts[0].status).toBe('active');
    });

    it('should filter alerts by location', async () => {
      const response = await request(app)
        .get('/api/v1/temperatures/alerts')
        .query({ locationId: testLocation.id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.alerts).toHaveLength(1);
    });
  });

  describe('POST /api/v1/temperatures/alerts/:id/acknowledge', () => {
    let alertId;

    beforeEach(async () => {
      const pool = getTestPool();

      // Create log and alert
      await pool.query(`
        INSERT INTO temperature_logs (id, location_id, equipment_id, equipment_type, temperature, unit, threshold_min, threshold_max, is_in_range, recorded_by)
        VALUES ('log-ack-1', $1, 'fridge-1', 'refrigerator', 50, 'F', 33, 41, false, $2)
      `, [testLocation.id, testUser.id]);

      const result = await pool.query(`
        INSERT INTO temperature_alerts (id, temperature_log_id, location_id, equipment_id, equipment_type, temperature, threshold_min, threshold_max, direction, status)
        VALUES ('alert-ack-1', 'log-ack-1', $1, 'fridge-1', 'refrigerator', 50, 33, 41, 'high', 'active')
        RETURNING id
      `, [testLocation.id]);

      alertId = result.rows[0].id;
    });

    it('should acknowledge an alert', async () => {
      const response = await request(app)
        .post(`/api/v1/temperatures/alerts/${alertId}/acknowledge`)
        .send({
          acknowledgedBy: testUser.id,
          note: 'Investigating the issue'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('acknowledged');
      expect(response.body.data.acknowledgedBy).toBe(testUser.id);
    });
  });

  describe('POST /api/v1/temperatures/alerts/:id/resolve', () => {
    let alertId;

    beforeEach(async () => {
      const pool = getTestPool();

      await pool.query(`
        INSERT INTO temperature_logs (id, location_id, equipment_id, equipment_type, temperature, unit, threshold_min, threshold_max, is_in_range, recorded_by)
        VALUES ('log-resolve-1', $1, 'fridge-1', 'refrigerator', 50, 'F', 33, 41, false, $2)
      `, [testLocation.id, testUser.id]);

      const result = await pool.query(`
        INSERT INTO temperature_alerts (id, temperature_log_id, location_id, equipment_id, equipment_type, temperature, threshold_min, threshold_max, direction, status)
        VALUES ('alert-resolve-1', 'log-resolve-1', $1, 'fridge-1', 'refrigerator', 50, 33, 41, 'high', 'acknowledged')
        RETURNING id
      `, [testLocation.id]);

      alertId = result.rows[0].id;
    });

    it('should resolve an alert', async () => {
      const response = await request(app)
        .post(`/api/v1/temperatures/alerts/${alertId}/resolve`)
        .send({
          resolvedBy: testUser.id,
          note: 'Fixed thermostat',
          resolution: 'Replaced faulty thermostat sensor'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('resolved');
      expect(response.body.data.resolvedBy).toBe(testUser.id);
      expect(response.body.data.resolutionNotes).toBe('Replaced faulty thermostat sensor');
    });
  });
});
