/**
 * Inventory Service
 * Business logic for inventory tracking, counts, waste logging, and variance analytics.
 */

const { getPool } = require('../database/pool');
const NotificationService = require('./NotificationService');

class InventoryService {
  constructor() {
    // Database-backed service
  }

  async createItem(data) {
    const pool = getPool();

    const totalValue = this.calculateTotalValue(data.currentQuantity, data.unitCost);

    const item = {
      id: data.id || `item-${Date.now()}`,
      location_id: data.locationId,
      name: data.name,
      sku: data.sku || null,
      barcode: data.barcode || null,
      category: data.category || null,
      unit: data.unit || null,
      current_quantity: data.currentQuantity || 0,
      par_level: data.parLevel || 0,
      reorder_point: data.reorderPoint || 0,
      unit_cost: data.unitCost || 0,
      total_value: totalValue,
      vendor_id: data.vendorId || null,
      last_count_date: data.lastCountDate || null,
      last_count_by: data.lastCountBy || null,
      last_order_date: data.lastOrderDate || null,
      last_received_date: data.lastReceivedDate || null,
      waste_tracking: JSON.stringify(data.wasteTracking || []),
      used_in_recipes: JSON.stringify(data.usedInRecipes || []),
      metadata: JSON.stringify(data.metadata || {})
    };

    const result = await pool.query(`
      INSERT INTO inventory_items (
        id, location_id, name, sku, barcode, category, unit,
        current_quantity, par_level, reorder_point, unit_cost, total_value,
        vendor_id, last_count_date, last_count_by, last_order_date,
        last_received_date, waste_tracking, used_in_recipes, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `, [
      item.id, item.location_id, item.name, item.sku, item.barcode,
      item.category, item.unit, item.current_quantity, item.par_level,
      item.reorder_point, item.unit_cost, item.total_value, item.vendor_id,
      item.last_count_date, item.last_count_by, item.last_order_date,
      item.last_received_date, item.waste_tracking, item.used_in_recipes, item.metadata
    ]);

    return this.formatInventoryItem(result.rows[0]);
  }

  async getItemById(id) {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM inventory_items WHERE id = $1', [id]);

    if (result.rows.length === 0) return null;
    return this.formatInventoryItem(result.rows[0]);
  }

  async getInventory(filters = {}) {
    const pool = getPool();
    const { locationId, category, lowStock } = filters;

    let query = 'SELECT * FROM inventory_items WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (locationId) {
      query += ` AND location_id = $${paramIndex++}`;
      params.push(locationId);
    }

    if (category) {
      query += ` AND LOWER(category) = LOWER($${paramIndex++})`;
      params.push(category);
    }

    query += ' ORDER BY name ASC';

    const result = await pool.query(query, params);
    let items = result.rows.map(row => this.formatInventoryItem(row));

    // Filter low stock in application layer since needsReorder is computed
    if (typeof lowStock !== 'undefined') {
      const shouldFilterLowStock = this.toBoolean(lowStock);
      if (shouldFilterLowStock) {
        items = items.filter(item => item.needsReorder);
      }
    }

    const summary = this.buildSummary(items);

    return {
      items,
      summary
    };
  }

  async performCount(countData) {
    const pool = getPool();
    const { locationId, items = [], countedBy, countedAt = new Date() } = countData;

    if (!locationId) {
      throw new Error('locationId is required to perform a count');
    }

    const results = [];
    const lowStockItems = [];

    for (const itemCount of items) {
      const inventoryItem = await this.getItemById(itemCount.itemId);

      if (!inventoryItem) {
        results.push({
          itemId: itemCount.itemId,
          error: 'Inventory item not found'
        });
        continue;
      }

      const previousQuantity = inventoryItem.currentQuantity;
      const theoreticalQuantity = this.resolveNumber(
        itemCount.theoreticalQuantity,
        previousQuantity
      );
      const countedQuantity = this.resolveNumber(itemCount.quantity, previousQuantity);
      const variance = countedQuantity - theoreticalQuantity;
      const varianceValue = parseFloat((variance * inventoryItem.unitCost).toFixed(2));

      // Update inventory item
      await pool.query(`
        UPDATE inventory_items
        SET
          current_quantity = $1,
          total_value = $2,
          last_count_date = $3,
          last_count_by = $4,
          updated_at = NOW()
        WHERE id = $5
      `, [
        countedQuantity,
        countedQuantity * inventoryItem.unitCost,
        new Date(countedAt),
        countedBy || 'system',
        itemCount.itemId
      ]);

      const result = {
        itemId: inventoryItem.id,
        name: inventoryItem.name,
        previousQuantity,
        theoreticalQuantity,
        countedQuantity,
        difference: countedQuantity - previousQuantity,
        variance,
        varianceValue,
        unit: inventoryItem.unit,
        unitCost: inventoryItem.unitCost
      };

      results.push(result);

      // Check if needs reorder
      if (countedQuantity <= inventoryItem.reorderPoint) {
        lowStockItems.push({
          ...inventoryItem,
          currentQuantity: countedQuantity
        });
      }
    }

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

    // Create count record
    const countRecord = {
      id: `count-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      location_id: locationId,
      counted_by: countedBy || 'system',
      count_date: new Date(countedAt),
      status: 'completed',
      total_variance_cost: parseFloat(totals.varianceValue.toFixed(2)),
      line_items: JSON.stringify(results),
      notes: null
    };

    await pool.query(`
      INSERT INTO inventory_counts (
        id, location_id, counted_by, count_date, status,
        total_variance_cost, line_items, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      countRecord.id, countRecord.location_id, countRecord.counted_by,
      countRecord.count_date, countRecord.status, countRecord.total_variance_cost,
      countRecord.line_items, countRecord.notes
    ]);

    // Send low stock notifications
    await Promise.all(lowStockItems.map(item => this.notifyLowStock(item)));

    return {
      id: countRecord.id,
      locationId: countRecord.location_id,
      countedBy: countRecord.counted_by,
      countedAt: countRecord.count_date,
      items: results,
      totals: {
        countedItems: totals.countedItems,
        theoreticalQuantity: parseFloat(totals.theoreticalQuantity.toFixed(2)),
        countedQuantity: parseFloat(totals.countedQuantity.toFixed(2)),
        variance: parseFloat(totals.variance.toFixed(2)),
        varianceValue: parseFloat(totals.varianceValue.toFixed(2))
      }
    };
  }

  async logWaste(wasteData) {
    const pool = getPool();
    const { itemId, quantity, reasonCode, notes = '', loggedBy, recordedAt = new Date() } = wasteData;

    const inventoryItem = await this.getItemById(itemId);
    if (!inventoryItem) {
      throw new Error('Inventory item not found');
    }

    const normalizedQuantity = this.resolveNumber(quantity, 0);
    const newQuantity = Math.max(0, inventoryItem.currentQuantity - normalizedQuantity);

    // Update waste tracking
    const wasteTracking = inventoryItem.wasteTracking || [];
    wasteTracking.push({
      date: new Date(recordedAt),
      quantity: normalizedQuantity,
      reasonCode,
      notes
    });

    // Update inventory item
    await pool.query(`
      UPDATE inventory_items
      SET
        current_quantity = $1,
        total_value = $2,
        waste_tracking = $3,
        updated_at = NOW()
      WHERE id = $4
    `, [
      newQuantity,
      newQuantity * inventoryItem.unitCost,
      JSON.stringify(wasteTracking),
      itemId
    ]);

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
      currentQuantity: newQuantity
    };

    if (newQuantity <= inventoryItem.reorderPoint) {
      await this.notifyLowStock({
        ...inventoryItem,
        currentQuantity: newQuantity
      });
    }

    return entry;
  }

  async getVariance(filters = {}) {
    const pool = getPool();
    const { locationId, startDate, endDate } = filters;

    let query = 'SELECT * FROM inventory_counts WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (locationId) {
      query += ` AND location_id = $${paramIndex++}`;
      params.push(locationId);
    }

    if (startDate) {
      query += ` AND count_date >= $${paramIndex++}`;
      params.push(new Date(startDate));
    }

    if (endDate) {
      query += ` AND count_date <= $${paramIndex++}`;
      params.push(new Date(endDate));
    }

    query += ' ORDER BY count_date DESC';

    const result = await pool.query(query, params);
    const relevantCounts = result.rows;

    const aggregate = relevantCounts.reduce(
      (acc, record) => {
        const items = record.line_items || [];
        items.forEach(item => {
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

  async getWasteLogs(filters = {}) {
    const pool = getPool();
    const { locationId } = filters;

    let query = 'SELECT * FROM inventory_items WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (locationId) {
      query += ` AND location_id = $${paramIndex++}`;
      params.push(locationId);
    }

    const result = await pool.query(query, params);
    const wasteLogs = [];

    result.rows.forEach(row => {
      const wasteTracking = row.waste_tracking || [];
      wasteTracking.forEach(entry => {
        wasteLogs.push({
          id: `waste-${row.id}-${entry.date}`,
          itemId: row.id,
          locationId: row.location_id,
          quantity: entry.quantity,
          reasonCode: entry.reasonCode,
          notes: entry.notes,
          cost: parseFloat((entry.quantity * row.unit_cost).toFixed(2)),
          loggedBy: null,
          recordedAt: entry.date,
          currentQuantity: row.current_quantity
        });
      });
    });

    return wasteLogs;
  }

  buildSummary(items) {
    if (!items.length) {
      return {
        totalValue: 0,
        totalItems: 0,
        needsReorder: 0
      };
    }

    const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0);
    const needsReorder = items.filter(item => item.needsReorder).length;

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

  // Helper method to format database row to API response format
  formatInventoryItem(row) {
    const needsReorder = row.current_quantity <= row.reorder_point;

    return {
      id: row.id,
      locationId: row.location_id,
      name: row.name,
      sku: row.sku,
      barcode: row.barcode,
      category: row.category,
      unit: row.unit,
      currentQuantity: parseFloat(row.current_quantity),
      parLevel: parseFloat(row.par_level),
      reorderPoint: parseFloat(row.reorder_point),
      unitCost: parseFloat(row.unit_cost),
      totalValue: parseFloat(row.total_value),
      vendorId: row.vendor_id,
      lastCountDate: row.last_count_date,
      lastCountBy: row.last_count_by,
      lastOrderDate: row.last_order_date,
      lastReceivedDate: row.last_received_date,
      wasteTracking: row.waste_tracking || [],
      usedInRecipes: row.used_in_recipes || [],
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      needsReorder
    };
  }
}

module.exports = new InventoryService();
