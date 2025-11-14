/**
 * Enhanced Analytics Service
 * Advanced reporting, labor cost analytics, food cost tracking, and performance metrics
 */

const { getPool } = require('../database/pool');

class EnhancedAnalyticsService {
  // ===== LABOR COST ANALYTICS =====

  async recordLaborEntry(laborData) {
    const pool = getPool();
    const id = `labor-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    let totalHours = laborData.totalHours;
    let totalCost = laborData.totalCost;

    // Calculate if clock out is provided
    if (laborData.clockOut && laborData.clockIn) {
      const clockIn = new Date(laborData.clockIn);
      const clockOut = new Date(laborData.clockOut);
      totalHours = (clockOut - clockIn) / (1000 * 60 * 60); // Convert ms to hours

      // Subtract break time
      if (laborData.breakMinutes) {
        totalHours -= laborData.breakMinutes / 60;
      }

      // Calculate overtime (over 8 hours per day)
      const overtimeHours = Math.max(0, totalHours - 8);
      const regularHours = totalHours - overtimeHours;
      const overtimeCost = overtimeHours * laborData.hourlyRate * 1.5;
      const regularCost = regularHours * laborData.hourlyRate;

      totalCost = regularCost + overtimeCost;
    }

    const result = await pool.query(`
      INSERT INTO labor_entries (
        id, user_id, location_id, shift_date, clock_in, clock_out,
        total_hours, hourly_rate, total_cost, overtime_hours, overtime_cost,
        break_minutes, position, notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'active')
      RETURNING *
    `, [
      id,
      laborData.userId,
      laborData.locationId,
      laborData.shiftDate,
      laborData.clockIn,
      laborData.clockOut || null,
      totalHours,
      laborData.hourlyRate,
      totalCost,
      Math.max(0, totalHours - 8),
      Math.max(0, (totalHours - 8) * laborData.hourlyRate * 1.5),
      laborData.breakMinutes || 0,
      laborData.position || null,
      laborData.notes || null
    ]);

    return result.rows[0];
  }

  async approveLaborEntry(entryId, approvedBy) {
    const pool = getPool();

    const result = await pool.query(`
      UPDATE labor_entries
      SET status = 'approved',
          approved_by = $1,
          approved_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [approvedBy, entryId]);

    return result.rows[0];
  }

  async getLaborCostReport(locationId, startDate, endDate) {
    const pool = getPool();

    const result = await pool.query(`
      SELECT
        shift_date,
        COUNT(*) as total_shifts,
        SUM(total_hours) as total_hours,
        SUM(total_cost) as total_labor_cost,
        SUM(overtime_hours) as total_overtime_hours,
        SUM(overtime_cost) as total_overtime_cost,
        AVG(hourly_rate) as avg_hourly_rate,
        COUNT(DISTINCT user_id) as unique_employees
      FROM labor_entries
      WHERE location_id = $1
        AND shift_date >= $2
        AND shift_date <= $3
        AND status = 'approved'
      GROUP BY shift_date
      ORDER BY shift_date DESC
    `, [locationId, startDate, endDate]);

    const summary = {
      totalLaborCost: result.rows.reduce((sum, row) => sum + parseFloat(row.total_labor_cost || 0), 0),
      totalHours: result.rows.reduce((sum, row) => sum + parseFloat(row.total_hours || 0), 0),
      totalOvertimeCost: result.rows.reduce((sum, row) => sum + parseFloat(row.total_overtime_cost || 0), 0),
      avgDailyLaborCost: result.rows.reduce((sum, row) => sum + parseFloat(row.total_labor_cost || 0), 0) / result.rows.length || 0,
      dailyBreakdown: result.rows
    };

    return summary;
  }

  // ===== SALES TRACKING =====

  async recordSalesEntry(salesData) {
    const pool = getPool();
    const id = `sale-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const averageCheck = salesData.transactionCount > 0
      ? salesData.netSales / salesData.transactionCount
      : 0;

    const result = await pool.query(`
      INSERT INTO sales_entries (
        id, location_id, sale_date, sale_hour, gross_sales, net_sales,
        tax_amount, tips, discounts, voids, transaction_count, guest_count,
        average_check, category_breakdown, payment_methods
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      id,
      salesData.locationId,
      salesData.saleDate,
      salesData.saleHour || null,
      salesData.grossSales,
      salesData.netSales,
      salesData.taxAmount || 0,
      salesData.tips || 0,
      salesData.discounts || 0,
      salesData.voids || 0,
      salesData.transactionCount || 0,
      salesData.guestCount || 0,
      averageCheck,
      JSON.stringify(salesData.categoryBreakdown || {}),
      JSON.stringify(salesData.paymentMethods || {})
    ]);

    return result.rows[0];
  }

  async getSalesReport(locationId, startDate, endDate) {
    const pool = getPool();

    const result = await pool.query(`
      SELECT
        sale_date,
        SUM(net_sales) as daily_sales,
        SUM(transaction_count) as daily_transactions,
        SUM(guest_count) as daily_guests,
        AVG(average_check) as avg_check
      FROM sales_entries
      WHERE location_id = $1
        AND sale_date >= $2
        AND sale_date <= $3
      GROUP BY sale_date
      ORDER BY sale_date DESC
    `, [locationId, startDate, endDate]);

    const summary = {
      totalSales: result.rows.reduce((sum, row) => sum + parseFloat(row.daily_sales || 0), 0),
      totalTransactions: result.rows.reduce((sum, row) => sum + parseInt(row.daily_transactions || 0), 0),
      totalGuests: result.rows.reduce((sum, row) => sum + parseInt(row.daily_guests || 0), 0),
      avgDailySales: result.rows.reduce((sum, row) => sum + parseFloat(row.daily_sales || 0), 0) / result.rows.length || 0,
      dailyBreakdown: result.rows
    };

    return summary;
  }

  // ===== FOOD COST TRACKING =====

  async recordFoodCost(foodCostData) {
    const pool = getPool();
    const id = `fc-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Calculate food cost metrics
    const costOfGoodsUsed = foodCostData.beginningInventory +
      foodCostData.purchases +
      (foodCostData.transferIn || 0) -
      (foodCostData.transferOut || 0) -
      foodCostData.endingInventory;

    const actualFoodCost = costOfGoodsUsed - (foodCostData.wasteCost || 0);

    const foodCostPercentage = foodCostData.salesForPeriod > 0
      ? (actualFoodCost / foodCostData.salesForPeriod) * 100
      : 0;

    const variance = foodCostPercentage - (foodCostData.targetFoodCostPercentage || 30);

    const result = await pool.query(`
      INSERT INTO food_cost_entries (
        id, location_id, period_start, period_end, beginning_inventory,
        purchases, ending_inventory, cost_of_goods_used, waste_cost,
        transfer_in, transfer_out, actual_food_cost, sales_for_period,
        food_cost_percentage, target_food_cost_percentage, variance, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
      id,
      foodCostData.locationId,
      foodCostData.periodStart,
      foodCostData.periodEnd,
      foodCostData.beginningInventory,
      foodCostData.purchases,
      foodCostData.endingInventory,
      costOfGoodsUsed,
      foodCostData.wasteCost || 0,
      foodCostData.transferIn || 0,
      foodCostData.transferOut || 0,
      actualFoodCost,
      foodCostData.salesForPeriod,
      foodCostPercentage,
      foodCostData.targetFoodCostPercentage || 30,
      variance,
      foodCostData.notes || null
    ]);

    return result.rows[0];
  }

  async getFoodCostTrend(locationId, months = 6) {
    const pool = getPool();

    const result = await pool.query(`
      SELECT
        period_start,
        period_end,
        actual_food_cost,
        sales_for_period,
        food_cost_percentage,
        target_food_cost_percentage,
        variance,
        waste_cost
      FROM food_cost_entries
      WHERE location_id = $1
        AND period_start >= CURRENT_DATE - INTERVAL '1 month' * $2
      ORDER BY period_start DESC
    `, [locationId, months]);

    return result.rows;
  }

  // ===== WASTE TRACKING =====

  async recordWaste(wasteData) {
    const pool = getPool();
    const id = `waste-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const totalCost = wasteData.quantity * (wasteData.costPerUnit || 0);

    const result = await pool.query(`
      INSERT INTO waste_entries (
        id, location_id, item_id, item_name, waste_date, quantity, unit,
        cost_per_unit, total_cost, waste_reason, responsible_user_id, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      id,
      wasteData.locationId,
      wasteData.itemId || null,
      wasteData.itemName,
      wasteData.wasteDate,
      wasteData.quantity,
      wasteData.unit,
      wasteData.costPerUnit || 0,
      totalCost,
      wasteData.wasteReason,
      wasteData.responsibleUserId || null,
      wasteData.notes || null
    ]);

    return result.rows[0];
  }

  async getWasteReport(locationId, startDate, endDate) {
    const pool = getPool();

    const result = await pool.query(`
      SELECT
        waste_date,
        waste_reason,
        item_name,
        SUM(total_cost) as total_waste_cost,
        SUM(quantity) as total_quantity,
        COUNT(*) as waste_count
      FROM waste_entries
      WHERE location_id = $1
        AND waste_date >= $2
        AND waste_date <= $3
      GROUP BY waste_date, waste_reason, item_name
      ORDER BY waste_date DESC, total_waste_cost DESC
    `, [locationId, startDate, endDate]);

    const summary = {
      totalWasteCost: result.rows.reduce((sum, row) => sum + parseFloat(row.total_waste_cost || 0), 0),
      totalWasteCount: result.rows.reduce((sum, row) => sum + parseInt(row.waste_count || 0), 0),
      byReason: {},
      byItem: {},
      details: result.rows
    };

    // Aggregate by reason
    result.rows.forEach(row => {
      if (!summary.byReason[row.waste_reason]) {
        summary.byReason[row.waste_reason] = { cost: 0, count: 0 };
      }
      summary.byReason[row.waste_reason].cost += parseFloat(row.total_waste_cost || 0);
      summary.byReason[row.waste_reason].count += parseInt(row.waste_count || 0);
    });

    return summary;
  }

  // ===== SALES FORECASTING =====

  async generateSalesForecast(locationId, forecastDate, forecastType = 'daily') {
    const pool = getPool();
    const id = `forecast-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Get historical data (90 days)
    const historicalResult = await pool.query(`
      SELECT
        AVG(net_sales) as avg_sales,
        STDDEV(net_sales) as stddev_sales,
        AVG(transaction_count) as avg_transactions,
        AVG(guest_count) as avg_guests
      FROM sales_entries
      WHERE location_id = $1
        AND sale_date >= $2 - INTERVAL '90 days'
        AND sale_date < $2
    `, [locationId, forecastDate]);

    const historical = historicalResult.rows[0];

    if (!historical || !historical.avg_sales) {
      throw new Error('Insufficient historical data for forecasting');
    }

    // Simple trend-based forecast
    const trendResult = await pool.query(`
      SELECT
        REGR_SLOPE(net_sales, EXTRACT(EPOCH FROM sale_date)) as trend_slope
      FROM sales_entries
      WHERE location_id = $1
        AND sale_date >= $2 - INTERVAL '90 days'
        AND sale_date < $2
    `, [locationId, forecastDate]);

    const trendSlope = trendResult.rows[0].trend_slope || 0;
    const trendAdjustment = trendSlope * 86400 * 30; // 30 days forward

    const predictedSales = parseFloat(historical.avg_sales) + trendAdjustment;
    const confidenceScore = Math.max(0.5, 1 - (parseFloat(historical.stddev_sales || 0) / parseFloat(historical.avg_sales)));

    const result = await pool.query(`
      INSERT INTO sales_forecasts (
        id, location_id, forecast_date, forecast_type, predicted_sales,
        predicted_transactions, predicted_guests, confidence_score,
        historical_average, trend_adjustment
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (location_id, forecast_date, forecast_type)
      DO UPDATE SET
        predicted_sales = EXCLUDED.predicted_sales,
        predicted_transactions = EXCLUDED.predicted_transactions,
        predicted_guests = EXCLUDED.predicted_guests,
        confidence_score = EXCLUDED.confidence_score,
        historical_average = EXCLUDED.historical_average,
        trend_adjustment = EXCLUDED.trend_adjustment
      RETURNING *
    `, [
      id,
      locationId,
      forecastDate,
      forecastType,
      predictedSales,
      Math.round(historical.avg_transactions || 0),
      Math.round(historical.avg_guests || 0),
      confidenceScore,
      historical.avg_sales,
      trendAdjustment
    ]);

    return result.rows[0];
  }

  async getForecastAccuracy(locationId, startDate, endDate) {
    const pool = getPool();

    const result = await pool.query(`
      SELECT
        sf.forecast_date,
        sf.predicted_sales,
        sf.confidence_score,
        se.net_sales as actual_sales,
        ABS(sf.predicted_sales - se.net_sales) as absolute_error,
        CASE
          WHEN se.net_sales > 0
          THEN ABS((sf.predicted_sales - se.net_sales) / se.net_sales) * 100
          ELSE NULL
        END as percent_error
      FROM sales_forecasts sf
      LEFT JOIN (
        SELECT location_id, sale_date, SUM(net_sales) as net_sales
        FROM sales_entries
        GROUP BY location_id, sale_date
      ) se ON sf.location_id = se.location_id AND sf.forecast_date = se.sale_date
      WHERE sf.location_id = $1
        AND sf.forecast_date >= $2
        AND sf.forecast_date <= $3
        AND sf.forecast_type = 'daily'
      ORDER BY sf.forecast_date DESC
    `, [locationId, startDate, endDate]);

    const accuracy = {
      forecasts: result.rows,
      avgPercentError: result.rows.reduce((sum, row) => sum + (parseFloat(row.percent_error || 0)), 0) / result.rows.length || 0,
      avgAbsoluteError: result.rows.reduce((sum, row) => sum + (parseFloat(row.absolute_error || 0)), 0) / result.rows.length || 0
    };

    return accuracy;
  }

  // ===== PERFORMANCE METRICS =====

  async recordPerformanceMetric(metricData) {
    const pool = getPool();
    const id = `metric-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const variance = metricData.targetValue
      ? ((metricData.metricValue - metricData.targetValue) / metricData.targetValue) * 100
      : null;

    const result = await pool.query(`
      INSERT INTO performance_metrics (
        id, location_id, user_id, metric_date, metric_type, metric_value,
        target_value, variance, unit, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      id,
      metricData.locationId,
      metricData.userId || null,
      metricData.metricDate,
      metricData.metricType,
      metricData.metricValue,
      metricData.targetValue || null,
      variance,
      metricData.unit || null,
      JSON.stringify(metricData.metadata || {})
    ]);

    return result.rows[0];
  }

  async getPerformanceMetrics(locationId, metricType, startDate, endDate) {
    const pool = getPool();

    const result = await pool.query(`
      SELECT
        metric_date,
        metric_type,
        AVG(metric_value) as avg_value,
        AVG(target_value) as avg_target,
        AVG(variance) as avg_variance,
        COUNT(*) as metric_count
      FROM performance_metrics
      WHERE location_id = $1
        AND metric_type = $2
        AND metric_date >= $3
        AND metric_date <= $4
      GROUP BY metric_date, metric_type
      ORDER BY metric_date DESC
    `, [locationId, metricType, startDate, endDate]);

    return result.rows;
  }

  // ===== DASHBOARD VIEWS =====

  async getDailyPerformanceDashboard(locationId, date) {
    const pool = getPool();

    const result = await pool.query(`
      SELECT * FROM daily_performance_dashboard
      WHERE location_id = $1 AND sale_date = $2
    `, [locationId, date]);

    return result.rows[0] || null;
  }

  async getPrimeCostAnalysis(locationId, startDate, endDate) {
    const pool = getPool();

    const result = await pool.query(`
      SELECT * FROM prime_cost_analysis
      WHERE location_id = $1
        AND period_start >= $2
        AND period_end <= $3
      ORDER BY period_start DESC
    `, [locationId, startDate, endDate]);

    return result.rows;
  }

  async getEmployeeProductivity(locationId, startDate, endDate) {
    const pool = getPool();

    let query = `
      SELECT * FROM employee_productivity
      WHERE week_start >= $1 AND week_start <= $2
    `;

    const params = [startDate, endDate];

    if (locationId) {
      query += ' AND location_id = $3';
      params.push(locationId);
    }

    query += ' ORDER BY sales_per_hour DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  // ===== REPORT SNAPSHOTS =====

  async generateReportSnapshot(snapshotData) {
    const pool = getPool();
    const id = `snapshot-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const result = await pool.query(`
      INSERT INTO report_snapshots (
        id, location_id, report_type, report_period, period_start,
        period_end, report_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      id,
      snapshotData.locationId || null,
      snapshotData.reportType,
      snapshotData.reportPeriod,
      snapshotData.periodStart,
      snapshotData.periodEnd,
      JSON.stringify(snapshotData.reportData)
    ]);

    return result.rows[0];
  }

  async getReportSnapshot(locationId, reportType, reportPeriod) {
    const pool = getPool();

    let query = `
      SELECT * FROM report_snapshots
      WHERE report_type = $1 AND report_period = $2
    `;

    const params = [reportType, reportPeriod];

    if (locationId) {
      query += ' AND location_id = $3';
      params.push(locationId);
    }

    query += ' ORDER BY generated_at DESC LIMIT 1';

    const result = await pool.query(query, params);
    return result.rows[0] || null;
  }
}

module.exports = new EnhancedAnalyticsService();
