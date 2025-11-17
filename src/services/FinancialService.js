/**
 * Financial Management Service
 * Phase 20
 *
 * Handles general ledger, AP/AR, budgets, and financial reporting
 */

const { pool } = require('../database/pool');

class FinancialService {
  // ============================================
  // CHART OF ACCOUNTS
  // ============================================

  async getChartOfAccounts(filters = {}) {
    let query = 'SELECT * FROM chart_of_accounts WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (filters.account_type) {
      query += ` AND account_type = $${paramCount}`;
      values.push(filters.account_type);
      paramCount++;
    }

    if (filters.is_active !== undefined) {
      query += ` AND is_active = $${paramCount}`;
      values.push(filters.is_active);
      paramCount++;
    }

    query += ' ORDER BY account_code';

    const result = await pool.query(query, values);
    return result.rows;
  }

  async createAccount(accountData, userId) {
    const result = await pool.query(
      `INSERT INTO chart_of_accounts (
        account_code, account_name, account_type, account_category,
        parent_account_id, normal_balance, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        accountData.account_code,
        accountData.account_name,
        accountData.account_type,
        accountData.account_category,
        accountData.parent_account_id,
        accountData.normal_balance,
        accountData.description
      ]
    );

    return result.rows[0];
  }

  // ============================================
  // JOURNAL ENTRIES
  // ============================================

  async createJournalEntry(entryData, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO journal_entries (
          entry_date, entry_type, description, location_id, created_by
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [
          entryData.entry_date,
          entryData.entry_type || 'manual',
          entryData.description,
          entryData.location_id,
          userId
        ]
      );

      const journalEntry = result.rows[0];

      // Add lines to general ledger
      let totalDebits = 0;
      let totalCredits = 0;

      for (const line of entryData.lines) {
        await client.query(
          `INSERT INTO general_ledger (
            transaction_date, account_id, location_id, debit_amount,
            credit_amount, description, journal_entry_id, posted_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            entryData.entry_date,
            line.account_id,
            entryData.location_id,
            line.debit_amount || 0,
            line.credit_amount || 0,
            line.description || entryData.description,
            journalEntry.id,
            userId
          ]
        );

        totalDebits += parseFloat(line.debit_amount || 0);
        totalCredits += parseFloat(line.credit_amount || 0);
      }

      // Update totals and balanced status
      const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;
      await client.query(
        `UPDATE journal_entries
         SET total_debits = $1, total_credits = $2, is_balanced = $3
         WHERE id = $4`,
        [totalDebits, totalCredits, isBalanced, journalEntry.id]
      );

      await client.query('COMMIT');
      return await this.getJournalEntryById(journalEntry.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getJournalEntryById(entryId) {
    const result = await pool.query(
      `SELECT
        je.*,
        COALESCE(
          json_agg(json_build_object(
            'id', gl.id,
            'account_id', gl.account_id,
            'account_name', coa.account_name,
            'debit_amount', gl.debit_amount,
            'credit_amount', gl.credit_amount,
            'description', gl.description
          )) FILTER (WHERE gl.id IS NOT NULL),
          '[]'
        ) as lines
      FROM journal_entries je
      LEFT JOIN general_ledger gl ON je.id = gl.journal_entry_id
      LEFT JOIN chart_of_accounts coa ON gl.account_id = coa.id
      WHERE je.id = $1
      GROUP BY je.id`,
      [entryId]
    );

    return result.rows[0];
  }

  async postJournalEntry(entryId, userId) {
    const result = await pool.query(
      `UPDATE journal_entries
       SET is_posted = TRUE, posted_at = NOW(), posted_by = $1
       WHERE id = $2 AND is_balanced = TRUE
       RETURNING *`,
      [userId, entryId]
    );

    if (result.rows.length === 0) {
      throw new Error('Journal entry not found or not balanced');
    }

    // Mark GL entries as posted
    await pool.query(
      `UPDATE general_ledger
       SET is_posted = TRUE, posted_at = NOW()
       WHERE journal_entry_id = $1`,
      [entryId]
    );

    return result.rows[0];
  }

  // ============================================
  // ACCOUNTS PAYABLE
  // ============================================

  async createPayable(payableData, userId) {
    const result = await pool.query(
      `INSERT INTO accounts_payable (
        vendor_name, vendor_id, location_id, invoice_number,
        invoice_date, due_date, amount, amount_due,
        payment_terms, account_id, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        payableData.vendor_name,
        payableData.vendor_id,
        payableData.location_id,
        payableData.invoice_number,
        payableData.invoice_date,
        payableData.due_date,
        payableData.amount,
        payableData.amount, // initially amount_due = amount
        payableData.payment_terms,
        payableData.account_id,
        payableData.notes
      ]
    );

    return result.rows[0];
  }

  async getPayables(filters = {}) {
    let query = 'SELECT * FROM accounts_payable WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (filters.location_id) {
      query += ` AND location_id = $${paramCount}`;
      values.push(filters.location_id);
      paramCount++;
    }

    if (filters.payment_status) {
      query += ` AND payment_status = $${paramCount}`;
      values.push(filters.payment_status);
      paramCount++;
    }

    if (filters.vendor_name) {
      query += ` AND vendor_name ILIKE $${paramCount}`;
      values.push(`%${filters.vendor_name}%`);
      paramCount++;
    }

    query += ' ORDER BY due_date ASC';

    const result = await pool.query(query, values);
    return result.rows;
  }

  async getAPAgingReport() {
    const result = await pool.query('SELECT * FROM ap_aging_report ORDER BY total_due DESC');
    return result.rows;
  }

  // ============================================
  // ACCOUNTS RECEIVABLE
  // ============================================

  async createReceivable(receivableData, userId) {
    const result = await pool.query(
      `INSERT INTO accounts_receivable (
        customer_name, customer_id, location_id, invoice_number,
        invoice_date, due_date, amount, amount_due,
        payment_terms, account_id, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        receivableData.customer_name,
        receivableData.customer_id,
        receivableData.location_id,
        receivableData.invoice_number,
        receivableData.invoice_date,
        receivableData.due_date,
        receivableData.amount,
        receivableData.amount,
        receivableData.payment_terms,
        receivableData.account_id,
        receivableData.notes
      ]
    );

    return result.rows[0];
  }

  async getReceivables(filters = {}) {
    let query = 'SELECT * FROM accounts_receivable WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (filters.location_id) {
      query += ` AND location_id = $${paramCount}`;
      values.push(filters.location_id);
      paramCount++;
    }

    if (filters.payment_status) {
      query += ` AND payment_status = $${paramCount}`;
      values.push(filters.payment_status);
      paramCount++;
    }

    query += ' ORDER BY due_date ASC';

    const result = await pool.query(query, values);
    return result.rows;
  }

  async getARAgingReport() {
    const result = await pool.query('SELECT * FROM ar_aging_report ORDER BY total_due DESC');
    return result.rows;
  }

  // ============================================
  // PAYMENTS
  // ============================================

  async recordPayment(paymentData, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO financial_payments (
          payment_date, payment_type, payment_method, payee,
          amount, location_id, account_id, reference_number,
          ap_id, ar_id, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          paymentData.payment_date,
          paymentData.payment_type,
          paymentData.payment_method,
          paymentData.payee,
          paymentData.amount,
          paymentData.location_id,
          paymentData.account_id,
          paymentData.reference_number,
          paymentData.ap_id,
          paymentData.ar_id,
          paymentData.notes,
          userId
        ]
      );

      const payment = result.rows[0];

      // Update AP or AR
      if (paymentData.ap_id) {
        await client.query(
          `UPDATE accounts_payable
           SET amount_paid = amount_paid + $1,
               amount_due = amount - (amount_paid + $1),
               payment_status = CASE
                 WHEN (amount_paid + $1) >= amount THEN 'paid'
                 WHEN (amount_paid + $1) > 0 THEN 'partial'
                 ELSE payment_status
               END
           WHERE id = $2`,
          [paymentData.amount, paymentData.ap_id]
        );
      }

      if (paymentData.ar_id) {
        await client.query(
          `UPDATE accounts_receivable
           SET amount_paid = amount_paid + $1,
               amount_due = amount - (amount_paid + $1),
               payment_status = CASE
                 WHEN (amount_paid + $1) >= amount THEN 'paid'
                 WHEN (amount_paid + $1) > 0 THEN 'partial'
                 ELSE payment_status
               END
           WHERE id = $2`,
          [paymentData.amount, paymentData.ar_id]
        );
      }

      await client.query('COMMIT');
      return payment;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================
  // BUDGETS
  // ============================================

  async createBudget(budgetData, userId) {
    const result = await pool.query(
      `INSERT INTO budgets (
        budget_name, location_id, fiscal_year, budget_type,
        total_budget, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        budgetData.budget_name,
        budgetData.location_id,
        budgetData.fiscal_year,
        budgetData.budget_type || 'annual',
        budgetData.total_budget,
        userId
      ]
    );

    return result.rows[0];
  }

  async addBudgetLineItem(lineItemData) {
    const result = await pool.query(
      `INSERT INTO budget_line_items (
        budget_id, account_id, period, budgeted_amount, notes
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        lineItemData.budget_id,
        lineItemData.account_id,
        lineItemData.period,
        lineItemData.budgeted_amount,
        lineItemData.notes
      ]
    );

    return result.rows[0];
  }

  async getBudgetWithLineItems(budgetId) {
    const result = await pool.query(
      `SELECT
        b.*,
        COALESCE(
          json_agg(json_build_object(
            'id', bli.id,
            'account_id', bli.account_id,
            'account_name', coa.account_name,
            'period', bli.period,
            'budgeted_amount', bli.budgeted_amount,
            'actual_amount', bli.actual_amount,
            'variance', bli.variance,
            'variance_percentage', bli.variance_percentage
          ) ORDER BY bli.period, coa.account_code) FILTER (WHERE bli.id IS NOT NULL),
          '[]'
        ) as line_items
      FROM budgets b
      LEFT JOIN budget_line_items bli ON b.id = bli.budget_id
      LEFT JOIN chart_of_accounts coa ON bli.account_id = coa.id
      WHERE b.id = $1
      GROUP BY b.id`,
      [budgetId]
    );

    return result.rows[0];
  }

  // ============================================
  // FINANCIAL REPORTS
  // ============================================

  async getTrialBalance(asOfDate = null) {
    const result = await pool.query('SELECT * FROM trial_balance');
    return result.rows;
  }

  async getProfitLossStatement(startDate, endDate, locationId = null) {
    let query = `
      SELECT
        account_type,
        account_category,
        account_name,
        SUM(amount) as amount
      FROM profit_loss_statement
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;

    if (startDate && endDate) {
      // Would need to add date filtering in the view for full implementation
    }

    if (locationId) {
      // Would need location filtering in view
    }

    query += `
      GROUP BY account_type, account_category, account_name
      ORDER BY account_type DESC, account_category
    `;

    const result = await pool.query(query, values);

    // Calculate totals
    const revenue = result.rows
      .filter(r => r.account_type === 'revenue')
      .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

    const expenses = result.rows
      .filter(r => r.account_type === 'expense')
      .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

    return {
      line_items: result.rows,
      total_revenue: revenue,
      total_expenses: expenses,
      net_income: revenue - expenses
    };
  }

  async getBalanceSheet(asOfDate = null) {
    const result = await pool.query('SELECT * FROM balance_sheet');

    const assets = result.rows
      .filter(r => r.account_type === 'asset')
      .reduce((sum, r) => sum + parseFloat(r.balance || 0), 0);

    const liabilities = result.rows
      .filter(r => r.account_type === 'liability')
      .reduce((sum, r) => sum + parseFloat(r.balance || 0), 0);

    const equity = result.rows
      .filter(r => r.account_type === 'equity')
      .reduce((sum, r) => sum + parseFloat(r.balance || 0), 0);

    return {
      line_items: result.rows,
      total_assets: assets,
      total_liabilities: liabilities,
      total_equity: equity
    };
  }

  // ============================================
  // TAX MANAGEMENT
  // ============================================

  async getTaxRates(locationId) {
    const result = await pool.query(
      `SELECT * FROM tax_rates
       WHERE location_id = $1 AND is_active = TRUE
       ORDER BY tax_type, effective_from DESC`,
      [locationId]
    );

    return result.rows;
  }

  async createTaxFiling(filingData, userId) {
    const result = await pool.query(
      `INSERT INTO tax_filings (
        filing_name, tax_type, location_id, filing_period_start,
        filing_period_end, due_date, total_sales, taxable_sales,
        tax_collected, tax_owed
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        filingData.filing_name,
        filingData.tax_type,
        filingData.location_id,
        filingData.filing_period_start,
        filingData.filing_period_end,
        filingData.due_date,
        filingData.total_sales,
        filingData.taxable_sales,
        filingData.tax_collected,
        filingData.tax_owed
      ]
    );

    return result.rows[0];
  }
}

module.exports = new FinancialService();
