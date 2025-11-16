/**
 * FinancialService Unit Tests
 * Tests business logic for accounting, AP/AR, budgets, and financial reporting
 */

const FinancialService = require('../../src/services/FinancialService');
const {
  setupTestDatabase,
  clearTestDatabase,
  teardownTestDatabase,
  createTestLocation,
  createTestUser,
  getTestPool
} = require('../helpers/testDb');
const { initializePool } = require('../../src/database/pool');

describe('FinancialService', () => {
  let testLocation;
  let testUser;
  let pool;
  let cashAccount, revenueAccount, expenseAccount;

  beforeAll(async () => {
    initializePool();
    await setupTestDatabase();
    pool = getTestPool();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    testLocation = await createTestLocation({
      id: 'test-location-1',
      code: 'TEST-001'
    });

    testUser = await createTestUser({
      id: 'test-user-1',
      role: 'manager',
      location_id: testLocation.id
    });

    // Create test accounts
    const cashResult = await pool.query(`
      INSERT INTO chart_of_accounts (id, account_code, account_name, account_type, normal_balance, is_system_account)
      VALUES ('1000', '1000', 'Cash', 'asset', 'debit', true)
      RETURNING *
    `);
    cashAccount = cashResult.rows[0];

    const revenueResult = await pool.query(`
      INSERT INTO chart_of_accounts (id, account_code, account_name, account_type, normal_balance, is_system_account)
      VALUES ('4000', '4000', 'Sales Revenue', 'revenue', 'credit', true)
      RETURNING *
    `);
    revenueAccount = revenueResult.rows[0];

    const expenseResult = await pool.query(`
      INSERT INTO chart_of_accounts (id, account_code, account_name, account_type, normal_balance, is_system_account)
      VALUES ('6000', '6000', 'Payroll Expense', 'expense', 'debit', true)
      RETURNING *
    `);
    expenseAccount = expenseResult.rows[0];
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('Chart of Accounts', () => {
    it('should get all accounts', async () => {
      const accounts = await FinancialService.getChartOfAccounts();

      expect(accounts.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter accounts by type', async () => {
      const assets = await FinancialService.getChartOfAccounts({ account_type: 'asset' });

      expect(assets.length).toBeGreaterThan(0);
      assets.forEach(account => {
        expect(account.account_type).toBe('asset');
      });
    });

    it('should create a new account', async () => {
      const accountData = {
        account_code: '1100',
        account_name: 'Accounts Receivable',
        account_type: 'asset',
        account_category: 'current_assets',
        normal_balance: 'debit',
        description: 'Money owed by customers'
      };

      const account = await FinancialService.createAccount(accountData, testUser.id);

      expect(account).toBeDefined();
      expect(account.account_code).toBe('1100');
      expect(account.account_name).toBe('Accounts Receivable');
    });
  });

  describe('Journal Entries', () => {
    it('should create a balanced journal entry', async () => {
      const entryData = {
        entry_date: '2025-01-15',
        entry_type: 'manual',
        description: 'Test entry',
        location_id: testLocation.id,
        lines: [
          {
            account_id: cashAccount.id,
            debit_amount: 100.00,
            credit_amount: 0,
            description: 'Cash debit'
          },
          {
            account_id: revenueAccount.id,
            debit_amount: 0,
            credit_amount: 100.00,
            description: 'Revenue credit'
          }
        ]
      };

      const entry = await FinancialService.createJournalEntry(entryData, testUser.id);

      expect(entry).toBeDefined();
      expect(entry.is_balanced).toBe(true);
      expect(parseFloat(entry.total_debits)).toBe(100.00);
      expect(parseFloat(entry.total_credits)).toBe(100.00);
    });

    it('should mark unbalanced entry as not balanced', async () => {
      const entryData = {
        entry_date: '2025-01-15',
        entry_type: 'manual',
        description: 'Unbalanced entry',
        location_id: testLocation.id,
        lines: [
          {
            account_id: cashAccount.id,
            debit_amount: 100.00,
            credit_amount: 0
          },
          {
            account_id: revenueAccount.id,
            debit_amount: 0,
            credit_amount: 50.00
          }
        ]
      };

      const entry = await FinancialService.createJournalEntry(entryData, testUser.id);

      expect(entry.is_balanced).toBe(false);
    });

    it('should post journal entry to general ledger', async () => {
      const entryResult = await pool.query(`
        INSERT INTO journal_entries (id, entry_number, entry_date, entry_type, description, total_debits, total_credits, is_balanced, created_by)
        VALUES ('je1', 'JE001', CURRENT_DATE, 'manual', 'Test entry', 100, 100, true, $1)
        RETURNING *
      `, [testUser.id]);

      await pool.query(`
        INSERT INTO general_ledger (account_id, location_id, debit_amount, credit_amount, journal_entry_id, transaction_date)
        VALUES
          ($1, $2, 100, 0, 'je1', CURRENT_DATE),
          ($3, $2, 0, 100, 'je1', CURRENT_DATE)
      `, [cashAccount.id, testLocation.id, revenueAccount.id]);

      const posted = await FinancialService.postJournalEntry('je1', testUser.id);

      expect(posted.is_posted).toBe(true);
      expect(posted.posted_by).toBe(testUser.id);
    });
  });

  describe('Accounts Payable', () => {
    it('should create a payable', async () => {
      const payableData = {
        vendor_name: 'Food Supplier Co',
        location_id: testLocation.id,
        invoice_number: 'INV-12345',
        invoice_date: '2025-01-01',
        due_date: '2025-01-31',
        amount: 1500.00,
        payment_terms: 'net_30',
        account_id: expenseAccount.id
      };

      const payable = await FinancialService.createPayable(payableData, testUser.id);

      expect(payable).toBeDefined();
      expect(payable.vendor_name).toBe('Food Supplier Co');
      expect(parseFloat(payable.amount)).toBe(1500.00);
      expect(parseFloat(payable.amount_due)).toBe(1500.00);
      expect(payable.payment_status).toBe('unpaid');
    });

    it('should get AP aging report', async () => {
      await pool.query(`
        INSERT INTO accounts_payable (id, vendor_name, location_id, invoice_date, due_date, amount, amount_due, payment_status)
        VALUES
          ('ap1', 'Vendor A', $1, CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE - INTERVAL '15 days', 1000, 1000, 'overdue'),
          ('ap2', 'Vendor B', $1, CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '20 days', 500, 500, 'unpaid')
      `, [testLocation.id]);

      const aging = await FinancialService.getAPAgingReport();

      expect(aging.length).toBeGreaterThan(0);
    });
  });

  describe('Accounts Receivable', () => {
    it('should create a receivable', async () => {
      const receivableData = {
        customer_name: 'ABC Catering',
        location_id: testLocation.id,
        invoice_number: 'INV-C001',
        invoice_date: '2025-01-15',
        due_date: '2025-02-15',
        amount: 2500.00,
        payment_terms: 'net_30',
        account_id: revenueAccount.id
      };

      const receivable = await FinancialService.createReceivable(receivableData, testUser.id);

      expect(receivable).toBeDefined();
      expect(receivable.customer_name).toBe('ABC Catering');
      expect(parseFloat(receivable.amount)).toBe(2500.00);
    });

    it('should get AR aging report', async () => {
      await pool.query(`
        INSERT INTO accounts_receivable (id, customer_name, location_id, invoice_number, invoice_date, due_date, amount, amount_due, payment_status)
        VALUES
          ('ar1', 'Customer A', $1, 'INV001', CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE - INTERVAL '30 days', 1500, 1500, 'overdue'),
          ('ar2', 'Customer B', $1, 'INV002', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 800, 800, 'unpaid')
      `, [testLocation.id]);

      const aging = await FinancialService.getARAgingReport();

      expect(aging.length).toBeGreaterThan(0);
    });
  });

  describe('Payments', () => {
    it('should record payment and update AP', async () => {
      const apResult = await pool.query(`
        INSERT INTO accounts_payable (id, vendor_name, location_id, invoice_date, due_date, amount, amount_due, payment_status)
        VALUES ('ap1', 'Vendor A', $1, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 1000, 1000, 'unpaid')
        RETURNING *
      `, [testLocation.id]);

      const paymentData = {
        payment_date: '2025-01-15',
        payment_type: 'vendor_payment',
        payment_method: 'check',
        payee: 'Vendor A',
        amount: 1000.00,
        location_id: testLocation.id,
        account_id: cashAccount.id,
        ap_id: 'ap1'
      };

      await FinancialService.recordPayment(paymentData, testUser.id);

      const updatedAP = await pool.query('SELECT * FROM accounts_payable WHERE id = $1', ['ap1']);
      expect(updatedAP.rows[0].payment_status).toBe('paid');
      expect(parseFloat(updatedAP.rows[0].amount_due)).toBe(0);
    });

    it('should handle partial payments', async () => {
      await pool.query(`
        INSERT INTO accounts_payable (id, vendor_name, location_id, invoice_date, due_date, amount, amount_due, payment_status)
        VALUES ('ap1', 'Vendor A', $1, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 1000, 1000, 'unpaid')
      `, [testLocation.id]);

      const paymentData = {
        payment_date: '2025-01-15',
        payment_type: 'vendor_payment',
        payment_method: 'check',
        payee: 'Vendor A',
        amount: 500.00,
        location_id: testLocation.id,
        account_id: cashAccount.id,
        ap_id: 'ap1'
      };

      await FinancialService.recordPayment(paymentData, testUser.id);

      const updatedAP = await pool.query('SELECT * FROM accounts_payable WHERE id = $1', ['ap1']);
      expect(updatedAP.rows[0].payment_status).toBe('partial');
      expect(parseFloat(updatedAP.rows[0].amount_due)).toBe(500.00);
    });
  });

  describe('Budgets', () => {
    it('should create a budget', async () => {
      const budgetData = {
        budget_name: '2025 Annual Budget',
        location_id: testLocation.id,
        fiscal_year: 2025,
        budget_type: 'annual',
        total_budget: 500000.00
      };

      const budget = await FinancialService.createBudget(budgetData, testUser.id);

      expect(budget).toBeDefined();
      expect(budget.budget_name).toBe('2025 Annual Budget');
      expect(budget.fiscal_year).toBe(2025);
    });

    it('should add budget line items', async () => {
      const budgetResult = await pool.query(`
        INSERT INTO budgets (id, budget_name, location_id, fiscal_year, budget_type, created_by)
        VALUES ('budget1', '2025 Budget', $1, 2025, 'annual', $2)
        RETURNING *
      `, [testLocation.id, testUser.id]);

      const lineItemData = {
        budget_id: 'budget1',
        account_id: expenseAccount.id,
        period: 1,
        budgeted_amount: 10000.00,
        notes: 'January payroll'
      };

      const lineItem = await FinancialService.addBudgetLineItem(lineItemData);

      expect(lineItem).toBeDefined();
      expect(parseFloat(lineItem.budgeted_amount)).toBe(10000.00);
    });

    it('should get budget with line items', async () => {
      await pool.query(`
        INSERT INTO budgets (id, budget_name, location_id, fiscal_year, budget_type, created_by)
        VALUES ('budget1', '2025 Budget', $1, 2025, 'annual', $2)
      `, [testLocation.id, testUser.id]);

      await pool.query(`
        INSERT INTO budget_line_items (budget_id, account_id, period, budgeted_amount)
        VALUES
          ('budget1', $1, 1, 10000),
          ('budget1', $1, 2, 10500)
      `, [expenseAccount.id]);

      const budget = await FinancialService.getBudgetWithLineItems('budget1');

      expect(budget).toBeDefined();
      expect(budget.line_items).toHaveLength(2);
    });
  });

  describe('Financial Reports', () => {
    it('should get trial balance', async () => {
      await pool.query(`
        INSERT INTO general_ledger (account_id, transaction_date, debit_amount, credit_amount, is_posted)
        VALUES
          ($1, CURRENT_DATE, 1000, 0, true),
          ($2, CURRENT_DATE, 0, 1000, true)
      `, [cashAccount.id, revenueAccount.id]);

      const trialBalance = await FinancialService.getTrialBalance();

      expect(trialBalance).toBeDefined();
      expect(trialBalance.length).toBeGreaterThan(0);
    });

    it('should generate P&L statement', async () => {
      await pool.query(`
        INSERT INTO general_ledger (account_id, transaction_date, debit_amount, credit_amount, is_posted, fiscal_year, fiscal_period)
        VALUES
          ($1, CURRENT_DATE, 0, 5000, true, 2025, 1),
          ($2, CURRENT_DATE, 3000, 0, true, 2025, 1)
      `, [revenueAccount.id, expenseAccount.id]);

      const pl = await FinancialService.getProfitLossStatement('2025-01-01', '2025-01-31', testLocation.id);

      expect(pl).toBeDefined();
      expect(pl.total_revenue).toBeGreaterThan(0);
      expect(pl.total_expenses).toBeGreaterThan(0);
      expect(pl.net_income).toBeDefined();
    });

    it('should generate balance sheet', async () => {
      await pool.query(`
        INSERT INTO general_ledger (account_id, transaction_date, debit_amount, credit_amount, is_posted)
        VALUES ($1, CURRENT_DATE, 10000, 0, true)
      `, [cashAccount.id]);

      const bs = await FinancialService.getBalanceSheet();

      expect(bs).toBeDefined();
      expect(bs.total_assets).toBeGreaterThan(0);
    });
  });

  describe('Tax Management', () => {
    it('should get tax rates for location', async () => {
      await pool.query(`
        INSERT INTO tax_rates (id, tax_name, tax_type, jurisdiction, tax_rate, location_id, effective_from, is_active)
        VALUES ('tax1', 'Sales Tax', 'sales_tax', 'State', 0.0825, $1, CURRENT_DATE, true)
      `, [testLocation.id]);

      const rates = await FinancialService.getTaxRates(testLocation.id);

      expect(rates).toHaveLength(1);
      expect(rates[0].tax_name).toBe('Sales Tax');
    });

    it('should create tax filing', async () => {
      const filingData = {
        filing_name: 'Q1 2025 Sales Tax',
        tax_type: 'sales_tax',
        location_id: testLocation.id,
        filing_period_start: '2025-01-01',
        filing_period_end: '2025-03-31',
        due_date: '2025-04-30',
        total_sales: 100000.00,
        taxable_sales: 95000.00,
        tax_collected: 7837.50,
        tax_owed: 7837.50
      };

      const filing = await FinancialService.createTaxFiling(filingData, testUser.id);

      expect(filing).toBeDefined();
      expect(filing.filing_name).toBe('Q1 2025 Sales Tax');
      expect(parseFloat(filing.tax_owed)).toBe(7837.50);
    });
  });
});
