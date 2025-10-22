/**
 * Invoice Service
 * Business logic for invoice capture, OCR simulation, and reconciliation workflows.
 */

const { getPool } = require('../database/pool');

class InvoiceService {
  constructor() {
    // Database-backed service
  }

  async createInvoice(data) {
    const pool = getPool();

    const lineItems = this.normalizeLineItems(data.lineItems);
    const subtotal = lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const tax = this.toNumber(data.tax, 0);
    const total = subtotal + tax;

    const invoice = {
      id: String(data.id || this.generateId()),
      location_id: data.locationId,
      vendor_id: data.vendorId || null,
      invoice_number: data.invoiceNumber,
      invoice_date: this.parseDate(data.invoiceDate) || new Date(),
      due_date: this.parseDate(data.dueDate) || null,
      subtotal,
      tax,
      total,
      status: this.normalizeStatus(data.status),
      line_items: JSON.stringify(lineItems),
      attachments: JSON.stringify(data.attachments || []),
      ocr_processed: Boolean(data.ocrProcessed),
      ocr_confidence: this.toNumber(data.ocrConfidence, 0),
      gl_code: data.glCode || null,
      approved_by: data.approvedBy || null,
      approved_at: this.parseDate(data.approvedAt) || null,
      paid_at: this.parseDate(data.paidAt) || null,
      payment_method: data.paymentMethod || null,
      reconciled: Boolean(data.reconciled),
      reconciled_with: data.reconciledWith || null,
      notes: data.notes || null,
      metadata: JSON.stringify(data.metadata || {})
    };

    const result = await pool.query(`
      INSERT INTO invoices (
        id, location_id, vendor_id, invoice_number, invoice_date, due_date,
        subtotal, tax, total, status, line_items, attachments, ocr_processed,
        ocr_confidence, gl_code, approved_by, approved_at, paid_at,
        payment_method, reconciled, reconciled_with, notes, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      RETURNING *
    `, [
      invoice.id, invoice.location_id, invoice.vendor_id, invoice.invoice_number,
      invoice.invoice_date, invoice.due_date, invoice.subtotal, invoice.tax,
      invoice.total, invoice.status, invoice.line_items, invoice.attachments,
      invoice.ocr_processed, invoice.ocr_confidence, invoice.gl_code,
      invoice.approved_by, invoice.approved_at, invoice.paid_at,
      invoice.payment_method, invoice.reconciled, invoice.reconciled_with,
      invoice.notes, invoice.metadata
    ]);

    return this.formatInvoice(result.rows[0]);
  }

  async getInvoices(filters = {}) {
    const pool = getPool();
    const { locationId, vendorId, status, startDate, endDate, search } = filters;

    let query = 'SELECT * FROM invoices WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (locationId) {
      query += ` AND location_id = $${paramIndex++}`;
      params.push(String(locationId));
    }

    if (vendorId) {
      query += ` AND vendor_id = $${paramIndex++}`;
      params.push(String(vendorId));
    }

    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(String(status).toLowerCase());
    }

    if (startDate) {
      query += ` AND invoice_date >= $${paramIndex++}`;
      params.push(this.parseDate(startDate));
    }

    if (endDate) {
      query += ` AND invoice_date <= $${paramIndex++}`;
      params.push(this.parseDate(endDate));
    }

    if (search) {
      query += ` AND (LOWER(invoice_number) LIKE LOWER($${paramIndex}) OR LOWER(vendor_id) LIKE LOWER($${paramIndex}))`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ' ORDER BY invoice_date DESC';

    const result = await pool.query(query, params);
    const invoices = result.rows.map(row => this.formatInvoice(row));

    const summary = this.buildSummary(invoices);
    const aging = this.calculateAging(invoices);

    return {
      invoices,
      summary,
      aging
    };
  }

  async getInvoiceById(id) {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM invoices WHERE id = $1', [String(id)]);

    if (result.rows.length === 0) {
      return null;
    }

    const invoice = this.formatInvoice(result.rows[0]);
    const lineItems = invoice.lineItems || [];

    invoice.analytics = {
      lineItemCount: lineItems.length,
      averageLineItemValue: this.roundToTwo(
        lineItems.length
          ? lineItems.reduce((sum, item) => sum + (item.total || 0), 0) / lineItems.length
          : 0
      ),
      isOverdue: this.isOverdue(result.rows[0]),
      outstandingBalance: this.roundToTwo(this.resolveOutstanding(result.rows[0]))
    };

    return invoice;
  }

  async updateInvoice(id, updates = {}) {
    const pool = getPool();

    const setClauses = [];
    const params = [];
    let paramIndex = 1;

    if (typeof updates.locationId !== 'undefined') {
      setClauses.push(`location_id = $${paramIndex++}`);
      params.push(updates.locationId);
    }

    if (typeof updates.vendorId !== 'undefined') {
      setClauses.push(`vendor_id = $${paramIndex++}`);
      params.push(updates.vendorId);
    }

    if (typeof updates.invoiceNumber !== 'undefined') {
      setClauses.push(`invoice_number = $${paramIndex++}`);
      params.push(updates.invoiceNumber);
    }

    if (typeof updates.invoiceDate !== 'undefined') {
      setClauses.push(`invoice_date = $${paramIndex++}`);
      params.push(this.parseDate(updates.invoiceDate));
    }

    if (typeof updates.dueDate !== 'undefined') {
      setClauses.push(`due_date = $${paramIndex++}`);
      params.push(this.parseDate(updates.dueDate));
    }

    if (typeof updates.status !== 'undefined') {
      setClauses.push(`status = $${paramIndex++}`);
      params.push(this.normalizeStatus(updates.status));
    }

    if (typeof updates.tax !== 'undefined') {
      setClauses.push(`tax = $${paramIndex++}`);
      params.push(this.toNumber(updates.tax, 0));
    }

    if (Array.isArray(updates.lineItems)) {
      const lineItems = this.normalizeLineItems(updates.lineItems);
      const subtotal = lineItems.reduce((sum, item) => sum + (item.total || 0), 0);

      setClauses.push(`line_items = $${paramIndex++}`);
      params.push(JSON.stringify(lineItems));

      setClauses.push(`subtotal = $${paramIndex++}`);
      params.push(subtotal);

      // Recalculate total
      const currentResult = await pool.query('SELECT tax FROM invoices WHERE id = $1', [String(id)]);
      if (currentResult.rows.length > 0) {
        const tax = currentResult.rows[0].tax || 0;
        setClauses.push(`total = $${paramIndex++}`);
        params.push(subtotal + tax);
      }
    }

    if (Array.isArray(updates.attachments)) {
      setClauses.push(`attachments = $${paramIndex++}`);
      params.push(JSON.stringify(updates.attachments));
    }

    if (updates.metadata && typeof updates.metadata === 'object') {
      // Get current metadata and merge
      const currentResult = await pool.query('SELECT metadata FROM invoices WHERE id = $1', [String(id)]);
      if (currentResult.rows.length > 0) {
        const currentMetadata = currentResult.rows[0].metadata || {};
        setClauses.push(`metadata = $${paramIndex++}`);
        params.push(JSON.stringify({ ...currentMetadata, ...updates.metadata }));
      }
    }

    if (setClauses.length === 0) {
      return await this.getInvoiceById(id);
    }

    setClauses.push(`updated_at = NOW()`);
    params.push(String(id));

    const query = `
      UPDATE invoices
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, params);
    if (result.rows.length === 0) return null;

    return this.formatInvoice(result.rows[0]);
  }

  async approveInvoice(id, data = {}) {
    const pool = getPool();
    const { userId, notes } = data;

    // Get current notes
    const currentResult = await pool.query('SELECT notes FROM invoices WHERE id = $1', [String(id)]);
    if (currentResult.rows.length === 0) {
      return null;
    }

    const currentNotes = currentResult.rows[0].notes || '';
    const updatedNotes = this.appendNote(currentNotes, notes);

    const result = await pool.query(`
      UPDATE invoices
      SET
        status = 'approved',
        approved_by = $1,
        approved_at = NOW(),
        notes = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [userId || 'system', updatedNotes, String(id)]);

    if (result.rows.length === 0) return null;
    return this.formatInvoice(result.rows[0]);
  }

  async reconcileInvoice(id, data = {}) {
    const pool = getPool();

    // Get current invoice
    const currentResult = await pool.query('SELECT * FROM invoices WHERE id = $1', [String(id)]);
    if (currentResult.rows.length === 0) {
      return null;
    }

    const currentInvoice = currentResult.rows[0];
    const currentNotes = currentInvoice.notes || '';
    const updatedNotes = this.appendNote(currentNotes, data.notes);

    const setClauses = ['reconciled = true'];
    const params = [];
    let paramIndex = 1;

    if (data.reconciledWith) {
      setClauses.push(`reconciled_with = $${paramIndex++}`);
      params.push(data.reconciledWith);
    }

    setClauses.push(`notes = $${paramIndex++}`);
    params.push(updatedNotes);

    if (data.status) {
      setClauses.push(`status = $${paramIndex++}`);
      params.push(this.normalizeStatus(data.status));
    }

    if (data.paymentMethod) {
      setClauses.push(`payment_method = $${paramIndex++}`);
      params.push(data.paymentMethod);
    }

    if (data.paidAt) {
      setClauses.push(`paid_at = $${paramIndex++}`);
      params.push(this.parseDate(data.paidAt) || new Date());

      // If status not explicitly set and current status is approved or not set, set to paid
      if (!data.status && (!currentInvoice.status || currentInvoice.status === 'approved')) {
        setClauses.push(`status = $${paramIndex++}`);
        params.push('paid');
      }
    }

    setClauses.push(`updated_at = NOW()`);
    params.push(String(id));

    const query = `
      UPDATE invoices
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, params);
    if (result.rows.length === 0) return null;

    return this.formatInvoice(result.rows[0]);
  }

  async recordOCRResult(id, data = {}) {
    const pool = getPool();

    // Get current invoice
    const currentResult = await pool.query('SELECT * FROM invoices WHERE id = $1', [String(id)]);
    if (currentResult.rows.length === 0) {
      return null;
    }

    const currentInvoice = currentResult.rows[0];
    const currentNotes = currentInvoice.notes || '';
    const updatedNotes = this.appendNote(currentNotes, data.notes);

    const setClauses = ['ocr_processed = true'];
    const params = [];
    let paramIndex = 1;

    setClauses.push(`ocr_confidence = $${paramIndex++}`);
    params.push(this.toNumber(data.ocrConfidence, currentInvoice.ocr_confidence));

    if (Array.isArray(data.lineItems) && data.lineItems.length) {
      const lineItems = this.normalizeLineItems(data.lineItems);
      const subtotal = lineItems.reduce((sum, item) => sum + (item.total || 0), 0);

      setClauses.push(`line_items = $${paramIndex++}`);
      params.push(JSON.stringify(lineItems));

      setClauses.push(`subtotal = $${paramIndex++}`);
      params.push(subtotal);

      setClauses.push(`total = $${paramIndex++}`);
      params.push(subtotal + (currentInvoice.tax || 0));
    }

    if (typeof data.invoiceNumber !== 'undefined') {
      setClauses.push(`invoice_number = $${paramIndex++}`);
      params.push(data.invoiceNumber);
    }

    setClauses.push(`notes = $${paramIndex++}`);
    params.push(updatedNotes);

    setClauses.push(`updated_at = NOW()`);
    params.push(String(id));

    const query = `
      UPDATE invoices
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, params);
    if (result.rows.length === 0) return null;

    return this.formatInvoice(result.rows[0]);
  }

  buildSummary(invoices) {
    const summary = {
      totalInvoices: invoices.length,
      byStatus: {},
      totalsByStatus: {},
      outstandingBalance: 0,
      approvalsPending: 0,
      averageOCRConfidence: null
    };

    let processedConfidence = 0;
    let processedCount = 0;

    invoices.forEach(invoice => {
      summary.byStatus[invoice.status] = (summary.byStatus[invoice.status] || 0) + 1;
      summary.totalsByStatus[invoice.status] = this.roundToTwo(
        (summary.totalsByStatus[invoice.status] || 0) + (invoice.total || 0)
      );

      if (invoice.status === 'pending') {
        summary.approvalsPending += 1;
      }

      const outstanding = invoice.status === 'paid' ? 0 : invoice.total;
      summary.outstandingBalance = this.roundToTwo(summary.outstandingBalance + outstanding);

      if (invoice.ocrProcessed && invoice.ocrConfidence) {
        processedConfidence += invoice.ocrConfidence;
        processedCount += 1;
      }
    });

    if (processedCount) {
      summary.averageOCRConfidence = this.roundToTwo(processedConfidence / processedCount);
    }

    return summary;
  }

  calculateAging(invoices) {
    const buckets = {
      current: 0,
      '1-30': 0,
      '31-60': 0,
      '61-90': 0,
      '90+': 0
    };

    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;

    invoices.forEach(invoice => {
      if (!invoice.dueDate || invoice.status === 'paid') {
        return;
      }

      const dueDate = new Date(invoice.dueDate);
      const diff = Math.floor((now - dueDate) / msPerDay);
      const amount = invoice.status === 'paid' ? 0 : invoice.total;

      if (diff <= 0) {
        buckets.current += amount;
      } else if (diff <= 30) {
        buckets['1-30'] += amount;
      } else if (diff <= 60) {
        buckets['31-60'] += amount;
      } else if (diff <= 90) {
        buckets['61-90'] += amount;
      } else {
        buckets['90+'] += amount;
      }
    });

    return Object.fromEntries(
      Object.entries(buckets).map(([bucket, value]) => [bucket, this.roundToTwo(value)])
    );
  }

  isOverdue(invoiceRow) {
    if (!invoiceRow.due_date) return false;
    if (invoiceRow.status === 'paid') return false;
    const now = new Date();
    const dueDate = new Date(invoiceRow.due_date);
    return dueDate < now;
  }

  resolveOutstanding(invoiceRow) {
    if (invoiceRow.status === 'paid') {
      return 0;
    }
    return this.roundToTwo(invoiceRow.total || 0);
  }

  normalizeStatus(status, fallback = 'pending') {
    if (!status && status !== 0) {
      return fallback;
    }

    const normalized = String(status).trim().toLowerCase();
    return normalized || fallback;
  }

  normalizeLineItems(items = []) {
    if (!Array.isArray(items)) {
      return [];
    }

    return items.map(item => {
      const quantity = this.toNumber(item.quantity, 0);
      const unitPrice = this.toNumber(item.unitPrice, 0);
      return {
        itemId: item.itemId || null,
        description: item.description || '',
        quantity,
        unitPrice,
        total: this.roundToTwo(quantity * unitPrice),
        glCode: item.glCode || null
      };
    });
  }

  parseDate(value) {
    if (!value) return null;
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed;
  }

  toNumber(value, fallback = 0) {
    const num = Number(value);
    if (Number.isFinite(num)) {
      return num;
    }
    return fallback;
  }

  roundToTwo(value) {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.round(value * 100) / 100;
  }

  appendNote(existing, addition) {
    if (!addition) return existing || '';
    const trimmed = typeof addition === 'string' ? addition.trim() : '';
    if (!trimmed) return existing || '';
    if (!existing) {
      return trimmed;
    }
    return `${existing}\n${trimmed}`;
  }

  generateId() {
    return `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  // Helper method to format database row to API response format
  formatInvoice(row) {
    return {
      id: row.id,
      locationId: row.location_id,
      vendorId: row.vendor_id,
      invoiceNumber: row.invoice_number,
      invoiceDate: row.invoice_date ? row.invoice_date.toISOString() : null,
      dueDate: row.due_date ? row.due_date.toISOString() : null,
      subtotal: this.roundToTwo(row.subtotal),
      tax: this.roundToTwo(row.tax),
      total: this.roundToTwo(row.total),
      status: row.status,
      lineItems: row.line_items || [],
      attachments: row.attachments || [],
      ocrProcessed: Boolean(row.ocr_processed),
      ocrConfidence: row.ocr_confidence ? this.roundToTwo(row.ocr_confidence) : 0,
      glCode: row.gl_code,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at ? row.approved_at.toISOString() : null,
      reconciled: Boolean(row.reconciled),
      reconciledWith: row.reconciled_with,
      paymentMethod: row.payment_method,
      paidAt: row.paid_at ? row.paid_at.toISOString() : null,
      notes: row.notes || '',
      metadata: row.metadata || {},
      createdAt: row.created_at ? row.created_at.toISOString() : null,
      updatedAt: row.updated_at ? row.updated_at.toISOString() : null
    };
  }
}

module.exports = new InvoiceService();
