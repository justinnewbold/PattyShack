-- Phase 10: Compliance & Audit Trail System

-- Audit logs for all system operations
CREATE TABLE audit_logs (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  entity_type VARCHAR(100) NOT NULL, -- users, tasks, inventory, temperatures, etc.
  entity_id VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL, -- create, update, delete, view, approve, reject
  user_id VARCHAR(255) REFERENCES users(id),
  location_id VARCHAR(255) REFERENCES locations(id),
  changes JSONB, -- Before/after values for updates
  metadata JSONB, -- Additional context (IP, user agent, etc.)
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  severity VARCHAR(20) DEFAULT 'info' -- info, warning, critical
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_location ON audit_logs(location_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Compliance checklist templates (e.g., health inspections, HACCP)
CREATE TABLE compliance_checklists (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  checklist_type VARCHAR(100) NOT NULL, -- health_inspection, haccp, opening, closing, daily, weekly, monthly
  category VARCHAR(100), -- food_safety, cleanliness, equipment, documentation
  regulatory_body VARCHAR(255), -- FDA, local_health_dept, OSHA, etc.
  is_required BOOLEAN DEFAULT true,
  frequency VARCHAR(50), -- daily, weekly, monthly, quarterly, annual, on_demand
  location_id VARCHAR(255) REFERENCES locations(id), -- NULL for company-wide
  is_active BOOLEAN DEFAULT true,
  passing_score INTEGER, -- Minimum score to pass (percentage)
  requires_signature BOOLEAN DEFAULT false,
  requires_photo_evidence BOOLEAN DEFAULT false,
  created_by VARCHAR(255) REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_compliance_checklists_type ON compliance_checklists(checklist_type);
CREATE INDEX idx_compliance_checklists_location ON compliance_checklists(location_id);

-- Items within compliance checklists
CREATE TABLE compliance_checklist_items (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  checklist_id VARCHAR(255) NOT NULL REFERENCES compliance_checklists(id) ON DELETE CASCADE,
  item_text TEXT NOT NULL,
  description TEXT,
  category VARCHAR(100),
  response_type VARCHAR(50) NOT NULL DEFAULT 'yes_no', -- yes_no, pass_fail, numeric, text, temperature, multiple_choice
  response_options JSONB, -- For multiple choice
  is_critical BOOLEAN DEFAULT false, -- Critical items must pass
  requires_photo BOOLEAN DEFAULT false,
  requires_corrective_action_on_fail BOOLEAN DEFAULT false,
  reference_standard VARCHAR(255), -- e.g., "FDA Food Code 3-501.16"
  sort_order INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_checklist_items_checklist ON compliance_checklist_items(checklist_id);

-- Compliance inspection instances
CREATE TABLE compliance_inspections (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  checklist_id VARCHAR(255) NOT NULL REFERENCES compliance_checklists(id),
  location_id VARCHAR(255) NOT NULL REFERENCES locations(id),
  inspection_type VARCHAR(50) DEFAULT 'internal', -- internal, external, regulatory
  inspector_user_id VARCHAR(255) REFERENCES users(id),
  inspector_name VARCHAR(255), -- For external inspectors
  inspector_organization VARCHAR(255),
  scheduled_date TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, failed, passed
  score INTEGER, -- 0-100
  passed BOOLEAN,
  signature_data TEXT, -- Base64 signature image
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inspections_checklist ON compliance_inspections(checklist_id);
CREATE INDEX idx_inspections_location ON compliance_inspections(location_id);
CREATE INDEX idx_inspections_status ON compliance_inspections(status);
CREATE INDEX idx_inspections_date ON compliance_inspections(scheduled_date);

-- Responses to checklist items during inspections
CREATE TABLE compliance_inspection_responses (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  inspection_id VARCHAR(255) NOT NULL REFERENCES compliance_inspections(id) ON DELETE CASCADE,
  checklist_item_id VARCHAR(255) NOT NULL REFERENCES compliance_checklist_items(id),
  response_value TEXT, -- Yes/No, Pass/Fail, numeric value, or text
  is_compliant BOOLEAN,
  photo_urls TEXT[], -- Array of photo evidence URLs
  notes TEXT,
  flagged_for_action BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inspection_responses_inspection ON compliance_inspection_responses(inspection_id);
CREATE INDEX idx_inspection_responses_item ON compliance_inspection_responses(checklist_item_id);

-- Compliance violations tracking
CREATE TABLE violations (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  location_id VARCHAR(255) NOT NULL REFERENCES locations(id),
  inspection_id VARCHAR(255) REFERENCES compliance_inspections(id),
  violation_type VARCHAR(100) NOT NULL, -- food_safety, cleanliness, documentation, equipment, labor
  severity VARCHAR(20) NOT NULL, -- minor, major, critical
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  regulatory_reference VARCHAR(255),
  detected_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  detected_by VARCHAR(255) REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'open', -- open, in_progress, resolved, closed
  resolution_required_by TIMESTAMP,
  resolved_at TIMESTAMP,
  resolved_by VARCHAR(255) REFERENCES users(id),
  resolution_notes TEXT,
  photo_urls TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_violations_location ON violations(location_id);
CREATE INDEX idx_violations_inspection ON violations(inspection_id);
CREATE INDEX idx_violations_status ON violations(status);
CREATE INDEX idx_violations_severity ON violations(severity);

-- Corrective actions for violations
CREATE TABLE corrective_actions (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  violation_id VARCHAR(255) NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
  action_description TEXT NOT NULL,
  assigned_to VARCHAR(255) REFERENCES users(id),
  due_date TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, verified
  completed_at TIMESTAMP,
  completed_by VARCHAR(255) REFERENCES users(id),
  verification_required BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,
  verified_by VARCHAR(255) REFERENCES users(id),
  verification_notes TEXT,
  photo_urls TEXT[], -- Evidence of completion
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_corrective_actions_violation ON corrective_actions(violation_id);
CREATE INDEX idx_corrective_actions_assigned ON corrective_actions(assigned_to);
CREATE INDEX idx_corrective_actions_status ON corrective_actions(status);

-- Document management (certificates, licenses, SOPs, permits)
CREATE TABLE documents (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  title VARCHAR(255) NOT NULL,
  document_type VARCHAR(100) NOT NULL, -- license, certificate, sop, permit, policy, training, inspection_report
  category VARCHAR(100), -- food_handler, liquor_license, health_permit, etc.
  location_id VARCHAR(255) REFERENCES locations(id), -- NULL for company-wide
  file_url VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  version INTEGER DEFAULT 1,
  issue_date DATE,
  expiration_date DATE,
  issuing_authority VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active', -- active, expired, pending_renewal, archived
  is_regulatory_required BOOLEAN DEFAULT false,
  reminder_days_before_expiry INTEGER DEFAULT 30,
  owner_user_id VARCHAR(255) REFERENCES users(id),
  uploaded_by VARCHAR(255) REFERENCES users(id),
  tags VARCHAR(100)[],
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_location ON documents(location_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_expiration ON documents(expiration_date);

-- Document version history
CREATE TABLE document_versions (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  document_id VARCHAR(255) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  change_description TEXT,
  uploaded_by VARCHAR(255) REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_document_versions_document ON document_versions(document_id);

-- Regulatory requirements tracking
CREATE TABLE regulatory_requirements (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  requirement_type VARCHAR(100) NOT NULL, -- inspection, certification, training, reporting
  regulatory_body VARCHAR(255) NOT NULL, -- FDA, OSHA, local_health_dept, etc.
  frequency VARCHAR(50), -- annual, quarterly, monthly, one_time
  location_id VARCHAR(255) REFERENCES locations(id),
  next_due_date DATE,
  responsible_user_id VARCHAR(255) REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, overdue
  last_completed_date DATE,
  completion_proof_document_id VARCHAR(255) REFERENCES documents(id),
  reminder_days_before INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_regulatory_requirements_location ON regulatory_requirements(location_id);
CREATE INDEX idx_regulatory_requirements_due_date ON regulatory_requirements(next_due_date);
CREATE INDEX idx_regulatory_requirements_status ON regulatory_requirements(status);

-- Compliance reports (generated summaries)
CREATE TABLE compliance_reports (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  report_type VARCHAR(100) NOT NULL, -- inspection_summary, violation_summary, audit_log_summary, regulatory_compliance
  title VARCHAR(255) NOT NULL,
  location_id VARCHAR(255) REFERENCES locations(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  generated_by VARCHAR(255) REFERENCES users(id),
  report_data JSONB NOT NULL, -- Structured report data
  summary TEXT,
  pdf_url VARCHAR(500),
  status VARCHAR(50) DEFAULT 'draft', -- draft, final, archived
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_compliance_reports_location ON compliance_reports(location_id);
CREATE INDEX idx_compliance_reports_type ON compliance_reports(report_type);
CREATE INDEX idx_compliance_reports_dates ON compliance_reports(start_date, end_date);

-- Temperature monitoring compliance view
CREATE VIEW temperature_compliance_view AS
SELECT
  t.location_id,
  l.name as location_name,
  COUNT(*) as total_readings,
  COUNT(*) FILTER (WHERE t.is_within_range = false) as out_of_range_count,
  COUNT(*) FILTER (WHERE t.corrective_action_taken = true) as corrected_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE t.is_within_range = true) / COUNT(*), 2) as compliance_rate,
  MAX(t.created_at) as last_reading_at
FROM temperature_logs t
JOIN locations l ON t.location_id = l.id
WHERE t.created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY t.location_id, l.name;

-- Task completion compliance view
CREATE VIEW task_compliance_view AS
SELECT
  t.location_id,
  l.name as location_name,
  COUNT(*) as total_tasks,
  COUNT(*) FILTER (WHERE t.status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE t.status = 'completed' AND t.completed_at <= t.due_date) as on_time_count,
  COUNT(*) FILTER (WHERE t.status != 'completed' AND t.due_date < CURRENT_TIMESTAMP) as overdue_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE t.status = 'completed') / COUNT(*), 2) as completion_rate,
  ROUND(100.0 * COUNT(*) FILTER (WHERE t.status = 'completed' AND t.completed_at <= t.due_date) / NULLIF(COUNT(*) FILTER (WHERE t.status = 'completed'), 0), 2) as on_time_rate
FROM tasks t
JOIN locations l ON t.location_id = l.id
WHERE t.created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY t.location_id, l.name;

-- Violation summary view
CREATE VIEW violation_summary AS
SELECT
  v.location_id,
  l.name as location_name,
  v.severity,
  COUNT(*) as violation_count,
  COUNT(*) FILTER (WHERE v.status = 'resolved') as resolved_count,
  COUNT(*) FILTER (WHERE v.status = 'open' AND v.resolution_required_by < CURRENT_TIMESTAMP) as overdue_count,
  AVG(EXTRACT(EPOCH FROM (COALESCE(v.resolved_at, CURRENT_TIMESTAMP) - v.detected_date))) / 3600 as avg_resolution_hours
FROM violations v
JOIN locations l ON v.location_id = l.id
GROUP BY v.location_id, l.name, v.severity;

-- Inspection success rate view
CREATE VIEW inspection_success_rate AS
SELECT
  ci.location_id,
  l.name as location_name,
  cc.checklist_type,
  COUNT(*) as total_inspections,
  COUNT(*) FILTER (WHERE ci.passed = true) as passed_count,
  COUNT(*) FILTER (WHERE ci.passed = false) as failed_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE ci.passed = true) / COUNT(*), 2) as pass_rate,
  AVG(ci.score) as avg_score,
  MAX(ci.completed_at) as last_inspection_date
FROM compliance_inspections ci
JOIN locations l ON ci.location_id = l.id
JOIN compliance_checklists cc ON ci.checklist_id = cc.id
WHERE ci.status = 'completed'
GROUP BY ci.location_id, l.name, cc.checklist_type;

-- Sample compliance checklists
INSERT INTO compliance_checklists (id, name, description, checklist_type, category, regulatory_body, frequency, passing_score, requires_signature) VALUES
('checklist-health-inspection', 'Health Department Inspection', 'Standard health department inspection checklist', 'health_inspection', 'food_safety', 'Local Health Department', 'annual', 80, true),
('checklist-haccp-daily', 'HACCP Daily Monitoring', 'Daily HACCP critical control points monitoring', 'haccp', 'food_safety', 'FDA', 'daily', 100, false),
('checklist-opening', 'Opening Procedures', 'Daily opening checklist for restaurant', 'opening', 'operations', NULL, 'daily', 90, false),
('checklist-closing', 'Closing Procedures', 'Daily closing checklist for restaurant', 'closing', 'operations', NULL, 'daily', 90, false),
('checklist-equipment', 'Equipment Safety Check', 'Monthly equipment safety and maintenance check', 'equipment', 'equipment', 'OSHA', 'monthly', 100, false);

-- Sample health inspection checklist items
INSERT INTO compliance_checklist_items (checklist_id, item_text, category, response_type, is_critical, sort_order) VALUES
('checklist-health-inspection', 'Food stored at proper temperatures (cold foods <41°F, hot foods >135°F)', 'food_safety', 'yes_no', true, 1),
('checklist-health-inspection', 'All food handlers have valid food handler cards', 'documentation', 'yes_no', true, 2),
('checklist-health-inspection', 'Hand washing sinks are accessible and stocked with soap and paper towels', 'cleanliness', 'yes_no', true, 3),
('checklist-health-inspection', 'No cross-contamination observed (raw/cooked food separation)', 'food_safety', 'yes_no', true, 4),
('checklist-health-inspection', 'Food preparation surfaces are clean and sanitized', 'cleanliness', 'yes_no', true, 5),
('checklist-health-inspection', 'Proper date marking on ready-to-eat foods', 'food_safety', 'yes_no', true, 6),
('checklist-health-inspection', 'Pest control measures in place, no evidence of pests', 'cleanliness', 'yes_no', true, 7),
('checklist-health-inspection', 'Floors, walls, and ceilings are clean and in good repair', 'cleanliness', 'yes_no', false, 8),
('checklist-health-inspection', 'All equipment is clean and functioning properly', 'equipment', 'yes_no', false, 9),
('checklist-health-inspection', 'Proper storage of chemicals away from food', 'food_safety', 'yes_no', true, 10);

-- Sample HACCP daily monitoring items
INSERT INTO compliance_checklist_items (checklist_id, item_text, category, response_type, is_critical, requires_photo, sort_order) VALUES
('checklist-haccp-daily', 'Walk-in cooler temperature check', 'temperature', 'temperature', true, false, 1),
('checklist-haccp-daily', 'Walk-in freezer temperature check', 'temperature', 'temperature', true, false, 2),
('checklist-haccp-daily', 'Hot holding unit temperature check', 'temperature', 'temperature', true, false, 3),
('checklist-haccp-daily', 'Cold prep table temperature check', 'temperature', 'temperature', true, false, 4),
('checklist-haccp-daily', 'Sanitizer concentration test (200-400 ppm)', 'chemical', 'numeric', true, false, 5);

-- Sample opening checklist items
INSERT INTO compliance_checklist_items (checklist_id, item_text, category, response_type, sort_order) VALUES
('checklist-opening', 'Check all refrigeration units are at proper temperature', 'equipment', 'yes_no', 1),
('checklist-opening', 'Inspect dining area for cleanliness', 'cleanliness', 'yes_no', 2),
('checklist-opening', 'Verify cash registers are functioning', 'equipment', 'yes_no', 3),
('checklist-opening', 'Check restrooms are clean and stocked', 'cleanliness', 'yes_no', 4),
('checklist-opening', 'Review reservation and expected covers for the day', 'operations', 'yes_no', 5);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pattyshack_user;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO pattyshack_user;
