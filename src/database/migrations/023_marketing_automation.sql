/**
 * Migration: Marketing Automation & Customer Engagement
 * Phase 21
 *
 * Features:
 * - Email campaigns
 * - SMS campaigns
 * - Customer segmentation
 * - Automated workflows
 * - Referral programs
 * - Gift cards & promotions
 * - Social media integration
 */

-- ============================================
-- CUSTOMER SEGMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS customer_segments (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('seg_' || gen_random_uuid()::TEXT),
  segment_name VARCHAR(255) NOT NULL,
  description TEXT,
  location_id VARCHAR(255) REFERENCES locations(id),
  segment_type VARCHAR(50) DEFAULT 'static', -- static, dynamic
  criteria JSONB NOT NULL, -- {field, operator, value} rules
  customer_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customer_segments_location ON customer_segments(location_id);
CREATE INDEX idx_customer_segments_type ON customer_segments(segment_type);

CREATE TABLE IF NOT EXISTS customer_segment_members (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('mem_' || gen_random_uuid()::TEXT),
  segment_id VARCHAR(255) REFERENCES customer_segments(id) ON DELETE CASCADE,
  customer_id VARCHAR(255) REFERENCES customer_accounts(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(segment_id, customer_id)
);

CREATE INDEX idx_customer_segment_members_segment ON customer_segment_members(segment_id);
CREATE INDEX idx_customer_segment_members_customer ON customer_segment_members(customer_id);

-- ============================================
-- MARKETING CAMPAIGNS
-- ============================================

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('camp_' || gen_random_uuid()::TEXT),
  campaign_name VARCHAR(255) NOT NULL,
  campaign_type VARCHAR(50) NOT NULL, -- email, sms, push, social
  campaign_objective VARCHAR(100), -- awareness, engagement, conversion, retention
  location_id VARCHAR(255) REFERENCES locations(id),
  segment_id VARCHAR(255) REFERENCES customer_segments(id),
  status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, running, completed, paused, cancelled
  subject_line VARCHAR(255),
  preview_text VARCHAR(255),
  email_template_id VARCHAR(255),
  sms_message TEXT,
  send_from VARCHAR(255),
  send_time TIMESTAMPTZ,
  scheduled_send_time TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_converted INTEGER DEFAULT 0,
  total_bounced INTEGER DEFAULT 0,
  total_unsubscribed INTEGER DEFAULT 0,
  conversion_revenue NUMERIC(10,2) DEFAULT 0,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_marketing_campaigns_location ON marketing_campaigns(location_id);
CREATE INDEX idx_marketing_campaigns_type ON marketing_campaigns(campaign_type);
CREATE INDEX idx_marketing_campaigns_status ON marketing_campaigns(status);

-- ============================================
-- CAMPAIGN MESSAGES
-- ============================================

CREATE TABLE IF NOT EXISTS campaign_messages (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('msg_' || gen_random_uuid()::TEXT),
  campaign_id VARCHAR(255) REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  customer_id VARCHAR(255) REFERENCES customer_accounts(id),
  message_type VARCHAR(50) NOT NULL, -- email, sms
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(20),
  message_content TEXT,
  personalization_data JSONB,
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, delivered, opened, clicked, bounced, failed
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaign_messages_campaign ON campaign_messages(campaign_id);
CREATE INDEX idx_campaign_messages_customer ON campaign_messages(customer_id);
CREATE INDEX idx_campaign_messages_status ON campaign_messages(status);

-- ============================================
-- EMAIL TEMPLATES
-- ============================================

CREATE TABLE IF NOT EXISTS email_templates (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('tmpl_' || gen_random_uuid()::TEXT),
  template_name VARCHAR(255) NOT NULL,
  template_category VARCHAR(100), -- promotional, transactional, newsletter
  subject_line VARCHAR(255),
  preview_text VARCHAR(255),
  html_content TEXT,
  text_content TEXT,
  design_json JSONB, -- for drag-and-drop builders
  thumbnail_url TEXT,
  variables JSONB, -- {{customer_name}}, {{offer_code}}, etc
  is_active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_templates_category ON email_templates(template_category);

-- ============================================
-- AUTOMATED WORKFLOWS
-- ============================================

CREATE TABLE IF NOT EXISTS marketing_workflows (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('wf_' || gen_random_uuid()::TEXT),
  workflow_name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(100) NOT NULL, -- customer_signup, order_placed, cart_abandoned, birthday, anniversary, inactivity
  trigger_criteria JSONB,
  location_id VARCHAR(255) REFERENCES locations(id),
  is_active BOOLEAN DEFAULT TRUE,
  total_triggered INTEGER DEFAULT 0,
  total_completed INTEGER DEFAULT 0,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_marketing_workflows_trigger ON marketing_workflows(trigger_type);
CREATE INDEX idx_marketing_workflows_location ON marketing_workflows(location_id);

CREATE TABLE IF NOT EXISTS workflow_steps (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('step_' || gen_random_uuid()::TEXT),
  workflow_id VARCHAR(255) REFERENCES marketing_workflows(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_type VARCHAR(50) NOT NULL, -- send_email, send_sms, wait, conditional_split, add_to_segment
  delay_amount INTEGER, -- in minutes
  delay_unit VARCHAR(20), -- minutes, hours, days
  action_data JSONB, -- template_id, message, segment_id, etc
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_steps_workflow ON workflow_steps(workflow_id);

CREATE TABLE IF NOT EXISTS workflow_executions (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('exec_' || gen_random_uuid()::TEXT),
  workflow_id VARCHAR(255) REFERENCES marketing_workflows(id),
  customer_id VARCHAR(255) REFERENCES customer_accounts(id),
  current_step_id VARCHAR(255) REFERENCES workflow_steps(id),
  status VARCHAR(50) DEFAULT 'running', -- running, completed, cancelled, failed
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  execution_log JSONB
);

CREATE INDEX idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_customer ON workflow_executions(customer_id);

-- ============================================
-- PROMOTIONS & DISCOUNTS
-- ============================================

CREATE TABLE IF NOT EXISTS promotions (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('promo_' || gen_random_uuid()::TEXT),
  promotion_code VARCHAR(50) UNIQUE NOT NULL,
  promotion_name VARCHAR(255) NOT NULL,
  description TEXT,
  promotion_type VARCHAR(50) NOT NULL, -- percentage_off, fixed_amount, bogo, free_item
  discount_percentage NUMERIC(5,2),
  discount_amount NUMERIC(10,2),
  free_item_id VARCHAR(255) REFERENCES menu_items(id),
  minimum_purchase_amount NUMERIC(10,2),
  location_id VARCHAR(255) REFERENCES locations(id),
  max_uses INTEGER,
  max_uses_per_customer INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_promotions_code ON promotions(promotion_code);
CREATE INDEX idx_promotions_location ON promotions(location_id);
CREATE INDEX idx_promotions_active ON promotions(is_active, valid_from, valid_until);

CREATE TABLE IF NOT EXISTS promotion_redemptions (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('redeem_' || gen_random_uuid()::TEXT),
  promotion_id VARCHAR(255) REFERENCES promotions(id),
  customer_id VARCHAR(255) REFERENCES customer_accounts(id),
  order_id VARCHAR(255) REFERENCES online_orders(id),
  discount_applied NUMERIC(10,2) NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_promotion_redemptions_promo ON promotion_redemptions(promotion_id);
CREATE INDEX idx_promotion_redemptions_customer ON promotion_redemptions(customer_id);

-- ============================================
-- GIFT CARDS
-- ============================================

CREATE TABLE IF NOT EXISTS gift_cards (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('gift_' || gen_random_uuid()::TEXT),
  card_number VARCHAR(50) UNIQUE NOT NULL,
  card_pin VARCHAR(20),
  initial_balance NUMERIC(10,2) NOT NULL,
  current_balance NUMERIC(10,2) NOT NULL,
  purchased_by_customer_id VARCHAR(255) REFERENCES customer_accounts(id),
  recipient_name VARCHAR(255),
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(20),
  personal_message TEXT,
  location_id VARCHAR(255) REFERENCES locations(id),
  status VARCHAR(50) DEFAULT 'active', -- active, redeemed, expired, cancelled
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gift_cards_number ON gift_cards(card_number);
CREATE INDEX idx_gift_cards_status ON gift_cards(status);

CREATE TABLE IF NOT EXISTS gift_card_transactions (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('gctx_' || gen_random_uuid()::TEXT),
  gift_card_id VARCHAR(255) REFERENCES gift_cards(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL, -- purchase, redeem, refund, adjust
  amount NUMERIC(10,2) NOT NULL,
  order_id VARCHAR(255) REFERENCES online_orders(id),
  balance_before NUMERIC(10,2),
  balance_after NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gift_card_transactions_card ON gift_card_transactions(gift_card_id);

-- ============================================
-- REFERRAL PROGRAM
-- ============================================

CREATE TABLE IF NOT EXISTS referral_programs (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('refprog_' || gen_random_uuid()::TEXT),
  program_name VARCHAR(255) NOT NULL,
  description TEXT,
  location_id VARCHAR(255) REFERENCES locations(id),
  referrer_reward_type VARCHAR(50), -- discount, credit, points, free_item
  referrer_reward_value NUMERIC(10,2),
  referee_reward_type VARCHAR(50),
  referee_reward_value NUMERIC(10,2),
  minimum_purchase_for_referee NUMERIC(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referrals (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('ref_' || gen_random_uuid()::TEXT),
  program_id VARCHAR(255) REFERENCES referral_programs(id),
  referrer_customer_id VARCHAR(255) REFERENCES customer_accounts(id),
  referee_customer_id VARCHAR(255) REFERENCES customer_accounts(id),
  referral_code VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, completed, rewarded, cancelled
  referee_order_id VARCHAR(255) REFERENCES online_orders(id),
  referrer_rewarded BOOLEAN DEFAULT FALSE,
  referee_rewarded BOOLEAN DEFAULT FALSE,
  referred_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_customer_id);
CREATE INDEX idx_referrals_referee ON referrals(referee_customer_id);
CREATE INDEX idx_referrals_code ON referrals(referral_code);

-- ============================================
-- SOCIAL MEDIA INTEGRATION
-- ============================================

CREATE TABLE IF NOT EXISTS social_media_posts (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('post_' || gen_random_uuid()::TEXT),
  platform VARCHAR(50) NOT NULL, -- facebook, instagram, twitter, tiktok
  post_type VARCHAR(50), -- story, feed, reel, tweet
  content TEXT NOT NULL,
  media_urls TEXT[],
  hashtags VARCHAR(100)[],
  location_id VARCHAR(255) REFERENCES locations(id),
  scheduled_post_time TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  post_url TEXT,
  external_post_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, published, failed
  engagement_likes INTEGER DEFAULT 0,
  engagement_comments INTEGER DEFAULT 0,
  engagement_shares INTEGER DEFAULT 0,
  engagement_views INTEGER DEFAULT 0,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_social_media_posts_platform ON social_media_posts(platform);
CREATE INDEX idx_social_media_posts_status ON social_media_posts(status);

-- ============================================
-- VIEWS
-- ============================================

-- Campaign Performance
CREATE OR REPLACE VIEW campaign_performance AS
SELECT
  mc.id,
  mc.campaign_name,
  mc.campaign_type,
  mc.status,
  mc.total_recipients,
  mc.total_sent,
  mc.total_delivered,
  mc.total_opened,
  mc.total_clicked,
  mc.total_converted,
  ROUND((mc.total_opened::NUMERIC / NULLIF(mc.total_delivered, 0)) * 100, 2) as open_rate,
  ROUND((mc.total_clicked::NUMERIC / NULLIF(mc.total_delivered, 0)) * 100, 2) as click_rate,
  ROUND((mc.total_converted::NUMERIC / NULLIF(mc.total_delivered, 0)) * 100, 2) as conversion_rate,
  mc.conversion_revenue,
  mc.created_at
FROM marketing_campaigns mc
ORDER BY mc.created_at DESC;

-- Customer Engagement Score
CREATE OR REPLACE VIEW customer_engagement_score AS
SELECT
  c.id as customer_id,
  c.email,
  c.first_name || ' ' || c.last_name as customer_name,
  COUNT(DISTINCT o.id) as total_orders,
  COUNT(DISTINCT cm.id) FILTER (WHERE cm.opened_at IS NOT NULL) as emails_opened,
  COUNT(DISTINCT cm.id) FILTER (WHERE cm.clicked_at IS NOT NULL) as emails_clicked,
  c.loyalty_points,
  COALESCE(c.total_spent, 0) as total_spent,
  (
    (COUNT(DISTINCT o.id) * 10) +
    (COUNT(DISTINCT cm.id) FILTER (WHERE cm.opened_at IS NOT NULL) * 2) +
    (COUNT(DISTINCT cm.id) FILTER (WHERE cm.clicked_at IS NOT NULL) * 5) +
    (c.loyalty_points / 100)
  ) as engagement_score
FROM customer_accounts c
LEFT JOIN online_orders o ON c.id = o.customer_id
LEFT JOIN campaign_messages cm ON c.id = cm.customer_id
GROUP BY c.id, c.email, c.first_name, c.last_name, c.loyalty_points, c.total_spent;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
DECLARE
  code VARCHAR(50);
  code_exists BOOLEAN;
BEGIN
  IF NEW.referral_code IS NULL THEN
    LOOP
      code := 'REF' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
      SELECT EXISTS(SELECT 1 FROM referrals WHERE referral_code = code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    NEW.referral_code := code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_referral_code
BEFORE INSERT ON referrals
FOR EACH ROW
EXECUTE FUNCTION generate_referral_code();

-- Update campaign stats on message status change
CREATE OR REPLACE FUNCTION update_campaign_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'sent' AND (OLD.status IS NULL OR OLD.status != 'sent') THEN
    UPDATE marketing_campaigns SET total_sent = total_sent + 1 WHERE id = NEW.campaign_id;
  END IF;

  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    UPDATE marketing_campaigns SET total_delivered = total_delivered + 1 WHERE id = NEW.campaign_id;
  END IF;

  IF NEW.opened_at IS NOT NULL AND OLD.opened_at IS NULL THEN
    UPDATE marketing_campaigns SET total_opened = total_opened + 1 WHERE id = NEW.campaign_id;
  END IF;

  IF NEW.clicked_at IS NOT NULL AND OLD.clicked_at IS NULL THEN
    UPDATE marketing_campaigns SET total_clicked = total_clicked + 1 WHERE id = NEW.campaign_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_campaign_stats
AFTER UPDATE ON campaign_messages
FOR EACH ROW
EXECUTE FUNCTION update_campaign_stats();

-- Migration complete
