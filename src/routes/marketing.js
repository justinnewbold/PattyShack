/**
 * Marketing Automation API Routes
 * Phase 21
 *
 * Endpoints for campaigns, segmentation, promotions, and engagement
 */

const express = require('express');
const router = express.Router();
const MarketingService = require('../services/MarketingService');

// Middleware
const authenticate = (req, res, next) => {
  req.user = { id: req.headers['x-user-id'] || 'system' };
  next();
};

// ============================================
// CUSTOMER SEGMENTATION
// ============================================

/**
 * POST /api/marketing/segments
 * Create customer segment
 */
router.post('/segments', authenticate, async (req, res) => {
  try {
    const segment = await MarketingService.createSegment(req.body, req.user.id);
    res.status(201).json({ success: true, data: segment });
  } catch (error) {
    console.error('[Marketing API] Error creating segment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/marketing/segments/:id/members
 * Get segment members
 */
router.get('/segments/:id/members', authenticate, async (req, res) => {
  try {
    const members = await MarketingService.getSegmentMembers(req.params.id);
    res.json({ success: true, data: members });
  } catch (error) {
    console.error('[Marketing API] Error getting segment members:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/marketing/segments/:id/members
 * Add customers to segment
 */
router.post('/segments/:id/members', authenticate, async (req, res) => {
  try {
    const { customer_ids } = req.body;
    await MarketingService.addCustomersToSegment(req.params.id, customer_ids);
    res.json({ success: true, message: 'Customers added to segment' });
  } catch (error) {
    console.error('[Marketing API] Error adding customers to segment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// CAMPAIGNS
// ============================================

/**
 * POST /api/marketing/campaigns
 * Create campaign
 */
router.post('/campaigns', authenticate, async (req, res) => {
  try {
    const campaign = await MarketingService.createCampaign(req.body, req.user.id);
    res.status(201).json({ success: true, data: campaign });
  } catch (error) {
    console.error('[Marketing API] Error creating campaign:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/marketing/campaigns
 * Get campaigns
 */
router.get('/campaigns', authenticate, async (req, res) => {
  try {
    const campaigns = await MarketingService.getCampaigns(req.query);
    res.json({ success: true, data: campaigns });
  } catch (error) {
    console.error('[Marketing API] Error getting campaigns:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/marketing/campaigns/:id
 * Get campaign by ID
 */
router.get('/campaigns/:id', authenticate, async (req, res) => {
  try {
    const campaign = await MarketingService.getCampaignById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    res.json({ success: true, data: campaign });
  } catch (error) {
    console.error('[Marketing API] Error getting campaign:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/marketing/campaigns/:id/send
 * Send campaign
 */
router.post('/campaigns/:id/send', authenticate, async (req, res) => {
  try {
    const result = await MarketingService.sendCampaign(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Marketing API] Error sending campaign:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/marketing/campaigns/:id/performance
 * Get campaign performance
 */
router.get('/campaigns/:id/performance', authenticate, async (req, res) => {
  try {
    const performance = await MarketingService.getCampaignPerformance(req.params.id);
    res.json({ success: true, data: performance });
  } catch (error) {
    console.error('[Marketing API] Error getting campaign performance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// EMAIL TEMPLATES
// ============================================

/**
 * POST /api/marketing/email-templates
 * Create email template
 */
router.post('/email-templates', authenticate, async (req, res) => {
  try {
    const template = await MarketingService.createEmailTemplate(req.body, req.user.id);
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    console.error('[Marketing API] Error creating template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/marketing/email-templates
 * Get email templates
 */
router.get('/email-templates', authenticate, async (req, res) => {
  try {
    const templates = await MarketingService.getEmailTemplates(req.query.category);
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('[Marketing API] Error getting templates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// PROMOTIONS
// ============================================

/**
 * POST /api/marketing/promotions
 * Create promotion
 */
router.post('/promotions', authenticate, async (req, res) => {
  try {
    const promotion = await MarketingService.createPromotion(req.body, req.user.id);
    res.status(201).json({ success: true, data: promotion });
  } catch (error) {
    console.error('[Marketing API] Error creating promotion:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/marketing/promotions/validate
 * Validate promotion code
 */
router.post('/promotions/validate', async (req, res) => {
  try {
    const { promotion_code, customer_id, order_amount } = req.body;
    const promotion = await MarketingService.validatePromotion(
      promotion_code,
      customer_id,
      order_amount
    );
    res.json({ success: true, data: promotion });
  } catch (error) {
    console.error('[Marketing API] Error validating promotion:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/marketing/promotions/:id/redeem
 * Redeem promotion
 */
router.post('/promotions/:id/redeem', async (req, res) => {
  try {
    const { customer_id, order_id, discount_applied } = req.body;
    await MarketingService.redeemPromotion(req.params.id, customer_id, order_id, discount_applied);
    res.json({ success: true, message: 'Promotion redeemed successfully' });
  } catch (error) {
    console.error('[Marketing API] Error redeeming promotion:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// GIFT CARDS
// ============================================

/**
 * POST /api/marketing/gift-cards
 * Create gift card
 */
router.post('/gift-cards', async (req, res) => {
  try {
    const giftCard = await MarketingService.createGiftCard(req.body);
    res.status(201).json({ success: true, data: giftCard });
  } catch (error) {
    console.error('[Marketing API] Error creating gift card:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/marketing/gift-cards/:cardNumber/balance
 * Get gift card balance
 */
router.get('/gift-cards/:cardNumber/balance', async (req, res) => {
  try {
    const giftCard = await MarketingService.getGiftCardBalance(req.params.cardNumber);
    if (!giftCard) {
      return res.status(404).json({ success: false, error: 'Gift card not found or inactive' });
    }
    res.json({ success: true, data: { balance: giftCard.current_balance } });
  } catch (error) {
    console.error('[Marketing API] Error getting gift card balance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// REFERRAL PROGRAM
// ============================================

/**
 * POST /api/marketing/referrals
 * Create referral
 */
router.post('/referrals', async (req, res) => {
  try {
    const { program_id, referrer_customer_id } = req.body;
    const referral = await MarketingService.createReferral(program_id, referrer_customer_id);
    res.status(201).json({ success: true, data: referral });
  } catch (error) {
    console.error('[Marketing API] Error creating referral:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/marketing/referrals/complete
 * Complete referral
 */
router.post('/referrals/complete', async (req, res) => {
  try {
    const { referral_code, referee_customer_id, order_id } = req.body;
    const referral = await MarketingService.completeReferral(
      referral_code,
      referee_customer_id,
      order_id
    );
    res.json({ success: true, data: referral });
  } catch (error) {
    console.error('[Marketing API] Error completing referral:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// CUSTOMER ENGAGEMENT
// ============================================

/**
 * GET /api/marketing/engagement/scores
 * Get customer engagement scores
 */
router.get('/engagement/scores', authenticate, async (req, res) => {
  try {
    const limit = req.query.limit || 100;
    const scores = await MarketingService.getCustomerEngagementScores(limit);
    res.json({ success: true, data: scores });
  } catch (error) {
    console.error('[Marketing API] Error getting engagement scores:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
