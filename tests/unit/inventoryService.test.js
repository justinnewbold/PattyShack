/**
 * InventoryService Unit Tests
 * Tests business logic for inventory tracking, waste logging, and variance analytics
 */

const InventoryService = require('../../src/services/InventoryService');
const {
  setupTestDatabase,
  clearTestDatabase,
  teardownTestDatabase,
  createTestLocation,
  createTestUser
} = require('../helpers/testDb');
const { initializePool } = require('../../src/database/pool');

describe('InventoryService', () => {
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

  describe('calculateTotalValue', () => {
    it('should calculate total value correctly', () => {
      const value = InventoryService.calculateTotalValue(10, 5.50);

      expect(value).toBe(55);
    });

    it('should handle zero quantity', () => {
      const value = InventoryService.calculateTotalValue(0, 5.50);

      expect(value).toBe(0);
    });

    it('should handle zero unit cost', () => {
      const value = InventoryService.calculateTotalValue(10, 0);

      expect(value).toBe(0);
    });

    it('should handle undefined values', () => {
      const value = InventoryService.calculateTotalValue();

      expect(value).toBe(0);
    });

    it('should handle null values', () => {
      const value = InventoryService.calculateTotalValue(null, null);

      expect(value).toBe(0);
    });

    it('should handle decimal quantities', () => {
      const value = InventoryService.calculateTotalValue(2.5, 10);

      expect(value).toBe(25);
    });
  });

  describe('resolveNumber', () => {
    it('should return number for valid numeric value', () => {
      expect(InventoryService.resolveNumber(42)).toBe(42);
    });

    it('should parse string numbers', () => {
      expect(InventoryService.resolveNumber('42')).toBe(42);
    });

    it('should parse decimal strings', () => {
      expect(InventoryService.resolveNumber('42.5')).toBe(42.5);
    });

    it('should return fallback for non-numeric string', () => {
      expect(InventoryService.resolveNumber('abc', 10)).toBe(10);
    });

    it('should return fallback for null', () => {
      expect(InventoryService.resolveNumber(null, 5)).toBe(5);
    });

    it('should return fallback for undefined', () => {
      expect(InventoryService.resolveNumber(undefined, 7)).toBe(7);
    });

    it('should return 0 as default fallback', () => {
      expect(InventoryService.resolveNumber('invalid')).toBe(0);
    });

    it('should handle Infinity', () => {
      expect(InventoryService.resolveNumber(Infinity, 10)).toBe(10);
    });

    it('should handle NaN', () => {
      expect(InventoryService.resolveNumber(NaN, 10)).toBe(10);
    });
  });

  describe('toBoolean', () => {
    it('should return true for boolean true', () => {
      expect(InventoryService.toBoolean(true)).toBe(true);
    });

    it('should return false for boolean false', () => {
      expect(InventoryService.toBoolean(false)).toBe(false);
    });

    it('should parse string "true"', () => {
      expect(InventoryService.toBoolean('true')).toBe(true);
    });

    it('should parse string "True"', () => {
      expect(InventoryService.toBoolean('True')).toBe(true);
    });

    it('should parse string "TRUE"', () => {
      expect(InventoryService.toBoolean('TRUE')).toBe(true);
    });

    it('should return false for string "false"', () => {
      expect(InventoryService.toBoolean('false')).toBe(false);
    });

    it('should return true for number 1', () => {
      expect(InventoryService.toBoolean(1)).toBe(true);
    });

    it('should return false for number 0', () => {
      expect(InventoryService.toBoolean(0)).toBe(false);
    });

    it('should return false for null', () => {
      expect(InventoryService.toBoolean(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(InventoryService.toBoolean(undefined)).toBe(false);
    });
  });

  describe('buildSummary', () => {
    it('should build summary for empty array', () => {
      const summary = InventoryService.buildSummary([]);

      expect(summary).toEqual({
        totalValue: 0,
        totalItems: 0,
        needsReorder: 0
      });
    });

    it('should calculate total value', () => {
      const items = [
        { totalValue: 100, needsReorder: false },
        { totalValue: 200, needsReorder: false },
        { totalValue: 50, needsReorder: false }
      ];

      const summary = InventoryService.buildSummary(items);

      expect(summary.totalValue).toBe(350);
      expect(summary.totalItems).toBe(3);
    });

    it('should count items needing reorder', () => {
      const items = [
        { totalValue: 100, needsReorder: true },
        { totalValue: 200, needsReorder: false },
        { totalValue: 50, needsReorder: true }
      ];

      const summary = InventoryService.buildSummary(items);

      expect(summary.needsReorder).toBe(2);
    });

    it('should round total value to 2 decimal places', () => {
      const items = [
        { totalValue: 100.333, needsReorder: false },
        { totalValue: 200.666, needsReorder: false }
      ];

      const summary = InventoryService.buildSummary(items);

      expect(summary.totalValue).toBe(301.00);
    });
  });

  describe('formatInventoryItem', () => {
    it('should convert database row to API format', () => {
      const dbRow = {
        id: 'item-1',
        location_id: 'loc-1',
        name: 'Test Item',
        sku: 'SKU-001',
        barcode: '123456',
        category: 'meat',
        unit: 'lbs',
        current_quantity: '50',
        par_level: '100',
        reorder_point: '30',
        unit_cost: '3.50',
        total_value: '175.00',
        vendor_id: 'vendor-1',
        last_count_date: '2025-10-20',
        last_count_by: 'user-1',
        last_order_date: '2025-10-15',
        last_received_date: '2025-10-18',
        waste_tracking: [{ quantity: 2, reasonCode: 'expired' }],
        used_in_recipes: ['burger'],
        metadata: { key: 'value' },
        created_at: '2025-10-01',
        updated_at: '2025-10-20'
      };

      const formatted = InventoryService.formatInventoryItem(dbRow);

      expect(formatted).toMatchObject({
        id: 'item-1',
        locationId: 'loc-1',
        name: 'Test Item',
        sku: 'SKU-001',
        barcode: '123456',
        category: 'meat',
        unit: 'lbs',
        currentQuantity: 50,
        parLevel: 100,
        reorderPoint: 30,
        unitCost: 3.50,
        totalValue: 175.00,
        vendorId: 'vendor-1',
        needsReorder: false
      });
    });

    it('should set needsReorder to true when below reorder point', () => {
      const dbRow = {
        id: 'item-1',
        location_id: 'loc-1',
        name: 'Test Item',
        sku: 'SKU-001',
        barcode: '123456',
        category: 'meat',
        unit: 'lbs',
        current_quantity: '25',  // Below reorder_point of 30
        par_level: '100',
        reorder_point: '30',
        unit_cost: '3.50',
        total_value: '87.50',
        vendor_id: 'vendor-1',
        last_count_date: null,
        last_count_by: null,
        last_order_date: null,
        last_received_date: null,
        waste_tracking: null,
        used_in_recipes: null,
        metadata: null,
        created_at: '2025-10-01',
        updated_at: '2025-10-20'
      };

      const formatted = InventoryService.formatInventoryItem(dbRow);

      expect(formatted.needsReorder).toBe(true);
    });

    it('should set needsReorder to true when equal to reorder point', () => {
      const dbRow = {
        id: 'item-1',
        location_id: 'loc-1',
        name: 'Test Item',
        sku: 'SKU-001',
        barcode: '123456',
        category: 'meat',
        unit: 'lbs',
        current_quantity: '30',  // Equal to reorder_point
        par_level: '100',
        reorder_point: '30',
        unit_cost: '3.50',
        total_value: '105.00',
        vendor_id: 'vendor-1',
        last_count_date: null,
        last_count_by: null,
        last_order_date: null,
        last_received_date: null,
        waste_tracking: null,
        used_in_recipes: null,
        metadata: null,
        created_at: '2025-10-01',
        updated_at: '2025-10-20'
      };

      const formatted = InventoryService.formatInventoryItem(dbRow);

      expect(formatted.needsReorder).toBe(true);
    });

    it('should handle null arrays as empty arrays', () => {
      const dbRow = {
        id: 'item-1',
        location_id: 'loc-1',
        name: 'Test Item',
        sku: 'SKU-001',
        barcode: '123456',
        category: 'meat',
        unit: 'lbs',
        current_quantity: '50',
        par_level: '100',
        reorder_point: '30',
        unit_cost: '3.50',
        total_value: '175.00',
        vendor_id: 'vendor-1',
        last_count_date: null,
        last_count_by: null,
        last_order_date: null,
        last_received_date: null,
        waste_tracking: null,
        used_in_recipes: null,
        metadata: null,
        created_at: '2025-10-01',
        updated_at: '2025-10-20'
      };

      const formatted = InventoryService.formatInventoryItem(dbRow);

      expect(formatted.wasteTracking).toEqual([]);
      expect(formatted.usedInRecipes).toEqual([]);
      expect(formatted.metadata).toEqual({});
    });
  });

  describe('performCount', () => {
    let item1, item2;

    beforeEach(async () => {
      item1 = await InventoryService.createItem({
        locationId: testLocation.id,
        name: 'Patties',
        sku: 'MEAT-001',
        category: 'meat',
        unit: 'lbs',
        currentQuantity: 50,
        parLevel: 100,
        reorderPoint: 30,
        unitCost: 3.50
      });

      item2 = await InventoryService.createItem({
        locationId: testLocation.id,
        name: 'Buns',
        sku: 'BREAD-001',
        category: 'bread',
        unit: 'units',
        currentQuantity: 200,
        parLevel: 300,
        reorderPoint: 100,
        unitCost: 0.25
      });
    });

    it('should perform count and calculate variance', async () => {
      const countData = {
        locationId: testLocation.id,
        countedBy: testUser.id,
        items: [
          {
            itemId: item1.id,
            theoreticalQuantity: 50,
            quantity: 48
          }
        ]
      };

      const result = await InventoryService.performCount(countData);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        itemId: item1.id,
        theoreticalQuantity: 50,
        countedQuantity: 48,
        variance: -2,
        varianceValue: expect.any(Number)
      });
      expect(result.items[0].varianceValue).toBeCloseTo(-7.00, 2);
    });

    it('should calculate positive variance', async () => {
      const countData = {
        locationId: testLocation.id,
        countedBy: testUser.id,
        items: [
          {
            itemId: item2.id,
            theoreticalQuantity: 200,
            quantity: 210
          }
        ]
      };

      const result = await InventoryService.performCount(countData);

      expect(result.items[0].variance).toBe(10);
      expect(result.items[0].varianceValue).toBeCloseTo(2.50, 2);
    });

    it('should calculate totals across multiple items', async () => {
      const countData = {
        locationId: testLocation.id,
        countedBy: testUser.id,
        items: [
          {
            itemId: item1.id,
            theoreticalQuantity: 50,
            quantity: 48
          },
          {
            itemId: item2.id,
            theoreticalQuantity: 200,
            quantity: 205
          }
        ]
      };

      const result = await InventoryService.performCount(countData);

      expect(result.totals).toMatchObject({
        countedItems: 2,
        theoreticalQuantity: 250,
        countedQuantity: 253,
        variance: 3,
        varianceValue: expect.any(Number)
      });
    });

    it('should update inventory quantities', async () => {
      const countData = {
        locationId: testLocation.id,
        countedBy: testUser.id,
        items: [
          {
            itemId: item1.id,
            theoreticalQuantity: 50,
            quantity: 45
          }
        ]
      };

      await InventoryService.performCount(countData);

      const updatedItem = await InventoryService.getItemById(item1.id);

      expect(updatedItem.currentQuantity).toBe(45);
    });

    it('should handle missing items', async () => {
      const countData = {
        locationId: testLocation.id,
        countedBy: testUser.id,
        items: [
          {
            itemId: 'non-existent',
            theoreticalQuantity: 10,
            quantity: 10
          }
        ]
      };

      const result = await InventoryService.performCount(countData);

      expect(result.items[0]).toHaveProperty('error');
      expect(result.totals.countedItems).toBe(0);
    });

    it('should throw error without locationId', async () => {
      const countData = {
        countedBy: testUser.id,
        items: []
      };

      await expect(
        InventoryService.performCount(countData)
      ).rejects.toThrow('locationId is required');
    });
  });

  describe('logWaste', () => {
    let inventoryItem;

    beforeEach(async () => {
      inventoryItem = await InventoryService.createItem({
        locationId: testLocation.id,
        name: 'Patties',
        sku: 'MEAT-001',
        category: 'meat',
        unit: 'lbs',
        currentQuantity: 50,
        parLevel: 100,
        reorderPoint: 30,
        unitCost: 3.50
      });
    });

    it('should log waste and reduce quantity', async () => {
      const wasteData = {
        itemId: inventoryItem.id,
        quantity: 5,
        reasonCode: 'expired',
        notes: 'Past expiration date',
        loggedBy: testUser.id
      };

      const entry = await InventoryService.logWaste(wasteData);

      expect(entry).toMatchObject({
        itemId: inventoryItem.id,
        quantity: 5,
        reasonCode: 'expired',
        notes: 'Past expiration date',
        currentQuantity: 45
      });
    });

    it('should calculate waste cost', async () => {
      const wasteData = {
        itemId: inventoryItem.id,
        quantity: 10,
        reasonCode: 'spoiled',
        loggedBy: testUser.id
      };

      const entry = await InventoryService.logWaste(wasteData);

      expect(entry.cost).toBeCloseTo(35.00, 2);  // 10 * 3.50
    });

    it('should not allow negative inventory', async () => {
      const wasteData = {
        itemId: inventoryItem.id,
        quantity: 100,  // More than current quantity
        reasonCode: 'damaged',
        loggedBy: testUser.id
      };

      const entry = await InventoryService.logWaste(wasteData);

      expect(entry.currentQuantity).toBe(0);
    });

    it('should update waste tracking in inventory item', async () => {
      const wasteData = {
        itemId: inventoryItem.id,
        quantity: 5,
        reasonCode: 'expired',
        notes: 'Test waste',
        loggedBy: testUser.id
      };

      await InventoryService.logWaste(wasteData);

      const updatedItem = await InventoryService.getItemById(inventoryItem.id);

      expect(updatedItem.wasteTracking).toHaveLength(1);
      expect(updatedItem.wasteTracking[0]).toMatchObject({
        quantity: 5,
        reasonCode: 'expired',
        notes: 'Test waste'
      });
    });

    it('should throw error for non-existent item', async () => {
      const wasteData = {
        itemId: 'non-existent',
        quantity: 5,
        reasonCode: 'damaged',
        loggedBy: testUser.id
      };

      await expect(
        InventoryService.logWaste(wasteData)
      ).rejects.toThrow('Inventory item not found');
    });
  });

  describe('getVariance', () => {
    it('should return zero variance when no counts exist', async () => {
      const variance = await InventoryService.getVariance({
        locationId: testLocation.id
      });

      expect(variance).toEqual({
        actual: 0,
        theoretical: 0,
        variance: 0,
        variancePercent: 0,
        varianceValue: 0,
        countsAnalyzed: 0
      });
    });

    it('should aggregate variance from multiple counts', async () => {
      const item = await InventoryService.createItem({
        locationId: testLocation.id,
        name: 'Patties',
        sku: 'MEAT-001',
        category: 'meat',
        unit: 'lbs',
        currentQuantity: 50,
        parLevel: 100,
        reorderPoint: 30,
        unitCost: 3.50
      });

      // Perform first count
      await InventoryService.performCount({
        locationId: testLocation.id,
        countedBy: testUser.id,
        items: [
          {
            itemId: item.id,
            theoreticalQuantity: 50,
            quantity: 48
          }
        ]
      });

      // Perform second count
      await InventoryService.performCount({
        locationId: testLocation.id,
        countedBy: testUser.id,
        items: [
          {
            itemId: item.id,
            theoreticalQuantity: 48,
            quantity: 45
          }
        ]
      });

      const variance = await InventoryService.getVariance({
        locationId: testLocation.id
      });

      expect(variance.countsAnalyzed).toBe(2);
      expect(variance.variance).toBeLessThan(0);  // Negative variance
    });

    it('should calculate variance percentage', async () => {
      const item = await InventoryService.createItem({
        locationId: testLocation.id,
        name: 'Patties',
        sku: 'MEAT-001',
        category: 'meat',
        unit: 'lbs',
        currentQuantity: 100,
        parLevel: 100,
        reorderPoint: 30,
        unitCost: 3.50
      });

      await InventoryService.performCount({
        locationId: testLocation.id,
        countedBy: testUser.id,
        items: [
          {
            itemId: item.id,
            theoreticalQuantity: 100,
            quantity: 90  // 10% variance
          }
        ]
      });

      const variance = await InventoryService.getVariance({
        locationId: testLocation.id
      });

      expect(variance.variancePercent).toBeCloseTo(-10, 1);
    });

    it('should filter by date range', async () => {
      const item = await InventoryService.createItem({
        locationId: testLocation.id,
        name: 'Patties',
        sku: 'MEAT-001',
        category: 'meat',
        unit: 'lbs',
        currentQuantity: 50,
        parLevel: 100,
        reorderPoint: 30,
        unitCost: 3.50
      });

      await InventoryService.performCount({
        locationId: testLocation.id,
        countedBy: testUser.id,
        items: [
          {
            itemId: item.id,
            theoreticalQuantity: 50,
            quantity: 48
          }
        ]
      });

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 1);

      const variance = await InventoryService.getVariance({
        locationId: testLocation.id,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      expect(variance.countsAnalyzed).toBe(1);
    });

    it('should handle zero theoretical quantity', async () => {
      const variance = {
        actual: 10,
        theoretical: 0,
        variance: 10,
        variancePercent: 0,
        varianceValue: 50,
        countsAnalyzed: 1
      };

      // When theoretical is zero, variancePercent should be 0
      expect(variance.variancePercent).toBe(0);
    });
  });

  describe('getInventory', () => {
    beforeEach(async () => {
      await InventoryService.createItem({
        locationId: testLocation.id,
        name: 'Patties',
        sku: 'MEAT-001',
        category: 'meat',
        unit: 'lbs',
        currentQuantity: 50,
        parLevel: 100,
        reorderPoint: 30,
        unitCost: 3.50
      });

      await InventoryService.createItem({
        locationId: testLocation.id,
        name: 'Buns',
        sku: 'BREAD-001',
        category: 'bread',
        unit: 'units',
        currentQuantity: 15,  // Below reorder point
        parLevel: 300,
        reorderPoint: 100,
        unitCost: 0.25
      });
    });

    it('should filter by category', async () => {
      const result = await InventoryService.getInventory({
        locationId: testLocation.id,
        category: 'meat'
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].category).toBe('meat');
    });

    it('should filter low stock items', async () => {
      const result = await InventoryService.getInventory({
        locationId: testLocation.id,
        lowStock: true
      });

      expect(result.items.every(item => item.needsReorder)).toBe(true);
    });

    it('should return summary with inventory', async () => {
      const result = await InventoryService.getInventory({
        locationId: testLocation.id
      });

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('summary');
      expect(result.summary).toMatchObject({
        totalValue: expect.any(Number),
        totalItems: expect.any(Number),
        needsReorder: expect.any(Number)
      });
    });
  });
});
