/**
 * Schedules API Integration Tests
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

describe('Schedules API', () => {
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
      code: 'TEST-001',
      name: 'Test Location'
    });

    testUser = await createTestUser({
      id: 'test-user-1',
      username: 'testcrew',
      email: 'crew@test.com',
      role: 'crew',
      location_id: testLocation.id
    });
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('POST /api/v1/schedules', () => {
    it('should create a schedule successfully', async () => {
      const scheduleData = {
        locationId: testLocation.id,
        userId: testUser.id,
        date: '2025-10-25',
        startTime: '09:00',
        endTime: '17:00',
        position: 'crew',
        breakDuration: 30
      };

      const response = await request(app)
        .post('/api/v1/schedules')
        .send(scheduleData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.locationId).toBe(testLocation.id);
      expect(response.body.data.userId).toBe(testUser.id);
      expect(response.body.data.status).toBe('scheduled');
      expect(response.body.data.scheduledHours).toBe(7.5); // 8 hours - 0.5 hours break
    });

    it('should calculate scheduled hours correctly', async () => {
      const scheduleData = {
        locationId: testLocation.id,
        userId: testUser.id,
        date: '2025-10-25',
        startTime: '08:00',
        endTime: '16:00',
        position: 'crew',
        breakDuration: 0
      };

      const response = await request(app)
        .post('/api/v1/schedules')
        .send(scheduleData)
        .expect(201);

      expect(response.body.data.scheduledHours).toBe(8);
    });

    it('should handle hourly rate and calculate labor cost', async () => {
      const scheduleData = {
        locationId: testLocation.id,
        userId: testUser.id,
        date: '2025-10-25',
        startTime: '09:00',
        endTime: '17:00',
        position: 'manager',
        breakDuration: 30,
        hourlyRate: 15.00
      };

      const response = await request(app)
        .post('/api/v1/schedules')
        .send(scheduleData)
        .expect(201);

      expect(response.body.data.hourlyRate).toBe(15.00);
      expect(response.body.data.laborCost).toBeCloseTo(112.50, 2); // 7.5 hours * $15
    });

    it('should reject schedule without required fields', async () => {
      const scheduleData = {
        locationId: testLocation.id,
        date: '2025-10-25'
        // Missing userId, startTime, endTime, position
      };

      const response = await request(app)
        .post('/api/v1/schedules')
        .send(scheduleData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should reject invalid date', async () => {
      const scheduleData = {
        locationId: testLocation.id,
        userId: testUser.id,
        date: 'invalid-date',
        startTime: '09:00',
        endTime: '17:00',
        position: 'crew'
      };

      const response = await request(app)
        .post('/api/v1/schedules')
        .send(scheduleData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid date');
    });

    it('should reject invalid time range', async () => {
      const scheduleData = {
        locationId: testLocation.id,
        userId: testUser.id,
        date: '2025-10-25',
        startTime: '17:00',
        endTime: '09:00',  // End time before start time
        position: 'crew'
      };

      const response = await request(app)
        .post('/api/v1/schedules')
        .send(scheduleData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid start/end time');
    });

    it('should reject invalid break duration', async () => {
      const scheduleData = {
        locationId: testLocation.id,
        userId: testUser.id,
        date: '2025-10-25',
        startTime: '09:00',
        endTime: '17:00',
        position: 'crew',
        breakDuration: -10
      };

      const response = await request(app)
        .post('/api/v1/schedules')
        .send(scheduleData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid break duration');
    });
  });

  describe('GET /api/v1/schedules', () => {
    beforeEach(async () => {
      const pool = getTestPool();

      // Create multiple schedules
      await pool.query(`
        INSERT INTO schedules (
          id, location_id, user_id, date, start_time, end_time,
          position, status, scheduled_hours, actual_hours, break_duration, hourly_rate, labor_cost
        ) VALUES
          ('sched-1', $1, $2, '2025-10-25', '09:00', '17:00', 'crew', 'scheduled', 7.5, 0, 30, 12.00, 0),
          ('sched-2', $1, $2, '2025-10-26', '10:00', '18:00', 'crew', 'scheduled', 7.5, 0, 30, 12.00, 0),
          ('sched-3', $1, $2, '2025-10-27', '08:00', '16:00', 'manager', 'completed', 7.5, 7.5, 30, 15.00, 112.50)
      `, [testLocation.id, testUser.id]);
    });

    it('should return all schedules', async () => {
      const response = await request(app)
        .get('/api/v1/schedules')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.schedules).toHaveLength(3);
      expect(response.body.data.laborSummary).toBeDefined();
    });

    it('should filter by location', async () => {
      const response = await request(app)
        .get('/api/v1/schedules')
        .query({ locationId: testLocation.id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.schedules).toHaveLength(3);
      response.body.data.schedules.forEach(schedule => {
        expect(schedule.locationId).toBe(testLocation.id);
      });
    });

    it('should filter by user', async () => {
      const response = await request(app)
        .get('/api/v1/schedules')
        .query({ userId: testUser.id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.schedules).toHaveLength(3);
      response.body.data.schedules.forEach(schedule => {
        expect(schedule.userId).toBe(testUser.id);
      });
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/v1/schedules')
        .query({ status: 'scheduled' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.schedules).toHaveLength(2);
      response.body.data.schedules.forEach(schedule => {
        expect(schedule.status).toBe('scheduled');
      });
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/v1/schedules')
        .query({
          startDate: '2025-10-25',
          endDate: '2025-10-26'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.schedules).toHaveLength(2);
    });

    it('should calculate labor summary', async () => {
      const response = await request(app)
        .get('/api/v1/schedules')
        .expect(200);

      expect(response.body.data.laborSummary).toMatchObject({
        totalShifts: 3,
        scheduledHours: expect.any(Number),
        actualHours: expect.any(Number),
        totalHours: expect.any(Number),
        totalCost: expect.any(Number)
      });
    });

    it('should reject invalid status filter', async () => {
      const response = await request(app)
        .get('/api/v1/schedules')
        .query({ status: 'invalid-status' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid schedule status');
    });
  });

  describe('POST /api/v1/schedules/:id/clock-in', () => {
    let scheduleId;

    beforeEach(async () => {
      const pool = getTestPool();

      const result = await pool.query(`
        INSERT INTO schedules (
          id, location_id, user_id, date, start_time, end_time,
          position, status, scheduled_hours, actual_hours, break_duration, hourly_rate, labor_cost
        ) VALUES
          ('sched-clock-1', $1, $2, '2025-10-25', '09:00', '17:00', 'crew', 'scheduled', 7.5, 0, 30, 12.00, 0)
        RETURNING id
      `, [testLocation.id, testUser.id]);

      scheduleId = result.rows[0].id;
    });

    it('should clock in successfully', async () => {
      const clockInData = {
        timestamp: new Date().toISOString(),
        location: 'front-terminal',
        notes: 'Clocked in on time'
      };

      const response = await request(app)
        .post(`/api/v1/schedules/${scheduleId}/clock-in`)
        .send(clockInData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('in_progress');
      expect(response.body.data.clockInTime).toBeDefined();
      expect(response.body.data.clockInLocation).toBe('front-terminal');
    });

    it('should use current time if no timestamp provided', async () => {
      const response = await request(app)
        .post(`/api/v1/schedules/${scheduleId}/clock-in`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.clockInTime).toBeDefined();
    });

    it('should update break duration if provided', async () => {
      const clockInData = {
        breakDuration: 45
      };

      const response = await request(app)
        .post(`/api/v1/schedules/${scheduleId}/clock-in`)
        .send(clockInData)
        .expect(200);

      expect(response.body.data.breakDuration).toBe(45);
    });

    it('should return 404 for non-existent schedule', async () => {
      const response = await request(app)
        .post('/api/v1/schedules/non-existent/clock-in')
        .send({})
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid timestamp', async () => {
      const clockInData = {
        timestamp: 'invalid-timestamp'
      };

      const response = await request(app)
        .post(`/api/v1/schedules/${scheduleId}/clock-in`)
        .send(clockInData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid timestamp');
    });
  });

  describe('POST /api/v1/schedules/:id/clock-out', () => {
    let scheduleId;

    beforeEach(async () => {
      const pool = getTestPool();

      const clockInTime = new Date();
      clockInTime.setHours(clockInTime.getHours() - 8);

      const result = await pool.query(`
        INSERT INTO schedules (
          id, location_id, user_id, date, start_time, end_time,
          position, status, clock_in_time, scheduled_hours, actual_hours, break_duration, hourly_rate, labor_cost
        ) VALUES
          ('sched-clock-2', $1, $2, '2025-10-25', '09:00', '17:00', 'crew', 'in_progress', $3, 7.5, 0, 30, 12.00, 0)
        RETURNING id
      `, [testLocation.id, testUser.id, clockInTime]);

      scheduleId = result.rows[0].id;
    });

    it('should clock out successfully', async () => {
      const clockOutData = {
        timestamp: new Date().toISOString(),
        notes: 'Completed shift'
      };

      const response = await request(app)
        .post(`/api/v1/schedules/${scheduleId}/clock-out`)
        .send(clockOutData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.clockOutTime).toBeDefined();
      expect(response.body.data.actualHours).toBeGreaterThan(0);
    });

    it('should calculate actual hours correctly', async () => {
      const response = await request(app)
        .post(`/api/v1/schedules/${scheduleId}/clock-out`)
        .send({})
        .expect(200);

      expect(response.body.data.actualHours).toBeGreaterThan(0);
      expect(response.body.data.actualHours).toBeLessThan(10); // Should be around 7.5 hours
    });

    it('should calculate labor cost on clock out', async () => {
      const response = await request(app)
        .post(`/api/v1/schedules/${scheduleId}/clock-out`)
        .send({})
        .expect(200);

      expect(response.body.data.laborCost).toBeGreaterThan(0);
      // Should be approximately actualHours * hourlyRate (12.00)
    });

    it('should handle break duration adjustment', async () => {
      const clockOutData = {
        breakDuration: 60  // 1 hour break instead of 30 minutes
      };

      const response = await request(app)
        .post(`/api/v1/schedules/${scheduleId}/clock-out`)
        .send(clockOutData)
        .expect(200);

      expect(response.body.data.breakDuration).toBe(60);
    });

    it('should return 404 for non-existent schedule', async () => {
      const response = await request(app)
        .post('/api/v1/schedules/non-existent/clock-out')
        .send({})
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid timestamp', async () => {
      const clockOutData = {
        timestamp: 'invalid-timestamp'
      };

      const response = await request(app)
        .post(`/api/v1/schedules/${scheduleId}/clock-out`)
        .send(clockOutData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid timestamp');
    });
  });

  describe('GET /api/v1/schedules/forecast', () => {
    beforeEach(async () => {
      const pool = getTestPool();

      // Create historical schedules for forecasting
      const dates = [];
      for (let i = 0; i < 4; i++) {
        const date = new Date('2025-10-20');
        date.setDate(date.getDate() + (i * 7)); // Same day of week
        dates.push(date.toISOString().split('T')[0]);
      }

      for (const date of dates) {
        await pool.query(`
          INSERT INTO schedules (
            id, location_id, user_id, date, start_time, end_time,
            position, status, scheduled_hours, actual_hours, break_duration, hourly_rate, labor_cost, metadata
          ) VALUES
            ($1, $2, $3, $4, '09:00', '17:00', 'crew', 'completed', 7.5, 7.5, 30, 12.00, 90.00, $5),
            ($6, $2, $3, $4, '10:00', '18:00', 'manager', 'completed', 7.5, 7.5, 30, 15.00, 112.50, $7)
        `, [
          `sched-${date}-1`,
          testLocation.id,
          testUser.id,
          date,
          JSON.stringify({ actualSales: 2000 }),
          `sched-${date}-2`,
          JSON.stringify({ actualSales: 2000 })
        ]);
      }
    });

    it('should generate labor forecast', async () => {
      const response = await request(app)
        .get('/api/v1/schedules/forecast')
        .query({
          locationId: testLocation.id,
          date: '2025-11-10'  // A Sunday, same day of week as test data
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        date: expect.any(String),
        locationId: testLocation.id,
        historicalSampleSize: expect.any(Number),
        forecastedSales: expect.any(Number),
        recommendedLaborHours: expect.any(Number),
        suggestedStaffing: expect.any(Array),
        confidence: expect.any(String)
      });
    });

    it('should calculate forecasted sales', async () => {
      const response = await request(app)
        .get('/api/v1/schedules/forecast')
        .query({
          locationId: testLocation.id,
          date: '2025-11-10'
        })
        .expect(200);

      expect(response.body.data.forecastedSales).toBeGreaterThan(0);
    });

    it('should provide staffing suggestions', async () => {
      const response = await request(app)
        .get('/api/v1/schedules/forecast')
        .query({
          locationId: testLocation.id,
          date: '2025-11-10'
        })
        .expect(200);

      expect(response.body.data.suggestedStaffing).toBeInstanceOf(Array);
      if (response.body.data.suggestedStaffing.length > 0) {
        expect(response.body.data.suggestedStaffing[0]).toMatchObject({
          position: expect.any(String),
          hours: expect.any(Number),
          recommendedHeadcount: expect.any(Number)
        });
      }
    });

    it('should include confidence level', async () => {
      const response = await request(app)
        .get('/api/v1/schedules/forecast')
        .query({
          locationId: testLocation.id,
          date: '2025-11-10'
        })
        .expect(200);

      expect(['high', 'medium', 'low', 'insufficient-data']).toContain(
        response.body.data.confidence
      );
    });

    it('should use current date if none provided', async () => {
      const response = await request(app)
        .get('/api/v1/schedules/forecast')
        .query({ locationId: testLocation.id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.date).toBeDefined();
    });

    it('should handle location with no historical data', async () => {
      const otherLocation = await createTestLocation({
        id: 'test-location-2',
        code: 'TEST-002'
      });

      const response = await request(app)
        .get('/api/v1/schedules/forecast')
        .query({
          locationId: otherLocation.id,
          date: '2025-11-10'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.historicalSampleSize).toBe(0);
      expect(response.body.data.confidence).toBe('insufficient-data');
    });

    it('should reject invalid date', async () => {
      const response = await request(app)
        .get('/api/v1/schedules/forecast')
        .query({
          locationId: testLocation.id,
          date: 'invalid-date'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid date');
    });
  });
});
