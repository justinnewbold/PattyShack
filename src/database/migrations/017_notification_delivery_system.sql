-- Migration: Email/SMS Notification Delivery System
-- Phase 15: External notification service integrations
-- Created: 2024-11

BEGIN;

-- Email/SMS providers configuration
CREATE TABLE notification_providers (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  provider_name VARCHAR(100) NOT NULL UNIQUE, -- sendgrid, mailgun, twilio, ses, etc.
  provider_type VARCHAR(50) NOT NULL, -- email, sms, push
  api_key_encrypted TEXT,
  api_secret_encrypted TEXT,
  config JSONB, -- Additional provider-specific config
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  daily_limit INTEGER,
  monthly_limit INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_provider_type (provider_type),
  INDEX idx_provider_active (is_active)
);

-- Email templates
CREATE TABLE email_templates (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  name VARCHAR(255) NOT NULL UNIQUE,
  subject VARCHAR(500) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables JSONB, -- List of variables used in template
  category VARCHAR(100), -- transactional, marketing, alert, etc.
  from_email VARCHAR(255),
  from_name VARCHAR(255),
  reply_to VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(255) REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_email_template_category (category)
);

-- SMS templates
CREATE TABLE sms_templates (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  name VARCHAR(255) NOT NULL UNIQUE,
  message TEXT NOT NULL,
  variables JSONB, -- List of variables used in template
  category VARCHAR(100),
  from_number VARCHAR(20), -- Default sending number
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(255) REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_sms_template_category (category)
);

-- Email delivery queue
CREATE TABLE email_queue (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  notification_id VARCHAR(255) REFERENCES notifications(id) ON DELETE SET NULL,
  to_email VARCHAR(255) NOT NULL,
  to_name VARCHAR(255),
  from_email VARCHAR(255) NOT NULL,
  from_name VARCHAR(255),
  reply_to VARCHAR(255),
  subject VARCHAR(500) NOT NULL,
  body_html TEXT,
  body_text TEXT,
  template_id VARCHAR(255) REFERENCES email_templates(id),
  template_variables JSONB,
  provider_id VARCHAR(255) REFERENCES notification_providers(id),
  priority INTEGER DEFAULT 5,
  status VARCHAR(50) DEFAULT 'queued', -- queued, sending, sent, failed, cancelled
  scheduled_for TIMESTAMP,
  sent_at TIMESTAMP,
  failed_at TIMESTAMP,
  error_message TEXT,
  provider_message_id VARCHAR(255), -- External provider's message ID
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_email_queue_status (status),
  INDEX idx_email_queue_scheduled (scheduled_for),
  INDEX idx_email_queue_priority (priority DESC),
  INDEX idx_email_queue_notification (notification_id)
);

-- SMS delivery queue
CREATE TABLE sms_queue (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  notification_id VARCHAR(255) REFERENCES notifications(id) ON DELETE SET NULL,
  to_phone VARCHAR(20) NOT NULL,
  from_phone VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  template_id VARCHAR(255) REFERENCES sms_templates(id),
  template_variables JSONB,
  provider_id VARCHAR(255) REFERENCES notification_providers(id),
  priority INTEGER DEFAULT 5,
  status VARCHAR(50) DEFAULT 'queued', -- queued, sending, sent, failed, cancelled
  scheduled_for TIMESTAMP,
  sent_at TIMESTAMP,
  failed_at TIMESTAMP,
  error_message TEXT,
  provider_message_id VARCHAR(255),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_sms_queue_status (status),
  INDEX idx_sms_queue_scheduled (scheduled_for),
  INDEX idx_sms_queue_priority (priority DESC),
  INDEX idx_sms_queue_notification (notification_id)
);

-- Delivery tracking and analytics
CREATE TABLE notification_delivery_log (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  notification_id VARCHAR(255) REFERENCES notifications(id) ON DELETE CASCADE,
  email_queue_id VARCHAR(255) REFERENCES email_queue(id) ON DELETE CASCADE,
  sms_queue_id VARCHAR(255) REFERENCES sms_queue(id) ON DELETE CASCADE,
  delivery_type VARCHAR(20) NOT NULL, -- email, sms, push
  recipient VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  provider_name VARCHAR(100),
  provider_message_id VARCHAR(255),
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP, -- For email open tracking
  clicked_at TIMESTAMP, -- For link click tracking
  bounced_at TIMESTAMP,
  bounce_type VARCHAR(50), -- hard, soft, complaint
  error_message TEXT,
  metadata JSONB,

  INDEX idx_delivery_log_notification (notification_id),
  INDEX idx_delivery_log_type (delivery_type),
  INDEX idx_delivery_log_status (status),
  INDEX idx_delivery_log_sent (sent_at)
);

-- Email webhooks (for delivery status updates from providers)
CREATE TABLE notification_webhooks (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  provider_id VARCHAR(255) NOT NULL REFERENCES notification_providers(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL, -- delivered, bounced, opened, clicked, etc.
  provider_event_id VARCHAR(255),
  provider_message_id VARCHAR(255),
  email_queue_id VARCHAR(255) REFERENCES email_queue(id),
  sms_queue_id VARCHAR(255) REFERENCES sms_queue(id),
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,

  INDEX idx_webhook_provider (provider_id),
  INDEX idx_webhook_type (event_type),
  INDEX idx_webhook_processed (processed),
  INDEX idx_webhook_message (provider_message_id)
);

-- Unsubscribe list
CREATE TABLE email_unsubscribes (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  email VARCHAR(255) NOT NULL UNIQUE,
  reason VARCHAR(255),
  unsubscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_unsubscribe_email (email)
);

-- ============================================
-- VIEWS
-- ============================================

-- Email queue pending view
CREATE VIEW pending_emails AS
SELECT
  eq.id,
  eq.to_email,
  eq.subject,
  eq.priority,
  eq.scheduled_for,
  eq.retry_count,
  eq.created_at,
  np.provider_name,
  CASE
    WHEN eq.scheduled_for IS NULL OR eq.scheduled_for <= CURRENT_TIMESTAMP THEN true
    ELSE false
  END as is_ready
FROM email_queue eq
LEFT JOIN notification_providers np ON eq.provider_id = np.id
WHERE eq.status = 'queued'
ORDER BY eq.priority DESC, eq.created_at ASC;

-- SMS queue pending view
CREATE VIEW pending_sms AS
SELECT
  sq.id,
  sq.to_phone,
  sq.message,
  sq.priority,
  sq.scheduled_for,
  sq.retry_count,
  sq.created_at,
  np.provider_name,
  CASE
    WHEN sq.scheduled_for IS NULL OR sq.scheduled_for <= CURRENT_TIMESTAMP THEN true
    ELSE false
  END as is_ready
FROM sms_queue sq
LEFT JOIN notification_providers np ON sq.provider_id = np.id
WHERE sq.status = 'queued'
ORDER BY sq.priority DESC, sq.created_at ASC;

-- Delivery statistics view
CREATE VIEW delivery_stats AS
SELECT
  delivery_type,
  provider_name,
  DATE(sent_at) as date,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
  COUNT(*) FILTER (WHERE status = 'bounced') as bounced,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE opened_at IS NOT NULL) as opened,
  COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) as clicked,
  ROUND((COUNT(*) FILTER (WHERE status = 'delivered')::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2) as delivery_rate,
  ROUND((COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE status = 'delivered'), 0)) * 100, 2) as open_rate,
  ROUND((COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE opened_at IS NOT NULL), 0)) * 100, 2) as click_rate
FROM notification_delivery_log
WHERE sent_at IS NOT NULL
GROUP BY delivery_type, provider_name, DATE(sent_at);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to render template with variables
CREATE OR REPLACE FUNCTION render_template(
  template_text TEXT,
  variables JSONB
)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
  var_key TEXT;
  var_value TEXT;
BEGIN
  result := template_text;

  FOR var_key, var_value IN SELECT key, value::text FROM jsonb_each_text(variables)
  LOOP
    result := replace(result, '{{' || var_key || '}}', var_value);
  END LOOP;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to check if email is unsubscribed
CREATE OR REPLACE FUNCTION is_email_unsubscribed(p_email VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM email_unsubscribes WHERE email = p_email);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INITIAL DATA
-- ============================================

-- Create default email templates
INSERT INTO email_templates (name, subject, body_html, body_text, category, variables) VALUES
('welcome_email', 'Welcome to PattyShack!',
 '<h1>Welcome {{user_name}}!</h1><p>Thank you for joining PattyShack.</p>',
 'Welcome {{user_name}}! Thank you for joining PattyShack.',
 'transactional', '["user_name", "user_email"]'),

('password_reset', 'Reset Your Password',
 '<h2>Password Reset Request</h2><p>Click <a href="{{reset_link}}">here</a> to reset your password.</p>',
 'Password Reset Request. Copy this link to reset your password: {{reset_link}}',
 'transactional', '["user_name", "reset_link"]'),

('task_assigned', 'New Task Assigned',
 '<h2>Task Assigned</h2><p>{{assigner_name}} assigned you a task: {{task_title}}</p>',
 'Task Assigned: {{assigner_name}} assigned you a task: {{task_title}}',
 'transactional', '["user_name", "assigner_name", "task_title", "task_url"]'),

('daily_report', 'Daily Business Report',
 '<h1>Daily Report for {{location_name}}</h1><p>{{report_summary}}</p>',
 'Daily Report for {{location_name}}: {{report_summary}}',
 'transactional', '["location_name", "date", "report_summary"]'),

('alert_notification', 'Alert: {{alert_type}}',
 '<h2>Alert</h2><p>{{alert_message}}</p>',
 'Alert: {{alert_message}}',
 'alert', '["alert_type", "alert_message", "alert_url"]');

-- Create default SMS templates
INSERT INTO sms_templates (name, message, category, variables) VALUES
('task_reminder', 'Reminder: {{task_title}} is due soon. - PattyShack',
 'alert', '["task_title", "due_date"]'),

('temp_alert', 'ALERT: Temperature out of range at {{equipment_name}}. Current: {{temperature}}F - PattyShack',
 'alert', '["equipment_name", "temperature", "threshold"]'),

('shift_reminder', 'Your shift at {{location_name}} starts in {{hours}} hours. - PattyShack',
 'reminder', '["location_name", "hours", "shift_time"]'),

('verification_code', 'Your PattyShack verification code is: {{code}}',
 'transactional', '["code"]');

COMMIT;

-- Rollback script (for reference)
-- DROP TABLE IF EXISTS email_unsubscribes CASCADE;
-- DROP TABLE IF EXISTS notification_webhooks CASCADE;
-- DROP TABLE IF EXISTS notification_delivery_log CASCADE;
-- DROP TABLE IF EXISTS sms_queue CASCADE;
-- DROP TABLE IF EXISTS email_queue CASCADE;
-- DROP TABLE IF EXISTS sms_templates CASCADE;
-- DROP TABLE IF EXISTS email_templates CASCADE;
-- DROP TABLE IF EXISTS notification_providers CASCADE;
-- DROP VIEW IF EXISTS delivery_stats;
-- DROP VIEW IF EXISTS pending_sms;
-- DROP VIEW IF EXISTS pending_emails;
-- DROP FUNCTION IF EXISTS is_email_unsubscribed(VARCHAR);
-- DROP FUNCTION IF EXISTS render_template(TEXT, JSONB);
