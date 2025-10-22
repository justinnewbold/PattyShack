/**
 * Inventory API Integration Tests
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

describe('Inventory API', () => {
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
      username: 'testmanager',
      email: 'manager@test.com',
      role: 'manager',
      location_id: testLocation.id
    });
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('GET /api/v1/inventory', () => {
    beforeEach(async () => {
      const pool = getTestPool();

      // Create test inventory items
      await pool.query(`
        INSERT INTO inventory_items (
          id, location_id, name, sku, category, unit,
          current_quantity, par_level, reorder_point, unit_cost, total_value
        ) VALUES
          ('item-1', $1, 'Hamburger Patties', 'MEAT-001', 'meat', 'lbs', 50, 100, 30, 3.50, 175.00),
          ('item-2', $1, 'Buns', 'BREAD-001', 'bread', 'units', 200, 300, 100, 0.25, 50.00),
          ('item-3', $1, 'Lettuce', 'VEG-001', 'produce', 'heads', 15, 50, 20, 1.50, 22.50),
          ('item-4', $1, 'Fries', 'FROZEN-001', 'frozen', 'lbs', 80, 120, 40, 2.00, 160.00)
      `, [testLocation.id]);
    });

    it('should return all inventory items', async () => {
      const response = await request(app)
        .get('/api/v1/inventory')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(4);
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.summary.totalItems).toBe(4);
      expect(response.body.data.summary.totalValue).toBeGreaterThan(0);
    });

    it('should filter by location', async () => {
      const response = await request(app)
        .get('/api/v1/inventory')
        .query({ locationId: testLocation.id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(4);
      response.body.data.items.forEach(item => {
        expect(item.locationId).toBe(testLocation.id);
      });
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/v1/inventory')
        .query({ category: 'meat' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].category).toBe('meat');
      expect(response.body.data.items[0].name).toBe('Hamburger Patties');
    });

    it('should filter low stock items', async () => {
      const response = await request(app)
        .get('/api/v1/inventory')
        .query({ lowStock: 'true' })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Lettuce (15) is below reorder point (20)
      expect(response.body.data.items.length).toBeGreaterThan(0);
      response.body.data.items.forEach(item => {
        expect(item.needsReorder).toBe(true);
      });
    });

    it('should calculate summary correctly', async () => {
      const response = await request(app)
        .get('/api/v1/inventory')
        .expect(200);

      expect(response.body.data.summary).toMatchObject({
        totalItems: 4,
        totalValue: expect.any(Number),
        needsReorder: expect.any(Number)
      });
      expect(response.body.data.summary.totalValue).toBeCloseTo(407.50, 2);
    });
  });

  describe('POST /api/v1/inventory/count', () => {
    let inventoryItems;

    beforeEach(async () => {
      const pool = getTestPool();

      const result = await pool.query(`
        INSERT INTO inventory_items (
          id, location_id, name, sku, category, unit,
          current_quantity, par_level, reorder_point, unit_cost, total_value
        ) VALUES
          ('item-1', $1, 'Patties', 'MEAT-001', 'meat', 'lbs', 50, 100, 30, 3.50, 175.00),
          ('item-2', $1, 'Buns', 'BREAD-001', 'bread', 'units', 200, 300, 100, 0.25, 50.00)
        RETURNING *
      `, [testLocation.id]);

      inventoryItems = result.rows;
    });

    it('should perform inventory count successfully', async () => {
      const countData = {
        locationId: testLocation.id,
        countedBy: testUser.id,
        items: [
          {
            itemId: 'item-1',
            theoreticalQuantity: 50,
            quantity: 48
          },
          {
            itemId: 'item-2',
            theoreticalQuantity: 200,
            quantity: 205
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/inventory/count')
        .send(countData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.locationId).toBe(testLocation.id);
      expect(response.body.data.countedBy).toBe(testUser.id);
      expect(response.body.data.items).toHaveLength(2);
    });

    it('should calculate variance correctly', async () => {
      const countData = {
        locationId: testLocation.id,
        countedBy: testUser.id,
        items: [
          {
            itemId: 'item-1',
            theoreticalQuantity: 50,
            quantity: 45  // -5 variance
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/inventory/count')
        .send(countData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items[0]).toMatchObject({
        itemId: 'item-1',
        theoreticalQuantity: 50,
        countedQuantity: 45,
        variance: -5,
        varianceValue: expect.any(Number)
      });
      // Variance value should be -5 * 3.50 = -17.50
      expect(response.body.data.items[0].varianceValue).toBeCloseTo(-17.50, 2);
    });

    it('should update inventory quantities', async () => {
      const countData = {
        locationId: testLocation.id,
        countedBy: testUser.id,
        items: [
          {
            itemId: 'item-1',
            theoreticalQuantity: 50,
            quantity: 48
          }
        ]
      };

      await request(app)
        .post('/api/v1/inventory/count')
        .send(countData)
        .expect(201);

      // Verify the inventory was updated
      const pool = getTestPool();
      const result = await pool.query(
        'SELECT current_quantity FROM inventory_items WHERE id = $1',
        ['item-1']
      );

      expect(parseFloat(result.rows[0].current_quantity)).toBe(48);
    });

    it('should calculate totals correctly', async () => {
      const countData = {
        locationId: testLocation.id,
        countedBy: testUser.id,
        items: [
          {
            itemId: 'item-1',
            theoreticalQuantity: 50,
            quantity: 48
          },
          {
            itemId: 'item-2',
            theoreticalQuantity: 200,
            quantity: 205
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/inventory/count')
        .send(countData)
        .expect(201);

      expect(response.body.data.totals).toMatchObject({
        countedItems: 2,
        theoreticalQuantity: 250,
        countedQuantity: 253,
        variance: 3,
        varianceValue: expect.any(Number)
      });
    });

    it('should handle missing items gracefully', async () => {
      const countData = {
        locationId: testLocation.id,
        countedBy: testUser.id,
        items: [
          {
            itemId: 'non-existent-item',
            theoreticalQuantity: 10,
            quantity: 10
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/inventory/count')
        .send(countData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items[0]).toHaveProperty('error');
    });

    it('should reject count without locationId', async () => {
      const countData = {
        countedBy: testUser.id,
        items: []
      };

      const response = await request(app)
        .post('/api/v1/inventory/count')
        .send(countData)
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/inventory/waste', () => {
    beforeEach(async () => {
      const pool = getTestPool();

      await pool.query(`
        INSERT INTO inventory_items (
          id, location_id, name, sku, category, unit,
          current_quantity, par_level, reorder_point, unit_cost, total_value
        ) VALUES
          ('item-1', $1, 'Patties', 'MEAT-001', 'meat', 'lbs', 50, 100, 30, 3.50, 175.00)
      `, [testLocation.id]);
    });

    it('should log waste successfully', async () => {
      const wasteData = {
        itemId: 'item-1',
        quantity: 5,
        reasonCode: 'expired',
        notes: 'Past expiration date',
        loggedBy: testUser.id
      };

      const response = await request(app)
        .post('/api/v1/inventory/waste')
        .send(wasteData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        itemId: 'item-1',
        quantity: 5,
        reasonCode: 'expired',
        notes: 'Past expiration date',
        cost: expect.any(Number)
      });
      expect(response.body.data.cost).toBeCloseTo(17.50, 2);
    });

    it('should reduce inventory quantity after logging waste', async () => {
      const wasteData = {
        itemId: 'item-1',
        quantity: 5,
        reasonCode: 'damaged',
        loggedBy: testUser.id
      };

      const response = await request(app)
        .post('/api/v1/inventory/waste')
        .send(wasteData)
        .expect(201);

      expect(response.body.data.currentQuantity).toBe(45);

      // Verify in database
      const pool = getTestPool();
      const result = await pool.query(
        'SELECT current_quantity FROM inventory_items WHERE id = $1',
        ['item-1']
      );

      expect(parseFloat(result.rows[0].current_quantity)).toBe(45);
    });

    it('should calculate waste cost correctly', async () => {
      const wasteData = {
        itemId: 'item-1',
        quantity: 10,
        reasonCode: 'spoiled',
        loggedBy: testUser.id
      };

      const response = await request(app)
        .post('/api/v1/inventory/waste')
        .send(wasteData)
        .expect(201);

      // Cost should be 10 * 3.50 = 35.00
      expect(response.body.data.cost).toBeCloseTo(35.00, 2);
    });

    it('should not allow negative inventory', async () => {
      const wasteData = {
        itemId: 'item-1',
        quantity: 100,  // More than current quantity (50)
        reasonCode: 'damaged',
        loggedBy: testUser.id
      };

      const response = await request(app)
        .post('/api/v1/inventory/waste')
        .send(wasteData)
        .expect(201);

      expect(response.body.data.currentQuantity).toBe(0);
    });

    it('should handle non-existent item', async () => {
      const wasteData = {
        itemId: 'non-existent',
        quantity: 5,
        reasonCode: 'damaged',
        loggedBy: testUser.id
      };

      const response = await request(app)
        .post('/api/v1/inventory/waste')
        .send(wasteData)
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/inventory/variance', () => {
    beforeEach(async () => {
      const pool = getTestPool();

      // Create inventory items
      await pool.query(`
        INSERT INTO inventory_items (
          id, location_id, name, sku, category, unit,
          current_quantity, par_level, reorder_point, unit_cost, total_value
        ) VALUES
          ('item-1', $1, 'Patties', 'MEAT-001', 'meat', 'lbs', 50, 100, 30, 3.50, 175.00),
          ('item-2', $1, 'Buns', 'BREAD-001', 'bread', 'units', 200, 300, 100, 0.25, 50.00)
      `, [testLocation.id]);

      // Create count records with variance
      await pool.query(`
        INSERT INTO inventory_counts (
          id, location_id, counted_by, count_date, status, total_variance_cost, line_items
        ) VALUES
          (
            'count-1',
            $1,
            $2,
            NOW() - INTERVAL '1 day',
            'completed',
            -15.00,
            $3
          ),
          (
            'count-2',
            $1,
            $2,
            NOW() - INTERVAL '2 days',
            'completed',
            10.50,
            $4
          )
      `, [
        testLocation.id,
        testUser.id,
        JSON.stringify([
          {
            itemId: 'item-1',
            theoreticalQuantity: 50,
            countedQuantity: 48,
            variance: -2,
            varianceValue: -7.00
          }
        ]),
        JSON.stringify([
          {
            itemId: 'item-2',
            theoreticalQuantity: 200,
            countedQuantity: 210,
            variance: 10,
            varianceValue: 2.50
          }
        ])
      ]);
    });

    it('should calculate variance report', async () => {
      const response = await request(app)
        .get('/api/v1/inventory/variance')
        .query({ locationId: testLocation.id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        actual: expect.any(Number),
        theoretical: expect.any(Number),
        variance: expect.any(Number),
        variancePercent: expect.any(Number),
        varianceValue: expect.any(Number),
        countsAnalyzed: 2
      });
    });

    it('should filter by date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 3);
      const endDate = new Date();

      const response = await request(app)
        .get('/api/v1/inventory/variance')
        .query({
          locationId: testLocation.id,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.countsAnalyzed).toBe(2);
    });

    it('should calculate variance percentage', async () => {
      const response = await request(app)
        .get('/api/v1/inventory/variance')
        .query({ locationId: testLocation.id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.variancePercent).toBeDefined();
      expect(typeof response.body.data.variancePercent).toBe('number');
    });

    it('should handle location with no counts', async () => {
      const otherLocation = await createTestLocation({
        id: 'test-location-2',
        code: 'TEST-002'
      });

      const response = await request(app)
        .get('/api/v1/inventory/variance')
        .query({ locationId: otherLocation.id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        actual: 0,
        theoretical: 0,
        variance: 0,
        variancePercent: 0,
        varianceValue: 0,
        countsAnalyzed: 0
      });
    });
  });
});
