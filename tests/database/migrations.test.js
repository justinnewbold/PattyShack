/**
 * Database Migration Tests for Phases 18-22
 * Tests that migrations run successfully and create expected schema
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

describe('Database Migrations - Phases 18-22', () => {
  let pool;

  beforeAll(async () => {
    // Create a fresh test pool
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'pattyshack_test',
      user: process.env.DB_USER || 'pattyshack_user',
      password: process.env.DB_PASSWORD || 'pattyshack_dev_password',
      max: 5
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  const runMigration = async (migrationFile) => {
    const migrationPath = path.join(__dirname, '../../src/database/migrations', migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    await pool.query(sql);
  };

  const tableExists = async (tableName) => {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      );
    `, [tableName]);
    return result.rows[0].exists;
  };

  const viewExists = async (viewName) => {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views
        WHERE table_schema = 'public' AND table_name = $1
      );
    `, [viewName]);
    return result.rows[0].exists;
  };

  const functionExists = async (functionName) => {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_proc
        WHERE proname = $1
      );
    `, [functionName]);
    return result.rows[0].exists;
  };

  describe('Phase 18: Menu Management System (020)', () => {
    it('should run migration 020 without errors', async () => {
      await expect(runMigration('020_menu_management_system.sql')).resolves.not.toThrow();
    });

    it('should create menu_categories table', async () => {
      const exists = await tableExists('menu_categories');
      expect(exists).toBe(true);
    });

    it('should create menu_items table', async () => {
      const exists = await tableExists('menu_items');
      expect(exists).toBe(true);
    });

    it('should create recipes table', async () => {
      const exists = await tableExists('recipes');
      expect(exists).toBe(true);
    });

    it('should create recipe_ingredients table', async () => {
      const exists = await tableExists('recipe_ingredients');
      expect(exists).toBe(true);
    });

    it('should create menu_performance table', async () => {
      const exists = await tableExists('menu_performance');
      expect(exists).toBe(true);
    });

    it('should create menu_item_profitability view', async () => {
      const exists = await viewExists('menu_item_profitability');
      expect(exists).toBe(true);
    });

    it('should create calculate_recipe_cost function', async () => {
      const exists = await functionExists('calculate_recipe_cost');
      expect(exists).toBe(true);
    });

    it('should seed menu categories', async () => {
      const result = await pool.query('SELECT COUNT(*) FROM menu_categories');
      expect(parseInt(result.rows[0].count)).toBeGreaterThanOrEqual(6);
    });
  });

  describe('Phase 19: Customer Portal (021)', () => {
    it('should run migration 021 without errors', async () => {
      await expect(runMigration('021_customer_portal.sql')).resolves.not.toThrow();
    });

    it('should create customer_accounts table', async () => {
      const exists = await tableExists('customer_accounts');
      expect(exists).toBe(true);
    });

    it('should create customer_addresses table', async () => {
      const exists = await tableExists('customer_addresses');
      expect(exists).toBe(true);
    });

    it('should create online_orders table', async () => {
      const exists = await tableExists('online_orders');
      expect(exists).toBe(true);
    });

    it('should create table_reservations table', async () => {
      const exists = await tableExists('table_reservations');
      expect(exists).toBe(true);
    });

    it('should create loyalty_transactions table', async () => {
      const exists = await tableExists('loyalty_transactions');
      expect(exists).toBe(true);
    });

    it('should create gift_cards table', async () => {
      const exists = await tableExists('gift_cards');
      expect(exists).toBe(true);
    });

    it('should create customer_reviews table', async () => {
      const exists = await tableExists('customer_reviews');
      expect(exists).toBe(true);
    });

    it('should create delivery_drivers table', async () => {
      const exists = await tableExists('delivery_drivers');
      expect(exists).toBe(true);
    });

    it('should create customer_order_history view', async () => {
      const exists = await viewExists('customer_order_history');
      expect(exists).toBe(true);
    });

    it('should create generate_order_number function', async () => {
      const exists = await functionExists('generate_order_number');
      expect(exists).toBe(true);
    });

    it('should seed loyalty rewards', async () => {
      const result = await pool.query('SELECT COUNT(*) FROM loyalty_rewards');
      expect(parseInt(result.rows[0].count)).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Phase 20: Financial Management (022)', () => {
    it('should run migration 022 without errors', async () => {
      await expect(runMigration('022_financial_management.sql')).resolves.not.toThrow();
    });

    it('should create chart_of_accounts table', async () => {
      const exists = await tableExists('chart_of_accounts');
      expect(exists).toBe(true);
    });

    it('should create general_ledger table', async () => {
      const exists = await tableExists('general_ledger');
      expect(exists).toBe(true);
    });

    it('should create journal_entries table', async () => {
      const exists = await tableExists('journal_entries');
      expect(exists).toBe(true);
    });

    it('should create accounts_payable table', async () => {
      const exists = await tableExists('accounts_payable');
      expect(exists).toBe(true);
    });

    it('should create accounts_receivable table', async () => {
      const exists = await tableExists('accounts_receivable');
      expect(exists).toBe(true);
    });

    it('should create budgets table', async () => {
      const exists = await tableExists('budgets');
      expect(exists).toBe(true);
    });

    it('should create tax_rates table', async () => {
      const exists = await tableExists('tax_rates');
      expect(exists).toBe(true);
    });

    it('should create trial_balance view', async () => {
      const exists = await viewExists('trial_balance');
      expect(exists).toBe(true);
    });

    it('should create profit_loss_statement view', async () => {
      const exists = await viewExists('profit_loss_statement');
      expect(exists).toBe(true);
    });

    it('should create balance_sheet view', async () => {
      const exists = await viewExists('balance_sheet');
      expect(exists).toBe(true);
    });

    it('should seed chart of accounts', async () => {
      const result = await pool.query('SELECT COUNT(*) FROM chart_of_accounts WHERE is_system_account = true');
      expect(parseInt(result.rows[0].count)).toBeGreaterThanOrEqual(20);
    });
  });

  describe('Phase 21: Marketing Automation (023)', () => {
    it('should run migration 023 without errors', async () => {
      await expect(runMigration('023_marketing_automation.sql')).resolves.not.toThrow();
    });

    it('should create customer_segments table', async () => {
      const exists = await tableExists('customer_segments');
      expect(exists).toBe(true);
    });

    it('should create marketing_campaigns table', async () => {
      const exists = await tableExists('marketing_campaigns');
      expect(exists).toBe(true);
    });

    it('should create email_templates table', async () => {
      const exists = await tableExists('email_templates');
      expect(exists).toBe(true);
    });

    it('should create promotions table', async () => {
      const exists = await tableExists('promotions');
      expect(exists).toBe(true);
    });

    it('should create marketing_workflows table', async () => {
      const exists = await tableExists('marketing_workflows');
      expect(exists).toBe(true);
    });

    it('should create social_media_posts table', async () => {
      const exists = await tableExists('social_media_posts');
      expect(exists).toBe(true);
    });

    it('should create campaign_performance view', async () => {
      const exists = await viewExists('campaign_performance');
      expect(exists).toBe(true);
    });

    it('should create customer_engagement_score view', async () => {
      const exists = await viewExists('customer_engagement_score');
      expect(exists).toBe(true);
    });

    it('should create generate_referral_code function', async () => {
      const exists = await functionExists('generate_referral_code');
      expect(exists).toBe(true);
    });
  });

  describe('Phase 22: Franchise Management (024)', () => {
    it('should run migration 024 without errors', async () => {
      await expect(runMigration('024_franchise_management.sql')).resolves.not.toThrow();
    });

    it('should create brands table', async () => {
      const exists = await tableExists('brands');
      expect(exists).toBe(true);
    });

    it('should create franchise_agreements table', async () => {
      const exists = await tableExists('franchise_agreements');
      expect(exists).toBe(true);
    });

    it('should create royalty_calculations table', async () => {
      const exists = await tableExists('royalty_calculations');
      expect(exists).toBe(true);
    });

    it('should create brand_standards table', async () => {
      const exists = await tableExists('brand_standards');
      expect(exists).toBe(true);
    });

    it('should create franchise_inspections table', async () => {
      const exists = await tableExists('franchise_inspections');
      expect(exists).toBe(true);
    });

    it('should create franchise_support_tickets table', async () => {
      const exists = await tableExists('franchise_support_tickets');
      expect(exists).toBe(true);
    });

    it('should create training_programs table', async () => {
      const exists = await tableExists('training_programs');
      expect(exists).toBe(true);
    });

    it('should create franchise_performance_summary view', async () => {
      const exists = await viewExists('franchise_performance_summary');
      expect(exists).toBe(true);
    });

    it('should create calculate_franchise_royalty function', async () => {
      const exists = await functionExists('calculate_franchise_royalty');
      expect(exists).toBe(true);
    });

    it('should add brand columns to locations table', async () => {
      const result = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'locations' AND column_name IN ('brand_id', 'franchise_agreement_id', 'is_franchised')
      `);
      expect(result.rows.length).toBeGreaterThanOrEqual(3);
    });

    it('should seed default brand', async () => {
      const result = await pool.query('SELECT COUNT(*) FROM brands WHERE brand_code = $1', ['PS']);
      expect(parseInt(result.rows[0].count)).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Schema Integrity', () => {
    it('should have proper foreign key relationships', async () => {
      const result = await pool.query(`
        SELECT COUNT(*) as fk_count
        FROM information_schema.table_constraints
        WHERE constraint_type = 'FOREIGN KEY'
          AND table_name IN (
            'menu_items', 'recipes', 'recipe_ingredients',
            'online_orders', 'table_reservations', 'customer_addresses',
            'royalty_calculations', 'franchise_inspections'
          )
      `);
      expect(parseInt(result.rows[0].fk_count)).toBeGreaterThan(15);
    });

    it('should have proper indexes created', async () => {
      const result = await pool.query(`
        SELECT COUNT(*) as index_count
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename IN (
            'menu_items', 'online_orders', 'customer_accounts',
            'marketing_campaigns', 'franchise_agreements'
          )
      `);
      expect(parseInt(result.rows[0].index_count)).toBeGreaterThan(20);
    });
  });
});
