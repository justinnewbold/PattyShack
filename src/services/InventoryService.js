/**
 * Inventory Service
 * Provides in-memory inventory tracking, counts, waste logging, and variance analytics.
 */

const InventoryItem = require('../models/InventoryItem');
const NotificationService = require('./NotificationService');

class InventoryService {
  constructor() {
    this.items = new Map();
    this.counts = [];
    this.wasteLogs = [];

    this.seedDemoData();
  }

  seedDemoData() {
    const demoItems = [
      {
        id: 'item-100',
        locationId: 'store-100',
        name: 'Ground Beef 80/20',
        sku: 'GB-80-20',
        barcode: '0123456789012',
        category: 'protein',
        unit: 'lb',
        currentQuantity: 120,
        parLevel: 150,
        reorderPoint: 80,
        unitCost: 3.25,
        lastCountDate: new Date(),
        metadata: { vendor: 'Premium Meats Co.' }
      },
      {
        id: 'item-101',
        locationId: 'store-100',
        name: 'Sesame Buns',
        sku: 'BUN-SES-12',
        barcode: '0987654321098',
        category: 'bakery',
        unit: 'case',
        currentQuantity: 32,
        parLevel: 45,
        reorderPoint: 20,
        unitCost: 12.75,
        metadata: { packSize: '12 ct' }
      },
      {
        id: 'item-200',
        locationId: 'store-200',
        name: 'American Cheese Slices',
        sku: 'CHE-120',
        barcode: '0456123789000',
        category: 'dairy',
        unit: 'case',
        currentQuantity: 18,
        parLevel: 30,
        reorderPoint: 15,
        unitCost: 22.5,
        metadata: { storage: 'refrigerated' }
      }
    ];

    demoItems.forEach(item => {
      this.createItem(item);
    });
  }

  createItem(data) {
    const item = new InventoryItem({
      ...data,
      totalValue: this.calculateTotalValue(data.currentQuantity, data.unitCost)
    });

    item.totalValue = this.calculateTotalValue(item.currentQuantity, item.unitCost);

    this.items.set(item.id, item);
    return item;
  }

  getItemById(id) {
    return this.items.get(id) || null;
  }

  async getInventory(filters = {}) {
    const { locationId, category, lowStock } = filters;

    let items = Array.from(this.items.values());

    if (locationId) {
      items = items.filter(item => item.locationId === locationId);
    }

    if (category) {
      const normalized = category.toLowerCase();
      items = items.filter(item => (item.category || '').toLowerCase() === normalized);
    }

    if (typeof lowStock !== 'undefined') {
      const shouldFilterLowStock = this.toBoolean(lowStock);
      if (shouldFilterLowStock) {
        items = items.filter(item => item.needsReorder());
      }
    }

    const summary = this.buildSummary(items);
    const serializedItems = items.map(item => this.serializeItem(item));

    return {
      items: serializedItems,
      summary
    };
  }

  async performCount(countData) {
    const { locationId, items = [], countedBy, countedAt = new Date() } = countData;

    if (!locationId) {
      throw new Error('locationId is required to perform a count');
    }

    const results = [];
    const lowStockItems = [];

    items.forEach(itemCount => {
      const inventoryItem = this.items.get(itemCount.itemId);

      if (!inventoryItem) {
        results.push({
          itemId: itemCount.itemId,
          error: 'Inventory item not found'
        });
        return;
      }

      const previousQuantity = inventoryItem.currentQuantity;
      const theoreticalQuantity = this.resolveNumber(
        itemCount.theoreticalQuantity,
        previousQuantity
      );
      const countedQuantity = this.resolveNumber(itemCount.quantity, previousQuantity);
      const adjustment = inventoryItem.updateQuantity(countedQuantity, 'count');
      const variance = countedQuantity - theoreticalQuantity;
      const varianceValue = parseFloat((variance * inventoryItem.unitCost).toFixed(2));

      inventoryItem.lastCountDate = new Date(countedAt);
      inventoryItem.lastCountBy = countedBy || 'system';

      const result = {
        itemId: inventoryItem.id,
        name: inventoryItem.name,
        previousQuantity,
        theoreticalQuantity,
        countedQuantity,
        difference: adjustment.difference,
        variance,
        varianceValue,
        unit: inventoryItem.unit,
        unitCost: inventoryItem.unitCost
      };

      results.push(result);

      if (inventoryItem.needsReorder()) {
        lowStockItems.push(inventoryItem);
      }
    });

    const totals = results.reduce(
      (acc, result) => {
        if (result.error) {
          return acc;
        }

        acc.countedItems += 1;
        acc.theoreticalQuantity += result.theoreticalQuantity;
        acc.countedQuantity += result.countedQuantity;
        acc.variance += result.variance;
        acc.varianceValue += result.varianceValue;
        return acc;
      },
      {
        countedItems: 0,
        theoreticalQuantity: 0,
        countedQuantity: 0,
        variance: 0,
        varianceValue: 0
      }
    );

    const countRecord = {
      id: `count-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      locationId,
      countedBy: countedBy || 'system',
      countedAt: new Date(countedAt),
      items: results,
      totals: {
        countedItems: totals.countedItems,
        theoreticalQuantity: parseFloat(totals.theoreticalQuantity.toFixed(2)),
        countedQuantity: parseFloat(totals.countedQuantity.toFixed(2)),
        variance: parseFloat(totals.variance.toFixed(2)),
        varianceValue: parseFloat(totals.varianceValue.toFixed(2))
      }
    };

    this.counts.push(countRecord);

    await Promise.all(lowStockItems.map(item => this.notifyLowStock(item)));

    return countRecord;
  }

  async logWaste(wasteData) {
    const { itemId, quantity, reasonCode, notes = '', loggedBy, recordedAt = new Date() } = wasteData;

    const inventoryItem = this.items.get(itemId);
    if (!inventoryItem) {
      throw new Error('Inventory item not found');
    }

    const normalizedQuantity = this.resolveNumber(quantity, 0);

    inventoryItem.recordWaste(normalizedQuantity, reasonCode, notes);

    const entry = {
      id: `waste-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      itemId,
      locationId: inventoryItem.locationId,
      quantity: normalizedQuantity,
      reasonCode,
      notes,
      cost: parseFloat((normalizedQuantity * inventoryItem.unitCost).toFixed(2)),
      loggedBy: loggedBy || null,
      recordedAt: new Date(recordedAt),
      currentQuantity: inventoryItem.currentQuantity
    };

    this.wasteLogs.push(entry);

    if (inventoryItem.needsReorder()) {
      await this.notifyLowStock(inventoryItem);
    }

    return entry;
  }

  async getVariance(filters = {}) {
    const { locationId, startDate, endDate } = filters;
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const relevantCounts = this.counts.filter(record => {
      if (locationId && record.locationId !== locationId) {
        return false;
      }

      if (start && record.countedAt < start) {
        return false;
      }

      if (end && record.countedAt > end) {
        return false;
      }

      return true;
    });

    const aggregate = relevantCounts.reduce(
      (acc, record) => {
        record.items.forEach(item => {
          if (item.error) {
            return;
          }

          acc.actual += item.countedQuantity;
          acc.theoretical += item.theoreticalQuantity;
          acc.variance += item.variance;
          acc.varianceValue += item.varianceValue;
        });
        return acc;
      },
      { actual: 0, theoretical: 0, variance: 0, varianceValue: 0 }
    );

    const variancePercent = aggregate.theoretical
      ? parseFloat(((aggregate.variance / aggregate.theoretical) * 100).toFixed(2))
      : 0;

    return {
      actual: parseFloat(aggregate.actual.toFixed(2)),
      theoretical: parseFloat(aggregate.theoretical.toFixed(2)),
      variance: parseFloat(aggregate.variance.toFixed(2)),
      variancePercent,
      varianceValue: parseFloat(aggregate.varianceValue.toFixed(2)),
      countsAnalyzed: relevantCounts.length
    };
  }

  getWasteLogs(filters = {}) {
    const { locationId } = filters;

    return this.wasteLogs.filter(entry => {
      if (locationId && entry.locationId !== locationId) {
        return false;
      }
      return true;
    });
  }

  serializeItem(item) {
    return {
      id: item.id,
      locationId: item.locationId,
      name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      category: item.category,
      unit: item.unit,
      currentQuantity: item.currentQuantity,
      parLevel: item.parLevel,
      reorderPoint: item.reorderPoint,
      unitCost: item.unitCost,
      totalValue: parseFloat(item.totalValue.toFixed(2)),
      lastCountDate: item.lastCountDate,
      lastCountBy: item.lastCountBy,
      lastOrderDate: item.lastOrderDate,
      lastReceivedDate: item.lastReceivedDate,
      wasteTracking: item.wasteTracking,
      usedInRecipes: item.usedInRecipes,
      metadata: item.metadata,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      needsReorder: item.needsReorder()
    };
  }

  buildSummary(items) {
    if (!items.length) {
      return {
        totalValue: 0,
        totalItems: 0,
        needsReorder: 0
      };
    }

    const totalValue = items.reduce((sum, item) => sum + this.calculateTotalValue(item.currentQuantity, item.unitCost), 0);
    const needsReorder = items.filter(item => item.needsReorder()).length;

    return {
      totalValue: parseFloat(totalValue.toFixed(2)),
      totalItems: items.length,
      needsReorder
    };
  }

  calculateTotalValue(quantity = 0, unitCost = 0) {
    return (quantity || 0) * (unitCost || 0);
  }

  resolveNumber(value, fallback = 0) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
    return fallback;
  }

  toBoolean(value) {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }

    return Boolean(value);
  }

  async notifyLowStock(item) {
    try {
      await NotificationService.sendInventoryLowStockAlert(item);
    } catch (error) {
      console.error('Failed to send low stock notification', error);
    }
  }
}

module.exports = new InventoryService();
