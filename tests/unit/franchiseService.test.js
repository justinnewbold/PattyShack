/**
 * FranchiseService Unit Tests
 * Tests business logic for franchise operations, royalties, and compliance
 */

const FranchiseService = require('../../src/services/FranchiseService');
const {
  setupTestDatabase,
  clearTestDatabase,
  teardownTestDatabase,
  createTestLocation,
  createTestUser,
  getTestPool
} = require('../helpers/testDb');
const { initializePool } = require('../../src/database/pool');

describe('FranchiseService', () => {
  let testLocation;
  let testUser;
  let pool;
  let testBrand;

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

    // Create test brand
    const brandResult = await pool.query(`
      INSERT INTO brands (id, brand_name, brand_code, is_active)
      VALUES ('brand1', 'PattyShack', 'PS', true)
      RETURNING *
    `);
    testBrand = brandResult.rows[0];
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('Brands', () => {
    it('should create a brand', async () => {
      const brandData = {
        brand_name: 'Burger Palace',
        brand_code: 'BP',
        description: 'Premium burger concept',
        primary_color: '#FF0000',
        secondary_color: '#0000FF'
      };

      const brand = await FranchiseService.createBrand(brandData, testUser.id);

      expect(brand).toBeDefined();
      expect(brand.brand_name).toBe('Burger Palace');
      expect(brand.brand_code).toBe('BP');
    });

    it('should get all active brands', async () => {
      const brands = await FranchiseService.getBrands();

      expect(brands.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Franchise Agreements', () => {
    it('should create a franchise agreement', async () => {
      const agreementData = {
        brand_id: testBrand.id,
        franchisee_name: 'John Smith',
        franchisee_company: 'Smith Restaurants LLC',
        franchisee_email: 'john@smithrest.com',
        franchisee_phone: '555-1234',
        agreement_number: 'FA-2025-001',
        territory: 'Downtown District',
        start_date: '2025-01-01',
        term_years: 10,
        initial_franchise_fee: 50000.00,
        ongoing_royalty_percentage: 6.00,
        marketing_fee_percentage: 2.00,
        minimum_royalty_monthly: 500.00
      };

      const agreement = await FranchiseService.createFranchiseAgreement(agreementData, testUser.id);

      expect(agreement).toBeDefined();
      expect(agreement.franchisee_name).toBe('John Smith');
      expect(parseFloat(agreement.ongoing_royalty_percentage)).toBe(6.00);
    });

    it('should get franchise agreements by brand', async () => {
      await pool.query(`
        INSERT INTO franchise_agreements (
          id, brand_id, franchisee_name, agreement_number,
          start_date, term_years, ongoing_royalty_percentage,
          marketing_fee_percentage, agreement_status
        )
        VALUES
          ('agr1', $1, 'Franchisee A', 'FA-001', CURRENT_DATE, 10, 6.00, 2.00, 'active'),
          ('agr2', $1, 'Franchisee B', 'FA-002', CURRENT_DATE, 10, 6.00, 2.00, 'active')
      `, [testBrand.id]);

      const agreements = await FranchiseService.getFranchiseAgreements({ brand_id: testBrand.id });

      expect(agreements).toHaveLength(2);
    });
  });

  describe('Royalty Calculations', () => {
    let testAgreement;

    beforeEach(async () => {
      const result = await pool.query(`
        INSERT INTO franchise_agreements (
          id, brand_id, franchisee_name, agreement_number,
          start_date, term_years, ongoing_royalty_percentage,
          marketing_fee_percentage, minimum_royalty_monthly, agreement_status
        )
        VALUES (
          'agr1', $1, 'Test Franchisee', 'FA-001',
          CURRENT_DATE, 10, 6.00, 2.00, 500.00, 'active'
        )
        RETURNING *
      `, [testBrand.id]);
      testAgreement = result.rows[0];
    });

    it('should calculate royalty based on sales', async () => {
      const royalty = await FranchiseService.calculateRoyalty(
        testAgreement.id,
        testLocation.id,
        '2025-01-01',
        '2025-01-31',
        10000.00
      );

      // 10000 * 0.06 = 600
      expect(parseFloat(royalty)).toBe(600.00);
    });

    it('should apply minimum royalty when calculated is below minimum', async () => {
      const royalty = await FranchiseService.calculateRoyalty(
        testAgreement.id,
        testLocation.id,
        '2025-01-01',
        '2025-01-31',
        5000.00
      );

      // 5000 * 0.06 = 300, but minimum is 500
      expect(parseFloat(royalty)).toBe(500.00);
    });

    it('should get royalty payment status', async () => {
      await pool.query(`
        INSERT INTO royalty_calculations (
          id, franchise_agreement_id, location_id,
          calculation_period_start, calculation_period_end,
          gross_sales, royalty_percentage, calculated_royalty,
          final_royalty, total_fees, payment_status, payment_due_date
        )
        VALUES (
          'roy1', $1, $2, '2025-01-01', '2025-01-31',
          10000, 6.00, 600, 600, 800, 'unpaid', CURRENT_DATE + INTERVAL '15 days'
        )
      `, [testAgreement.id, testLocation.id]);

      const status = await FranchiseService.getRoyaltyPaymentStatus();

      expect(status.length).toBeGreaterThan(0);
    });

    it('should mark royalty as paid', async () => {
      await pool.query(`
        INSERT INTO royalty_calculations (
          id, franchise_agreement_id, location_id,
          calculation_period_start, calculation_period_end,
          gross_sales, royalty_percentage, calculated_royalty,
          final_royalty, total_fees, payment_status
        )
        VALUES (
          'roy1', $1, $2, '2025-01-01', '2025-01-31',
          10000, 6.00, 600, 600, 800, 'pending'
        )
      `, [testAgreement.id, testLocation.id]);

      const updated = await FranchiseService.markRoyaltyPaid('roy1', '2025-02-10');

      expect(updated.payment_status).toBe('paid');
    });
  });

  describe('Brand Standards & Compliance', () => {
    it('should create a brand standard', async () => {
      const standardData = {
        brand_id: testBrand.id,
        standard_name: 'Food Safety Temperature Checks',
        category: 'quality',
        description: 'All food temps must be logged every 2 hours',
        compliance_threshold: 95.00,
        inspection_frequency: 'monthly',
        is_critical: true
      };

      const standard = await FranchiseService.createBrandStandard(standardData, testUser.id);

      expect(standard).toBeDefined();
      expect(standard.standard_name).toBe('Food Safety Temperature Checks');
      expect(standard.is_critical).toBe(true);
    });

    it('should get brand standards', async () => {
      await pool.query(`
        INSERT INTO brand_standards (id, brand_id, standard_name, category, description, is_active)
        VALUES
          ('std1', $1, 'Standard 1', 'operations', 'Test', true),
          ('std2', $1, 'Standard 2', 'quality', 'Test', true)
      `, [testBrand.id]);

      const standards = await FranchiseService.getBrandStandards(testBrand.id);

      expect(standards).toHaveLength(2);
    });
  });

  describe('Franchise Inspections', () => {
    let testAgreement;

    beforeEach(async () => {
      const result = await pool.query(`
        INSERT INTO franchise_agreements (
          id, brand_id, franchisee_name, agreement_number,
          start_date, term_years, ongoing_royalty_percentage,
          marketing_fee_percentage, agreement_status
        )
        VALUES (
          'agr1', $1, 'Test Franchisee', 'FA-001',
          CURRENT_DATE, 10, 6.00, 2.00, 'active'
        )
        RETURNING *
      `, [testBrand.id]);
      testAgreement = result.rows[0];
    });

    it('should create an inspection', async () => {
      const inspectionData = {
        franchise_agreement_id: testAgreement.id,
        location_id: testLocation.id,
        inspection_date: '2025-01-15',
        inspector_name: 'Jane Inspector',
        inspection_type: 'routine',
        overall_score: 92.5,
        passed: true,
        critical_violations: 0,
        minor_violations: 2
      };

      const inspection = await FranchiseService.createInspection(inspectionData, testUser.id);

      expect(inspection).toBeDefined();
      expect(parseFloat(inspection.overall_score)).toBe(92.5);
      expect(inspection.passed).toBe(true);
    });

    it('should create inspection with findings', async () => {
      await pool.query(`
        INSERT INTO brand_standards (id, brand_id, standard_name, category, description)
        VALUES ('std1', $1, 'Cleanliness', 'operations', 'Test')
      `, [testBrand.id]);

      const inspectionData = {
        franchise_agreement_id: testAgreement.id,
        location_id: testLocation.id,
        inspection_date: '2025-01-15',
        inspector_name: 'Jane Inspector',
        inspection_type: 'routine',
        overall_score: 85.0,
        passed: true,
        findings: [
          {
            standard_id: 'std1',
            finding_type: 'violation',
            severity: 'minor',
            description: 'Floor needs mopping',
            corrective_action: 'Clean floor immediately'
          }
        ]
      };

      const inspection = await FranchiseService.createInspection(inspectionData, testUser.id);

      expect(inspection).toBeDefined();
    });

    it('should get inspections for location', async () => {
      await pool.query(`
        INSERT INTO franchise_inspections (
          id, franchise_agreement_id, location_id, inspection_date,
          inspector_name, inspection_type, overall_score, passed
        )
        VALUES
          ('insp1', $1, $2, CURRENT_DATE - INTERVAL '30 days', 'Inspector', 'routine', 90, true),
          ('insp2', $1, $2, CURRENT_DATE, 'Inspector', 'routine', 95, true)
      `, [testAgreement.id, testLocation.id]);

      const inspections = await FranchiseService.getInspections(testLocation.id);

      expect(inspections).toHaveLength(2);
    });
  });

  describe('Franchise Support', () => {
    let testAgreement;

    beforeEach(async () => {
      const result = await pool.query(`
        INSERT INTO franchise_agreements (
          id, brand_id, franchisee_name, agreement_number,
          start_date, term_years, ongoing_royalty_percentage,
          marketing_fee_percentage, agreement_status
        )
        VALUES (
          'agr1', $1, 'Test Franchisee', 'FA-001',
          CURRENT_DATE, 10, 6.00, 2.00, 'active'
        )
        RETURNING *
      `, [testBrand.id]);
      testAgreement = result.rows[0];
    });

    it('should create a support ticket', async () => {
      const ticketData = {
        franchise_agreement_id: testAgreement.id,
        location_id: testLocation.id,
        category: 'it',
        priority: 'high',
        subject: 'POS system not working',
        description: 'POS crashed during lunch rush'
      };

      const ticket = await FranchiseService.createSupportTicket(ticketData, testUser.id);

      expect(ticket).toBeDefined();
      expect(ticket.subject).toBe('POS system not working');
      expect(ticket.priority).toBe('high');
      expect(ticket.ticket_number).toBeDefined();
    });

    it('should get support tickets by status', async () => {
      await pool.query(`
        INSERT INTO franchise_support_tickets (
          id, ticket_number, franchise_agreement_id, location_id,
          category, priority, subject, description, status
        )
        VALUES
          ('tick1', 'TICK001', $1, $2, 'it', 'high', 'Issue 1', 'Desc', 'open'),
          ('tick2', 'TICK002', $1, $2, 'operations', 'medium', 'Issue 2', 'Desc', 'open'),
          ('tick3', 'TICK003', $1, $2, 'it', 'low', 'Issue 3', 'Desc', 'resolved')
      `, [testAgreement.id, testLocation.id]);

      const openTickets = await FranchiseService.getSupportTickets({ status: 'open' });

      expect(openTickets).toHaveLength(2);
    });

    it('should resolve a support ticket', async () => {
      await pool.query(`
        INSERT INTO franchise_support_tickets (
          id, ticket_number, franchise_agreement_id, location_id,
          category, priority, subject, description, status
        )
        VALUES ('tick1', 'TICK001', $1, $2, 'it', 'high', 'Issue', 'Desc', 'open')
      `, [testAgreement.id, testLocation.id]);

      const resolved = await FranchiseService.resolveSupportTicket(
        'tick1',
        'Rebooted POS system, issue resolved',
        testUser.id
      );

      expect(resolved.status).toBe('resolved');
      expect(resolved.resolution_notes).toBe('Rebooted POS system, issue resolved');
    });
  });

  describe('Performance Reporting', () => {
    let testAgreement;

    beforeEach(async () => {
      const result = await pool.query(`
        INSERT INTO franchise_agreements (
          id, brand_id, franchisee_name, agreement_number,
          start_date, term_years, ongoing_royalty_percentage,
          marketing_fee_percentage, agreement_status
        )
        VALUES (
          'agr1', $1, 'Test Franchisee', 'FA-001',
          CURRENT_DATE, 10, 6.00, 2.00, 'active'
        )
        RETURNING *
      `, [testBrand.id]);
      testAgreement = result.rows[0];
    });

    it('should get franchise performance summary', async () => {
      await pool.query(`
        UPDATE locations SET franchise_agreement_id = $1 WHERE id = $2
      `, [testAgreement.id, testLocation.id]);

      const performance = await FranchiseService.getFranchisePerformanceSummary(testAgreement.id);

      expect(performance).toBeDefined();
    });

    it('should get brand performance overview', async () => {
      const performance = await FranchiseService.getBrandPerformanceOverview(testBrand.id);

      expect(performance).toBeDefined();
      expect(performance.brand_name).toBe('PattyShack');
    });
  });
});
