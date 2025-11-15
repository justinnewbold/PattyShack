-- Migration: Reporting & Visualization Engine
-- Phase 17: Report builder, chart config, PDF export
-- Created: 2024-11

BEGIN;

-- Report templates (pre-configured reports)
CREATE TABLE report_templates (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(100), -- financial, operations, compliance, analytics
  query_template TEXT NOT NULL, -- SQL template with placeholders
  parameters JSONB, -- Parameter definitions
  output_format VARCHAR(50) DEFAULT 'table', -- table, chart, pivot, dashboard
  chart_config JSONB, -- Chart configuration
  is_public BOOLEAN DEFAULT true,
  created_by VARCHAR(255) REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_report_template_category (category)
);

-- Chart configurations
CREATE TABLE chart_configurations (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  name VARCHAR(255) NOT NULL,
  chart_type VARCHAR(50) NOT NULL, -- line, bar, pie, donut, area, scatter, etc.
  data_source VARCHAR(255), -- table, view, or custom query
  data_config JSONB NOT NULL, -- x-axis, y-axis, series config
  display_config JSONB, -- Colors, labels, legend, etc.
  filters JSONB,
  refresh_interval_seconds INTEGER,
  created_by VARCHAR(255) REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_chart_type (chart_type)
);

-- Report exports
CREATE TABLE report_exports (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  report_id VARCHAR(255) REFERENCES saved_reports(id),
  report_template_id VARCHAR(255) REFERENCES report_templates(id),
  export_format VARCHAR(50) NOT NULL, -- pdf, excel, csv, json
  file_name VARCHAR(255),
  file_path VARCHAR(500),
  file_url VARCHAR(500),
  file_size_bytes BIGINT,
  parameters JSONB,
  status VARCHAR(50) DEFAULT 'pending', -- pending, generating, completed, failed
  generated_at TIMESTAMP,
  expires_at TIMESTAMP,
  error_message TEXT,
  created_by VARCHAR(255) REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_export_status (status),
  INDEX idx_export_created (created_at)
);

-- Dashboard layouts (custom dashboard arrangements)
CREATE TABLE dashboard_layouts (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  layout_config JSONB NOT NULL, -- Grid layout configuration
  widgets JSONB NOT NULL, -- Widget placements and configs
  is_default BOOLEAN DEFAULT false,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_dashboard_layout_user (user_id)
);

-- Visualization cache (for expensive queries)
CREATE TABLE visualization_cache (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  cache_key VARCHAR(255) NOT NULL UNIQUE,
  chart_id VARCHAR(255) REFERENCES chart_configurations(id),
  data JSONB NOT NULL,
  parameters JSONB,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_viz_cache_expires (expires_at),
  INDEX idx_viz_cache_chart (chart_id)
);

-- Insert default report templates
INSERT INTO report_templates (name, description, category, query_template, parameters, output_format) VALUES
('Daily Sales Summary', 'Daily sales by location', 'financial',
 'SELECT location_id, SUM(amount) as total_sales FROM sales_entries WHERE date = {{date}} GROUP BY location_id',
 '{"date": {"type": "date", "required": true}}', 'table'),

('Labor Cost Report', 'Labor costs and hours by period', 'financial',
 'SELECT * FROM labor_entries WHERE period_start >= {{start_date}} AND period_end <= {{end_date}}',
 '{"start_date": {"type": "date"}, "end_date": {"type": "date"}}', 'table'),

('Task Completion Trends', 'Task completion rates over time', 'operations',
 'SELECT DATE(completed_at) as date, COUNT(*) as completed FROM tasks WHERE status = ''completed'' GROUP BY DATE(completed_at)',
 '{}', 'chart');

COMMIT;
