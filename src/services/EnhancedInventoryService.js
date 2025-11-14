/**
 * Enhanced Inventory Service
 * Smart reordering, vendor management, recipe costing, and forecasting
 */

const { getPool } = require('../database/pool');

class EnhancedInventoryService {
  // Smart Reordering
  async calculateReorderPoint(itemId, locationId) {
    const pool = getPool();

    // Get usage history
    const usageResult = await pool.query(`
      SELECT AVG(quantity) as avg_usage
      FROM inventory_counts
      WHERE item_id = $1
        AND location_id = $2
        AND counted_at >= CURRENT_DATE - INTERVAL '30 days'
    `, [itemId, locationId]);

    const avgDailyUsage = usageResult.rows[0]?.avg_usage || 0;

    // Get lead time from preferred vendor
    const itemResult = await pool.query(`
      SELECT i.lead_time_days, v.lead_time_days as vendor_lead_time
      FROM inventory i
      LEFT JOIN vendors v ON i.preferred_vendor_id = v.id
      WHERE i.id = $1
    `, [itemId]);

    const leadTime = itemResult.rows[0]?.vendor_lead_time || itemResult.rows[0]?.lead_time_days || 3;

    // Calculate reorder point: (Avg Daily Usage × Lead Time) + Safety Stock
    const safetyStock = avgDailyUsage * 2; // 2 days safety stock
    const reorderPoint = (avgDailyUsage * leadTime) + safetyStock;
    const reorderQuantity = avgDailyUsage * (leadTime + 7); // 1 week supply

    await pool.query(`
      UPDATE inventory
      SET reorder_point = $1,
          reorder_quantity = $2,
          safety_stock = $3,
          avg_daily_usage = $4,
          updated_at = NOW()
      WHERE id = $5
    `, [reorderPoint, reorderQuantity, safetyStock, avgDailyUsage, itemId]);

    return { reorderPoint, reorderQuantity, safetyStock, avgDailyUsage, leadTime };
  }

  async getItemsNeedingReorder(locationId = null) {
    const pool = getPool();

    let query = 'SELECT * FROM items_needing_reorder';
    const params = [];

    if (locationId) {
      query += ' WHERE location_id = $1';
      params.push(locationId);
    }

    query += ' ORDER BY stock_level DESC, days_of_stock ASC NULLS LAST';

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Vendor Management
  async addVendor(vendorData) {
    const pool = getPool();
    const id = `vendor-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const result = await pool.query(`
      INSERT INTO vendors (
        id, name, contact_name, email, phone, address,
        payment_terms, lead_time_days, minimum_order, rating, active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
      RETURNING *
    `, [
      id,
      vendorData.name,
      vendorData.contactName || null,
      vendorData.email || null,
      vendorData.phone || null,
      vendorData.address || null,
      vendorData.paymentTerms || null,
      vendorData.leadTimeDays || 3,
      vendorData.minimumOrder || null,
      vendorData.rating || null
    ]);

    return result.rows[0];
  }

  async compareVendorPricing(itemId) {
    const pool = getPool();

    const result = await pool.query(`
      SELECT
        v.id as vendor_id,
        v.name as vendor_name,
        v.lead_time_days,
        v.minimum_order,
        v.rating,
        vp.unit_price,
        vp.unit_size,
        vp.case_price,
        vp.case_quantity,
        CASE
          WHEN vp.case_price IS NOT NULL AND vp.case_quantity > 0
          THEN vp.case_price / vp.case_quantity
          ELSE vp.unit_price
        END as effective_unit_price
      FROM vendor_pricing vp
      JOIN vendors v ON vp.vendor_id = v.id
      WHERE vp.item_id = $1
        AND vp.is_current = true
        AND v.active = true
      ORDER BY effective_unit_price ASC
    `, [itemId]);

    return result.rows;
  }

  async addVendorPricing(pricingData) {
    const pool = getPool();
    const id = `vp-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Mark previous pricing as not current
    await pool.query(
      'UPDATE vendor_pricing SET is_current = false WHERE vendor_id = $1 AND item_id = $2',
      [pricingData.vendorId, pricingData.itemId]
    );

    const result = await pool.query(`
      INSERT INTO vendor_pricing (
        id, vendor_id, item_id, unit_price, unit_size,
        case_price, case_quantity, effective_date, is_current
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
      RETURNING *
    `, [
      id,
      pricingData.vendorId,
      pricingData.itemId,
      pricingData.unitPrice,
      pricingData.unitSize || null,
      pricingData.casePrice || null,
      pricingData.caseQuantity || null,
      pricingData.effectiveDate || new Date()
    ]);

    return result.rows[0];
  }

  // Recipe Costing
  async createRecipe(recipeData) {
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const id = `recipe-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const result = await client.query(`
        INSERT INTO recipes (
          id, name, category, serving_size, servings_per_recipe,
          prep_time_minutes, selling_price, active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        RETURNING *
      `, [
        id,
        recipeData.name,
        recipeData.category || null,
        recipeData.servingSize || null,
        recipeData.servingsPerRecipe || 1,
        recipeData.prepTimeMinutes || null,
        recipeData.sellingPrice || null
      ]);

      const recipe = result.rows[0];

      // Add ingredients
      let totalCost = 0;
      if (recipeData.ingredients && recipeData.ingredients.length > 0) {
        for (const ing of recipeData.ingredients) {
          const ingId = `ri-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          const ingTotal = ing.quantity * (ing.unitCost || 0);
          totalCost += ingTotal;

          await client.query(`
            INSERT INTO recipe_ingredients (
              id, recipe_id, item_id, item_name, quantity, unit, unit_cost, total_cost
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            ingId, id, ing.itemId, ing.itemName, ing.quantity,
            ing.unit, ing.unitCost || 0, ingTotal
          ]);
        }
      }

      // Update recipe costs
      const costPerServing = totalCost / (recipeData.servingsPerRecipe || 1);
      const marginPercent = recipeData.sellingPrice ?
        ((recipeData.sellingPrice - costPerServing) / recipeData.sellingPrice * 100) : 0;

      await client.query(`
        UPDATE recipes
        SET total_cost = $1,
            cost_per_serving = $2,
            margin_percent = $3
        WHERE id = $4
      `, [totalCost, costPerServing, marginPercent, id]);

      await client.query('COMMIT');

      return { ...recipe, totalCost, costPerServing, marginPercent };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getRecipeWithCosting(recipeId) {
    const pool = getPool();

    const recipeResult = await pool.query('SELECT * FROM recipes WHERE id = $1', [recipeId]);
    const ingredientsResult = await pool.query(
      'SELECT * FROM recipe_ingredients WHERE recipe_id = $1',
      [recipeId]
    );

    return {
      ...recipeResult.rows[0],
      ingredients: ingredientsResult.rows
    };
  }

  // Inventory Transfers
  async createTransfer(transferData) {
    const pool = getPool();
    const id = `transfer-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const result = await pool.query(`
      INSERT INTO inventory_transfers (
        id, from_location_id, to_location_id, item_id, item_name,
        quantity, unit, requested_by, notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
      RETURNING *
    `, [
      id,
      transferData.fromLocationId,
      transferData.toLocationId,
      transferData.itemId,
      transferData.itemName,
      transferData.quantity,
      transferData.unit,
      transferData.requestedBy || null,
      transferData.notes || null
    ]);

    return result.rows[0];
  }

  async approveTransfer(transferId, approvedBy) {
    const pool = getPool();

    const result = await pool.query(`
      UPDATE inventory_transfers
      SET status = 'approved',
          approved_by = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [approvedBy, transferId]);

    return result.rows[0];
  }

  async completeTransfer(transferId) {
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const transferResult = await client.query(
        'SELECT * FROM inventory_transfers WHERE id = $1',
        [transferId]
      );

      const transfer = transferResult.rows[0];

      if (!transfer || transfer.status !== 'in_transit') {
        throw new Error('Transfer not found or not in transit');
      }

      // Deduct from source
      await client.query(
        'UPDATE inventory SET current_stock = current_stock - $1 WHERE location_id = $2 AND item_id = $3',
        [transfer.quantity, transfer.from_location_id, transfer.item_id]
      );

      // Add to destination
      await client.query(
        'UPDATE inventory SET current_stock = current_stock + $1 WHERE location_id = $2 AND item_id = $3',
        [transfer.quantity, transfer.to_location_id, transfer.item_id]
      );

      // Update transfer status
      await client.query(
        'UPDATE inventory_transfers SET status = \'received\', updated_at = NOW() WHERE id = $1',
        [transferId]
      );

      await client.query('COMMIT');
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Inventory Forecasting
  async generateForecast(locationId, itemId, forecastDays = 30) {
    const pool = getPool();

    // Get usage data from last 90 days
    const usageResult = await pool.query(`
      SELECT
        DATE(counted_at) as date,
        AVG(quantity) as daily_usage
      FROM inventory_counts
      WHERE location_id = $1
        AND item_id = $2
        AND counted_at >= CURRENT_DATE - INTERVAL '90 days'
      GROUP BY DATE(counted_at)
      ORDER BY date DESC
    `, [locationId, itemId]);

    if (usageResult.rows.length < 7) {
      return { error: 'Insufficient data for forecasting' };
    }

    const avgDailyUsage = usageResult.rows.reduce((sum, row) => sum + parseFloat(row.daily_usage), 0) / usageResult.rows.length;

    // Get current stock
    const stockResult = await pool.query(
      'SELECT current_stock, reorder_quantity FROM inventory WHERE location_id = $1 AND item_id = $2',
      [locationId, itemId]
    );

    const currentStock = stockResult.rows[0]?.current_stock || 0;
    const predictedStockoutDays = avgDailyUsage > 0 ? Math.floor(currentStock / avgDailyUsage) : null;
    const predictedStockoutDate = predictedStockoutDays ?
      new Date(Date.now() + predictedStockoutDays * 24 * 60 * 60 * 1000) : null;

    const recommendedOrderQty = avgDailyUsage * forecastDays;

    // Store forecast
    const id = `forecast-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    await pool.query(`
      INSERT INTO inventory_forecasts (
        id, location_id, item_id, item_name, forecast_date,
        predicted_usage, predicted_stockout_date, recommended_order_quantity,
        confidence_level, based_on_days
      ) VALUES ($1, $2, $3, (SELECT item_name FROM inventory WHERE id = $3), $4, $5, $6, $7, $8, $9)
    `, [
      id, locationId, itemId, new Date(), avgDailyUsage * forecastDays,
      predictedStockoutDate, recommendedOrderQty, 0.85, usageResult.rows.length
    ]);

    return {
      avgDailyUsage,
      currentStock,
      predictedStockoutDays,
      predictedStockoutDate,
      recommendedOrderQty,
      confidenceLevel: 0.85
    };
  }

  // Purchase Orders
  async createPurchaseOrder(poData) {
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const id = `po-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const orderNumber = `PO-${Date.now()}`;

      let subtotal = 0;
      if (poData.items) {
        subtotal = poData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      }

      const tax = subtotal * 0.08; // 8% tax
      const total = subtotal + tax;

      const result = await client.query(`
        INSERT INTO purchase_orders (
          id, location_id, vendor_id, order_number, order_date,
          expected_delivery_date, status, subtotal, tax, total,
          created_by, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        id, poData.locationId, poData.vendorId, orderNumber,
        poData.orderDate || new Date(), poData.expectedDeliveryDate || null,
        subtotal, tax, total, poData.createdBy || null, poData.notes || null
      ]);

      // Add items
      if (poData.items) {
        for (const item of poData.items) {
          const itemId = `poi-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          await client.query(`
            INSERT INTO purchase_order_items (
              id, purchase_order_id, item_id, item_name, quantity_ordered,
              unit, unit_price, total_price
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            itemId, id, item.itemId, item.itemName, item.quantity,
            item.unit, item.unitPrice, item.quantity * item.unitPrice
          ]);
        }
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getPurchaseOrders(locationId, status = null) {
    const pool = getPool();

    let query = 'SELECT * FROM purchase_orders WHERE location_id = $1';
    const params = [locationId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY order_date DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }
}

module.exports = new EnhancedInventoryService();
