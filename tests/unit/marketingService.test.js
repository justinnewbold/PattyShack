/**
 * MarketingService Unit Tests
 * Tests business logic for campaigns, segmentation, and promotions
 */

const MarketingService = require('../../src/services/MarketingService');
const {
  setupTestDatabase,
  clearTestDatabase,
  teardownTestDatabase,
  createTestLocation,
  createTestUser,
  getTestPool
} = require('../helpers/testDb');
const { initializePool } = require('../../src/database/pool');

describe('MarketingService', () => {
  let testLocation;
  let testUser;
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
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('Customer Segmentation', () => {
    it('should create a customer segment', async () => {
      const segmentData = {
        segment_name: 'VIP Customers',
        description: 'High value customers',
        location_id: testLocation.id,
        segment_type: 'static',
        criteria: { total_spent_min: 1000 }
      };

      const segment = await MarketingService.createSegment(segmentData, testUser.id);

      expect(segment).toBeDefined();
      expect(segment.segment_name).toBe('VIP Customers');
      expect(segment.segment_type).toBe('static');
    });

    it('should add customers to segment', async () => {
      await pool.query(`
        INSERT INTO customer_accounts (id, email, password_hash, first_name, last_name)
        VALUES
          ('cust1', 'cust1@test.com', 'hash', 'John', 'Doe'),
          ('cust2', 'cust2@test.com', 'hash', 'Jane', 'Smith')
      `);

      await pool.query(`
        INSERT INTO customer_segments (id, segment_name, location_id, criteria)
        VALUES ('seg1', 'VIP', $1, '{}')
      `, [testLocation.id]);

      await MarketingService.addCustomersToSegment('seg1', ['cust1', 'cust2']);

      const members = await MarketingService.getSegmentMembers('seg1');
      expect(members).toHaveLength(2);
    });
  });

  describe('Marketing Campaigns', () => {
    let testSegment;

    beforeEach(async () => {
      const result = await pool.query(`
        INSERT INTO customer_segments (id, segment_name, location_id, criteria)
        VALUES ('seg1', 'All Customers', $1, '{}')
        RETURNING *
      `, [testLocation.id]);
      testSegment = result.rows[0];
    });

    it('should create an email campaign', async () => {
      const campaignData = {
        campaign_name: 'Spring Sale',
        campaign_type: 'email',
        campaign_objective: 'conversion',
        location_id: testLocation.id,
        segment_id: testSegment.id,
        subject_line: 'Save 20% this weekend!',
        preview_text: 'Limited time offer'
      };

      const campaign = await MarketingService.createCampaign(campaignData, testUser.id);

      expect(campaign).toBeDefined();
      expect(campaign.campaign_name).toBe('Spring Sale');
      expect(campaign.campaign_type).toBe('email');
    });

    it('should send campaign to segment members', async () => {
      await pool.query(`
        INSERT INTO customer_accounts (id, email, password_hash, first_name, last_name)
        VALUES ('cust1', 'customer@test.com', 'hash', 'John', 'Doe')
      `);

      await pool.query(`
        INSERT INTO customer_segment_members (segment_id, customer_id)
        VALUES ($1, 'cust1')
      `, [testSegment.id]);

      await pool.query(`
        INSERT INTO marketing_campaigns (id, campaign_name, campaign_type, segment_id, subject_line, status)
        VALUES ('camp1', 'Test Campaign', 'email', $1, 'Test Subject', 'draft')
      `, [testSegment.id]);

      const result = await MarketingService.sendCampaign('camp1');

      expect(result.recipients).toBe(1);
    });

    it('should get campaign performance', async () => {
      await pool.query(`
        INSERT INTO marketing_campaigns (
          id, campaign_name, campaign_type, status,
          total_recipients, total_sent, total_delivered, total_opened, total_clicked
        )
        VALUES ('camp1', 'Test Campaign', 'email', 'completed', 100, 100, 98, 45, 12)
      `);

      const performance = await MarketingService.getCampaignPerformance('camp1');

      expect(performance).toBeDefined();
      expect(performance.total_recipients).toBe(100);
      expect(parseFloat(performance.open_rate)).toBeCloseTo(45.92, 1);
      expect(parseFloat(performance.click_rate)).toBeCloseTo(12.24, 1);
    });
  });

  describe('Email Templates', () => {
    it('should create an email template', async () => {
      const templateData = {
        template_name: 'Welcome Email',
        template_category: 'transactional',
        subject_line: 'Welcome to PattyShack!',
        html_content: '<h1>Welcome!</h1>',
        text_content: 'Welcome!',
        variables: ['customer_name', 'location_name']
      };

      const template = await MarketingService.createEmailTemplate(templateData, testUser.id);

      expect(template).toBeDefined();
      expect(template.template_name).toBe('Welcome Email');
      expect(template.template_category).toBe('transactional');
    });

    it('should get templates by category', async () => {
      await pool.query(`
        INSERT INTO email_templates (id, template_name, template_category, is_active)
        VALUES
          ('tmpl1', 'Promo 1', 'promotional', true),
          ('tmpl2', 'Promo 2', 'promotional', true),
          ('tmpl3', 'Welcome', 'transactional', true)
      `);

      const templates = await MarketingService.getEmailTemplates('promotional');

      expect(templates).toHaveLength(2);
      templates.forEach(t => expect(t.template_category).toBe('promotional'));
    });
  });

  describe('Promotions', () => {
    it('should create a promotion', async () => {
      const promoData = {
        promotion_code: 'SAVE20',
        promotion_name: '20% Off Sale',
        promotion_type: 'percentage_off',
        discount_percentage: 20.00,
        location_id: testLocation.id,
        max_uses: 100,
        valid_from: '2025-01-01',
        valid_until: '2025-12-31'
      };

      const promo = await MarketingService.createPromotion(promoData, testUser.id);

      expect(promo).toBeDefined();
      expect(promo.promotion_code).toBe('SAVE20');
      expect(parseFloat(promo.discount_percentage)).toBe(20.00);
    });

    it('should validate promotion code', async () => {
      await pool.query(`
        INSERT INTO promotions (
          id, promotion_code, promotion_name, promotion_type,
          discount_percentage, location_id, max_uses, current_uses,
          valid_from, valid_until, is_active
        )
        VALUES (
          'promo1', 'SAVE10', '10% Off', 'percentage_off',
          10.00, $1, 100, 0, CURRENT_DATE - INTERVAL '1 day',
          CURRENT_DATE + INTERVAL '30 days', true
        )
      `, [testLocation.id]);

      await pool.query(`
        INSERT INTO customer_accounts (id, email, password_hash, first_name, last_name)
        VALUES ('cust1', 'customer@test.com', 'hash', 'John', 'Doe')
      `);

      const promo = await MarketingService.validatePromotion('SAVE10', 'cust1', 50.00);

      expect(promo).toBeDefined();
      expect(promo.promotion_code).toBe('SAVE10');
    });

    it('should reject expired promotion', async () => {
      await pool.query(`
        INSERT INTO promotions (
          id, promotion_code, promotion_name, promotion_type,
          discount_percentage, location_id, max_uses,
          valid_from, valid_until, is_active
        )
        VALUES (
          'promo1', 'EXPIRED', 'Old Promo', 'percentage_off',
          10.00, $1, 100,
          CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE - INTERVAL '30 days', true
        )
      `, [testLocation.id]);

      await pool.query(`
        INSERT INTO customer_accounts (id, email, password_hash, first_name, last_name)
        VALUES ('cust1', 'customer@test.com', 'hash', 'John', 'Doe')
      `);

      await expect(
        MarketingService.validatePromotion('EXPIRED', 'cust1', 50.00)
      ).rejects.toThrow();
    });

    it('should redeem promotion', async () => {
      await pool.query(`
        INSERT INTO promotions (
          id, promotion_code, promotion_name, promotion_type,
          discount_percentage, location_id, max_uses, current_uses,
          valid_from, valid_until, is_active
        )
        VALUES (
          'promo1', 'SAVE10', '10% Off', 'percentage_off',
          10.00, $1, 100, 0, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', true
        )
      `, [testLocation.id]);

      await pool.query(`
        INSERT INTO customer_accounts (id, email, password_hash, first_name, last_name)
        VALUES ('cust1', 'customer@test.com', 'hash', 'John', 'Doe')
      `);

      await MarketingService.redeemPromotion('promo1', 'cust1', 'order1', 5.00);

      const promo = await pool.query('SELECT current_uses FROM promotions WHERE id = $1', ['promo1']);
      expect(promo.rows[0].current_uses).toBe(1);
    });
  });

  describe('Gift Cards', () => {
    it('should create a gift card', async () => {
      await pool.query(`
        INSERT INTO customer_accounts (id, email, password_hash, first_name, last_name)
        VALUES ('cust1', 'customer@test.com', 'hash', 'John', 'Doe')
      `);

      const giftCardData = {
        amount: 50.00,
        purchased_by_customer_id: 'cust1',
        recipient_name: 'Jane Doe',
        recipient_email: 'jane@test.com',
        location_id: testLocation.id
      };

      const giftCard = await MarketingService.createGiftCard(giftCardData);

      expect(giftCard).toBeDefined();
      expect(parseFloat(giftCard.initial_balance)).toBe(50.00);
      expect(parseFloat(giftCard.current_balance)).toBe(50.00);
      expect(giftCard.card_number).toBeDefined();
    });

    it('should get gift card balance', async () => {
      await pool.query(`
        INSERT INTO gift_cards (id, card_number, card_pin, initial_balance, current_balance, status)
        VALUES ('gc1', 'GCTEST123', '1234', 100.00, 75.00, 'active')
      `);

      const giftCard = await MarketingService.getGiftCardBalance('GCTEST123');

      expect(giftCard).toBeDefined();
      expect(parseFloat(giftCard.current_balance)).toBe(75.00);
    });
  });

  describe('Referral Program', () => {
    it('should create a referral', async () => {
      await pool.query(`
        INSERT INTO customer_accounts (id, email, password_hash, first_name, last_name)
        VALUES ('cust1', 'customer@test.com', 'hash', 'John', 'Doe')
      `);

      await pool.query(`
        INSERT INTO referral_programs (id, program_name, location_id, is_active)
        VALUES ('prog1', 'Refer a Friend', $1, true)
      `, [testLocation.id]);

      const referral = await MarketingService.createReferral('prog1', 'cust1');

      expect(referral).toBeDefined();
      expect(referral.referral_code).toBeDefined();
      expect(referral.status).toBe('pending');
    });

    it('should complete referral', async () => {
      await pool.query(`
        INSERT INTO customer_accounts (id, email, password_hash, first_name, last_name)
        VALUES
          ('cust1', 'referrer@test.com', 'hash', 'John', 'Doe'),
          ('cust2', 'referee@test.com', 'hash', 'Jane', 'Smith')
      `);

      await pool.query(`
        INSERT INTO referral_programs (id, program_name, location_id, is_active)
        VALUES ('prog1', 'Refer a Friend', $1, true)
      `, [testLocation.id]);

      await pool.query(`
        INSERT INTO referrals (id, program_id, referrer_customer_id, referral_code, status)
        VALUES ('ref1', 'prog1', 'cust1', 'REFCODE123', 'pending')
      `);

      const completed = await MarketingService.completeReferral('REFCODE123', 'cust2', 'order1');

      expect(completed.status).toBe('completed');
      expect(completed.referee_customer_id).toBe('cust2');
    });
  });

  describe('Customer Engagement', () => {
    it('should get customer engagement scores', async () => {
      await pool.query(`
        INSERT INTO customer_accounts (id, email, password_hash, first_name, last_name, loyalty_points, total_spent)
        VALUES
          ('cust1', 'cust1@test.com', 'hash', 'John', 'Doe', 500, 1000.00),
          ('cust2', 'cust2@test.com', 'hash', 'Jane', 'Smith', 1000, 2500.00)
      `);

      const scores = await MarketingService.getCustomerEngagementScores(10);

      expect(scores.length).toBeGreaterThan(0);
    });
  });
});
