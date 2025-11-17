/**
 * Integration Tests for Phases 18-22 API Routes
 * Tests all new endpoints: menu, customers, financial, marketing, franchise
 */

const request = require('supertest');
const app = require('../../src/server/index');
const {
  setupTestDatabase,
  clearTestDatabase,
  teardownTestDatabase,
  createTestLocation,
  createTestUser,
  getTestPool
} = require('../helpers/testDb');
const { initializePool } = require('../../src/database/pool');

describe('Phases 18-22 API Integration Tests', () => {
  let testLocation;
  let testUser;
  let authToken;
  let pool;

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

    authToken = 'test-token';
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  // ==========================================
  // PHASE 18: MENU MANAGEMENT
  // ==========================================

  describe('Phase 18: Menu Management API', () => {
    describe('POST /api/v1/menu/categories', () => {
      it('should create a menu category', async () => {
        const categoryData = {
          location_id: testLocation.id,
          name: 'Appetizers',
          description: 'Tasty starters',
          display_order: 1
        };

        const response = await request(app)
          .post('/api/v1/menu/categories')
          .set('x-user-id', testUser.id)
          .send(categoryData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Appetizers');
      });
    });

    describe('POST /api/v1/menu/items', () => {
      it('should create a menu item', async () => {
        await pool.query(`
          INSERT INTO menu_categories (id, location_id, name, display_order)
          VALUES ('cat1', $1, 'Burgers', 1)
        `, [testLocation.id]);

        const itemData = {
          category_id: 'cat1',
          name: 'Classic Burger',
          base_price: 12.99,
          is_available: true
        };

        const response = await request(app)
          .post('/api/v1/menu/items')
          .set('x-user-id', testUser.id)
          .send(itemData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Classic Burger');
      });
    });
  });

  // ==========================================
  // PHASE 19: CUSTOMER PORTAL
  // ==========================================

  describe('Phase 19: Customer Portal API', () => {
    describe('POST /api/v1/customers/register', () => {
      it('should register a new customer', async () => {
        const customerData = {
          email: 'newcustomer@test.com',
          password: 'password123',
          first_name: 'John',
          last_name: 'Doe',
          phone: '555-1234'
        };

        const response = await request(app)
          .post('/api/v1/customers/register')
          .send(customerData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.email).toBe('newcustomer@test.com');
      });
    });

    describe('POST /api/v1/customers/login', () => {
      it('should authenticate customer', async () => {
        // Create a customer first (password123 hashed)
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash('password123', 10);

        await pool.query(`
          INSERT INTO customer_accounts (id, email, password_hash, first_name, last_name, account_status)
          VALUES ('cust1', 'customer@test.com', $1, 'John', 'Doe', 'active')
        `, [hashedPassword]);

        const response = await request(app)
          .post('/api/v1/customers/login')
          .send({
            email: 'customer@test.com',
            password: 'password123'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.email).toBe('customer@test.com');
      });
    });

    describe('POST /api/v1/customers/orders', () => {
      it('should create an online order', async () => {
        await pool.query(`
          INSERT INTO customer_accounts (id, email, password_hash, first_name, last_name)
          VALUES ('cust1', 'customer@test.com', 'hash', 'John', 'Doe')
        `);

        await pool.query(`
          INSERT INTO menu_categories (id, location_id, name, display_order)
          VALUES ('cat1', $1, 'Burgers', 1)
        `, [testLocation.id]);

        await pool.query(`
          INSERT INTO menu_items (id, category_id, name, base_price)
          VALUES ('item1', 'cat1', 'Burger', 9.99)
        `);

        const orderData = {
          location_id: testLocation.id,
          order_type: 'pickup',
          subtotal: 9.99,
          total_amount: 10.79,
          items: [
            {
              menu_item_id: 'item1',
              quantity: 1,
              unit_price: 9.99,
              subtotal: 9.99
            }
          ]
        };

        const response = await request(app)
          .post('/api/v1/customers/orders')
          .set('x-customer-id', 'cust1')
          .send(orderData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.order_type).toBe('pickup');
      });
    });

    describe('POST /api/v1/customers/reservations', () => {
      it('should create a table reservation', async () => {
        await pool.query(`
          INSERT INTO customer_accounts (id, email, password_hash, first_name, last_name)
          VALUES ('cust1', 'customer@test.com', 'hash', 'John', 'Doe')
        `);

        const reservationData = {
          location_id: testLocation.id,
          guest_name: 'John Doe',
          guest_email: 'customer@test.com',
          party_size: 4,
          reservation_date: '2025-12-15',
          reservation_time: '19:00:00'
        };

        const response = await request(app)
          .post('/api/v1/customers/reservations')
          .set('x-customer-id', 'cust1')
          .send(reservationData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.party_size).toBe(4);
      });
    });
  });

  // ==========================================
  // PHASE 20: FINANCIAL MANAGEMENT
  // ==========================================

  describe('Phase 20: Financial Management API', () => {
    beforeEach(async () => {
      // Create test accounts
      await pool.query(`
        INSERT INTO chart_of_accounts (id, account_code, account_name, account_type, normal_balance)
        VALUES
          ('1000', '1000', 'Cash', 'asset', 'debit'),
          ('4000', '4000', 'Revenue', 'revenue', 'credit')
      `);
    });

    describe('GET /api/v1/financial/accounts', () => {
      it('should get chart of accounts', async () => {
        const response = await request(app)
          .get('/api/v1/financial/accounts')
          .set('x-user-id', testUser.id)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe('POST /api/v1/financial/journal-entries', () => {
      it('should create a journal entry', async () => {
        const entryData = {
          entry_date: '2025-01-15',
          description: 'Test entry',
          location_id: testLocation.id,
          lines: [
            { account_id: '1000', debit_amount: 100, credit_amount: 0 },
            { account_id: '4000', debit_amount: 0, credit_amount: 100 }
          ]
        };

        const response = await request(app)
          .post('/api/v1/financial/journal-entries')
          .set('x-user-id', testUser.id)
          .send(entryData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.is_balanced).toBe(true);
      });
    });

    describe('GET /api/v1/financial/reports/trial-balance', () => {
      it('should get trial balance', async () => {
        const response = await request(app)
          .get('/api/v1/financial/reports/trial-balance')
          .set('x-user-id', testUser.id)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });
  });

  // ==========================================
  // PHASE 21: MARKETING AUTOMATION
  // ==========================================

  describe('Phase 21: Marketing Automation API', () => {
    describe('POST /api/v1/marketing/segments', () => {
      it('should create a customer segment', async () => {
        const segmentData = {
          segment_name: 'VIP Customers',
          location_id: testLocation.id,
          segment_type: 'static',
          criteria: { total_spent_min: 1000 }
        };

        const response = await request(app)
          .post('/api/v1/marketing/segments')
          .set('x-user-id', testUser.id)
          .send(segmentData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.segment_name).toBe('VIP Customers');
      });
    });

    describe('POST /api/v1/marketing/campaigns', () => {
      it('should create a campaign', async () => {
        await pool.query(`
          INSERT INTO customer_segments (id, segment_name, location_id, criteria)
          VALUES ('seg1', 'Test Segment', $1, '{}')
        `, [testLocation.id]);

        const campaignData = {
          campaign_name: 'Spring Sale',
          campaign_type: 'email',
          segment_id: 'seg1',
          subject_line: 'Save 20%!'
        };

        const response = await request(app)
          .post('/api/v1/marketing/campaigns')
          .set('x-user-id', testUser.id)
          .send(campaignData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.campaign_name).toBe('Spring Sale');
      });
    });

    describe('POST /api/v1/marketing/promotions', () => {
      it('should create a promotion', async () => {
        const promoData = {
          promotion_code: 'SAVE20',
          promotion_name: '20% Off',
          promotion_type: 'percentage_off',
          discount_percentage: 20.00,
          location_id: testLocation.id,
          valid_from: '2025-01-01',
          valid_until: '2025-12-31'
        };

        const response = await request(app)
          .post('/api/v1/marketing/promotions')
          .set('x-user-id', testUser.id)
          .send(promoData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.promotion_code).toBe('SAVE20');
      });
    });
  });

  // ==========================================
  // PHASE 22: FRANCHISE MANAGEMENT
  // ==========================================

  describe('Phase 22: Franchise Management API', () => {
    let testBrand;

    beforeEach(async () => {
      const result = await pool.query(`
        INSERT INTO brands (id, brand_name, brand_code)
        VALUES ('brand1', 'PattyShack', 'PS')
        RETURNING *
      `);
      testBrand = result.rows[0];
    });

    describe('POST /api/v1/franchise/brands', () => {
      it('should create a brand', async () => {
        const brandData = {
          brand_name: 'Burger Palace',
          brand_code: 'BP',
          description: 'Premium burgers'
        };

        const response = await request(app)
          .post('/api/v1/franchise/brands')
          .set('x-user-id', testUser.id)
          .send(brandData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.brand_name).toBe('Burger Palace');
      });
    });

    describe('POST /api/v1/franchise/agreements', () => {
      it('should create a franchise agreement', async () => {
        const agreementData = {
          brand_id: testBrand.id,
          franchisee_name: 'John Smith',
          agreement_number: 'FA-2025-001',
          start_date: '2025-01-01',
          term_years: 10,
          ongoing_royalty_percentage: 6.00,
          marketing_fee_percentage: 2.00
        };

        const response = await request(app)
          .post('/api/v1/franchise/agreements')
          .set('x-user-id', testUser.id)
          .send(agreementData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.franchisee_name).toBe('John Smith');
      });
    });

    describe('POST /api/v1/franchise/royalties/calculate', () => {
      it('should calculate royalty', async () => {
        await pool.query(`
          INSERT INTO franchise_agreements (
            id, brand_id, franchisee_name, agreement_number,
            start_date, term_years, ongoing_royalty_percentage,
            marketing_fee_percentage, agreement_status
          )
          VALUES ('agr1', $1, 'Test', 'FA-001', CURRENT_DATE, 10, 6.00, 2.00, 'active')
        `, [testBrand.id]);

        const response = await request(app)
          .post('/api/v1/franchise/royalties/calculate')
          .set('x-user-id', testUser.id)
          .send({
            agreement_id: 'agr1',
            location_id: testLocation.id,
            period_start: '2025-01-01',
            period_end: '2025-01-31',
            gross_sales: 10000.00
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.royalty).toBe(600.00);
      });
    });

    describe('POST /api/v1/franchise/support-tickets', () => {
      it('should create a support ticket', async () => {
        await pool.query(`
          INSERT INTO franchise_agreements (
            id, brand_id, franchisee_name, agreement_number,
            start_date, term_years, ongoing_royalty_percentage,
            marketing_fee_percentage, agreement_status
          )
          VALUES ('agr1', $1, 'Test', 'FA-001', CURRENT_DATE, 10, 6.00, 2.00, 'active')
        `, [testBrand.id]);

        const ticketData = {
          franchise_agreement_id: 'agr1',
          location_id: testLocation.id,
          category: 'it',
          priority: 'high',
          subject: 'POS issue',
          description: 'System crashed'
        };

        const response = await request(app)
          .post('/api/v1/franchise/support-tickets')
          .set('x-user-id', testUser.id)
          .send(ticketData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.subject).toBe('POS issue');
      });
    });
  });
});
