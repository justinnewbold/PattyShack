/**
 * Analytics Service
 * Aggregates operational data across services to produce dashboards, benchmarks, and reports.
 */

const TaskService = require('./TaskService');
const InventoryService = require('./InventoryService');
const TemperatureService = require('./TemperatureService');
const ScheduleService = require('./ScheduleService');
const InvoiceService = require('./InvoiceService');

class AnalyticsService {
  async getDashboard(options = {}) {
    const { locationId = null, period = '7d' } = options;
    const range = this.resolvePeriod(period);

    const [
      currentSchedules,
      previousSchedules,
      currentLaborSummary,
      previousLaborSummary,
      currentInvoices,
      previousInvoices,
      tasks,
      wasteLogs,
      temperatureStats
    ] = await Promise.all([
      this.fetchSchedules({ locationId, start: range.start, end: range.end }),
      this.fetchSchedules({ locationId, start: range.previousStart, end: range.previousEnd }),
      this.fetchLaborSummary({ locationId, start: range.start, end: range.end }),
      this.fetchLaborSummary({ locationId, start: range.previousStart, end: range.previousEnd }),
      this.fetchInvoices({ locationId, start: range.start, end: range.end }),
      this.fetchInvoices({ locationId, start: range.previousStart, end: range.previousEnd }),
      TaskService.getTasks(locationId ? { locationId } : {}),
      this.fetchWasteLogs({ locationId, start: range.start, end: range.end, previousStart: range.previousStart, previousEnd: range.previousEnd }),
      this.fetchTemperatureStats({ locationId, start: range.start, end: range.end })
    ]);

    const currentSales = this.sumSales(currentSchedules);
    const previousSales = this.sumSales(previousSchedules);

    const currentFoodCost = this.sumInvoiceTotals(currentInvoices);
    const previousFoodCost = this.sumInvoiceTotals(previousInvoices);

    const currentLaborCost = currentLaborSummary.totalCost || 0;
    const previousLaborCost = previousLaborSummary.totalCost || 0;

    const wasteCurrent = wasteLogs.current;
    const wastePrevious = wasteLogs.previous;

    const compliance = this.calculateCompliance(tasks, range.start, range.end);

    const dashboard = {
      period: {
        label: range.label,
        start: range.start ? range.start.toISOString() : null,
        end: range.end ? range.end.toISOString() : null
      },
      kpis: {
        sales: {
          current: this.round(currentSales),
          previous: this.round(previousSales),
          change: this.calculatePercentageChange(currentSales, previousSales)
        },
        foodCost: {
          current: this.round(currentFoodCost),
          target: this.round(this.estimateFoodCostTarget(currentSales)),
          variance: this.calculateVariance(currentFoodCost, this.estimateFoodCostTarget(currentSales)),
          previous: this.round(previousFoodCost)
        },
        laborCost: {
          current: this.round(currentLaborCost),
          target: this.round(this.estimateLaborTarget(currentSales)),
          variance: this.calculateVariance(currentLaborCost, this.estimateLaborTarget(currentSales)),
          laborPercent: this.calculateLaborPercent(currentLaborCost, currentSales),
          previousPercent: this.calculateLaborPercent(previousLaborCost, previousSales)
        },
        waste: {
          current: this.round(wasteCurrent.totalCost),
          previous: this.round(wastePrevious.totalCost),
          change: this.calculatePercentageChange(wasteCurrent.totalCost, wastePrevious.totalCost),
          topReasons: wasteCurrent.topReasons
        },
        compliance: {
          score: this.round(compliance.score),
          tasks: compliance.tasks,
          trend: this.determineTrend(compliance.score, compliance.previousScore)
        }
      },
      charts: {
        salesTrend: this.buildSalesTrend(currentSchedules, range),
        laborVsSales: this.buildLaborVersusSales(currentSchedules),
        wasteByCategory: wasteCurrent.byCategory,
        temperatureCompliance: temperatureStats
      }
    };

    return dashboard;
  }

  async getLocationComparison(options = {}) {
    const { metric = 'sales', period = '30d' } = options;
    const range = this.resolvePeriod(period);

    const locationIds = await this.collectLocationIds();
    if (!locationIds.size) {
      return {
        locations: [],
        benchmark: {
          average: 0,
          topPerformer: null,
          bottomPerformer: null
        }
      };
    }

    const results = [];

    for (const locationId of locationIds) {
      const value = await this.calculateMetric(metric, locationId, range);
      const previousValue = await this.calculateMetric(metric, locationId, {
        start: range.previousStart,
        end: range.previousEnd
      });

      results.push({
        locationId,
        value: this.round(value),
        previousValue: this.round(previousValue),
        change: this.calculatePercentageChange(value, previousValue)
      });
    }

    const sorted = [...results].sort((a, b) => b.value - a.value);
    const average = sorted.reduce((sum, entry) => sum + entry.value, 0) / sorted.length;

    return {
      period: {
        label: range.label,
        start: range.start ? range.start.toISOString() : null,
        end: range.end ? range.end.toISOString() : null
      },
      metric,
      locations: sorted.map((entry, index) => ({
        ...entry,
        rank: index + 1
      })),
      benchmark: {
        average: this.round(average),
        topPerformer: sorted.length ? sorted[0] : null,
        bottomPerformer: sorted.length ? sorted[sorted.length - 1] : null
      }
    };
  }

  async generateReport(type, filters = {}) {
    const supportedTypes = ['operations', 'labor', 'inventory', 'financial'];
    if (!supportedTypes.includes(type)) {
      const error = new Error(`Unsupported report type: ${type}`);
      error.statusCode = 400;
      throw error;
    }

    const { locationId = null, startDate = null, endDate = null } = filters;
    const range = this.resolveExplicitRange(startDate, endDate);

    const base = {
      reportType: type,
      generatedAt: new Date().toISOString(),
      filters: {
        locationId,
        startDate: range.start ? range.start.toISOString() : null,
        endDate: range.end ? range.end.toISOString() : null
      },
      exportUrl: null
    };

    switch (type) {
      case 'operations':
        return {
          ...base,
          data: await this.buildOperationsReport(locationId, range)
        };
      case 'labor':
        return {
          ...base,
          data: await this.buildLaborReport(locationId, range)
        };
      case 'inventory':
        return {
          ...base,
          data: await this.buildInventoryReport(locationId, range)
        };
      case 'financial':
        return {
          ...base,
          data: await this.buildFinancialReport(locationId, range)
        };
      default:
        return base;
    }
  }

  async getAlerts(options = {}) {
    const { locationId = null, severity = null } = options;

    const [temperature, inventory, tasks, invoices] = await Promise.all([
      TemperatureService.getAlerts(locationId ? { locationId } : {}),
      InventoryService.getInventory(locationId ? { locationId } : {}),
      TaskService.getTasks(locationId ? { locationId } : {}),
      InvoiceService.getInvoices(locationId ? { locationId } : {})
    ]);

    const alerts = [];

    const temperatureAlerts = temperature.alerts || [];

    temperatureAlerts.forEach(alert => {
      alerts.push({
        id: alert.id,
        type: 'temperature',
        severity: alert.status === 'active' ? 'critical' : 'warning',
        status: alert.status,
        locationId: alert.locationId,
        title: `${alert.equipmentType || 'Equipment'} temperature ${alert.direction}`,
        message: `Temperature recorded at ${alert.temperature}° against ${alert.threshold.min}-${alert.threshold.max}° range.`,
        createdAt: alert.createdAt.toISOString(),
        metadata: {
          equipmentId: alert.equipmentId,
          direction: alert.direction
        }
      });
    });

    const inventoryItems = inventory.items || [];

    inventoryItems
      .filter(item => item.currentQuantity <= item.reorderPoint)
      .forEach(item => {
        alerts.push({
          id: `inventory-${item.id}`,
          type: 'inventory',
          severity: 'warning',
          status: 'active',
          locationId: item.locationId,
          title: `${item.name} below par`,
          message: `Current quantity ${item.currentQuantity} ${item.unit} below reorder point ${item.reorderPoint}.`,
          createdAt: new Date().toISOString(),
          metadata: {
            itemId: item.id,
            category: item.category
          }
        });
      });

    const now = new Date();
    tasks
      .filter(task => this.isTaskOverdue(task, now))
      .forEach(task => {
        alerts.push({
          id: `task-${task.id}`,
          type: 'task',
          severity: 'info',
          status: 'active',
          locationId: task.locationId,
          title: `Overdue task: ${task.title}`,
          message: `Task was due on ${task.dueDate}.`,
          createdAt: new Date(task.dueDate).toISOString(),
          metadata: {
            status: task.status,
            assignedTo: task.assignedTo || null
          }
        });
      });

    const invoiceList = invoices.invoices || [];

    invoiceList
      .filter(invoice => this.isInvoiceOverdue(invoice))
      .forEach(invoice => {
        alerts.push({
          id: `invoice-${invoice.id}`,
          type: 'invoice',
          severity: 'critical',
          status: invoice.status,
          locationId: invoice.locationId,
          title: `Invoice ${invoice.invoiceNumber} overdue`,
          message: `Outstanding balance ${this.round(invoice.total || 0)} past due date ${invoice.dueDate}.`,
          createdAt: invoice.dueDate,
          metadata: {
            vendorId: invoice.vendorId,
            total: invoice.total
          }
        });
      });

    const normalizedAlerts = alerts.map(alert => ({
      ...alert,
      createdAt: alert.createdAt instanceof Date ? alert.createdAt.toISOString() : alert.createdAt
    }));

    const filtered = severity
      ? normalizedAlerts.filter(alert => alert.severity === severity)
      : normalizedAlerts;

    const summary = filtered.reduce(
      (acc, alert) => {
        acc[alert.severity] = (acc[alert.severity] || 0) + 1;
        return acc;
      },
      { critical: 0, warning: 0, info: 0 }
    );

    return {
      alerts: filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      summary
    };
  }

  async fetchSchedules({ locationId, start, end }) {
    const filters = {};
    if (locationId) filters.locationId = locationId;
    if (start) filters.startDate = start.toISOString();
    if (end) filters.endDate = end.toISOString();

    const { schedules } = await ScheduleService.getSchedules(filters);
    return schedules || [];
  }

  async fetchLaborSummary({ locationId, start, end }) {
    const filters = {};
    if (locationId) filters.locationId = locationId;
    if (start) filters.startDate = start.toISOString();
    if (end) filters.endDate = end.toISOString();

    const { laborSummary } = await ScheduleService.getSchedules(filters);
    return laborSummary || {};
  }

  async fetchInvoices({ locationId, start, end }) {
    const filters = {};
    if (locationId) filters.locationId = locationId;
    if (start) filters.startDate = start.toISOString();
    if (end) filters.endDate = end.toISOString();

    const { invoices } = await InvoiceService.getInvoices(filters);
    return invoices || [];
  }

  async fetchWasteLogs({ locationId, start, end, previousStart, previousEnd }) {
    const logs = await InventoryService.getWasteLogs(locationId ? { locationId } : {});

    const current = logs.filter(entry => this.isWithinRange(entry.recordedAt, start, end));
    const previous = previousStart || previousEnd
      ? logs.filter(entry => this.isWithinRange(entry.recordedAt, previousStart, previousEnd))
      : [];

    return {
      current: await this.summarizeWaste(current),
      previous: await this.summarizeWaste(previous)
    };
  }

  async fetchTemperatureStats({ locationId, start, end }) {
    const filters = {};
    if (locationId) filters.locationId = locationId;
    if (start) filters.startDate = start.toISOString();
    if (end) filters.endDate = end.toISOString();

    const { logs } = await TemperatureService.getLogs(filters);
    if (!logs || !logs.length) {
      return {
        complianceRate: null,
        totalReadings: 0,
        outOfRange: 0
      };
    }

    const totalReadings = logs.length;
    const outOfRange = logs.filter(log => !log.isInRange).length;
    const complianceRate = ((totalReadings - outOfRange) / totalReadings) * 100;

    return {
      complianceRate: this.round(complianceRate),
      totalReadings,
      outOfRange
    };
  }

  async summarizeWaste(entries) {
    if (!entries.length) {
      return {
        totalCost: 0,
        byCategory: [],
        topReasons: []
      };
    }

    const byCategoryMap = new Map();
    const reasonMap = new Map();

    for (const entry of entries) {
      const item = await InventoryService.getItemById(entry.itemId);
      const category = item?.category || 'uncategorized';

      const currentCategory = byCategoryMap.get(category) || 0;
      byCategoryMap.set(category, currentCategory + (entry.cost || 0));

      const reasonKey = entry.reasonCode || 'unspecified';
      const reasonTotal = reasonMap.get(reasonKey) || 0;
      reasonMap.set(reasonKey, reasonTotal + (entry.cost || 0));
    }

    const totalCost = entries.reduce((sum, entry) => sum + (entry.cost || 0), 0);

    const byCategory = Array.from(byCategoryMap.entries())
      .map(([category, value]) => ({ category, value: this.round(value) }))
      .sort((a, b) => b.value - a.value);

    const topReasons = Array.from(reasonMap.entries())
      .map(([reason, value]) => ({ reason, value: this.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      totalCost: this.round(totalCost),
      byCategory,
      topReasons
    };
  }

  sumSales(schedules) {
    if (!schedules || !schedules.length) {
      return 0;
    }

    return schedules.reduce((total, schedule) => {
      const sales = schedule.metadata?.actualSales ?? schedule.metadata?.projectedSales ?? 0;
      return total + (Number.isFinite(sales) ? sales : 0);
    }, 0);
  }

  sumInvoiceTotals(invoices) {
    if (!invoices || !invoices.length) {
      return 0;
    }

    return invoices.reduce((total, invoice) => total + (invoice.total || 0), 0);
  }

  estimateFoodCostTarget(sales) {
    if (!sales) {
      return 0;
    }
    return sales * 0.3; // 30% of sales as a baseline target
  }

  estimateLaborTarget(sales) {
    if (!sales) {
      return 0;
    }
    return sales * 0.25; // 25% of sales as an ideal labor target
  }

  calculateLaborPercent(laborCost, sales) {
    if (!sales) {
      return null;
    }
    return this.round((laborCost / sales) * 100);
  }

  buildSalesTrend(schedules, range) {
    if (!schedules.length) {
      return [];
    }

    const granularity = this.determineGranularity(range.start, range.end);
    const buckets = new Map();

    schedules.forEach(schedule => {
      const bucketKey = this.getBucketKey(schedule.date, granularity);
      const existing = buckets.get(bucketKey) || { date: bucketKey, sales: 0, laborCost: 0 };

      const sales = schedule.metadata?.actualSales ?? schedule.metadata?.projectedSales ?? 0;
      const laborCost = schedule.laborCost || 0;

      existing.sales += Number.isFinite(sales) ? sales : 0;
      existing.laborCost += Number.isFinite(laborCost) ? laborCost : 0;

      buckets.set(bucketKey, existing);
    });

    return Array.from(buckets.values())
      .map(entry => ({
        date: entry.date,
        sales: this.round(entry.sales),
        laborCost: this.round(entry.laborCost)
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  buildLaborVersusSales(schedules) {
    if (!schedules.length) {
      return [];
    }

    return schedules.map(schedule => ({
      scheduleId: schedule.id,
      date: schedule.date,
      laborCost: this.round(schedule.laborCost || 0),
      sales: this.round(schedule.metadata?.actualSales ?? schedule.metadata?.projectedSales ?? 0),
      position: schedule.position
    }));
  }

  calculateCompliance(tasks, start, end) {
    if (!tasks.length) {
      return {
        score: 0,
        previousScore: 0,
        tasks: {
          completed: 0,
          total: 0,
          overdue: 0
        }
      };
    }

    const tasksInPeriod = tasks.filter(task => this.isWithinRange(task.dueDate || task.createdAt, start, end));
    const completed = tasksInPeriod.filter(task => task.status === 'completed');
    const overdue = tasksInPeriod.filter(task => this.isTaskOverdue(task, end || new Date())).length;

    const score = tasksInPeriod.length
      ? (completed.length / tasksInPeriod.length) * 100
      : 0;

    // Approximate previous score using historical completion data outside the range
    const previousTasks = tasks.filter(task => !this.isWithinRange(task.dueDate || task.createdAt, start, end));
    const previousCompleted = previousTasks.filter(task => task.status === 'completed');
    const previousScore = previousTasks.length
      ? (previousCompleted.length / previousTasks.length) * 100
      : score;

    return {
      score: this.round(score),
      previousScore: this.round(previousScore),
      tasks: {
        completed: completed.length,
        total: tasksInPeriod.length,
        overdue
      }
    };
  }

  async collectLocationIds() {
    const ids = new Set();

    const [tasks, inventory, schedules, invoices, temperature] = await Promise.all([
      TaskService.getTasks(),
      InventoryService.getInventory(),
      ScheduleService.getSchedules(),
      InvoiceService.getInvoices(),
      TemperatureService.getLogs()
    ]);

    tasks.forEach(task => {
      if (task.locationId) ids.add(task.locationId);
    });

    (inventory.items || []).forEach(item => {
      if (item.locationId) ids.add(item.locationId);
    });

    (schedules.schedules || schedules).forEach(schedule => {
      if (schedule.locationId) ids.add(schedule.locationId);
    });

    (invoices.invoices || invoices).forEach(invoice => {
      if (invoice.locationId) ids.add(invoice.locationId);
    });

    (temperature.logs || temperature).forEach(log => {
      if (log.locationId) ids.add(log.locationId);
    });

    return ids;
  }

  async calculateMetric(metric, locationId, range) {
    switch (metric) {
      case 'sales': {
        const schedules = await this.fetchSchedules({ locationId, start: range.start, end: range.end });
        return this.sumSales(schedules);
      }
      case 'labor': {
        const summary = await this.fetchLaborSummary({ locationId, start: range.start, end: range.end });
        return summary.laborPercent ?? 0;
      }
      case 'compliance': {
        const tasks = await TaskService.getTasks({ locationId });
        const compliance = this.calculateCompliance(tasks, range.start, range.end);
        return compliance.score;
      }
      case 'waste': {
        const waste = await this.fetchWasteLogs({ locationId, start: range.start, end: range.end, previousStart: null, previousEnd: null });
        return waste.current.totalCost;
      }
      default:
        return 0;
    }
  }

  async buildOperationsReport(locationId, range) {
    const tasks = await TaskService.getTasks(locationId ? { locationId } : {});
    const compliance = this.calculateCompliance(tasks, range.start, range.end);
    const alerts = await this.getAlerts({ locationId });

    return {
      title: 'Operations Summary',
      compliance,
      alerts,
      taskBreakdown: this.buildTaskBreakdown(tasks, range.start, range.end)
    };
  }

  async buildLaborReport(locationId, range) {
    const schedules = await this.fetchSchedules({ locationId, start: range.start, end: range.end });
    const summary = await this.fetchLaborSummary({ locationId, start: range.start, end: range.end });
    const sales = this.sumSales(schedules);

    return {
      title: 'Labor Performance',
      totals: {
        scheduledHours: summary.scheduledHours || 0,
        actualHours: summary.actualHours || 0,
        totalCost: summary.totalCost || 0,
        laborPercent: summary.laborPercent,
        sales: this.round(sales)
      },
      overtimeHours: summary.overtimeHours || 0,
      openShifts: summary.openShifts || 0,
      coverageByPosition: summary.coverageByPosition || {},
      laborVsSales: this.buildLaborVersusSales(schedules)
    };
  }

  async buildInventoryReport(locationId, range) {
    const inventory = await InventoryService.getInventory(locationId ? { locationId } : {});
    const variance = await InventoryService.getVariance({
      locationId,
      startDate: range.start ? range.start.toISOString() : undefined,
      endDate: range.end ? range.end.toISOString() : undefined
    });
    const waste = await this.fetchWasteLogs({ locationId, start: range.start, end: range.end, previousStart: null, previousEnd: null });

    return {
      title: 'Inventory Health',
      summary: inventory.summary,
      variance,
      waste: waste.current,
      countsAnalyzed: variance.countsAnalyzed
    };
  }

  async buildFinancialReport(locationId, range) {
    const { invoices, summary, aging } = await InvoiceService.getInvoices({
      locationId,
      startDate: range.start ? range.start.toISOString() : undefined,
      endDate: range.end ? range.end.toISOString() : undefined
    });

    const totals = this.sumInvoiceTotals(invoices);

    return {
      title: 'Financial Overview',
      totals: {
        invoiceCount: invoices.length,
        totalSpend: this.round(totals),
        outstandingBalance: summary.outstandingBalance
      },
      byStatus: summary.byStatus,
      totalsByStatus: summary.totalsByStatus,
      aging,
      averageOCRConfidence: summary.averageOCRConfidence
    };
  }

  buildTaskBreakdown(tasks, start, end) {
    const relevant = tasks.filter(task => this.isWithinRange(task.dueDate || task.createdAt, start, end));

    const byStatus = relevant.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {});

    const byType = relevant.reduce((acc, task) => {
      const type = task.type || 'unspecified';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return {
      total: relevant.length,
      byStatus,
      byType
    };
  }

  resolvePeriod(period) {
    const now = new Date();
    const end = new Date(now);
    let start;
    let label = period;

    const normalized = String(period || '').toLowerCase();

    if (normalized === '24h') {
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      label = 'Last 24 Hours';
    } else if (normalized.endsWith('d')) {
      const days = parseInt(normalized.replace('d', ''), 10);
      const duration = Number.isFinite(days) ? days : 7;
      start = new Date(end.getTime() - duration * 24 * 60 * 60 * 1000);
      label = `Last ${duration} Days`;
    } else if (normalized === 'mtd') {
      start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
      label = 'Month to Date';
    } else if (normalized === 'qtd') {
      const quarter = Math.floor(end.getUTCMonth() / 3);
      start = new Date(Date.UTC(end.getUTCFullYear(), quarter * 3, 1));
      label = 'Quarter to Date';
    } else if (normalized === 'ytd') {
      start = new Date(Date.UTC(end.getUTCFullYear(), 0, 1));
      label = 'Year to Date';
    } else {
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      label = 'Last 7 Days';
    }

    const durationMs = start ? end.getTime() - start.getTime() : 7 * 24 * 60 * 60 * 1000;
    const previousEnd = start ? new Date(start.getTime()) : null;
    const previousStart = previousEnd ? new Date(previousEnd.getTime() - durationMs) : null;

    return {
      label,
      start,
      end,
      previousStart,
      previousEnd
    };
  }

  resolveExplicitRange(startDate, endDate) {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : new Date();

    if (start && Number.isNaN(start.getTime())) {
      throw new Error('Invalid startDate provided');
    }

    if (end && Number.isNaN(end.getTime())) {
      throw new Error('Invalid endDate provided');
    }

    if (start && end && start > end) {
      throw new Error('startDate must be before endDate');
    }

    return {
      start,
      end
    };
  }

  determineGranularity(start, end) {
    if (!start || !end) {
      return 'day';
    }

    const duration = end.getTime() - start.getTime();
    if (duration <= 2 * 24 * 60 * 60 * 1000) {
      return 'hour';
    }

    if (duration <= 90 * 24 * 60 * 60 * 1000) {
      return 'day';
    }

    return 'week';
  }

  getBucketKey(dateInput, granularity) {
    const date = dateInput ? new Date(dateInput) : new Date();

    if (Number.isNaN(date.getTime())) {
      return new Date().toISOString();
    }

    if (granularity === 'hour') {
      return date.toISOString().slice(0, 13) + ':00:00Z';
    }

    if (granularity === 'week') {
      const weekDate = new Date(date);
      const day = weekDate.getUTCDay();
      const diff = weekDate.getUTCDate() - day + (day === 0 ? -6 : 1);
      weekDate.setUTCDate(diff);
      weekDate.setUTCHours(0, 0, 0, 0);
      return weekDate.toISOString().split('T')[0];
    }

    const normalized = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    return normalized.toISOString().split('T')[0];
  }

  calculatePercentageChange(current, previous) {
    if (!previous) {
      return current ? 100 : 0;
    }

    const change = ((current - previous) / Math.abs(previous)) * 100;
    return this.round(change);
  }

  calculateVariance(actual, target) {
    if (!target) {
      return actual ? 100 : 0;
    }

    const variance = ((actual - target) / target) * 100;
    return this.round(variance);
  }

  determineTrend(current, previous) {
    if (current === null || current === undefined) {
      return 'flat';
    }

    if (previous === null || previous === undefined) {
      return current > 0 ? 'up' : 'flat';
    }

    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'flat';
  }

  isWithinRange(dateInput, start, end) {
    if (!dateInput) {
      return false;
    }

    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (Number.isNaN(date.getTime())) {
      return false;
    }

    if (start && date < start) {
      return false;
    }

    if (end && date > end) {
      return false;
    }

    return true;
  }

  isTaskOverdue(task, referenceDate = new Date()) {
    if (!task || task.status === 'completed') {
      return false;
    }

    if (!task.dueDate) {
      return false;
    }

    const due = new Date(task.dueDate);
    if (Number.isNaN(due.getTime())) {
      return false;
    }

    return due < referenceDate;
  }

  isInvoiceOverdue(invoice) {
    if (!invoice.dueDate || invoice.status === 'paid') {
      return false;
    }

    const due = new Date(invoice.dueDate);
    if (Number.isNaN(due.getTime())) {
      return false;
    }

    return due < new Date();
  }

  round(value, decimals = 2) {
    if (!Number.isFinite(value)) {
      return 0;
    }

    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }
}

module.exports = new AnalyticsService();
