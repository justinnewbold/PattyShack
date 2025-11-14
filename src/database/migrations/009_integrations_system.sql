-- Integrations System Migration
-- Third-party integrations, webhooks, data sync, and API connections

-- Integration providers
CREATE TABLE IF NOT EXISTS integration_providers (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  category VARCHAR(100) NOT NULL CHECK (category IN ('pos', 'payroll', 'accounting', 'inventory', 'analytics', 'communication', 'other')),
  description TEXT,
  api_version VARCHAR(50),
  base_url VARCHAR(500),
  auth_type VARCHAR(50) CHECK (auth_type IN ('oauth2', 'api_key', 'basic_auth', 'bearer_token', 'custom')),
  required_credentials JSONB DEFAULT '[]',
  supported_features JSONB DEFAULT '[]',
  rate_limit_per_hour INTEGER,
  is_active BOOLEAN DEFAULT true,
  documentation_url VARCHAR(500),
  support_contact VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_integration_providers_category ON integration_providers(category);
CREATE INDEX idx_integration_providers_active ON integration_providers(is_active);

-- Location-specific integrations
CREATE TABLE IF NOT EXISTS location_integrations (
  id VARCHAR(255) PRIMARY KEY,
  location_id VARCHAR(255) NOT NULL,
  provider_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error', 'pending')),
  credentials JSONB DEFAULT '{}', -- Encrypted credentials
  config JSONB DEFAULT '{}',
  last_sync_at TIMESTAMP,
  last_sync_status VARCHAR(50) CHECK (last_sync_status IN ('success', 'failure', 'partial')),
  sync_frequency_minutes INTEGER DEFAULT 60,
  auto_sync_enabled BOOLEAN DEFAULT true,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  enabled_features JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (provider_id) REFERENCES integration_providers(id) ON DELETE CASCADE,
  UNIQUE(location_id, provider_id)
);

CREATE INDEX idx_location_integrations_location ON location_integrations(location_id);
CREATE INDEX idx_location_integrations_provider ON location_integrations(provider_id);
CREATE INDEX idx_location_integrations_status ON location_integrations(status);

-- Sync logs
CREATE TABLE IF NOT EXISTS integration_sync_logs (
  id VARCHAR(255) PRIMARY KEY,
  integration_id VARCHAR(255) NOT NULL,
  sync_type VARCHAR(50) NOT NULL CHECK (sync_type IN ('full', 'incremental', 'manual', 'scheduled')),
  direction VARCHAR(20) NOT NULL CHECK (direction IN ('import', 'export', 'bidirectional')),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed', 'cancelled')),
  records_processed INTEGER DEFAULT 0,
  records_succeeded INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  error_details JSONB,
  sync_metadata JSONB DEFAULT '{}',
  FOREIGN KEY (integration_id) REFERENCES location_integrations(id) ON DELETE CASCADE
);

CREATE INDEX idx_sync_logs_integration ON integration_sync_logs(integration_id);
CREATE INDEX idx_sync_logs_started_at ON integration_sync_logs(started_at);
CREATE INDEX idx_sync_logs_status ON integration_sync_logs(status);

-- Webhooks
CREATE TABLE IF NOT EXISTS webhooks (
  id VARCHAR(255) PRIMARY KEY,
  location_id VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  event_types JSONB NOT NULL DEFAULT '[]',
  method VARCHAR(10) DEFAULT 'POST' CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH')),
  headers JSONB DEFAULT '{}',
  auth_type VARCHAR(50) CHECK (auth_type IN ('none', 'api_key', 'bearer_token', 'basic_auth', 'custom')),
  auth_credentials JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  retry_on_failure BOOLEAN DEFAULT true,
  max_retries INTEGER DEFAULT 3,
  retry_delay_seconds INTEGER DEFAULT 60,
  last_triggered_at TIMESTAMP,
  last_status VARCHAR(50),
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

CREATE INDEX idx_webhooks_location ON webhooks(location_id);
CREATE INDEX idx_webhooks_active ON webhooks(is_active);

-- Webhook delivery logs
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id VARCHAR(255) PRIMARY KEY,
  webhook_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'delivered', 'failed', 'retrying')),
  http_status_code INTEGER,
  response_body TEXT,
  response_time_ms INTEGER,
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP,
  next_retry_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE
);

CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_next_retry ON webhook_deliveries(next_retry_at);

-- API keys (for external access to PattyShack API)
CREATE TABLE IF NOT EXISTS api_keys (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  key_prefix VARCHAR(20) NOT NULL,
  location_id VARCHAR(255),
  user_id VARCHAR(255),
  permissions JSONB DEFAULT '[]',
  rate_limit_per_hour INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP,
  usage_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP,
  ip_whitelist JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_location ON api_keys(location_id);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);

-- Data export jobs
CREATE TABLE IF NOT EXISTS data_export_jobs (
  id VARCHAR(255) PRIMARY KEY,
  location_id VARCHAR(255),
  user_id VARCHAR(255) NOT NULL,
  export_type VARCHAR(100) NOT NULL,
  format VARCHAR(50) NOT NULL CHECK (format IN ('csv', 'json', 'xlsx', 'pdf')),
  filters JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  file_path VARCHAR(500),
  file_size_bytes BIGINT,
  row_count INTEGER,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  download_url VARCHAR(500),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_export_jobs_location ON data_export_jobs(location_id);
CREATE INDEX idx_export_jobs_user ON data_export_jobs(user_id);
CREATE INDEX idx_export_jobs_status ON data_export_jobs(status);
CREATE INDEX idx_export_jobs_created_at ON data_export_jobs(created_at);

-- Import jobs
CREATE TABLE IF NOT EXISTS data_import_jobs (
  id VARCHAR(255) PRIMARY KEY,
  location_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  import_type VARCHAR(100) NOT NULL,
  format VARCHAR(50) NOT NULL CHECK (format IN ('csv', 'json', 'xlsx')),
  file_path VARCHAR(500),
  file_size_bytes BIGINT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'validating', 'processing', 'completed', 'failed', 'cancelled')),
  validation_errors JSONB DEFAULT '[]',
  total_rows INTEGER,
  rows_processed INTEGER DEFAULT 0,
  rows_succeeded INTEGER DEFAULT 0,
  rows_failed INTEGER DEFAULT 0,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  import_summary JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_import_jobs_location ON data_import_jobs(location_id);
CREATE INDEX idx_import_jobs_user ON data_import_jobs(user_id);
CREATE INDEX idx_import_jobs_status ON data_import_jobs(status);

-- Insert common integration providers
INSERT INTO integration_providers (id, name, category, description, auth_type, supported_features) VALUES
  ('provider-square', 'Square POS', 'pos', 'Square Point of Sale integration', 'oauth2', '["sales_import", "inventory_sync", "payment_processing"]'),
  ('provider-toast', 'Toast POS', 'pos', 'Toast restaurant POS system', 'api_key', '["sales_import", "menu_sync", "employee_hours"]'),
  ('provider-clover', 'Clover POS', 'pos', 'Clover Point of Sale system', 'oauth2', '["sales_import", "inventory_sync", "employee_management"]'),
  ('provider-adp', 'ADP Workforce', 'payroll', 'ADP payroll and workforce management', 'oauth2', '["time_export", "employee_sync", "payroll_export"]'),
  ('provider-gusto', 'Gusto', 'payroll', 'Gusto payroll platform', 'oauth2', '["time_export", "employee_sync", "payroll_processing"]'),
  ('provider-quickbooks', 'QuickBooks Online', 'accounting', 'QuickBooks accounting integration', 'oauth2', '["invoice_sync", "expense_export", "vendor_sync", "reports"]'),
  ('provider-xero', 'Xero', 'accounting', 'Xero accounting software', 'oauth2', '["invoice_sync", "expense_export", "bank_reconciliation"]'),
  ('provider-mailchimp', 'Mailchimp', 'communication', 'Email marketing platform', 'api_key', '["customer_sync", "campaign_management"]'),
  ('provider-twilio', 'Twilio', 'communication', 'SMS and communication platform', 'api_key', '["sms_notifications", "voice_calls"]'),
  ('provider-slack', 'Slack', 'communication', 'Team communication platform', 'oauth2', '["notifications", "alerts", "team_messaging"]');

-- Insert sample webhook
INSERT INTO webhooks (id, name, url, event_types, is_active)
SELECT
  'webhook-sample',
  'Sample Webhook',
  'https://example.com/webhooks/pattyshack',
  '["task.completed", "temperature.alert", "schedule.published"]',
  false
FROM locations LIMIT 1;
