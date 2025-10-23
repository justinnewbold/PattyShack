/**
 * Invoice Management Routes
 * Handles digital invoice capture, OCR results, approval workflows, and reconciliation
 */

const express = require('express');
const InvoiceService = require('../services/InvoiceService');
const validators = require('../utils/validators');

const router = express.Router();

const REQUIRED_FIELDS = ['locationId', 'vendorId', 'invoiceNumber'];

/**
 * @swagger
 * /invoices:
 *   get:
 *     summary: List invoices with filters
 *     description: Retrieve a list of invoices with optional filtering by location, vendor, status, date range, and search term
 *     tags: [Invoices]
 *     parameters:
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: integer
 *         description: Filter by location ID
 *         example: 1
 *       - in: query
 *         name: vendorId
 *         schema:
 *           type: integer
 *         description: Filter by vendor ID
 *         example: 5
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, reconciled, paid]
 *         description: Filter by invoice status
 *         example: pending
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by start date (invoices on or after this date)
 *         example: "2025-10-01T00:00:00Z"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by end date (invoices on or before this date)
 *         example: "2025-10-31T23:59:59Z"
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for invoice number or vendor name
 *         example: INV-2025-001
 *     responses:
 *       200:
 *         description: Invoices retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Invoice'
 */
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

/**
 * @swagger
 * /invoices/{id}:
 *   get:
 *     summary: Get invoice by ID
 *     description: Retrieve detailed information about a specific invoice
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Invoice ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Invoice retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Invoice'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
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

/**
 * @swagger
 * /invoices:
 *   post:
 *     summary: Capture new invoice
 *     description: Create a new invoice record with digital capture data, OCR information, and vendor details
 *     tags: [Invoices]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - locationId
 *               - vendorId
 *               - invoiceNumber
 *             properties:
 *               locationId:
 *                 type: integer
 *                 description: Location ID where invoice is assigned
 *                 example: 1
 *               vendorId:
 *                 type: integer
 *                 description: Vendor ID
 *                 example: 5
 *               invoiceNumber:
 *                 type: string
 *                 description: Invoice number from vendor
 *                 example: INV-2025-001
 *               invoiceDate:
 *                 type: string
 *                 format: date-time
 *                 description: Date of invoice
 *                 example: "2025-10-23T00:00:00Z"
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 description: Payment due date
 *                 example: "2025-11-23T00:00:00Z"
 *               amount:
 *                 type: number
 *                 format: float
 *                 description: Invoice amount
 *                 example: 1250.50
 *               status:
 *                 type: string
 *                 enum: [pending, approved, reconciled, paid]
 *                 description: Invoice status
 *                 example: pending
 *               notes:
 *                 type: string
 *                 description: Additional notes
 *                 example: Quarterly maintenance invoice
 *     responses:
 *       201:
 *         description: Invoice created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Invoice'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
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

/**
 * @swagger
 * /invoices/{id}:
 *   put:
 *     summary: Update invoice
 *     description: Update an existing invoice's properties including dates, amounts, and status
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Invoice ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               locationId:
 *                 type: integer
 *                 description: Location ID
 *                 example: 1
 *               vendorId:
 *                 type: integer
 *                 description: Vendor ID
 *                 example: 5
 *               invoiceNumber:
 *                 type: string
 *                 description: Invoice number
 *                 example: INV-2025-001
 *               invoiceDate:
 *                 type: string
 *                 format: date-time
 *                 description: Date of invoice
 *                 example: "2025-10-23T00:00:00Z"
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 description: Payment due date
 *                 example: "2025-11-23T00:00:00Z"
 *               amount:
 *                 type: number
 *                 format: float
 *                 description: Invoice amount
 *                 example: 1250.50
 *               status:
 *                 type: string
 *                 enum: [pending, approved, reconciled, paid]
 *                 description: Invoice status
 *                 example: approved
 *               notes:
 *                 type: string
 *                 description: Additional notes
 *                 example: Updated amount after vendor correction
 *     responses:
 *       200:
 *         description: Invoice updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Invoice'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
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

/**
 * @swagger
 * /invoices/{id}/approve:
 *   post:
 *     summary: Approve invoice
 *     description: Mark an invoice as approved by a user, moving it through the approval workflow
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Invoice ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: integer
 *                 description: ID of user approving the invoice
 *                 example: 5
 *               notes:
 *                 type: string
 *                 description: Approval notes or comments
 *                 example: Approved after budget review
 *     responses:
 *       200:
 *         description: Invoice approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Invoice'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
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

/**
 * @swagger
 * /invoices/{id}/reconcile:
 *   post:
 *     summary: Reconcile invoice
 *     description: Reconcile invoice against purchase order or payment, marking it as paid and recording payment details
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Invoice ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reconciledWith:
 *                 type: string
 *                 description: Reference to reconciled document (PO number, payment ID, etc.)
 *                 example: PO-2025-045
 *               status:
 *                 type: string
 *                 enum: [reconciled, paid]
 *                 description: Updated status after reconciliation
 *                 example: paid
 *               paymentMethod:
 *                 type: string
 *                 enum: [check, ach, credit_card, wire_transfer, cash]
 *                 description: Method of payment
 *                 example: ach
 *               paidAt:
 *                 type: string
 *                 format: date-time
 *                 description: Date and time when payment was made
 *                 example: "2025-10-23T14:30:00Z"
 *               notes:
 *                 type: string
 *                 description: Reconciliation notes
 *                 example: Reconciled against monthly vendor statement
 *     responses:
 *       200:
 *         description: Invoice reconciled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Invoice'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
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

/**
 * @swagger
 * /invoices/{id}/ocr:
 *   post:
 *     summary: Record OCR result for invoice
 *     description: Store optical character recognition (OCR) results for a captured invoice image, including confidence scores and extracted line items
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Invoice ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ocrConfidence:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 maximum: 1
 *                 description: OCR confidence score (0-1)
 *                 example: 0.95
 *               lineItems:
 *                 type: array
 *                 description: Extracted line items from invoice
 *                 items:
 *                   type: object
 *                   properties:
 *                     description:
 *                       type: string
 *                       example: Premium Ground Beef 80/20
 *                     quantity:
 *                       type: number
 *                       example: 50
 *                     unit:
 *                       type: string
 *                       example: lbs
 *                     unitPrice:
 *                       type: number
 *                       format: float
 *                       example: 4.50
 *                     amount:
 *                       type: number
 *                       format: float
 *                       example: 225.00
 *               invoiceNumber:
 *                 type: string
 *                 description: Invoice number extracted from OCR
 *                 example: INV-2025-001
 *               notes:
 *                 type: string
 *                 description: OCR processing notes or warnings
 *                 example: Low confidence on line item 3, manual review recommended
 *     responses:
 *       200:
 *         description: OCR result recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Invoice'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
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
