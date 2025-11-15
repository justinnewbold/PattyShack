-- Phase 11: Business Intelligence & Executive Dashboard System

-- KPI (Key Performance Indicator) definitions
CREATE TABLE kpis (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL, -- financial, operational, customer, employee, compliance
  metric_type VARCHAR(50) NOT NULL, -- currency, percentage, count, ratio, score
  calculation_method TEXT, -- SQL query or formula description
  target_value NUMERIC,
  unit VARCHAR(50), -- $, %, count, hours, etc.
  is_higher_better BOOLEAN DEFAULT true,
  frequency VARCHAR(50) DEFAULT 'daily', -- realtime, hourly, daily, weekly, monthly
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(255) REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_kpis_category ON kpis(category);
CREATE INDEX idx_kpis_active ON kpis(is_active);

-- KPI values over time
CREATE TABLE kpi_values (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  kpi_id VARCHAR(255) NOT NULL REFERENCES kpis(id) ON DELETE CASCADE,
  location_id VARCHAR(255) REFERENCES locations(id),
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  value NUMERIC NOT NULL,
  target_value NUMERIC,
  variance NUMERIC, -- Actual vs target
  variance_percentage NUMERIC,
  metadata JSONB, -- Additional context like breakdown by category
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_kpi_values_kpi ON kpi_values(kpi_id, period_start DESC);
CREATE INDEX idx_kpi_values_location ON kpi_values(location_id);
CREATE INDEX idx_kpi_values_period ON kpi_values(period_start, period_end);

-- Dashboard definitions (templates)
CREATE TABLE dashboards (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  dashboard_type VARCHAR(100) NOT NULL, -- executive, operations, financial, location, custom
  target_role VARCHAR(100), -- Which role this dashboard is designed for
  is_template BOOLEAN DEFAULT false, -- System template vs user-created
  is_public BOOLEAN DEFAULT false,
  layout_config JSONB, -- Grid layout configuration
  refresh_interval INTEGER DEFAULT 300, -- Seconds
  created_by VARCHAR(255) REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dashboards_type ON dashboards(dashboard_type);
CREATE INDEX idx_dashboards_role ON dashboards(target_role);

-- Dashboard widgets (charts, metrics, tables)
CREATE TABLE dashboard_widgets (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  dashboard_id VARCHAR(255) NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  widget_type VARCHAR(50) NOT NULL, -- kpi_card, line_chart, bar_chart, pie_chart, table, heatmap
  title VARCHAR(255) NOT NULL,
  data_source VARCHAR(100) NOT NULL, -- kpi, custom_query, aggregation
  source_config JSONB NOT NULL, -- KPI ID, query, or aggregation settings
  display_config JSONB, -- Chart colors, formatting, etc.
  position_x INTEGER NOT NULL,
  position_y INTEGER NOT NULL,
  width INTEGER NOT NULL DEFAULT 4,
  height INTEGER NOT NULL DEFAULT 4,
  sort_order INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dashboard_widgets_dashboard ON dashboard_widgets(dashboard_id);

-- User dashboard preferences and customizations
CREATE TABLE user_dashboards (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  dashboard_id VARCHAR(255) NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false,
  custom_filters JSONB, -- Location filter, date range, etc.
  last_viewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, dashboard_id)
);

CREATE INDEX idx_user_dashboards_user ON user_dashboards(user_id);

-- Goals and targets
CREATE TABLE goals (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  goal_type VARCHAR(100) NOT NULL, -- revenue, cost_reduction, efficiency, quality, compliance
  kpi_id VARCHAR(255) REFERENCES kpis(id),
  location_id VARCHAR(255) REFERENCES locations(id),
  target_value NUMERIC NOT NULL,
  current_value NUMERIC,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'active', -- active, achieved, at_risk, failed, cancelled
  progress_percentage NUMERIC DEFAULT 0,
  owner_user_id VARCHAR(255) REFERENCES users(id),
  created_by VARCHAR(255) REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_goals_location ON goals(location_id);
CREATE INDEX idx_goals_kpi ON goals(kpi_id);
CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_goals_dates ON goals(start_date, end_date);

-- Goal milestones and checkpoints
CREATE TABLE goal_milestones (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  goal_id VARCHAR(255) NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  target_date DATE NOT NULL,
  target_value NUMERIC NOT NULL,
  actual_value NUMERIC,
  is_achieved BOOLEAN DEFAULT false,
  achieved_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_goal_milestones_goal ON goal_milestones(goal_id);

-- Saved custom reports
CREATE TABLE saved_reports (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  report_type VARCHAR(100) NOT NULL, -- data_export, scheduled_report, custom_query
  query_config JSONB NOT NULL, -- Filters, grouping, aggregations
  schedule_config JSONB, -- Cron expression, recipients
  is_scheduled BOOLEAN DEFAULT false,
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  created_by VARCHAR(255) REFERENCES users(id),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_saved_reports_creator ON saved_reports(created_by);
CREATE INDEX idx_saved_reports_scheduled ON saved_reports(is_scheduled, next_run_at);

-- Report execution history
CREATE TABLE report_executions (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  report_id VARCHAR(255) REFERENCES saved_reports(id) ON DELETE SET NULL,
  executed_by VARCHAR(255) REFERENCES users(id),
  execution_status VARCHAR(50) NOT NULL, -- running, completed, failed
  parameters JSONB,
  result_count INTEGER,
  file_url VARCHAR(500),
  error_message TEXT,
  execution_time_ms INTEGER,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_report_executions_report ON report_executions(report_id);
CREATE INDEX idx_report_executions_status ON report_executions(execution_status);

-- Analytics views for common business metrics

-- Daily business summary view
CREATE VIEW daily_business_summary AS
SELECT
  l.id as location_id,
  l.name as location_name,
  DATE(CURRENT_TIMESTAMP) as business_date,
  -- Sales metrics (from existing sales_entries if available, or placeholder)
  0 as total_sales,
  0 as transaction_count,
  0 as average_check,
  -- Labor metrics
  (SELECT COUNT(*) FROM shifts s WHERE s.location_id = l.id AND s.shift_date = CURRENT_DATE) as scheduled_shifts,
  (SELECT SUM(EXTRACT(EPOCH FROM (s.end_time - s.start_time))/3600)
   FROM shifts s WHERE s.location_id = l.id AND s.shift_date = CURRENT_DATE) as scheduled_hours,
  -- Task completion
  (SELECT COUNT(*) FROM tasks t WHERE t.location_id = l.id AND DATE(t.created_at) = CURRENT_DATE) as total_tasks,
  (SELECT COUNT(*) FROM tasks t WHERE t.location_id = l.id AND t.status = 'completed' AND DATE(t.completed_at) = CURRENT_DATE) as completed_tasks,
  -- Temperature compliance
  (SELECT COUNT(*) FROM temperature_logs tl WHERE tl.location_id = l.id AND DATE(tl.created_at) = CURRENT_DATE) as temp_readings,
  (SELECT COUNT(*) FROM temperature_logs tl WHERE tl.location_id = l.id AND tl.is_within_range = false AND DATE(tl.created_at) = CURRENT_DATE) as temp_violations,
  -- Active violations
  (SELECT COUNT(*) FROM violations v WHERE v.location_id = l.id AND v.status IN ('open', 'in_progress')) as open_violations
FROM locations l;

-- Weekly performance trends
CREATE VIEW weekly_performance_trends AS
SELECT
  l.id as location_id,
  l.name as location_name,
  DATE_TRUNC('week', d.date) as week_start,
  -- Task metrics
  AVG((SELECT COUNT(*) FROM tasks t WHERE t.location_id = l.id AND DATE(t.completed_at) = d.date)::NUMERIC) as avg_daily_tasks_completed,
  AVG(CASE
    WHEN (SELECT COUNT(*) FROM tasks t WHERE t.location_id = l.id AND DATE(t.created_at) = d.date) > 0
    THEN (SELECT COUNT(*) FROM tasks t WHERE t.location_id = l.id AND t.status = 'completed' AND DATE(t.completed_at) = d.date)::NUMERIC * 100 /
         (SELECT COUNT(*) FROM tasks t WHERE t.location_id = l.id AND DATE(t.created_at) = d.date)
    ELSE 0
  END) as avg_task_completion_rate,
  -- Temperature compliance
  AVG(CASE
    WHEN (SELECT COUNT(*) FROM temperature_logs tl WHERE tl.location_id = l.id AND DATE(tl.created_at) = d.date) > 0
    THEN (SELECT COUNT(*) FROM temperature_logs tl WHERE tl.location_id = l.id AND tl.is_within_range = true AND DATE(tl.created_at) = d.date)::NUMERIC * 100 /
         (SELECT COUNT(*) FROM temperature_logs tl WHERE tl.location_id = l.id AND DATE(tl.created_at) = d.date)
    ELSE 100
  END) as avg_temp_compliance_rate
FROM locations l
CROSS JOIN generate_series(CURRENT_DATE - INTERVAL '90 days', CURRENT_DATE, '1 day'::interval) d(date)
GROUP BY l.id, l.name, DATE_TRUNC('week', d.date);

-- Location comparison view (for multi-location analytics)
CREATE VIEW location_comparison AS
SELECT
  l.id as location_id,
  l.name as location_name,
  l.city,
  l.state,
  -- Current month metrics
  (SELECT COUNT(*) FROM tasks t WHERE t.location_id = l.id AND DATE_TRUNC('month', t.created_at) = DATE_TRUNC('month', CURRENT_DATE)) as monthly_tasks,
  (SELECT COUNT(*) FROM tasks t WHERE t.location_id = l.id AND t.status = 'completed' AND DATE_TRUNC('month', t.completed_at) = DATE_TRUNC('month', CURRENT_DATE)) as monthly_completed_tasks,
  (SELECT COUNT(*) FROM violations v WHERE v.location_id = l.id AND DATE_TRUNC('month', v.detected_date) = DATE_TRUNC('month', CURRENT_DATE)) as monthly_violations,
  (SELECT COUNT(*) FROM compliance_inspections ci WHERE ci.location_id = l.id AND DATE_TRUNC('month', ci.completed_at) = DATE_TRUNC('month', CURRENT_DATE)) as monthly_inspections,
  (SELECT AVG(ci.score) FROM compliance_inspections ci WHERE ci.location_id = l.id AND DATE_TRUNC('month', ci.completed_at) = DATE_TRUNC('month', CURRENT_DATE) AND ci.status = 'completed') as avg_inspection_score
FROM locations l;

-- Pre-seed standard KPIs
INSERT INTO kpis (id, name, description, category, metric_type, target_value, unit, is_higher_better, frequency) VALUES
('kpi-task-completion-rate', 'Task Completion Rate', 'Percentage of assigned tasks completed on time', 'operational', 'percentage', 95, '%', true, 'daily'),
('kpi-temp-compliance-rate', 'Temperature Compliance Rate', 'Percentage of temperature readings within acceptable range', 'compliance', 'percentage', 98, '%', true, 'daily'),
('kpi-labor-cost-percentage', 'Labor Cost Percentage', 'Labor cost as percentage of revenue', 'financial', 'percentage', 30, '%', false, 'daily'),
('kpi-food-cost-percentage', 'Food Cost Percentage', 'Food cost as percentage of revenue', 'financial', 'percentage', 28, '%', false, 'daily'),
('kpi-prime-cost', 'Prime Cost', 'Combined labor and food cost percentage', 'financial', 'percentage', 60, '%', false, 'daily'),
('kpi-inspection-pass-rate', 'Inspection Pass Rate', 'Percentage of inspections passed', 'compliance', 'percentage', 100, '%', true, 'monthly'),
('kpi-violation-resolution-time', 'Avg Violation Resolution Time', 'Average hours to resolve compliance violations', 'compliance', 'count', 24, 'hours', false, 'weekly'),
('kpi-inventory-variance', 'Inventory Variance', 'Difference between expected and actual inventory', 'operational', 'percentage', 2, '%', false, 'weekly'),
('kpi-schedule-adherence', 'Schedule Adherence', 'Percentage of shifts filled as scheduled', 'operational', 'percentage', 98, '%', true, 'daily'),
('kpi-employee-turnover', 'Employee Turnover Rate', 'Annual employee turnover rate', 'employee', 'percentage', 50, '%', false, 'monthly');

-- Pre-seed executive dashboard template
INSERT INTO dashboards (id, name, description, dashboard_type, target_role, is_template, is_public) VALUES
('dashboard-executive', 'Executive Overview', 'High-level business metrics for executives and owners', 'executive', 'owner', true, true),
('dashboard-operations', 'Operations Dashboard', 'Daily operational metrics for managers', 'operations', 'manager', true, true),
('dashboard-compliance', 'Compliance Dashboard', 'Compliance and food safety metrics', 'compliance', 'manager', true, true),
('dashboard-financial', 'Financial Dashboard', 'Revenue, costs, and financial KPIs', 'financial', 'owner', true, true);

-- Sample widgets for executive dashboard
INSERT INTO dashboard_widgets (dashboard_id, widget_type, title, data_source, source_config, display_config, position_x, position_y, width, height, sort_order) VALUES
('dashboard-executive', 'kpi_card', 'Task Completion Rate', 'kpi', '{"kpi_id": "kpi-task-completion-rate", "period": "today"}', '{"color": "blue", "show_trend": true}', 0, 0, 3, 2, 1),
('dashboard-executive', 'kpi_card', 'Temperature Compliance', 'kpi', '{"kpi_id": "kpi-temp-compliance-rate", "period": "today"}', '{"color": "green", "show_trend": true}', 3, 0, 3, 2, 2),
('dashboard-executive', 'kpi_card', 'Prime Cost %', 'kpi', '{"kpi_id": "kpi-prime-cost", "period": "today"}', '{"color": "orange", "show_trend": true}', 6, 0, 3, 2, 3),
('dashboard-executive', 'kpi_card', 'Open Violations', 'custom_query', '{"table": "violations", "count": "status", "filter": {"status": ["open", "in_progress"]}}', '{"color": "red"}', 9, 0, 3, 2, 4),
('dashboard-executive', 'line_chart', 'Task Completion Trend (7 Days)', 'kpi', '{"kpi_id": "kpi-task-completion-rate", "period": "last_7_days"}', '{"x_axis": "date", "y_axis": "value"}', 0, 2, 6, 4, 5),
('dashboard-executive', 'bar_chart', 'Location Comparison', 'aggregation', '{"view": "location_comparison", "metric": "monthly_completed_tasks"}', '{"x_axis": "location_name", "y_axis": "count"}', 6, 2, 6, 4, 6);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pattyshack_user;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO pattyshack_user;
