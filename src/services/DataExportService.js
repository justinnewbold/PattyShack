/**
 * Data Export/Import Service
 * Handles data exports to CSV, JSON, XLSX and imports from various formats
 */

const { getPool } = require('../database/pool');
const fs = require('fs').promises;
const path = require('path');
const { Parser } = require('json2csv');

class DataExportService {
  constructor() {
    this.exportDir = path.join(__dirname, '../../exports');
    this.ensureExportDir();
  }

  async ensureExportDir() {
    try {
      await fs.mkdir(this.exportDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create export directory:', error);
    }
  }

  // ===== EXPORT JOBS =====

  async createExportJob(exportData) {
    const pool = getPool();
    const id = `export-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const result = await pool.query(`
      INSERT INTO data_export_jobs (
        id, location_id, user_id, export_type, format, filters, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *
    `, [
      id,
      exportData.locationId || null,
      exportData.userId,
      exportData.exportType,
      exportData.format,
      JSON.stringify(exportData.filters || {})
    ]);

    // Start export asynchronously
    this.processExport(id).catch(error => {
      console.error('Export processing error:', error);
    });

    return result.rows[0];
  }

  async processExport(exportId) {
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update status to processing
      await client.query(
        'UPDATE data_export_jobs SET status = $1, started_at = NOW() WHERE id = $2',
        ['processing', exportId]
      );

      // Get export job details
      const jobResult = await client.query(
        'SELECT * FROM data_export_jobs WHERE id = $1',
        [exportId]
      );

      const job = jobResult.rows[0];

      // Get data based on export type
      const data = await this.getDataForExport(job.export_type, job.filters, job.location_id);

      // Generate file based on format
      const filePath = await this.generateExportFile(data, job.format, job.export_type);
      const stats = await fs.stat(filePath);

      // Update job with results
      await client.query(`
        UPDATE data_export_jobs
        SET status = 'completed',
            completed_at = NOW(),
            file_path = $1,
            file_size_bytes = $2,
            row_count = $3,
            download_url = $4,
            expires_at = NOW() + INTERVAL '7 days'
        WHERE id = $5
      `, [
        filePath,
        stats.size,
        data.length,
        `/api/v1/exports/${exportId}/download`,
        exportId
      ]);

      await client.query('COMMIT');

      return { success: true, exportId, rowCount: data.length };

    } catch (error) {
      await client.query('ROLLBACK');

      // Update job with error
      await pool.query(`
        UPDATE data_export_jobs
        SET status = 'failed',
            error_message = $1
        WHERE id = $2
      `, [error.message, exportId]);

      throw error;

    } finally {
      client.release();
    }
  }

  async getDataForExport(exportType, filters, locationId) {
    const pool = getPool();

    switch (exportType) {
      case 'tasks':
        return await this.exportTasks(filters, locationId);

      case 'temperatures':
        return await this.exportTemperatures(filters, locationId);

      case 'inventory':
        return await this.exportInventory(filters, locationId);

      case 'schedules':
        return await this.exportSchedules(filters, locationId);

      case 'labor':
        return await this.exportLabor(filters, locationId);

      case 'sales':
        return await this.exportSales(filters, locationId);

      default:
        throw new Error(`Unsupported export type: ${exportType}`);
    }
  }

  async exportTasks(filters, locationId) {
    const pool = getPool();

    let query = `
      SELECT
        t.id,
        t.title,
        t.description,
        t.task_type,
        t.priority,
        t.status,
        t.due_date,
        t.completed_at,
        u1.name as assigned_to_name,
        u2.name as created_by_name,
        l.name as location_name,
        t.created_at,
        t.updated_at
      FROM tasks t
      LEFT JOIN users u1 ON t.assigned_to = u1.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      LEFT JOIN locations l ON t.location_id = l.id
      WHERE 1=1
    `;

    const params = [];

    if (locationId) {
      query += ' AND t.location_id = $' + (params.length + 1);
      params.push(locationId);
    }

    if (filters.startDate) {
      query += ' AND t.created_at >= $' + (params.length + 1);
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ' AND t.created_at <= $' + (params.length + 1);
      params.push(filters.endDate);
    }

    if (filters.status) {
      query += ' AND t.status = $' + (params.length + 1);
      params.push(filters.status);
    }

    query += ' ORDER BY t.created_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  async exportTemperatures(filters, locationId) {
    const pool = getPool();

    let query = `
      SELECT
        tl.id,
        e.name as equipment_name,
        e.equipment_type,
        tl.temperature,
        tl.recorded_at,
        u.name as recorded_by_name,
        l.name as location_name,
        tl.is_within_range,
        tl.notes
      FROM temperature_logs tl
      JOIN equipment e ON tl.equipment_id = e.id
      LEFT JOIN users u ON tl.recorded_by = u.id
      LEFT JOIN locations l ON e.location_id = l.id
      WHERE 1=1
    `;

    const params = [];

    if (locationId) {
      query += ' AND e.location_id = $' + (params.length + 1);
      params.push(locationId);
    }

    if (filters.startDate) {
      query += ' AND tl.recorded_at >= $' + (params.length + 1);
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ' AND tl.recorded_at <= $' + (params.length + 1);
      params.push(filters.endDate);
    }

    query += ' ORDER BY tl.recorded_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  async exportInventory(filters, locationId) {
    const pool = getPool();

    let query = `
      SELECT
        i.id,
        i.item_name,
        i.category,
        i.current_quantity,
        i.unit,
        i.unit_cost,
        i.total_value,
        i.last_counted_at,
        l.name as location_name,
        i.par_level,
        i.reorder_point
      FROM inventory i
      LEFT JOIN locations l ON i.location_id = l.id
      WHERE 1=1
    `;

    const params = [];

    if (locationId) {
      query += ' AND i.location_id = $' + (params.length + 1);
      params.push(locationId);
    }

    query += ' ORDER BY i.item_name';

    const result = await pool.query(query, params);
    return result.rows;
  }

  async exportSchedules(filters, locationId) {
    const pool = getPool();

    let query = `
      SELECT
        s.id,
        s.shift_date,
        s.start_time,
        s.end_time,
        s.total_hours,
        s.position,
        u.name as employee_name,
        s.status,
        s.estimated_cost,
        l.name as location_name
      FROM shifts s
      JOIN schedules sch ON s.schedule_id = sch.id
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN locations l ON sch.location_id = l.id
      WHERE 1=1
    `;

    const params = [];

    if (locationId) {
      query += ' AND sch.location_id = $' + (params.length + 1);
      params.push(locationId);
    }

    if (filters.startDate) {
      query += ' AND s.shift_date >= $' + (params.length + 1);
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ' AND s.shift_date <= $' + (params.length + 1);
      params.push(filters.endDate);
    }

    query += ' ORDER BY s.shift_date, s.start_time';

    const result = await pool.query(query, params);
    return result.rows;
  }

  async exportLabor(filters, locationId) {
    const pool = getPool();

    let query = `
      SELECT
        le.id,
        le.shift_date,
        u.name as employee_name,
        le.position,
        le.clock_in,
        le.clock_out,
        le.total_hours,
        le.hourly_rate,
        le.total_cost,
        le.overtime_hours,
        le.overtime_cost,
        le.status,
        l.name as location_name
      FROM labor_entries le
      JOIN users u ON le.user_id = u.id
      LEFT JOIN locations l ON le.location_id = l.id
      WHERE 1=1
    `;

    const params = [];

    if (locationId) {
      query += ' AND le.location_id = $' + (params.length + 1);
      params.push(locationId);
    }

    if (filters.startDate) {
      query += ' AND le.shift_date >= $' + (params.length + 1);
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ' AND le.shift_date <= $' + (params.length + 1);
      params.push(filters.endDate);
    }

    query += ' ORDER BY le.shift_date DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  async exportSales(filters, locationId) {
    const pool = getPool();

    let query = `
      SELECT
        se.id,
        se.sale_date,
        se.sale_hour,
        se.gross_sales,
        se.net_sales,
        se.tax_amount,
        se.tips,
        se.discounts,
        se.transaction_count,
        se.guest_count,
        se.average_check,
        l.name as location_name
      FROM sales_entries se
      LEFT JOIN locations l ON se.location_id = l.id
      WHERE 1=1
    `;

    const params = [];

    if (locationId) {
      query += ' AND se.location_id = $' + (params.length + 1);
      params.push(locationId);
    }

    if (filters.startDate) {
      query += ' AND se.sale_date >= $' + (params.length + 1);
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ' AND se.sale_date <= $' + (params.length + 1);
      params.push(filters.endDate);
    }

    query += ' ORDER BY se.sale_date DESC, se.sale_hour';

    const result = await pool.query(query, params);
    return result.rows;
  }

  async generateExportFile(data, format, exportType) {
    const timestamp = Date.now();
    const filename = `${exportType}_${timestamp}.${format}`;
    const filePath = path.join(this.exportDir, filename);

    switch (format) {
      case 'csv':
        await this.generateCSV(data, filePath);
        break;

      case 'json':
        await this.generateJSON(data, filePath);
        break;

      case 'xlsx':
        await this.generateXLSX(data, filePath);
        break;

      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    return filePath;
  }

  async generateCSV(data, filePath) {
    if (data.length === 0) {
      await fs.writeFile(filePath, '');
      return;
    }

    const parser = new Parser();
    const csv = parser.parse(data);
    await fs.writeFile(filePath, csv);
  }

  async generateJSON(data, filePath) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  async generateXLSX(data, filePath) {
    // Placeholder for XLSX generation
    // Would use a library like 'exceljs' or 'xlsx'
    await this.generateCSV(data, filePath);
  }

  async getExportJob(exportId) {
    const pool = getPool();

    const result = await pool.query(
      'SELECT * FROM data_export_jobs WHERE id = $1',
      [exportId]
    );

    return result.rows[0] || null;
  }

  async getUserExports(userId, limit = 20) {
    const pool = getPool();

    const result = await pool.query(`
      SELECT * FROM data_export_jobs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [userId, limit]);

    return result.rows;
  }

  async downloadExport(exportId) {
    const job = await this.getExportJob(exportId);

    if (!job || !job.file_path) {
      throw new Error('Export not found or not ready');
    }

    if (job.status !== 'completed') {
      throw new Error(`Export is ${job.status}`);
    }

    if (job.expires_at && new Date(job.expires_at) < new Date()) {
      throw new Error('Export has expired');
    }

    const data = await fs.readFile(job.file_path);

    return {
      data,
      filename: path.basename(job.file_path),
      contentType: this.getContentType(job.format)
    };
  }

  getContentType(format) {
    const types = {
      csv: 'text/csv',
      json: 'application/json',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pdf: 'application/pdf'
    };

    return types[format] || 'application/octet-stream';
  }

  async cleanupExpiredExports() {
    const pool = getPool();

    const result = await pool.query(`
      SELECT file_path FROM data_export_jobs
      WHERE expires_at < NOW() AND file_path IS NOT NULL
    `);

    for (const row of result.rows) {
      try {
        await fs.unlink(row.file_path);
      } catch (error) {
        console.error('Failed to delete export file:', error);
      }
    }

    await pool.query(
      'DELETE FROM data_export_jobs WHERE expires_at < NOW()'
    );

    return { deleted: result.rows.length };
  }
}

module.exports = new DataExportService();
