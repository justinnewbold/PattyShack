-- Scheduling System Migration
-- Employee scheduling, availability, time-off requests, and automated schedule generation

-- Employee availability
CREATE TABLE IF NOT EXISTS employee_availability (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  location_id VARCHAR(255) NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_preferred BOOLEAN DEFAULT false,
  effective_date DATE,
  expiration_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

CREATE INDEX idx_availability_user ON employee_availability(user_id);
CREATE INDEX idx_availability_location ON employee_availability(location_id);
CREATE INDEX idx_availability_day ON employee_availability(day_of_week);

-- Time-off requests
CREATE TABLE IF NOT EXISTS time_off_requests (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  location_id VARCHAR(255) NOT NULL,
  request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('vacation', 'sick', 'personal', 'unpaid', 'other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER,
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')),
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_by VARCHAR(255),
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_time_off_user ON time_off_requests(user_id);
CREATE INDEX idx_time_off_location ON time_off_requests(location_id);
CREATE INDEX idx_time_off_status ON time_off_requests(status);
CREATE INDEX idx_time_off_dates ON time_off_requests(start_date, end_date);

-- Schedule templates
CREATE TABLE IF NOT EXISTS schedule_templates (
  id VARCHAR(255) PRIMARY KEY,
  location_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_templates_location ON schedule_templates(location_id);
CREATE INDEX idx_templates_day ON schedule_templates(day_of_week);
CREATE INDEX idx_templates_active ON schedule_templates(is_active);

-- Template shifts
CREATE TABLE IF NOT EXISTS template_shifts (
  id VARCHAR(255) PRIMARY KEY,
  template_id VARCHAR(255) NOT NULL,
  position VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  required_count INTEGER DEFAULT 1,
  preferred_skills JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES schedule_templates(id) ON DELETE CASCADE
);

CREATE INDEX idx_template_shifts_template ON template_shifts(template_id);
CREATE INDEX idx_template_shifts_position ON template_shifts(position);

-- Schedules
CREATE TABLE IF NOT EXISTS schedules (
  id VARCHAR(255) PRIMARY KEY,
  location_id VARCHAR(255) NOT NULL,
  schedule_date DATE NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'locked', 'archived')),
  total_labor_hours DECIMAL(10, 2) DEFAULT 0,
  estimated_labor_cost DECIMAL(12, 2) DEFAULT 0,
  notes TEXT,
  created_by VARCHAR(255),
  published_by VARCHAR(255),
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (published_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(location_id, schedule_date)
);

CREATE INDEX idx_schedules_location ON schedules(location_id);
CREATE INDEX idx_schedules_date ON schedules(schedule_date);
CREATE INDEX idx_schedules_week ON schedules(week_start, week_end);
CREATE INDEX idx_schedules_status ON schedules(status);

-- Shifts
CREATE TABLE IF NOT EXISTS shifts (
  id VARCHAR(255) PRIMARY KEY,
  schedule_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255),
  position VARCHAR(100) NOT NULL,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER DEFAULT 0,
  total_hours DECIMAL(5, 2),
  hourly_rate DECIMAL(10, 2),
  estimated_cost DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'declined', 'no_show', 'completed', 'cancelled')),
  notes TEXT,
  is_overtime BOOLEAN DEFAULT false,
  requires_coverage BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_shifts_schedule ON shifts(schedule_id);
CREATE INDEX idx_shifts_user ON shifts(user_id);
CREATE INDEX idx_shifts_date ON shifts(shift_date);
CREATE INDEX idx_shifts_status ON shifts(status);
CREATE INDEX idx_shifts_position ON shifts(position);

-- Shift trades
CREATE TABLE IF NOT EXISTS shift_trades (
  id VARCHAR(255) PRIMARY KEY,
  shift_id VARCHAR(255) NOT NULL,
  from_user_id VARCHAR(255) NOT NULL,
  to_user_id VARCHAR(255),
  trade_type VARCHAR(50) NOT NULL CHECK (trade_type IN ('swap', 'giveaway', 'pickup')),
  offered_shift_id VARCHAR(255),
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'approved', 'rejected')),
  manager_approval_required BOOLEAN DEFAULT true,
  approved_by VARCHAR(255),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (offered_shift_id) REFERENCES shifts(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_trades_shift ON shift_trades(shift_id);
CREATE INDEX idx_trades_from_user ON shift_trades(from_user_id);
CREATE INDEX idx_trades_to_user ON shift_trades(to_user_id);
CREATE INDEX idx_trades_status ON shift_trades(status);

-- Schedule conflicts view
CREATE OR REPLACE VIEW schedule_conflicts AS
SELECT
  s1.id as shift1_id,
  s2.id as shift2_id,
  s1.user_id,
  u.name as employee_name,
  s1.shift_date,
  s1.start_time as shift1_start,
  s1.end_time as shift1_end,
  s2.start_time as shift2_start,
  s2.end_time as shift2_end,
  'overlapping_shifts' as conflict_type
FROM shifts s1
JOIN shifts s2 ON
  s1.user_id = s2.user_id
  AND s1.shift_date = s2.shift_date
  AND s1.id < s2.id
  AND s1.start_time < s2.end_time
  AND s1.end_time > s2.start_time
  AND s1.status NOT IN ('cancelled', 'declined')
  AND s2.status NOT IN ('cancelled', 'declined')
JOIN users u ON s1.user_id = u.id

UNION ALL

SELECT
  s.id as shift1_id,
  NULL as shift2_id,
  s.user_id,
  u.name as employee_name,
  s.shift_date,
  s.start_time as shift1_start,
  s.end_time as shift1_end,
  NULL as shift2_start,
  NULL as shift2_end,
  'time_off_conflict' as conflict_type
FROM shifts s
JOIN users u ON s.user_id = u.id
JOIN time_off_requests tor ON
  s.user_id = tor.user_id
  AND s.shift_date >= tor.start_date
  AND s.shift_date <= tor.end_date
  AND tor.status = 'approved'
  AND s.status NOT IN ('cancelled', 'declined');

-- Employee schedule view
CREATE OR REPLACE VIEW employee_schedule_view AS
SELECT
  s.id as shift_id,
  s.schedule_id,
  s.user_id,
  u.name as employee_name,
  u.email as employee_email,
  s.position,
  s.shift_date,
  s.start_time,
  s.end_time,
  s.break_minutes,
  s.total_hours,
  s.estimated_cost,
  s.status,
  s.is_overtime,
  s.requires_coverage,
  sch.location_id,
  l.name as location_name,
  sch.status as schedule_status,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM time_off_requests tor
      WHERE tor.user_id = s.user_id
        AND s.shift_date >= tor.start_date
        AND s.shift_date <= tor.end_date
        AND tor.status = 'approved'
    ) THEN true
    ELSE false
  END as has_time_off_conflict
FROM shifts s
JOIN schedules sch ON s.schedule_id = sch.id
JOIN locations l ON sch.location_id = l.id
LEFT JOIN users u ON s.user_id = u.id;

-- Weekly schedule summary view
CREATE OR REPLACE VIEW weekly_schedule_summary AS
SELECT
  sch.location_id,
  l.name as location_name,
  sch.week_start,
  sch.week_end,
  sch.status as schedule_status,
  COUNT(DISTINCT s.id) as total_shifts,
  COUNT(DISTINCT s.user_id) as unique_employees,
  SUM(s.total_hours) as total_hours,
  SUM(s.estimated_cost) as total_labor_cost,
  COUNT(CASE WHEN s.requires_coverage THEN 1 END) as uncovered_shifts,
  COUNT(CASE WHEN s.status = 'confirmed' THEN 1 END) as confirmed_shifts,
  COUNT(CASE WHEN s.status = 'declined' THEN 1 END) as declined_shifts
FROM schedules sch
JOIN locations l ON sch.location_id = l.id
LEFT JOIN shifts s ON sch.id = s.schedule_id
GROUP BY sch.location_id, l.name, sch.week_start, sch.week_end, sch.status;

-- Insert sample data
INSERT INTO schedule_templates (id, location_id, name, description, day_of_week, is_active)
SELECT
  'template-weekday-' || l.id,
  l.id,
  'Standard Weekday',
  'Standard Monday-Friday schedule',
  NULL,
  true
FROM locations l
LIMIT 1;

INSERT INTO schedule_templates (id, location_id, name, description, day_of_week, is_active)
SELECT
  'template-weekend-' || l.id,
  l.id,
  'Standard Weekend',
  'Standard Saturday-Sunday schedule',
  NULL,
  true
FROM locations l
LIMIT 1;

-- Insert template shifts for weekday
INSERT INTO template_shifts (id, template_id, position, start_time, end_time, required_count)
SELECT
  'tshift-weekday-morning-' || seq,
  st.id,
  positions.position,
  '06:00:00',
  '14:00:00',
  2
FROM schedule_templates st
CROSS JOIN generate_series(1, 3) seq
CROSS JOIN (VALUES ('cook'), ('server'), ('prep')) positions(position)
WHERE st.name = 'Standard Weekday'
LIMIT 9;

-- Insert template shifts for weekend
INSERT INTO template_shifts (id, template_id, position, start_time, end_time, required_count)
SELECT
  'tshift-weekend-' || seq,
  st.id,
  positions.position,
  '08:00:00',
  '16:00:00',
  3
FROM schedule_templates st
CROSS JOIN generate_series(1, 3) seq
CROSS JOIN (VALUES ('cook'), ('server'), ('host')) positions(position)
WHERE st.name = 'Standard Weekend'
LIMIT 9;
