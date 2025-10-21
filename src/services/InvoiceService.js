/**
 * Invoice Service
 * Provides in-memory invoice capture, OCR simulation, and reconciliation workflows.
 */

const Invoice = require('../models/Invoice');

class InvoiceService {
  constructor() {
    this.invoices = new Map();
    this.seedDemoData();
  }

  seedDemoData() {
    const demoInvoices = [
      {
        id: 'inv-100',
        locationId: 'store-100',
        vendorId: 'vendor-501',
        invoiceNumber: 'PS-2024-001',
        invoiceDate: this.parseDate('2024-01-05'),
        dueDate: this.parseDate('2024-01-20'),
        status: 'pending',
        tax: 12.5,
        ocrProcessed: true,
        ocrConfidence: 0.92,
        lineItems: [
          { description: 'Ground Beef 80/20', quantity: 80, unitPrice: 3.3, glCode: '5000' },
          { description: 'Sesame Buns (12ct)', quantity: 30, unitPrice: 12.5, glCode: '5005' }
        ],
        metadata: {
          deliveryDate: '2024-01-05T12:00:00Z',
          purchaseOrder: 'PO-8891'
        }
      },
      {
        id: 'inv-101',
        locationId: 'store-200',
        vendorId: 'vendor-640',
        invoiceNumber: 'PS-2024-014',
        invoiceDate: this.parseDate('2023-12-18'),
        dueDate: this.parseDate('2024-01-02'),
        status: 'approved',
        tax: 8.25,
        approvedBy: 'manager-201',
        approvedAt: new Date('2023-12-19T15:20:00Z'),
        ocrProcessed: true,
        ocrConfidence: 0.88,
        lineItems: [
          { description: 'American Cheese Slices', quantity: 20, unitPrice: 21.95, glCode: '5010' },
          { description: 'Pickle Chips', quantity: 10, unitPrice: 14.5, glCode: '5012' }
        ],
        metadata: {
          deliveryDate: '2023-12-18T09:30:00Z',
          purchaseOrder: 'PO-8732'
        }
      },
      {
        id: 'inv-102',
        locationId: 'store-100',
        vendorId: 'vendor-501',
        invoiceNumber: 'PS-2023-230',
        invoiceDate: this.parseDate('2023-11-28'),
        dueDate: this.parseDate('2023-12-08'),
        status: 'paid',
        tax: 6.1,
        paidAt: new Date('2023-12-06T11:10:00Z'),
        paymentMethod: 'ach',
        lineItems: [
          { description: 'Paper Goods Assorted', quantity: 15, unitPrice: 18.2, glCode: '5050' }
        ],
        metadata: {
          deliveryDate: '2023-11-28T08:45:00Z',
          purchaseOrder: 'PO-8502'
        }
      }
    ];

    demoInvoices.forEach(invoice => {
      this.createInvoice(invoice);
    });
  }

  async createInvoice(data) {
    const invoice = new Invoice({
      ...data,
      id: String(data.id || this.generateId()),
      locationId: data.locationId,
      vendorId: data.vendorId,
      invoiceNumber: data.invoiceNumber,
      invoiceDate: this.parseDate(data.invoiceDate) || new Date(),
      dueDate: this.parseDate(data.dueDate),
      status: this.normalizeStatus(data.status),
      tax: this.toNumber(data.tax, 0),
      subtotal: 0,
      lineItems: this.normalizeLineItems(data.lineItems),
      attachments: Array.isArray(data.attachments) ? [...data.attachments] : [],
      ocrProcessed: Boolean(data.ocrProcessed),
      ocrConfidence: this.toNumber(data.ocrConfidence, 0),
      metadata: this.normalizeMetadata(data.metadata)
    });

    invoice.recalculateTotals();
    invoice.createdAt = new Date();
    invoice.updatedAt = new Date();

    this.invoices.set(invoice.id, invoice);
    return this.serializeInvoice(invoice);
  }

  async getInvoices(filters = {}) {
    const {
      locationId,
      vendorId,
      status,
      startDate,
      endDate,
      search
    } = filters;

    let invoices = Array.from(this.invoices.values());

    if (locationId) {
      invoices = invoices.filter(invoice => invoice.locationId === String(locationId));
    }

    if (vendorId) {
      invoices = invoices.filter(invoice => invoice.vendorId === String(vendorId));
    }

    if (status) {
      const normalizedStatus = String(status).toLowerCase();
      invoices = invoices.filter(invoice => invoice.status === normalizedStatus);
    }

    if (startDate) {
      const start = this.parseDate(startDate);
      if (start) {
        invoices = invoices.filter(invoice =>
          invoice.invoiceDate && invoice.invoiceDate >= start
        );
      }
    }

    if (endDate) {
      const end = this.parseDate(endDate);
      if (end) {
        invoices = invoices.filter(invoice =>
          invoice.invoiceDate && invoice.invoiceDate <= end
        );
      }
    }

    if (search) {
      const query = String(search).toLowerCase();
      invoices = invoices.filter(invoice =>
        (invoice.invoiceNumber && invoice.invoiceNumber.toLowerCase().includes(query)) ||
        (invoice.vendorId && invoice.vendorId.toLowerCase().includes(query))
      );
    }

    const summary = this.buildSummary(invoices);
    const aging = this.calculateAging(invoices);

    return {
      invoices: invoices.map(invoice => this.serializeInvoice(invoice)),
      summary,
      aging
    };
  }

  async getInvoiceById(id) {
    const invoice = this.invoices.get(String(id));
    if (!invoice) {
      return null;
    }

    const serialized = this.serializeInvoice(invoice);
    serialized.analytics = {
      lineItemCount: invoice.lineItems.length,
      averageLineItemValue: this.roundToTwo(
        invoice.lineItems.length
          ? invoice.lineItems.reduce((sum, item) => sum + (item.total || 0), 0) / invoice.lineItems.length
          : 0
      ),
      isOverdue: this.isOverdue(invoice),
      outstandingBalance: this.roundToTwo(this.resolveOutstanding(invoice))
    };

    return serialized;
  }

  async updateInvoice(id, updates = {}) {
    const invoice = this.invoices.get(String(id));
    if (!invoice) {
      return null;
    }

    if (typeof updates.locationId !== 'undefined') {
      invoice.locationId = updates.locationId;
    }

    if (typeof updates.vendorId !== 'undefined') {
      invoice.vendorId = updates.vendorId;
    }

    if (typeof updates.invoiceNumber !== 'undefined') {
      invoice.invoiceNumber = updates.invoiceNumber;
    }

    if (typeof updates.invoiceDate !== 'undefined') {
      invoice.invoiceDate = this.parseDate(updates.invoiceDate);
    }

    if (typeof updates.dueDate !== 'undefined') {
      invoice.dueDate = this.parseDate(updates.dueDate);
    }

    if (typeof updates.status !== 'undefined') {
      invoice.status = this.normalizeStatus(updates.status, invoice.status);
    }

    if (typeof updates.tax !== 'undefined') {
      invoice.tax = this.toNumber(updates.tax, invoice.tax);
    }

    if (Array.isArray(updates.lineItems)) {
      invoice.lineItems = this.normalizeLineItems(updates.lineItems);
    }

    if (Array.isArray(updates.attachments)) {
      invoice.attachments = [...updates.attachments];
    }

    if (updates.metadata && typeof updates.metadata === 'object') {
      invoice.metadata = this.normalizeMetadata({ ...invoice.metadata, ...updates.metadata });
    }

    invoice.updatedAt = new Date();
    invoice.recalculateTotals();

    this.invoices.set(invoice.id, invoice);
    return this.serializeInvoice(invoice);
  }

  async approveInvoice(id, data = {}) {
    const invoice = this.invoices.get(String(id));
    if (!invoice) {
      return null;
    }

    const { userId, notes } = data;
    invoice.approve(userId || 'system');
    invoice.notes = this.appendNote(invoice.notes, notes);
    this.invoices.set(invoice.id, invoice);

    return this.serializeInvoice(invoice);
  }

  async reconcileInvoice(id, data = {}) {
    const invoice = this.invoices.get(String(id));
    if (!invoice) {
      return null;
    }

    invoice.reconciled = true;
    invoice.reconciledWith = data.reconciledWith || invoice.reconciledWith;
    invoice.notes = this.appendNote(invoice.notes, data.notes);
    invoice.updatedAt = new Date();

    if (data.status) {
      invoice.status = this.normalizeStatus(data.status, invoice.status);
    }

    if (data.paymentMethod) {
      invoice.paymentMethod = data.paymentMethod;
    }

    if (data.paidAt) {
      invoice.paidAt = this.parseDate(data.paidAt) || new Date();
      if (!invoice.status || invoice.status === 'approved') {
        invoice.status = 'paid';
      }
    }

    this.invoices.set(invoice.id, invoice);
    return this.serializeInvoice(invoice);
  }

  async recordOCRResult(id, data = {}) {
    const invoice = this.invoices.get(String(id));
    if (!invoice) {
      return null;
    }

    invoice.ocrProcessed = true;
    invoice.ocrConfidence = this.toNumber(data.ocrConfidence, invoice.ocrConfidence);

    if (Array.isArray(data.lineItems) && data.lineItems.length) {
      invoice.lineItems = this.normalizeLineItems(data.lineItems);
    }

    if (typeof data.invoiceNumber !== 'undefined') {
      invoice.invoiceNumber = data.invoiceNumber;
    }

    invoice.notes = this.appendNote(invoice.notes, data.notes);
    invoice.updatedAt = new Date();
    invoice.recalculateTotals();

    this.invoices.set(invoice.id, invoice);
    return this.serializeInvoice(invoice);
  }

  serializeInvoice(invoice) {
    return {
      id: invoice.id,
      locationId: invoice.locationId,
      vendorId: invoice.vendorId,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate ? invoice.invoiceDate.toISOString() : null,
      dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
      subtotal: this.roundToTwo(invoice.subtotal),
      tax: this.roundToTwo(invoice.tax),
      total: this.roundToTwo(invoice.total),
      status: invoice.status,
      lineItems: invoice.lineItems.map(item => ({
        itemId: item.itemId || null,
        description: item.description || '',
        quantity: this.roundToTwo(item.quantity || 0),
        unitPrice: this.roundToTwo(item.unitPrice || 0),
        total: this.roundToTwo(item.total || 0),
        glCode: item.glCode || null
      })),
      attachments: invoice.attachments || [],
      ocrProcessed: Boolean(invoice.ocrProcessed),
      ocrConfidence: invoice.ocrConfidence ? this.roundToTwo(invoice.ocrConfidence) : 0,
      approvedBy: invoice.approvedBy || null,
      approvedAt: invoice.approvedAt ? invoice.approvedAt.toISOString() : null,
      reconciled: Boolean(invoice.reconciled),
      reconciledWith: invoice.reconciledWith || null,
      paymentMethod: invoice.paymentMethod || null,
      paidAt: invoice.paidAt ? invoice.paidAt.toISOString() : null,
      notes: invoice.notes || '',
      metadata: invoice.metadata || {},
      createdAt: invoice.createdAt ? invoice.createdAt.toISOString() : null,
      updatedAt: invoice.updatedAt ? invoice.updatedAt.toISOString() : null
    };
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

      const outstanding = this.resolveOutstanding(invoice);
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

      const diff = Math.floor((now - invoice.dueDate) / msPerDay);
      const amount = this.resolveOutstanding(invoice);

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

  isOverdue(invoice) {
    if (!invoice.dueDate) return false;
    if (invoice.status === 'paid') return false;
    const now = new Date();
    return invoice.dueDate < now;
  }

  resolveOutstanding(invoice) {
    if (invoice.status === 'paid') {
      return 0;
    }

    return this.roundToTwo(invoice.total || 0);
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

  normalizeMetadata(metadata) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return {};
    }
    return { ...metadata };
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
}

module.exports = new InvoiceService();
