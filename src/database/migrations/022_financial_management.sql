/**
 * Migration: Financial Management & Accounting Integration
 * Phase 20
 *
 * Features:
 * - General ledger
 * - Accounts payable/receivable
 * - P&L statements
 * - Cash flow tracking
 * - Budget management
 * - Tax management
 * - QuickBooks/Xero integration
 */

-- ============================================
-- CHART OF ACCOUNTS
-- ============================================

CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('acct_' || gen_random_uuid()::TEXT),
  account_code VARCHAR(50) UNIQUE NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL, -- asset, liability, equity, revenue, expense
  account_category VARCHAR(100), -- cash, inventory, fixed_assets, cogs, operating_expense, etc
  parent_account_id VARCHAR(255) REFERENCES chart_of_accounts(id),
  normal_balance VARCHAR(20) NOT NULL, -- debit or credit
  is_active BOOLEAN DEFAULT TRUE,
  is_system_account BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chart_of_accounts_type ON chart_of_accounts(account_type);
CREATE INDEX idx_chart_of_accounts_code ON chart_of_accounts(account_code);

-- ============================================
-- GENERAL LEDGER
-- ============================================

CREATE TABLE IF NOT EXISTS general_ledger (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('gl_' || gen_random_uuid()::TEXT),
  transaction_date DATE NOT NULL,
  account_id VARCHAR(255) REFERENCES chart_of_accounts(id) NOT NULL,
  location_id VARCHAR(255) REFERENCES locations(id),
  debit_amount NUMERIC(12,2) DEFAULT 0,
  credit_amount NUMERIC(12,2) DEFAULT 0,
  description TEXT,
  reference_type VARCHAR(100), -- invoice, order, payment, adjustment
  reference_id VARCHAR(255),
  journal_entry_id VARCHAR(255),
  posted_by VARCHAR(255),
  is_posted BOOLEAN DEFAULT FALSE,
  posted_at TIMESTAMPTZ,
  fiscal_year INTEGER,
  fiscal_period INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_general_ledger_account ON general_ledger(account_id);
CREATE INDEX idx_general_ledger_date ON general_ledger(transaction_date);
CREATE INDEX idx_general_ledger_location ON general_ledger(location_id);
CREATE INDEX idx_general_ledger_ref ON general_ledger(reference_type, reference_id);

-- ============================================
-- JOURNAL ENTRIES
-- ============================================

CREATE TABLE IF NOT EXISTS journal_entries (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('je_' || gen_random_uuid()::TEXT),
  entry_number VARCHAR(50) UNIQUE NOT NULL,
  entry_date DATE NOT NULL,
  entry_type VARCHAR(50) DEFAULT 'manual', -- manual, automatic, recurring, adjusting, closing
  description TEXT NOT NULL,
  location_id VARCHAR(255) REFERENCES locations(id),
  total_debits NUMERIC(12,2) DEFAULT 0,
  total_credits NUMERIC(12,2) DEFAULT 0,
  is_balanced BOOLEAN DEFAULT FALSE,
  is_posted BOOLEAN DEFAULT FALSE,
  posted_at TIMESTAMPTZ,
  posted_by VARCHAR(255),
  created_by VARCHAR(255) NOT NULL,
  approved_by VARCHAR(255),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX idx_journal_entries_type ON journal_entries(entry_type);

-- ============================================
-- ACCOUNTS PAYABLE
-- ============================================

CREATE TABLE IF NOT EXISTS accounts_payable (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('ap_' || gen_random_uuid()::TEXT),
  invoice_id VARCHAR(255) REFERENCES invoices(id),
  vendor_name VARCHAR(255) NOT NULL,
  vendor_id VARCHAR(255),
  location_id VARCHAR(255) REFERENCES locations(id),
  invoice_number VARCHAR(100),
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  amount_paid NUMERIC(12,2) DEFAULT 0,
  amount_due NUMERIC(12,2) NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'unpaid', -- unpaid, partial, paid, overdue
  payment_terms VARCHAR(100), -- net_30, net_60, due_on_receipt
  account_id VARCHAR(255) REFERENCES chart_of_accounts(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_accounts_payable_vendor ON accounts_payable(vendor_name);
CREATE INDEX idx_accounts_payable_status ON accounts_payable(payment_status);
CREATE INDEX idx_accounts_payable_due_date ON accounts_payable(due_date);

-- ============================================
-- ACCOUNTS RECEIVABLE
-- ============================================

CREATE TABLE IF NOT EXISTS accounts_receivable (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('ar_' || gen_random_uuid()::TEXT),
  customer_id VARCHAR(255),
  customer_name VARCHAR(255) NOT NULL,
  location_id VARCHAR(255) REFERENCES locations(id),
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  amount_paid NUMERIC(12,2) DEFAULT 0,
  amount_due NUMERIC(12,2) NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'unpaid', -- unpaid, partial, paid, overdue
  payment_terms VARCHAR(100),
  account_id VARCHAR(255) REFERENCES chart_of_accounts(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_accounts_receivable_customer ON accounts_receivable(customer_name);
CREATE INDEX idx_accounts_receivable_status ON accounts_receivable(payment_status);
CREATE INDEX idx_accounts_receivable_due_date ON accounts_receivable(due_date);

-- ============================================
-- PAYMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS financial_payments (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('pay_' || gen_random_uuid()::TEXT),
  payment_number VARCHAR(50) UNIQUE NOT NULL,
  payment_date DATE NOT NULL,
  payment_type VARCHAR(50) NOT NULL, -- vendor_payment, customer_payment, expense, refund
  payment_method VARCHAR(50), -- cash, check, credit_card, ach, wire
  payee VARCHAR(255) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  location_id VARCHAR(255) REFERENCES locations(id),
  account_id VARCHAR(255) REFERENCES chart_of_accounts(id),
  reference_number VARCHAR(100),
  ap_id VARCHAR(255) REFERENCES accounts_payable(id),
  ar_id VARCHAR(255) REFERENCES accounts_receivable(id),
  notes TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_financial_payments_type ON financial_payments(payment_type);
CREATE INDEX idx_financial_payments_date ON financial_payments(payment_date);
CREATE INDEX idx_financial_payments_payee ON financial_payments(payee);

-- ============================================
-- BUDGETS
-- ============================================

CREATE TABLE IF NOT EXISTS budgets (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('budget_' || gen_random_uuid()::TEXT),
  budget_name VARCHAR(255) NOT NULL,
  location_id VARCHAR(255) REFERENCES locations(id),
  fiscal_year INTEGER NOT NULL,
  budget_type VARCHAR(50) DEFAULT 'annual', -- annual, quarterly, monthly
  status VARCHAR(50) DEFAULT 'draft', -- draft, approved, active, closed
  total_budget NUMERIC(12,2),
  created_by VARCHAR(255),
  approved_by VARCHAR(255),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_budgets_location ON budgets(location_id);
CREATE INDEX idx_budgets_fiscal_year ON budgets(fiscal_year);

CREATE TABLE IF NOT EXISTS budget_line_items (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('bli_' || gen_random_uuid()::TEXT),
  budget_id VARCHAR(255) REFERENCES budgets(id) ON DELETE CASCADE,
  account_id VARCHAR(255) REFERENCES chart_of_accounts(id),
  period INTEGER, -- 1-12 for months, 1-4 for quarters
  budgeted_amount NUMERIC(12,2) NOT NULL,
  actual_amount NUMERIC(12,2) DEFAULT 0,
  variance NUMERIC(12,2),
  variance_percentage NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_budget_line_items_budget ON budget_line_items(budget_id);
CREATE INDEX idx_budget_line_items_account ON budget_line_items(account_id);

-- ============================================
-- TAX MANAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS tax_rates (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('tax_' || gen_random_uuid()::TEXT),
  tax_name VARCHAR(255) NOT NULL,
  tax_type VARCHAR(50) NOT NULL, -- sales_tax, vat, gst, income_tax
  jurisdiction VARCHAR(255), -- state, county, city
  tax_rate NUMERIC(5,4) NOT NULL, -- e.g., 0.0825 for 8.25%
  location_id VARCHAR(255) REFERENCES locations(id),
  is_compound BOOLEAN DEFAULT FALSE,
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tax_rates_location ON tax_rates(location_id);
CREATE INDEX idx_tax_rates_type ON tax_rates(tax_type);

CREATE TABLE IF NOT EXISTS tax_filings (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('filing_' || gen_random_uuid()::TEXT),
  filing_name VARCHAR(255) NOT NULL,
  tax_type VARCHAR(50) NOT NULL,
  location_id VARCHAR(255) REFERENCES locations(id),
  filing_period_start DATE NOT NULL,
  filing_period_end DATE NOT NULL,
  due_date DATE NOT NULL,
  total_sales NUMERIC(12,2),
  taxable_sales NUMERIC(12,2),
  tax_collected NUMERIC(12,2),
  tax_owed NUMERIC(12,2),
  tax_paid NUMERIC(12,2),
  filing_status VARCHAR(50) DEFAULT 'pending', -- pending, filed, paid
  filed_date DATE,
  filed_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tax_filings_location ON tax_filings(location_id);
CREATE INDEX idx_tax_filings_status ON tax_filings(filing_status);

-- ============================================
-- FISCAL PERIODS
-- ============================================

CREATE TABLE IF NOT EXISTS fiscal_periods (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('period_' || gen_random_uuid()::TEXT),
  fiscal_year INTEGER NOT NULL,
  period_number INTEGER NOT NULL, -- 1-12
  period_name VARCHAR(50), -- January, Q1, etc
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_closed BOOLEAN DEFAULT FALSE,
  closed_by VARCHAR(255),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fiscal_year, period_number)
);

CREATE INDEX idx_fiscal_periods_year ON fiscal_periods(fiscal_year);

-- ============================================
-- ACCOUNTING INTEGRATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS accounting_integrations (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('int_' || gen_random_uuid()::TEXT),
  integration_name VARCHAR(100) NOT NULL, -- quickbooks, xero, sage
  location_id VARCHAR(255) REFERENCES locations(id),
  api_credentials JSONB, -- encrypted credentials
  account_mapping JSONB, -- map local accounts to external system
  sync_frequency VARCHAR(50) DEFAULT 'daily', -- manual, hourly, daily, weekly
  last_sync_at TIMESTAMPTZ,
  last_sync_status VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounting_sync_log (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('sync_' || gen_random_uuid()::TEXT),
  integration_id VARCHAR(255) REFERENCES accounting_integrations(id),
  sync_type VARCHAR(50), -- export, import, reconcile
  records_processed INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  sync_status VARCHAR(50), -- success, failed, partial
  error_log JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================
-- VIEWS
-- ============================================

-- Trial Balance
CREATE OR REPLACE VIEW trial_balance AS
SELECT
  coa.account_code,
  coa.account_name,
  coa.account_type,
  coa.normal_balance,
  SUM(gl.debit_amount) as total_debits,
  SUM(gl.credit_amount) as total_credits,
  CASE
    WHEN coa.normal_balance = 'debit' THEN SUM(gl.debit_amount) - SUM(gl.credit_amount)
    ELSE SUM(gl.credit_amount) - SUM(gl.debit_amount)
  END as balance
FROM chart_of_accounts coa
LEFT JOIN general_ledger gl ON coa.id = gl.account_id AND gl.is_posted = TRUE
WHERE coa.is_active = TRUE
GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type, coa.normal_balance
ORDER BY coa.account_code;

-- Profit & Loss Statement
CREATE OR REPLACE VIEW profit_loss_statement AS
SELECT
  coa.account_type,
  coa.account_category,
  coa.account_name,
  CASE
    WHEN coa.account_type = 'revenue' THEN SUM(gl.credit_amount - gl.debit_amount)
    WHEN coa.account_type = 'expense' THEN SUM(gl.debit_amount - gl.credit_amount)
    ELSE 0
  END as amount,
  gl.fiscal_year,
  gl.fiscal_period
FROM chart_of_accounts coa
LEFT JOIN general_ledger gl ON coa.id = gl.account_id AND gl.is_posted = TRUE
WHERE coa.account_type IN ('revenue', 'expense')
GROUP BY coa.account_type, coa.account_category, coa.account_name, gl.fiscal_year, gl.fiscal_period
ORDER BY coa.account_type DESC, coa.account_category;

-- Balance Sheet
CREATE OR REPLACE VIEW balance_sheet AS
SELECT
  coa.account_type,
  coa.account_category,
  coa.account_name,
  CASE
    WHEN coa.normal_balance = 'debit' THEN SUM(gl.debit_amount - gl.credit_amount)
    ELSE SUM(gl.credit_amount - gl.debit_amount)
  END as balance
FROM chart_of_accounts coa
LEFT JOIN general_ledger gl ON coa.id = gl.account_id AND gl.is_posted = TRUE
WHERE coa.account_type IN ('asset', 'liability', 'equity')
GROUP BY coa.id, coa.account_type, coa.account_category, coa.account_name, coa.normal_balance
ORDER BY
  CASE coa.account_type
    WHEN 'asset' THEN 1
    WHEN 'liability' THEN 2
    WHEN 'equity' THEN 3
  END,
  coa.account_category;

-- Aging Report (AP)
CREATE OR REPLACE VIEW ap_aging_report AS
SELECT
  vendor_name,
  SUM(amount_due) as total_due,
  SUM(CASE WHEN CURRENT_DATE - due_date <= 30 THEN amount_due ELSE 0 END) as current_30,
  SUM(CASE WHEN CURRENT_DATE - due_date BETWEEN 31 AND 60 THEN amount_due ELSE 0 END) as days_31_60,
  SUM(CASE WHEN CURRENT_DATE - due_date BETWEEN 61 AND 90 THEN amount_due ELSE 0 END) as days_61_90,
  SUM(CASE WHEN CURRENT_DATE - due_date > 90 THEN amount_due ELSE 0 END) as over_90
FROM accounts_payable
WHERE payment_status IN ('unpaid', 'partial', 'overdue')
GROUP BY vendor_name;

-- Aging Report (AR)
CREATE OR REPLACE VIEW ar_aging_report AS
SELECT
  customer_name,
  SUM(amount_due) as total_due,
  SUM(CASE WHEN CURRENT_DATE - due_date <= 30 THEN amount_due ELSE 0 END) as current_30,
  SUM(CASE WHEN CURRENT_DATE - due_date BETWEEN 31 AND 60 THEN amount_due ELSE 0 END) as days_31_60,
  SUM(CASE WHEN CURRENT_DATE - due_date BETWEEN 61 AND 90 THEN amount_due ELSE 0 END) as days_61_90,
  SUM(CASE WHEN CURRENT_DATE - due_date > 90 THEN amount_due ELSE 0 END) as over_90
FROM accounts_receivable
WHERE payment_status IN ('unpaid', 'partial', 'overdue')
GROUP BY customer_name;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-post journal entry to general ledger
CREATE OR REPLACE FUNCTION post_journal_entry_to_gl(p_journal_entry_id VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  entry RECORD;
  line RECORD;
BEGIN
  -- Get journal entry
  SELECT * INTO entry FROM journal_entries WHERE id = p_journal_entry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Journal entry not found';
  END IF;

  IF NOT entry.is_balanced THEN
    RAISE EXCEPTION 'Journal entry is not balanced';
  END IF;

  -- Post to general ledger (would need journal_entry_lines table in full implementation)
  UPDATE journal_entries
  SET is_posted = TRUE, posted_at = NOW()
  WHERE id = p_journal_entry_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Calculate budget variance
CREATE OR REPLACE FUNCTION calculate_budget_variance()
RETURNS TRIGGER AS $$
BEGIN
  NEW.variance := NEW.actual_amount - NEW.budgeted_amount;
  IF NEW.budgeted_amount != 0 THEN
    NEW.variance_percentage := (NEW.variance / NEW.budgeted_amount) * 100;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_budget_variance
BEFORE INSERT OR UPDATE ON budget_line_items
FOR EACH ROW
EXECUTE FUNCTION calculate_budget_variance();

-- ============================================
-- SEED DATA - Chart of Accounts
-- ============================================

INSERT INTO chart_of_accounts (account_code, account_name, account_type, account_category, normal_balance, is_system_account)
VALUES
  -- ASSETS
  ('1000', 'Cash', 'asset', 'cash', 'debit', TRUE),
  ('1100', 'Accounts Receivable', 'asset', 'accounts_receivable', 'debit', TRUE),
  ('1200', 'Inventory', 'asset', 'inventory', 'debit', TRUE),
  ('1500', 'Equipment', 'asset', 'fixed_assets', 'debit', TRUE),
  ('1600', 'Accumulated Depreciation', 'asset', 'fixed_assets', 'credit', TRUE),

  -- LIABILITIES
  ('2000', 'Accounts Payable', 'liability', 'accounts_payable', 'credit', TRUE),
  ('2100', 'Sales Tax Payable', 'liability', 'taxes_payable', 'credit', TRUE),
  ('2200', 'Payroll Liabilities', 'liability', 'payroll', 'credit', TRUE),
  ('2500', 'Long-term Debt', 'liability', 'long_term_liabilities', 'credit', TRUE),

  -- EQUITY
  ('3000', 'Owner\'s Equity', 'equity', 'capital', 'credit', TRUE),
  ('3100', 'Retained Earnings', 'equity', 'retained_earnings', 'credit', TRUE),

  -- REVENUE
  ('4000', 'Food Sales', 'revenue', 'sales', 'credit', TRUE),
  ('4100', 'Beverage Sales', 'revenue', 'sales', 'credit', TRUE),
  ('4200', 'Catering Revenue', 'revenue', 'sales', 'credit', TRUE),

  -- COST OF GOODS SOLD
  ('5000', 'Food Costs', 'expense', 'cogs', 'debit', TRUE),
  ('5100', 'Beverage Costs', 'expense', 'cogs', 'debit', TRUE),

  -- OPERATING EXPENSES
  ('6000', 'Payroll Expense', 'expense', 'operating_expense', 'debit', TRUE),
  ('6100', 'Rent Expense', 'expense', 'operating_expense', 'debit', TRUE),
  ('6200', 'Utilities', 'expense', 'operating_expense', 'debit', TRUE),
  ('6300', 'Marketing & Advertising', 'expense', 'operating_expense', 'debit', TRUE),
  ('6400', 'Insurance', 'expense', 'operating_expense', 'debit', TRUE),
  ('6500', 'Maintenance & Repairs', 'expense', 'operating_expense', 'debit', TRUE),
  ('6600', 'Supplies', 'expense', 'operating_expense', 'debit', TRUE),
  ('6700', 'Professional Fees', 'expense', 'operating_expense', 'debit', TRUE),
  ('6800', 'Depreciation Expense', 'expense', 'operating_expense', 'debit', TRUE)
ON CONFLICT DO NOTHING;

-- Migration complete
