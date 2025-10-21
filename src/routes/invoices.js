/**
 * Invoice Management Routes
 * Handles digital invoice capture, OCR results, approval workflows, and reconciliation
 */

const express = require('express');
const InvoiceService = require('../services/InvoiceService');
const validators = require('../utils/validators');

const router = express.Router();

const REQUIRED_FIELDS = ['locationId', 'vendorId', 'invoiceNumber'];

// GET /api/v1/invoices - List invoices with filters
router.get('/', async (req, res, next) => {
  try {
    const { locationId, vendorId, status, startDate, endDate, search } = req.query;
    const data = await InvoiceService.getInvoices({
      locationId,
      vendorId,
      status,
      startDate,
      endDate,
      search
    });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/invoices/:id - Retrieve invoice details
router.get('/:id', async (req, res, next) => {
  try {
    const invoice = await InvoiceService.getInvoiceById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/invoices - Capture new invoice
router.post('/', async (req, res, next) => {
  try {
    const payload = req.body || {};

    if (!validators.hasRequiredFields(payload, REQUIRED_FIELDS)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: locationId, vendorId, invoiceNumber'
      });
    }

    if (payload.invoiceDate && !validators.isValidDate(payload.invoiceDate)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid invoiceDate'
      });
    }

    if (payload.dueDate && !validators.isValidDate(payload.dueDate)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dueDate'
      });
    }

    const invoice = await InvoiceService.createInvoice(payload);

    res.status(201).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/invoices/:id - Update invoice
router.put('/:id', async (req, res, next) => {
  try {
    const updates = req.body || {};

    if (updates.invoiceDate && !validators.isValidDate(updates.invoiceDate)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid invoiceDate'
      });
    }

    if (updates.dueDate && !validators.isValidDate(updates.dueDate)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dueDate'
      });
    }

    const invoice = await InvoiceService.updateInvoice(req.params.id, updates);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/invoices/:id/approve - Approve invoice
router.post('/:id/approve', async (req, res, next) => {
  try {
    const { userId, notes } = req.body || {};

    const invoice = await InvoiceService.approveInvoice(req.params.id, { userId, notes });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/invoices/:id/reconcile - Reconcile invoice against PO / payment
router.post('/:id/reconcile', async (req, res, next) => {
  try {
    const { reconciledWith, status, paymentMethod, paidAt, notes } = req.body || {};

    if (paidAt && !validators.isValidDate(paidAt)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid paidAt'
      });
    }

    const invoice = await InvoiceService.reconcileInvoice(req.params.id, {
      reconciledWith,
      status,
      paymentMethod,
      paidAt,
      notes
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/invoices/:id/ocr - Record OCR result for invoice
router.post('/:id/ocr', async (req, res, next) => {
  try {
    const { ocrConfidence, lineItems, invoiceNumber, notes } = req.body || {};

    if (typeof ocrConfidence !== 'undefined' && Number.isNaN(Number(ocrConfidence))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ocrConfidence'
      });
    }

    const invoice = await InvoiceService.recordOCRResult(req.params.id, {
      ocrConfidence,
      lineItems,
      invoiceNumber,
      notes
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
