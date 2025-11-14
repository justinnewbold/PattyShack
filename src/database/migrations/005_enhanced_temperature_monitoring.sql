-- Enhanced Temperature Monitoring Migration
-- Adds multi-sensor dashboard, custom thresholds, and predictive analytics

-- Equipment registry table
CREATE TABLE IF NOT EXISTS equipment (
  id VARCHAR(255) PRIMARY KEY,
  location_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  equipment_type VARCHAR(50) NOT NULL CHECK (equipment_type IN ('refrigerator', 'freezer', 'hot_holding', 'prep_table', 'ambient', 'walk_in_cooler', 'walk_in_freezer')),
  manufacturer VARCHAR(255),
  model VARCHAR(255),
  serial_number VARCHAR(255),
  install_date DATE,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'offline', 'decommissioned')),
  sensor_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

CREATE INDEX idx_equipment_location ON equipment(location_id);
CREATE INDEX idx_equipment_type ON equipment(equipment_type);
CREATE INDEX idx_equipment_status ON equipment(status);
CREATE INDEX idx_equipment_sensor ON equipment(sensor_id);

-- Custom temperature thresholds per equipment
CREATE TABLE IF NOT EXISTS temperature_thresholds (
  id VARCHAR(255) PRIMARY KEY,
  equipment_id VARCHAR(255) NOT NULL,
  threshold_min DECIMAL(5, 2) NOT NULL,
  threshold_max DECIMAL(5, 2) NOT NULL,
  warning_min DECIMAL(5, 2),
  warning_max DECIMAL(5, 2),
  critical_duration_minutes INTEGER DEFAULT 30,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
);

CREATE INDEX idx_thresholds_equipment ON temperature_thresholds(equipment_id);
CREATE INDEX idx_thresholds_active ON temperature_thresholds(active);

-- Temperature alerts table
CREATE TABLE IF NOT EXISTS temperature_alerts (
  id VARCHAR(255) PRIMARY KEY,
  equipment_id VARCHAR(255) NOT NULL,
  temperature_log_id VARCHAR(255),
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('critical', 'warning', 'out_of_range', 'sensor_offline', 'trend_anomaly')),
  temperature DECIMAL(5, 2),
  threshold_violated VARCHAR(50),
  severity VARCHAR(50) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'false_alarm')),
  acknowledged_by VARCHAR(255),
  acknowledged_at TIMESTAMP,
  resolved_by VARCHAR(255),
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  notify_roles JSONB DEFAULT '[]',
  notified_users JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
  FOREIGN KEY (temperature_log_id) REFERENCES temperature_logs(id) ON DELETE SET NULL,
  FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_alerts_equipment ON temperature_alerts(equipment_id);
CREATE INDEX idx_alerts_status ON temperature_alerts(status);
CREATE INDEX idx_alerts_severity ON temperature_alerts(severity);
CREATE INDEX idx_alerts_created_at ON temperature_alerts(created_at);

-- Equipment maintenance schedule
CREATE TABLE IF NOT EXISTS equipment_maintenance (
  id VARCHAR(255) PRIMARY KEY,
  equipment_id VARCHAR(255) NOT NULL,
  maintenance_type VARCHAR(50) NOT NULL CHECK (maintenance_type IN ('routine', 'repair', 'inspection', 'calibration', 'cleaning')),
  scheduled_date DATE NOT NULL,
  completed_date DATE,
  performed_by VARCHAR(255),
  notes TEXT,
  cost DECIMAL(10, 2),
  next_maintenance_date DATE,
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'overdue')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_maintenance_equipment ON equipment_maintenance(equipment_id);
CREATE INDEX idx_maintenance_scheduled_date ON equipment_maintenance(scheduled_date);
CREATE INDEX idx_maintenance_status ON equipment_maintenance(status);

-- Cold chain compliance log
CREATE TABLE IF NOT EXISTS cold_chain_events (
  id VARCHAR(255) PRIMARY KEY,
  location_id VARCHAR(255) NOT NULL,
  equipment_id VARCHAR(255),
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('breach', 'recovery', 'power_outage', 'door_open', 'manual_override')),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_minutes INTEGER,
  temperature_at_breach DECIMAL(5, 2),
  max_temperature DECIMAL(5, 2),
  min_temperature DECIMAL(5, 2),
  affected_products JSONB DEFAULT '[]',
  action_taken TEXT,
  reported_by VARCHAR(255),
  severity VARCHAR(50) DEFAULT 'medium',
  compliance_status VARCHAR(50) DEFAULT 'pending' CHECK (compliance_status IN ('pending', 'compliant', 'non_compliant', 'under_review')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE SET NULL,
  FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_cold_chain_location ON cold_chain_events(location_id);
CREATE INDEX idx_cold_chain_equipment ON cold_chain_events(equipment_id);
CREATE INDEX idx_cold_chain_start_time ON cold_chain_events(start_time);
CREATE INDEX idx_cold_chain_compliance ON cold_chain_events(compliance_status);

-- Sensor battery monitoring
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS battery_level INTEGER;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS last_battery_check TIMESTAMP;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS battery_low_threshold INTEGER DEFAULT 20;

-- Add predictive fields to temperature_logs
ALTER TABLE temperature_logs ADD COLUMN IF NOT EXISTS is_anomaly BOOLEAN DEFAULT false;
ALTER TABLE temperature_logs ADD COLUMN IF NOT EXISTS predicted_next_reading DECIMAL(5, 2);
ALTER TABLE temperature_logs ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3, 2);

-- Create view for equipment status dashboard
CREATE OR REPLACE VIEW equipment_status_dashboard AS
SELECT
  e.id,
  e.name,
  e.equipment_type,
  e.location_id,
  l.name as location_name,
  e.status,
  e.battery_level,
  tl.temperature as current_temperature,
  tl.recorded_at as last_reading_at,
  tt.threshold_min,
  tt.threshold_max,
  CASE
    WHEN tl.temperature < tt.threshold_min OR tl.temperature > tt.threshold_max THEN 'out_of_range'
    WHEN tl.temperature < tt.warning_min OR tl.temperature > tt.warning_max THEN 'warning'
    ELSE 'normal'
  END as temperature_status,
  (SELECT COUNT(*) FROM temperature_alerts WHERE equipment_id = e.id AND status = 'active') as active_alerts,
  e.next_maintenance_date,
  CASE
    WHEN e.next_maintenance_date < CURRENT_DATE THEN 'overdue'
    WHEN e.next_maintenance_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
    ELSE 'ok'
  END as maintenance_status
FROM equipment e
LEFT JOIN locations l ON e.location_id = l.id
LEFT JOIN LATERAL (
  SELECT temperature, recorded_at
  FROM temperature_logs
  WHERE equipment_id = e.id
  ORDER BY recorded_at DESC
  LIMIT 1
) tl ON true
LEFT JOIN temperature_thresholds tt ON e.id = tt.equipment_id AND tt.active = true
WHERE e.status = 'active';

-- Insert sample equipment
INSERT INTO equipment (id, location_id, name, equipment_type, manufacturer, status, battery_level)
SELECT
  'equip-walk-in-cooler-1',
  id,
  'Walk-in Cooler #1',
  'walk_in_cooler',
  'TrueCool Systems',
  'active',
  85
FROM locations LIMIT 1;

INSERT INTO equipment (id, location_id, name, equipment_type, manufacturer, status, battery_level)
SELECT
  'equip-freezer-1',
  id,
  'Main Freezer',
  'freezer',
  'Arctic Pro',
  'active',
  72
FROM locations LIMIT 1;

-- Insert default thresholds for sample equipment
INSERT INTO temperature_thresholds (id, equipment_id, threshold_min, threshold_max, warning_min, warning_max, active)
VALUES
  ('thresh-1', 'equip-walk-in-cooler-1', 34.0, 40.0, 35.0, 39.0, true),
  ('thresh-2', 'equip-freezer-1', -10.0, 0.0, -8.0, -2.0, true);
