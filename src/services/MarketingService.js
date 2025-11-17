/**
 * Marketing Automation Service
 * Phase 21
 *
 * Handles campaigns, segmentation, workflows, and promotions
 */

const { pool } = require('../database/pool');

class MarketingService {
  // ============================================
  // CUSTOMER SEGMENTATION
  // ============================================

  async createSegment(segmentData, userId) {
    const result = await pool.query(
      `INSERT INTO customer_segments (
        segment_name, description, location_id, segment_type,
        criteria, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        segmentData.segment_name,
        segmentData.description,
        segmentData.location_id,
        segmentData.segment_type || 'static',
        JSON.stringify(segmentData.criteria),
        userId
      ]
    );

    const segment = result.rows[0];

    // Auto-populate if static segment
    if (segmentData.segment_type === 'static' && segmentData.customer_ids) {
      await this.addCustomersToSegment(segment.id, segmentData.customer_ids);
    }

    return segment;
  }

  async addCustomersToSegment(segmentId, customerIds) {
    const values = customerIds.map(customerId => `('${segmentId}', '${customerId}')`).join(',');
    await pool.query(
      `INSERT INTO customer_segment_members (segment_id, customer_id)
       VALUES ${values}
       ON CONFLICT DO NOTHING`
    );

    // Update count
    await pool.query(
      `UPDATE customer_segments
       SET customer_count = (SELECT COUNT(*) FROM customer_segment_members WHERE segment_id = $1)
       WHERE id = $1`,
      [segmentId]
    );
  }

  async getSegmentMembers(segmentId) {
    const result = await pool.query(
      `SELECT
        c.*
      FROM customer_accounts c
      JOIN customer_segment_members csm ON c.id = csm.customer_id
      WHERE csm.segment_id = $1`,
      [segmentId]
    );

    return result.rows;
  }

  // ============================================
  // MARKETING CAMPAIGNS
  // ============================================

  async createCampaign(campaignData, userId) {
    const result = await pool.query(
      `INSERT INTO marketing_campaigns (
        campaign_name, campaign_type, campaign_objective, location_id,
        segment_id, subject_line, preview_text, email_template_id,
        sms_message, scheduled_send_time, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        campaignData.campaign_name,
        campaignData.campaign_type,
        campaignData.campaign_objective,
        campaignData.location_id,
        campaignData.segment_id,
        campaignData.subject_line,
        campaignData.preview_text,
        campaignData.email_template_id,
        campaignData.sms_message,
        campaignData.scheduled_send_time,
        userId
      ]
    );

    return result.rows[0];
  }

  async getCampaignById(campaignId) {
    const result = await pool.query(
      'SELECT * FROM marketing_campaigns WHERE id = $1',
      [campaignId]
    );

    return result.rows[0];
  }

  async getCampaigns(filters = {}) {
    let query = 'SELECT * FROM marketing_campaigns WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (filters.location_id) {
      query += ` AND location_id = $${paramCount}`;
      values.push(filters.location_id);
      paramCount++;
    }

    if (filters.campaign_type) {
      query += ` AND campaign_type = $${paramCount}`;
      values.push(filters.campaign_type);
      paramCount++;
    }

    if (filters.status) {
      query += ` AND status = $${paramCount}`;
      values.push(filters.status);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, values);
    return result.rows;
  }

  async sendCampaign(campaignId) {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Get segment members
    const members = await this.getSegmentMembers(campaign.segment_id);

    // Create messages for each recipient
    for (const customer of members) {
      await pool.query(
        `INSERT INTO campaign_messages (
          campaign_id, customer_id, message_type,
          recipient_email, recipient_phone, message_content, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
        [
          campaignId,
          customer.id,
          campaign.campaign_type,
          customer.email,
          customer.phone,
          campaign.campaign_type === 'email' ? campaign.subject_line : campaign.sms_message
        ]
      );
    }

    // Update campaign
    await pool.query(
      `UPDATE marketing_campaigns
       SET status = 'running', send_time = NOW(), total_recipients = $1
       WHERE id = $2`,
      [members.length, campaignId]
    );

    return { campaign, recipients: members.length };
  }

  async getCampaignPerformance(campaignId = null) {
    let query = 'SELECT * FROM campaign_performance';
    const values = [];

    if (campaignId) {
      query += ' WHERE id = $1';
      values.push(campaignId);
    }

    const result = await pool.query(query, values);
    return campaignId ? result.rows[0] : result.rows;
  }

  // ============================================
  // EMAIL TEMPLATES
  // ============================================

  async createEmailTemplate(templateData, userId) {
    const result = await pool.query(
      `INSERT INTO email_templates (
        template_name, template_category, subject_line, preview_text,
        html_content, text_content, design_json, variables, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        templateData.template_name,
        templateData.template_category,
        templateData.subject_line,
        templateData.preview_text,
        templateData.html_content,
        templateData.text_content,
        JSON.stringify(templateData.design_json || {}),
        JSON.stringify(templateData.variables || []),
        userId
      ]
    );

    return result.rows[0];
  }

  async getEmailTemplates(category = null) {
    let query = 'SELECT * FROM email_templates WHERE is_active = TRUE';
    const values = [];

    if (category) {
      query += ' AND template_category = $1';
      values.push(category);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, values);
    return result.rows;
  }

  // ============================================
  // PROMOTIONS
  // ============================================

  async createPromotion(promotionData, userId) {
    const result = await pool.query(
      `INSERT INTO promotions (
        promotion_code, promotion_name, description, promotion_type,
        discount_percentage, discount_amount, free_item_id,
        minimum_purchase_amount, location_id, max_uses,
        max_uses_per_customer, valid_from, valid_until, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        promotionData.promotion_code,
        promotionData.promotion_name,
        promotionData.description,
        promotionData.promotion_type,
        promotionData.discount_percentage,
        promotionData.discount_amount,
        promotionData.free_item_id,
        promotionData.minimum_purchase_amount,
        promotionData.location_id,
        promotionData.max_uses,
        promotionData.max_uses_per_customer || 1,
        promotionData.valid_from,
        promotionData.valid_until,
        userId
      ]
    );

    return result.rows[0];
  }

  async validatePromotion(promotionCode, customerId, orderAmount) {
    const result = await pool.query(
      `SELECT * FROM promotions
       WHERE promotion_code = $1
         AND is_active = TRUE
         AND valid_from <= NOW()
         AND valid_until >= NOW()`,
      [promotionCode]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid or expired promotion code');
    }

    const promo = result.rows[0];

    // Check minimum purchase
    if (promo.minimum_purchase_amount && orderAmount < promo.minimum_purchase_amount) {
      throw new Error(`Minimum purchase of $${promo.minimum_purchase_amount} required`);
    }

    // Check max uses
    if (promo.max_uses && promo.current_uses >= promo.max_uses) {
      throw new Error('Promotion has reached maximum uses');
    }

    // Check customer usage
    const usageResult = await pool.query(
      'SELECT COUNT(*) as usage_count FROM promotion_redemptions WHERE promotion_id = $1 AND customer_id = $2',
      [promo.id, customerId]
    );

    if (usageResult.rows[0].usage_count >= promo.max_uses_per_customer) {
      throw new Error('You have already used this promotion the maximum number of times');
    }

    return promo;
  }

  async redeemPromotion(promotionId, customerId, orderId, discountApplied) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO promotion_redemptions (promotion_id, customer_id, order_id, discount_applied)
         VALUES ($1, $2, $3, $4)`,
        [promotionId, customerId, orderId, discountApplied]
      );

      await client.query(
        'UPDATE promotions SET current_uses = current_uses + 1 WHERE id = $1',
        [promotionId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================
  // GIFT CARDS
  // ============================================

  async createGiftCard(giftCardData) {
    const cardNumber = this.generateGiftCardNumber();
    const cardPin = Math.floor(1000 + Math.random() * 9000).toString();

    const result = await pool.query(
      `INSERT INTO gift_cards (
        card_number, card_pin, initial_balance, current_balance,
        purchased_by_customer_id, recipient_name, recipient_email,
        recipient_phone, personal_message, location_id, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        cardNumber,
        cardPin,
        giftCardData.amount,
        giftCardData.amount,
        giftCardData.purchased_by_customer_id,
        giftCardData.recipient_name,
        giftCardData.recipient_email,
        giftCardData.recipient_phone,
        giftCardData.personal_message,
        giftCardData.location_id,
        giftCardData.expires_at || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
      ]
    );

    return result.rows[0];
  }

  generateGiftCardNumber() {
    return 'GC' + Math.random().toString(36).substring(2, 15).toUpperCase();
  }

  async getGiftCardBalance(cardNumber) {
    const result = await pool.query(
      'SELECT * FROM gift_cards WHERE card_number = $1 AND status = $2',
      [cardNumber, 'active']
    );

    return result.rows[0];
  }

  // ============================================
  // REFERRAL PROGRAM
  // ============================================

  async createReferral(programId, referrerCustomerId) {
    const result = await pool.query(
      `INSERT INTO referrals (program_id, referrer_customer_id)
       VALUES ($1, $2)
       RETURNING *`,
      [programId, referrerCustomerId]
    );

    return result.rows[0];
  }

  async completeReferral(referralCode, refereeCustomerId, orderId) {
    const result = await pool.query(
      `UPDATE referrals
       SET referee_customer_id = $1, referee_order_id = $2,
           status = 'completed', completed_at = NOW()
       WHERE referral_code = $3
       RETURNING *`,
      [refereeCustomerId, orderId, referralCode]
    );

    return result.rows[0];
  }

  // ============================================
  // CUSTOMER ENGAGEMENT
  // ============================================

  async getCustomerEngagementScores(limit = 100) {
    const result = await pool.query(
      `SELECT * FROM customer_engagement_score
       ORDER BY engagement_score DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  }
}

module.exports = new MarketingService();
