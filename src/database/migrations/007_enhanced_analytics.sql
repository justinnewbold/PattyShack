-- Enhanced Analytics Migration
-- Advanced reporting, labor cost analytics, food cost tracking, and performance metrics

-- Labor cost tracking
CREATE TABLE IF NOT EXISTS labor_entries (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  location_id VARCHAR(255) NOT NULL,
  shift_date DATE NOT NULL,
  clock_in TIMESTAMP NOT NULL,
  clock_out TIMESTAMP,
  total_hours DECIMAL(5, 2),
  hourly_rate DECIMAL(10, 2) NOT NULL,
  total_cost DECIMAL(10, 2),
  overtime_hours DECIMAL(5, 2) DEFAULT 0,
  overtime_cost DECIMAL(10, 2) DEFAULT 0,
  break_minutes INTEGER DEFAULT 0,
  position VARCHAR(100),
  notes TEXT,
  approved_by VARCHAR(255),
  approved_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'approved', 'disputed', 'corrected')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_labor_user ON labor_entries(user_id);
CREATE INDEX idx_labor_location ON labor_entries(location_id);
CREATE INDEX idx_labor_shift_date ON labor_entries(shift_date);
CREATE INDEX idx_labor_status ON labor_entries(status);

-- Sales tracking
CREATE TABLE IF NOT EXISTS sales_entries (
  id VARCHAR(255) PRIMARY KEY,
  location_id VARCHAR(255) NOT NULL,
  sale_date DATE NOT NULL,
  sale_hour INTEGER CHECK (sale_hour >= 0 AND sale_hour <= 23),
  gross_sales DECIMAL(12, 2) NOT NULL DEFAULT 0,
  net_sales DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  tips DECIMAL(10, 2) DEFAULT 0,
  discounts DECIMAL(10, 2) DEFAULT 0,
  voids DECIMAL(10, 2) DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,
  guest_count INTEGER DEFAULT 0,
  average_check DECIMAL(10, 2),
  category_breakdown JSONB DEFAULT '{}',
  payment_methods JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

CREATE INDEX idx_sales_location ON sales_entries(location_id);
CREATE INDEX idx_sales_date ON sales_entries(sale_date);
CREATE INDEX idx_sales_hour ON sales_entries(sale_hour);

-- Food cost tracking
CREATE TABLE IF NOT EXISTS food_cost_entries (
  id VARCHAR(255) PRIMARY KEY,
  location_id VARCHAR(255) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  beginning_inventory DECIMAL(12, 2) NOT NULL,
  purchases DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ending_inventory DECIMAL(12, 2) NOT NULL,
  cost_of_goods_used DECIMAL(12, 2),
  waste_cost DECIMAL(10, 2) DEFAULT 0,
  transfer_in DECIMAL(10, 2) DEFAULT 0,
  transfer_out DECIMAL(10, 2) DEFAULT 0,
  actual_food_cost DECIMAL(12, 2),
  sales_for_period DECIMAL(12, 2),
  food_cost_percentage DECIMAL(5, 2),
  target_food_cost_percentage DECIMAL(5, 2) DEFAULT 30.00,
  variance DECIMAL(5, 2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

CREATE INDEX idx_food_cost_location ON food_cost_entries(location_id);
CREATE INDEX idx_food_cost_period ON food_cost_entries(period_start, period_end);

-- Waste tracking
CREATE TABLE IF NOT EXISTS waste_entries (
  id VARCHAR(255) PRIMARY KEY,
  location_id VARCHAR(255) NOT NULL,
  item_id VARCHAR(255),
  item_name VARCHAR(255) NOT NULL,
  waste_date DATE NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  cost_per_unit DECIMAL(10, 2),
  total_cost DECIMAL(10, 2),
  waste_reason VARCHAR(100) NOT NULL CHECK (waste_reason IN ('spoilage', 'overcook', 'burn', 'drop', 'quality', 'expiration', 'prep_error', 'other')),
  responsible_user_id VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES inventory(id) ON DELETE SET NULL,
  FOREIGN KEY (responsible_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_waste_location ON waste_entries(location_id);
CREATE INDEX idx_waste_date ON waste_entries(waste_date);
CREATE INDEX idx_waste_reason ON waste_entries(waste_reason);
CREATE INDEX idx_waste_item ON waste_entries(item_id);

-- Sales forecasts
CREATE TABLE IF NOT EXISTS sales_forecasts (
  id VARCHAR(255) PRIMARY KEY,
  location_id VARCHAR(255) NOT NULL,
  forecast_date DATE NOT NULL,
  forecast_type VARCHAR(50) NOT NULL CHECK (forecast_type IN ('daily', 'weekly', 'monthly')),
  predicted_sales DECIMAL(12, 2) NOT NULL,
  predicted_transactions INTEGER,
  predicted_guests INTEGER,
  confidence_score DECIMAL(3, 2),
  weather_factor DECIMAL(3, 2),
  event_factor DECIMAL(3, 2),
  historical_average DECIMAL(12, 2),
  trend_adjustment DECIMAL(5, 2),
  actual_sales DECIMAL(12, 2),
  variance DECIMAL(5, 2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  UNIQUE(location_id, forecast_date, forecast_type)
);

CREATE INDEX idx_forecast_location ON sales_forecasts(location_id);
CREATE INDEX idx_forecast_date ON sales_forecasts(forecast_date);

-- Performance metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
  id VARCHAR(255) PRIMARY KEY,
  location_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255),
  metric_date DATE NOT NULL,
  metric_type VARCHAR(100) NOT NULL,
  metric_value DECIMAL(12, 2) NOT NULL,
  target_value DECIMAL(12, 2),
  variance DECIMAL(5, 2),
  unit VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_metrics_location ON performance_metrics(location_id);
CREATE INDEX idx_metrics_user ON performance_metrics(user_id);
CREATE INDEX idx_metrics_date ON performance_metrics(metric_date);
CREATE INDEX idx_metrics_type ON performance_metrics(metric_type);

-- Reporting snapshots (pre-calculated reports for performance)
CREATE TABLE IF NOT EXISTS report_snapshots (
  id VARCHAR(255) PRIMARY KEY,
  location_id VARCHAR(255),
  report_type VARCHAR(100) NOT NULL,
  report_period VARCHAR(50) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  report_data JSONB NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

CREATE INDEX idx_snapshots_location ON report_snapshots(location_id);
CREATE INDEX idx_snapshots_type ON report_snapshots(report_type);
CREATE INDEX idx_snapshots_period ON report_snapshots(period_start, period_end);

-- Prime cost view (Food Cost + Labor Cost)
CREATE OR REPLACE VIEW prime_cost_analysis AS
SELECT
  fc.location_id,
  l.name as location_name,
  fc.period_start,
  fc.period_end,
  fc.actual_food_cost,
  fc.food_cost_percentage,
  COALESCE(SUM(le.total_cost), 0) as total_labor_cost,
  fc.sales_for_period,
  CASE
    WHEN fc.sales_for_period > 0
    THEN (COALESCE(SUM(le.total_cost), 0) / fc.sales_for_period) * 100
    ELSE 0
  END as labor_cost_percentage,
  (fc.actual_food_cost + COALESCE(SUM(le.total_cost), 0)) as prime_cost,
  CASE
    WHEN fc.sales_for_period > 0
    THEN ((fc.actual_food_cost + COALESCE(SUM(le.total_cost), 0)) / fc.sales_for_period) * 100
    ELSE 0
  END as prime_cost_percentage
FROM food_cost_entries fc
JOIN locations l ON fc.location_id = l.id
LEFT JOIN labor_entries le ON
  le.location_id = fc.location_id
  AND le.shift_date >= fc.period_start
  AND le.shift_date <= fc.period_end
  AND le.status = 'approved'
GROUP BY fc.location_id, l.name, fc.period_start, fc.period_end,
         fc.actual_food_cost, fc.food_cost_percentage, fc.sales_for_period;

-- Daily performance dashboard view
CREATE OR REPLACE VIEW daily_performance_dashboard AS
SELECT
  se.location_id,
  l.name as location_name,
  se.sale_date,
  se.net_sales,
  se.transaction_count,
  se.guest_count,
  se.average_check,
  COALESCE(le.daily_labor_cost, 0) as labor_cost,
  CASE
    WHEN se.net_sales > 0
    THEN (COALESCE(le.daily_labor_cost, 0) / se.net_sales) * 100
    ELSE 0
  END as labor_cost_percent,
  COALESCE(we.daily_waste_cost, 0) as waste_cost,
  CASE
    WHEN se.net_sales > 0
    THEN (COALESCE(we.daily_waste_cost, 0) / se.net_sales) * 100
    ELSE 0
  END as waste_percent,
  sf.predicted_sales,
  CASE
    WHEN sf.predicted_sales > 0
    THEN ((se.net_sales - sf.predicted_sales) / sf.predicted_sales) * 100
    ELSE NULL
  END as forecast_variance
FROM sales_entries se
JOIN locations l ON se.location_id = l.id
LEFT JOIN (
  SELECT location_id, shift_date, SUM(total_cost) as daily_labor_cost
  FROM labor_entries
  WHERE status = 'approved'
  GROUP BY location_id, shift_date
) le ON se.location_id = le.location_id AND se.sale_date = le.shift_date
LEFT JOIN (
  SELECT location_id, waste_date, SUM(total_cost) as daily_waste_cost
  FROM waste_entries
  GROUP BY location_id, waste_date
) we ON se.location_id = we.location_id AND se.sale_date = we.waste_date
LEFT JOIN sales_forecasts sf ON
  se.location_id = sf.location_id
  AND se.sale_date = sf.forecast_date
  AND sf.forecast_type = 'daily';

-- Employee productivity view
CREATE OR REPLACE VIEW employee_productivity AS
SELECT
  le.user_id,
  u.name as employee_name,
  le.location_id,
  l.name as location_name,
  DATE_TRUNC('week', le.shift_date) as week_start,
  SUM(le.total_hours) as total_hours,
  SUM(le.total_cost) as total_cost,
  AVG(le.hourly_rate) as avg_hourly_rate,
  COUNT(DISTINCT le.shift_date) as shifts_worked,
  COALESCE(SUM(se.net_sales) / NULLIF(SUM(le.total_hours), 0), 0) as sales_per_hour,
  COALESCE(SUM(tc.completed_count), 0) as tasks_completed
FROM labor_entries le
JOIN users u ON le.user_id = u.id
JOIN locations l ON le.location_id = l.id
LEFT JOIN sales_entries se ON
  le.location_id = se.location_id
  AND le.shift_date = se.sale_date
LEFT JOIN (
  SELECT assigned_to, COUNT(*) as completed_count, created_at::date as task_date
  FROM tasks
  WHERE status = 'completed'
  GROUP BY assigned_to, created_at::date
) tc ON le.user_id = tc.assigned_to AND le.shift_date = tc.task_date
WHERE le.status = 'approved'
GROUP BY le.user_id, u.name, le.location_id, l.name, DATE_TRUNC('week', le.shift_date);

-- Insert sample data
INSERT INTO sales_entries (id, location_id, sale_date, sale_hour, gross_sales, net_sales, transaction_count, guest_count, average_check)
SELECT
  'sale-' || l.id || '-' || TO_CHAR(d.date, 'YYYYMMDD') || '-' || h.hour,
  l.id,
  d.date,
  h.hour,
  RANDOM() * 500 + 100,
  RANDOM() * 450 + 90,
  (RANDOM() * 20 + 5)::INTEGER,
  (RANDOM() * 30 + 10)::INTEGER,
  RANDOM() * 25 + 15
FROM locations l
CROSS JOIN generate_series(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, '1 day') d(date)
CROSS JOIN generate_series(11, 21) h(hour)
LIMIT 300;

-- Update average_check
UPDATE sales_entries
SET average_check = CASE WHEN transaction_count > 0 THEN net_sales / transaction_count ELSE 0 END;

INSERT INTO waste_entries (id, location_id, item_name, waste_date, quantity, unit, cost_per_unit, total_cost, waste_reason)
SELECT
  'waste-' || seq,
  l.id,
  items.item_name,
  CURRENT_DATE - (RANDOM() * 30)::INTEGER,
  RANDOM() * 5 + 0.5,
  'lb',
  RANDOM() * 10 + 2,
  (RANDOM() * 5 + 0.5) * (RANDOM() * 10 + 2),
  (ARRAY['spoilage', 'overcook', 'burn', 'quality', 'expiration'])[FLOOR(RANDOM() * 5 + 1)::INT]
FROM locations l
CROSS JOIN generate_series(1, 20) seq
CROSS JOIN (VALUES ('Ground Beef'), ('Lettuce'), ('Tomatoes'), ('Cheese'), ('Buns')) items(item_name)
LIMIT 100;
