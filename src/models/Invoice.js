/**
 * Invoice Model
 * Supports digital invoice capture, OCR, and reconciliation
 */

class Invoice {
  constructor(data) {
    this.id = data.id;
    this.locationId = data.locationId;
    this.vendorId = data.vendorId;
    this.invoiceNumber = data.invoiceNumber;
    this.invoiceDate = data.invoiceDate;
    this.dueDate = data.dueDate;
    this.subtotal = data.subtotal || 0;
    this.tax = data.tax || 0;
    this.total = data.total || 0;
    this.status = data.status || 'pending'; // 'pending', 'approved', 'paid', 'disputed'
    this.lineItems = data.lineItems || [];
    this.attachments = data.attachments || []; // PDF/image URLs
    this.ocrProcessed = data.ocrProcessed || false;
    this.ocrConfidence = data.ocrConfidence || 0;
    this.glCode = data.glCode; // General Ledger code for accounting
    this.approvedBy = data.approvedBy;
    this.approvedAt = data.approvedAt;
    this.paidAt = data.paidAt;
    this.paymentMethod = data.paymentMethod;
    this.reconciled = data.reconciled || false;
    this.reconciledWith = data.reconciledWith; // Purchase order ID
    this.notes = data.notes || '';
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  addLineItem(item) {
    this.lineItems.push({
      itemId: item.itemId,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.quantity * item.unitPrice,
      glCode: item.glCode
    });
    this.recalculateTotals();
  }

  recalculateTotals() {
    this.subtotal = this.lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
    this.total = this.subtotal + (this.tax || 0);
    this.updatedAt = new Date();
  }

  approve(userId) {
    this.status = 'approved';
    this.approvedBy = userId;
    this.approvedAt = new Date();
    this.updatedAt = new Date();
  }
}

module.exports = Invoice;
