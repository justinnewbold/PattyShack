-- PattyShack Initial Database Schema
-- Creates all tables for the restaurant operations platform

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('crew', 'manager', 'district', 'regional', 'corporate')),
  location_id VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  phone VARCHAR(50),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_location ON users(location_id);
CREATE INDEX idx_users_role ON users(role);

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  address TEXT,
  city VARCHAR(255),
  state VARCHAR(50),
  zip VARCHAR(20),
  phone VARCHAR(50),
  type VARCHAR(50) CHECK (type IN ('corporate', 'franchise')),
  brand_id VARCHAR(255),
  district_id VARCHAR(255),
  region_id VARCHAR(255),
  manager_id VARCHAR(255),
  timezone VARCHAR(100) DEFAULT 'America/New_York',
  active BOOLEAN DEFAULT true,
  opening_date DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_locations_district ON locations(district_id);
CREATE INDEX idx_locations_region ON locations(region_id);
CREATE INDEX idx_locations_brand ON locations(brand_id);
CREATE INDEX idx_locations_active ON locations(active);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  type VARCHAR(50) CHECK (type IN ('checklist', 'line_check', 'food_safety', 'opening', 'closing', 'custom')),
  category VARCHAR(100),
  location_id VARCHAR(255) NOT NULL,
  assigned_to VARCHAR(255),
  priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'overdue')),
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  completed_by VARCHAR(255),
  recurring BOOLEAN DEFAULT false,
  recurrence_pattern VARCHAR(50),
  recurrence_interval INTEGER,
  requires_photo_verification BOOLEAN DEFAULT false,
  photo_urls JSONB DEFAULT '[]',
  requires_signature BOOLEAN DEFAULT false,
  signature_url TEXT,
  checklist_items JSONB DEFAULT '[]',
  notes TEXT,
  corrective_actions JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_tasks_location ON tasks(location_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_type ON tasks(type);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_recurring ON tasks(recurring);

-- Temperature Logs table
CREATE TABLE IF NOT EXISTS temperature_logs (
  id VARCHAR(255) PRIMARY KEY,
  location_id VARCHAR(255) NOT NULL,
  equipment_id VARCHAR(255) NOT NULL,
  equipment_type VARCHAR(50) CHECK (equipment_type IN ('refrigerator', 'freezer', 'hot_holding', 'prep_table', 'ambient')),
  temperature DECIMAL(5, 2) NOT NULL,
  unit VARCHAR(1) DEFAULT 'F' CHECK (unit IN ('F', 'C')),
  threshold_min DECIMAL(5, 2),
  threshold_max DECIMAL(5, 2),
  is_in_range BOOLEAN,
  source VARCHAR(50) DEFAULT 'manual' CHECK (source IN ('manual', 'iot_sensor', 'bluetooth_probe')),
  sensor_id VARCHAR(255),
  recorded_by VARCHAR(255),
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  corrective_action TEXT,
  alert_sent BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_temp_logs_location ON temperature_logs(location_id);
CREATE INDEX idx_temp_logs_equipment ON temperature_logs(equipment_id);
CREATE INDEX idx_temp_logs_equipment_type ON temperature_logs(equipment_type);
CREATE INDEX idx_temp_logs_recorded_at ON temperature_logs(recorded_at);
CREATE INDEX idx_temp_logs_in_range ON temperature_logs(is_in_range);

-- Inventory Items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id VARCHAR(255) PRIMARY KEY,
  location_id VARCHAR(255) NOT NULL,
  name VARCHAR(500) NOT NULL,
  sku VARCHAR(100),
  barcode VARCHAR(100),
  category VARCHAR(100),
  unit VARCHAR(50),
  current_quantity DECIMAL(10, 2) DEFAULT 0,
  par_level DECIMAL(10, 2) DEFAULT 0,
  reorder_point DECIMAL(10, 2) DEFAULT 0,
  unit_cost DECIMAL(10, 2) DEFAULT 0,
  total_value DECIMAL(10, 2) DEFAULT 0,
  vendor_id VARCHAR(255),
  last_count_date TIMESTAMP,
  last_count_by VARCHAR(255),
  last_order_date TIMESTAMP,
  last_received_date TIMESTAMP,
  waste_tracking JSONB DEFAULT '[]',
  used_in_recipes JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (last_count_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_inventory_location ON inventory_items(location_id);
CREATE INDEX idx_inventory_category ON inventory_items(category);
CREATE INDEX idx_inventory_sku ON inventory_items(sku);
CREATE INDEX idx_inventory_barcode ON inventory_items(barcode);

-- Schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id VARCHAR(255) PRIMARY KEY,
  location_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  position VARCHAR(100),
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'no_show', 'open')),
  clock_in_time TIMESTAMP,
  clock_out_time TIMESTAMP,
  clock_in_location TEXT,
  break_duration INTEGER DEFAULT 0,
  actual_hours DECIMAL(5, 2) DEFAULT 0,
  scheduled_hours DECIMAL(5, 2) DEFAULT 0,
  labor_cost DECIMAL(10, 2) DEFAULT 0,
  hourly_rate DECIMAL(10, 2) DEFAULT 0,
  approved_by VARCHAR(255),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_schedules_location ON schedules(location_id);
CREATE INDEX idx_schedules_user ON schedules(user_id);
CREATE INDEX idx_schedules_date ON schedules(date);
CREATE INDEX idx_schedules_status ON schedules(status);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(255) PRIMARY KEY,
  location_id VARCHAR(255) NOT NULL,
  vendor_id VARCHAR(255),
  invoice_number VARCHAR(100) NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE,
  subtotal DECIMAL(10, 2) DEFAULT 0,
  tax DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'disputed')),
  line_items JSONB DEFAULT '[]',
  attachments JSONB DEFAULT '[]',
  ocr_processed BOOLEAN DEFAULT false,
  ocr_confidence DECIMAL(5, 2) DEFAULT 0,
  gl_code VARCHAR(50),
  approved_by VARCHAR(255),
  approved_at TIMESTAMP,
  paid_at TIMESTAMP,
  payment_method VARCHAR(100),
  reconciled BOOLEAN DEFAULT false,
  reconciled_with VARCHAR(255),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_invoices_location ON invoices(location_id);
CREATE INDEX idx_invoices_vendor ON invoices(vendor_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- Temperature Alerts table (for tracking alert lifecycle)
CREATE TABLE IF NOT EXISTS temperature_alerts (
  id VARCHAR(255) PRIMARY KEY,
  temperature_log_id VARCHAR(255) NOT NULL,
  location_id VARCHAR(255) NOT NULL,
  equipment_id VARCHAR(255) NOT NULL,
  equipment_type VARCHAR(50),
  temperature DECIMAL(5, 2),
  threshold_min DECIMAL(5, 2),
  threshold_max DECIMAL(5, 2),
  direction VARCHAR(10) CHECK (direction IN ('low', 'high')),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  severity VARCHAR(50) DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  acknowledged_by VARCHAR(255),
  acknowledged_at TIMESTAMP,
  resolved_by VARCHAR(255),
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  notes JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (temperature_log_id) REFERENCES temperature_logs(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_temp_alerts_location ON temperature_alerts(location_id);
CREATE INDEX idx_temp_alerts_equipment ON temperature_alerts(equipment_id);
CREATE INDEX idx_temp_alerts_status ON temperature_alerts(status);
CREATE INDEX idx_temp_alerts_created_at ON temperature_alerts(created_at);

-- Inventory Count Records table (for tracking count history)
CREATE TABLE IF NOT EXISTS inventory_counts (
  id VARCHAR(255) PRIMARY KEY,
  location_id VARCHAR(255) NOT NULL,
  count_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  counted_by VARCHAR(255),
  status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'reconciled')),
  total_variance_cost DECIMAL(10, 2) DEFAULT 0,
  line_items JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (counted_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_inv_counts_location ON inventory_counts(location_id);
CREATE INDEX idx_inv_counts_date ON inventory_counts(count_date);
