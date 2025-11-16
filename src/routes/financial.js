/**
 * Financial Management API Routes
 * Phase 20
 *
 * Endpoints for accounting, AP/AR, budgets, and financial reporting
 */

const express = require('express');
const router = express.Router();
const FinancialService = require('../services/FinancialService');

// Middleware to authenticate requests
const authenticate = (req, res, next) => {
  req.user = { id: req.headers['x-user-id'] || 'system' };
  next();
};

// ============================================
// CHART OF ACCOUNTS
// ============================================

/**
 * GET /api/financial/accounts
 * Get chart of accounts
 */
router.get('/accounts', authenticate, async (req, res) => {
  try {
    const accounts = await FinancialService.getChartOfAccounts(req.query);
    res.json({ success: true, data: accounts });
  } catch (error) {
    console.error('[Financial API] Error getting accounts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/financial/accounts
 * Create account
 */
router.post('/accounts', authenticate, async (req, res) => {
  try {
    const account = await FinancialService.createAccount(req.body, req.user.id);
    res.status(201).json({ success: true, data: account });
  } catch (error) {
    console.error('[Financial API] Error creating account:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// JOURNAL ENTRIES
// ============================================

/**
 * POST /api/financial/journal-entries
 * Create journal entry
 */
router.post('/journal-entries', authenticate, async (req, res) => {
  try {
    const entry = await FinancialService.createJournalEntry(req.body, req.user.id);
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    console.error('[Financial API] Error creating journal entry:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/financial/journal-entries/:id
 * Get journal entry
 */
router.get('/journal-entries/:id', authenticate, async (req, res) => {
  try {
    const entry = await FinancialService.getJournalEntryById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Journal entry not found' });
    }
    res.json({ success: true, data: entry });
  } catch (error) {
    console.error('[Financial API] Error getting journal entry:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/financial/journal-entries/:id/post
 * Post journal entry to general ledger
 */
router.post('/journal-entries/:id/post', authenticate, async (req, res) => {
  try {
    const entry = await FinancialService.postJournalEntry(req.params.id, req.user.id);
    res.json({ success: true, data: entry });
  } catch (error) {
    console.error('[Financial API] Error posting journal entry:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ACCOUNTS PAYABLE
// ============================================

/**
 * POST /api/financial/payables
 * Create payable
 */
router.post('/payables', authenticate, async (req, res) => {
  try {
    const payable = await FinancialService.createPayable(req.body, req.user.id);
    res.status(201).json({ success: true, data: payable });
  } catch (error) {
    console.error('[Financial API] Error creating payable:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/financial/payables
 * Get payables
 */
router.get('/payables', authenticate, async (req, res) => {
  try {
    const payables = await FinancialService.getPayables(req.query);
    res.json({ success: true, data: payables });
  } catch (error) {
    console.error('[Financial API] Error getting payables:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/financial/payables/aging
 * Get AP aging report
 */
router.get('/payables/aging', authenticate, async (req, res) => {
  try {
    const report = await FinancialService.getAPAgingReport();
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('[Financial API] Error getting AP aging:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ACCOUNTS RECEIVABLE
// ============================================

/**
 * POST /api/financial/receivables
 * Create receivable
 */
router.post('/receivables', authenticate, async (req, res) => {
  try {
    const receivable = await FinancialService.createReceivable(req.body, req.user.id);
    res.status(201).json({ success: true, data: receivable });
  } catch (error) {
    console.error('[Financial API] Error creating receivable:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/financial/receivables
 * Get receivables
 */
router.get('/receivables', authenticate, async (req, res) => {
  try {
    const receivables = await FinancialService.getReceivables(req.query);
    res.json({ success: true, data: receivables });
  } catch (error) {
    console.error('[Financial API] Error getting receivables:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/financial/receivables/aging
 * Get AR aging report
 */
router.get('/receivables/aging', authenticate, async (req, res) => {
  try {
    const report = await FinancialService.getARAgingReport();
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('[Financial API] Error getting AR aging:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// PAYMENTS
// ============================================

/**
 * POST /api/financial/payments
 * Record payment
 */
router.post('/payments', authenticate, async (req, res) => {
  try {
    const payment = await FinancialService.recordPayment(req.body, req.user.id);
    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    console.error('[Financial API] Error recording payment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// BUDGETS
// ============================================

/**
 * POST /api/financial/budgets
 * Create budget
 */
router.post('/budgets', authenticate, async (req, res) => {
  try {
    const budget = await FinancialService.createBudget(req.body, req.user.id);
    res.status(201).json({ success: true, data: budget });
  } catch (error) {
    console.error('[Financial API] Error creating budget:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/financial/budgets/:id/line-items
 * Add budget line item
 */
router.post('/budgets/:id/line-items', authenticate, async (req, res) => {
  try {
    const lineItem = await FinancialService.addBudgetLineItem({
      ...req.body,
      budget_id: req.params.id
    });
    res.status(201).json({ success: true, data: lineItem });
  } catch (error) {
    console.error('[Financial API] Error adding line item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/financial/budgets/:id
 * Get budget with line items
 */
router.get('/budgets/:id', authenticate, async (req, res) => {
  try {
    const budget = await FinancialService.getBudgetWithLineItems(req.params.id);
    if (!budget) {
      return res.status(404).json({ success: false, error: 'Budget not found' });
    }
    res.json({ success: true, data: budget });
  } catch (error) {
    console.error('[Financial API] Error getting budget:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// FINANCIAL REPORTS
// ============================================

/**
 * GET /api/financial/reports/trial-balance
 * Get trial balance
 */
router.get('/reports/trial-balance', authenticate, async (req, res) => {
  try {
    const report = await FinancialService.getTrialBalance(req.query.as_of_date);
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('[Financial API] Error getting trial balance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/financial/reports/profit-loss
 * Get P&L statement
 */
router.get('/reports/profit-loss', authenticate, async (req, res) => {
  try {
    const { start_date, end_date, location_id } = req.query;
    const report = await FinancialService.getProfitLossStatement(start_date, end_date, location_id);
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('[Financial API] Error getting P&L:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/financial/reports/balance-sheet
 * Get balance sheet
 */
router.get('/reports/balance-sheet', authenticate, async (req, res) => {
  try {
    const report = await FinancialService.getBalanceSheet(req.query.as_of_date);
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('[Financial API] Error getting balance sheet:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// TAX MANAGEMENT
// ============================================

/**
 * GET /api/financial/tax-rates
 * Get tax rates
 */
router.get('/tax-rates', authenticate, async (req, res) => {
  try {
    const { location_id } = req.query;
    if (!location_id) {
      return res.status(400).json({ success: false, error: 'location_id is required' });
    }
    const rates = await FinancialService.getTaxRates(location_id);
    res.json({ success: true, data: rates });
  } catch (error) {
    console.error('[Financial API] Error getting tax rates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/financial/tax-filings
 * Create tax filing
 */
router.post('/tax-filings', authenticate, async (req, res) => {
  try {
    const filing = await FinancialService.createTaxFiling(req.body, req.user.id);
    res.status(201).json({ success: true, data: filing });
  } catch (error) {
    console.error('[Financial API] Error creating tax filing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
