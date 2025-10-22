/**
 * TemperatureService Unit Tests
 * Tests business logic for temperature logging, alerting, and analytics
 */

const TemperatureService = require('../../src/services/TemperatureService');
const {
  setupTestDatabase,
  clearTestDatabase,
  teardownTestDatabase,
  createTestLocation,
  createTestUser
} = require('../helpers/testDb');
const { initializePool } = require('../../src/database/pool');

describe('TemperatureService', () => {
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
      role: 'crew',
      location_id: testLocation.id
    });
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('getThreshold', () => {
    it('should return custom thresholds when provided', () => {
      const threshold = TemperatureService.getThreshold('refrigerator', 32, 40);

      expect(threshold).toEqual({ min: 32, max: 40 });
    });

    it('should return default freezer thresholds', () => {
      const threshold = TemperatureService.getThreshold('freezer');

      expect(threshold).toEqual({ min: -10, max: 10 });
    });

    it('should return default fridge thresholds', () => {
      const threshold = TemperatureService.getThreshold('fridge');

      expect(threshold).toEqual({ min: 33, max: 41 });
    });

    it('should return default cold hold thresholds', () => {
      const threshold = TemperatureService.getThreshold('coldHold');

      expect(threshold).toEqual({ min: 33, max: 41 });
    });

    it('should return default hot hold thresholds', () => {
      const threshold = TemperatureService.getThreshold('hotHold');

      expect(threshold).toEqual({ min: 135, max: 165 });
    });

    it('should return default ambient thresholds', () => {
      const threshold = TemperatureService.getThreshold('ambient');

      expect(threshold).toEqual({ min: 65, max: 80 });
    });

    it('should handle case-insensitive equipment types', () => {
      const threshold = TemperatureService.getThreshold('FREEZER');

      expect(threshold).toEqual({ min: -10, max: 10 });
    });

    it('should return default range for unknown equipment type', () => {
      const threshold = TemperatureService.getThreshold('unknown-type');

      expect(threshold).toEqual({ min: 33, max: 165 });
    });

    it('should handle null equipment type', () => {
      const threshold = TemperatureService.getThreshold(null);

      expect(threshold).toEqual({ min: 33, max: 165 });
    });
  });

  describe('evaluateRange', () => {
    it('should return true for temperature within range', () => {
      const threshold = { min: 33, max: 41 };

      expect(TemperatureService.evaluateRange(37, threshold)).toBe(true);
    });

    it('should return false for temperature below min', () => {
      const threshold = { min: 33, max: 41 };

      expect(TemperatureService.evaluateRange(30, threshold)).toBe(false);
    });

    it('should return false for temperature above max', () => {
      const threshold = { min: 33, max: 41 };

      expect(TemperatureService.evaluateRange(45, threshold)).toBe(false);
    });

    it('should return true for temperature at minimum', () => {
      const threshold = { min: 33, max: 41 };

      expect(TemperatureService.evaluateRange(33, threshold)).toBe(true);
    });

    it('should return true for temperature at maximum', () => {
      const threshold = { min: 33, max: 41 };

      expect(TemperatureService.evaluateRange(41, threshold)).toBe(true);
    });

    it('should handle undefined min threshold', () => {
      const threshold = { max: 41 };

      expect(TemperatureService.evaluateRange(30, threshold)).toBe(true);
      expect(TemperatureService.evaluateRange(45, threshold)).toBe(false);
    });

    it('should handle undefined max threshold', () => {
      const threshold = { min: 33 };

      expect(TemperatureService.evaluateRange(45, threshold)).toBe(true);
      expect(TemperatureService.evaluateRange(30, threshold)).toBe(false);
    });
  });

  describe('calculateStatistics', () => {
    it('should calculate statistics for empty array', () => {
      const stats = TemperatureService.calculateStatistics([]);

      expect(stats).toEqual({
        totalReadings: 0,
        outOfRange: 0,
        averageTemp: null
      });
    });

    it('should calculate average temperature', () => {
      const logs = [
        { temperature: 35, isInRange: true },
        { temperature: 37, isInRange: true },
        { temperature: 39, isInRange: true }
      ];

      const stats = TemperatureService.calculateStatistics(logs);

      expect(stats.totalReadings).toBe(3);
      expect(stats.averageTemp).toBeCloseTo(37, 2);
      expect(stats.outOfRange).toBe(0);
    });

    it('should count out of range readings', () => {
      const logs = [
        { temperature: 35, isInRange: true },
        { temperature: 45, isInRange: false },
        { temperature: 50, isInRange: false }
      ];

      const stats = TemperatureService.calculateStatistics(logs);

      expect(stats.totalReadings).toBe(3);
      expect(stats.outOfRange).toBe(2);
    });

    it('should round average to 2 decimal places', () => {
      const logs = [
        { temperature: 35.333, isInRange: true },
        { temperature: 37.666, isInRange: true }
      ];

      const stats = TemperatureService.calculateStatistics(logs);

      expect(stats.averageTemp).toBe(36.50);
    });
  });

  describe('calculateTrends', () => {
    it('should return null values for empty array', () => {
      const trends = TemperatureService.calculateTrends([]);

      expect(trends).toEqual({
        average: null,
        min: null,
        max: null,
        latest: null
      });
    });

    it('should calculate average, min, max', () => {
      const readings = [
        { temperature: 35, recordedAt: '2025-10-20T10:00:00Z' },
        { temperature: 40, recordedAt: '2025-10-20T11:00:00Z' },
        { temperature: 37, recordedAt: '2025-10-20T12:00:00Z' }
      ];

      const trends = TemperatureService.calculateTrends(readings);

      expect(trends.average).toBeCloseTo(37.33, 2);
      expect(trends.min).toBe(35);
      expect(trends.max).toBe(40);
    });

    it('should identify latest reading', () => {
      const readings = [
        { temperature: 35, recordedAt: '2025-10-20T10:00:00Z' },
        { temperature: 40, recordedAt: '2025-10-20T12:00:00Z' },
        { temperature: 37, recordedAt: '2025-10-20T11:00:00Z' }
      ];

      const trends = TemperatureService.calculateTrends(readings);

      expect(trends.latest.temperature).toBe(40);
    });

    it('should round average to 2 decimal places', () => {
      const readings = [
        { temperature: 35.111, recordedAt: '2025-10-20T10:00:00Z' },
        { temperature: 37.888, recordedAt: '2025-10-20T11:00:00Z' }
      ];

      const trends = TemperatureService.calculateTrends(readings);

      expect(trends.average).toBe(36.50);
    });
  });

  describe('resolvePeriod', () => {
    it('should return null for undefined period', () => {
      const result = TemperatureService.resolvePeriod();

      expect(result).toBeNull();
    });

    it('should resolve 24h period', () => {
      const now = new Date();
      const result = TemperatureService.resolvePeriod('24h');
      const expected = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      expect(result.getTime()).toBeCloseTo(expected.getTime(), -3);
    });

    it('should resolve 7d period', () => {
      const now = new Date();
      const result = TemperatureService.resolvePeriod('7d');
      const expected = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      expect(result.getTime()).toBeCloseTo(expected.getTime(), -3);
    });

    it('should resolve 30d period', () => {
      const now = new Date();
      const result = TemperatureService.resolvePeriod('30d');
      const expected = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      expect(result.getTime()).toBeCloseTo(expected.getTime(), -3);
    });

    it('should parse numeric hours', () => {
      const now = new Date();
      const result = TemperatureService.resolvePeriod('2');
      const expected = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      expect(result.getTime()).toBeCloseTo(expected.getTime(), -3);
    });

    it('should return null for invalid period', () => {
      const result = TemperatureService.resolvePeriod('invalid');

      expect(result).toBeNull();
    });
  });

  describe('formatTemperatureLog', () => {
    it('should convert database row to API format', () => {
      const dbRow = {
        id: 'log-1',
        location_id: 'loc-1',
        equipment_id: 'fridge-1',
        equipment_type: 'refrigerator',
        temperature: '37.5',
        unit: 'F',
        threshold_min: '33',
        threshold_max: '41',
        is_in_range: true,
        source: 'manual',
        sensor_id: null,
        recorded_by: 'user-1',
        recorded_at: '2025-10-20T10:00:00Z',
        notes: 'Test note',
        corrective_action: null,
        alert_sent: false,
        metadata: { key: 'value' },
        created_at: '2025-10-20T10:00:00Z'
      };

      const formatted = TemperatureService.formatTemperatureLog(dbRow);

      expect(formatted).toEqual({
        id: 'log-1',
        locationId: 'loc-1',
        equipmentId: 'fridge-1',
        equipmentType: 'refrigerator',
        temperature: 37.5,
        unit: 'F',
        threshold: {
          min: 33,
          max: 41
        },
        isInRange: true,
        source: 'manual',
        sensorId: null,
        recordedBy: 'user-1',
        recordedAt: '2025-10-20T10:00:00Z',
        notes: 'Test note',
        correctiveAction: null,
        alertSent: false,
        metadata: { key: 'value' },
        createdAt: '2025-10-20T10:00:00Z'
      });
    });

    it('should handle null thresholds', () => {
      const dbRow = {
        id: 'log-1',
        location_id: 'loc-1',
        equipment_id: 'fridge-1',
        equipment_type: 'refrigerator',
        temperature: '37.5',
        unit: 'F',
        threshold_min: null,
        threshold_max: null,
        is_in_range: true,
        source: 'manual',
        sensor_id: null,
        recorded_by: 'user-1',
        recorded_at: '2025-10-20T10:00:00Z',
        notes: null,
        corrective_action: null,
        alert_sent: false,
        metadata: null,
        created_at: '2025-10-20T10:00:00Z'
      };

      const formatted = TemperatureService.formatTemperatureLog(dbRow);

      expect(formatted.threshold).toEqual({
        min: null,
        max: null
      });
      expect(formatted.metadata).toEqual({});
    });
  });

  describe('formatAlert', () => {
    it('should convert alert row to API format', () => {
      const dbRow = {
        id: 'alert-1',
        temperature_log_id: 'log-1',
        location_id: 'loc-1',
        equipment_id: 'fridge-1',
        equipment_type: 'refrigerator',
        temperature: '45',
        threshold_min: '33',
        threshold_max: '41',
        direction: 'high',
        status: 'active',
        severity: 'warning',
        acknowledged_by: null,
        acknowledged_at: null,
        resolved_by: null,
        resolved_at: null,
        resolution_notes: null,
        notes: [{ message: 'Test note' }],
        created_at: '2025-10-20T10:00:00Z',
        updated_at: '2025-10-20T10:00:00Z'
      };

      const formatted = TemperatureService.formatAlert(dbRow);

      expect(formatted).toMatchObject({
        id: 'alert-1',
        temperatureLogId: 'log-1',
        locationId: 'loc-1',
        equipmentId: 'fridge-1',
        equipmentType: 'refrigerator',
        temperature: 45,
        threshold: {
          min: 33,
          max: 41
        },
        direction: 'high',
        status: 'active',
        severity: 'warning',
        notes: [{ message: 'Test note' }]
      });
    });

    it('should handle null temperature and empty notes', () => {
      const dbRow = {
        id: 'alert-1',
        temperature_log_id: 'log-1',
        location_id: 'loc-1',
        equipment_id: 'fridge-1',
        equipment_type: 'refrigerator',
        temperature: null,
        threshold_min: null,
        threshold_max: null,
        direction: 'high',
        status: 'active',
        severity: 'warning',
        acknowledged_by: null,
        acknowledged_at: null,
        resolved_by: null,
        resolved_at: null,
        resolution_notes: null,
        notes: null,
        created_at: '2025-10-20T10:00:00Z',
        updated_at: '2025-10-20T10:00:00Z'
      };

      const formatted = TemperatureService.formatAlert(dbRow);

      expect(formatted.temperature).toBeNull();
      expect(formatted.notes).toEqual([]);
    });
  });

  describe('logReading', () => {
    it('should create temperature log within range', async () => {
      const reading = {
        locationId: testLocation.id,
        equipmentId: 'fridge-1',
        equipmentType: 'refrigerator',
        temperature: 37,
        unit: 'F',
        recordedBy: testUser.id
      };

      const log = await TemperatureService.logReading(reading);

      expect(log).toMatchObject({
        locationId: testLocation.id,
        equipmentId: 'fridge-1',
        equipmentType: 'refrigerator',
        temperature: 37,
        isInRange: true
      });
    });

    it('should create alert for out of range reading', async () => {
      const reading = {
        locationId: testLocation.id,
        equipmentId: 'fridge-1',
        equipmentType: 'refrigerator',
        temperature: 50,  // Above max (41)
        unit: 'F',
        recordedBy: testUser.id
      };

      const log = await TemperatureService.logReading(reading);

      expect(log.isInRange).toBe(false);

      // Verify alert was created
      const alerts = await TemperatureService.getAlerts({
        locationId: testLocation.id
      });

      expect(alerts.alerts.length).toBeGreaterThan(0);
    });

    it('should use default thresholds for equipment type', async () => {
      const reading = {
        locationId: testLocation.id,
        equipmentId: 'freezer-1',
        equipmentType: 'freezer',
        temperature: 0,
        unit: 'F',
        recordedBy: testUser.id
      };

      const log = await TemperatureService.logReading(reading);

      expect(log.threshold).toEqual({
        min: -10,
        max: 10
      });
      expect(log.isInRange).toBe(true);
    });
  });

  describe('createAlert', () => {
    it('should create alert with correct direction for low temperature', async () => {
      const reading = {
        locationId: testLocation.id,
        equipmentId: 'fridge-1',
        equipmentType: 'refrigerator',
        temperature: 30,  // Below min (33)
        unit: 'F',
        recordedBy: testUser.id
      };

      const log = await TemperatureService.logReading(reading);
      const alerts = await TemperatureService.getAlerts({
        locationId: testLocation.id
      });

      expect(alerts.alerts[0].direction).toBe('low');
    });

    it('should create alert with correct direction for high temperature', async () => {
      const reading = {
        locationId: testLocation.id,
        equipmentId: 'fridge-1',
        equipmentType: 'refrigerator',
        temperature: 50,  // Above max (41)
        unit: 'F',
        recordedBy: testUser.id
      };

      const log = await TemperatureService.logReading(reading);
      const alerts = await TemperatureService.getAlerts({
        locationId: testLocation.id
      });

      expect(alerts.alerts[0].direction).toBe('high');
    });
  });

  describe('acknowledgeAlert', () => {
    let alertId;

    beforeEach(async () => {
      const reading = {
        locationId: testLocation.id,
        equipmentId: 'fridge-1',
        equipmentType: 'refrigerator',
        temperature: 50,
        unit: 'F',
        recordedBy: testUser.id
      };

      await TemperatureService.logReading(reading);

      const alerts = await TemperatureService.getAlerts({
        locationId: testLocation.id
      });

      alertId = alerts.alerts[0].id;
    });

    it('should acknowledge alert', async () => {
      const acknowledged = await TemperatureService.acknowledgeAlert(alertId, {
        acknowledgedBy: testUser.id,
        note: 'Investigating'
      });

      expect(acknowledged.status).toBe('acknowledged');
      expect(acknowledged.acknowledgedBy).toBe(testUser.id);
    });

    it('should add note when acknowledging', async () => {
      const acknowledged = await TemperatureService.acknowledgeAlert(alertId, {
        acknowledgedBy: testUser.id,
        note: 'Checking equipment'
      });

      expect(acknowledged.notes.length).toBeGreaterThan(0);
      expect(acknowledged.notes[0]).toMatchObject({
        message: 'Checking equipment',
        type: 'acknowledged',
        author: testUser.id
      });
    });

    it('should return null for non-existent alert', async () => {
      const result = await TemperatureService.acknowledgeAlert('non-existent', {
        acknowledgedBy: testUser.id
      });

      expect(result).toBeNull();
    });
  });

  describe('resolveAlert', () => {
    let alertId;

    beforeEach(async () => {
      const reading = {
        locationId: testLocation.id,
        equipmentId: 'fridge-1',
        equipmentType: 'refrigerator',
        temperature: 50,
        unit: 'F',
        recordedBy: testUser.id
      };

      await TemperatureService.logReading(reading);

      const alerts = await TemperatureService.getAlerts({
        locationId: testLocation.id
      });

      alertId = alerts.alerts[0].id;
    });

    it('should resolve alert', async () => {
      const resolved = await TemperatureService.resolveAlert(alertId, {
        resolvedBy: testUser.id,
        resolution: 'Fixed thermostat'
      });

      expect(resolved.status).toBe('resolved');
      expect(resolved.resolvedBy).toBe(testUser.id);
      expect(resolved.resolution).toBe('Fixed thermostat');
    });

    it('should add resolution note', async () => {
      const resolved = await TemperatureService.resolveAlert(alertId, {
        resolvedBy: testUser.id,
        note: 'Problem fixed',
        resolution: 'Replaced sensor'
      });

      expect(resolved.notes.length).toBeGreaterThan(0);
      const resolutionNote = resolved.notes.find(n => n.type === 'resolved');
      expect(resolutionNote).toBeDefined();
      expect(resolutionNote.message).toBe('Problem fixed');
    });

    it('should auto-acknowledge if not already acknowledged', async () => {
      const resolved = await TemperatureService.resolveAlert(alertId, {
        resolvedBy: testUser.id,
        resolution: 'Fixed'
      });

      expect(resolved.acknowledgedBy).toBe(testUser.id);
    });

    it('should return null for non-existent alert', async () => {
      const result = await TemperatureService.resolveAlert('non-existent', {
        resolvedBy: testUser.id
      });

      expect(result).toBeNull();
    });
  });

  describe('getAlerts', () => {
    beforeEach(async () => {
      // Create some temperature readings with alerts
      await TemperatureService.logReading({
        locationId: testLocation.id,
        equipmentId: 'fridge-1',
        equipmentType: 'refrigerator',
        temperature: 50,
        unit: 'F',
        recordedBy: testUser.id
      });
    });

    it('should return alerts with summary', async () => {
      const result = await TemperatureService.getAlerts({
        locationId: testLocation.id
      });

      expect(result).toMatchObject({
        alerts: expect.any(Array),
        summary: {
          active: expect.any(Number),
          acknowledged: expect.any(Number),
          resolved: expect.any(Number)
        }
      });
    });

    it('should filter by status', async () => {
      const result = await TemperatureService.getAlerts({
        locationId: testLocation.id,
        status: 'active'
      });

      expect(result.alerts.every(a => a.status === 'active')).toBe(true);
    });

    it('should calculate summary counts correctly', async () => {
      const result = await TemperatureService.getAlerts({
        locationId: testLocation.id
      });

      const totalCount = result.summary.active +
                         result.summary.acknowledged +
                         result.summary.resolved;

      expect(totalCount).toBe(result.alerts.length);
    });
  });
});
