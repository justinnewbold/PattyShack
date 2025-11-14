-- Task Escalation and Enhanced Photo Verification Migration

-- Task escalation rules table
CREATE TABLE IF NOT EXISTS task_escalation_rules (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  applies_to_type VARCHAR(50),
  applies_to_category VARCHAR(100),
  applies_to_priority VARCHAR(50),
  escalate_after_hours INTEGER NOT NULL DEFAULT 24,
  escalate_to_priority VARCHAR(50) NOT NULL,
  notify_roles JSONB DEFAULT '[]',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_escalation_rules_type ON task_escalation_rules(applies_to_type);
CREATE INDEX idx_escalation_rules_priority ON task_escalation_rules(applies_to_priority);
CREATE INDEX idx_escalation_rules_active ON task_escalation_rules(active);

-- Task escalation log
CREATE TABLE IF NOT EXISTS task_escalations (
  id VARCHAR(255) PRIMARY KEY,
  task_id VARCHAR(255) NOT NULL,
  rule_id VARCHAR(255),
  previous_priority VARCHAR(50) NOT NULL,
  new_priority VARCHAR(50) NOT NULL,
  escalated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  escalated_by VARCHAR(50) DEFAULT 'system',
  reason TEXT,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (rule_id) REFERENCES task_escalation_rules(id) ON DELETE SET NULL
);

CREATE INDEX idx_escalations_task ON task_escalations(task_id);
CREATE INDEX idx_escalations_escalated_at ON task_escalations(escalated_at);

-- Photo annotations table
CREATE TABLE IF NOT EXISTS task_photo_annotations (
  id VARCHAR(255) PRIMARY KEY,
  task_id VARCHAR(255) NOT NULL,
  photo_url TEXT NOT NULL,
  annotations JSONB DEFAULT '[]',
  annotation_data JSONB DEFAULT '{}',
  annotated_by VARCHAR(255),
  annotated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (annotated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_photo_annotations_task ON task_photo_annotations(task_id);
CREATE INDEX idx_photo_annotations_annotated_by ON task_photo_annotations(annotated_by);

-- Add escalation tracking fields to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_escalated_at TIMESTAMP;

CREATE INDEX idx_tasks_escalation_level ON tasks(escalation_level);

-- Insert default escalation rules
INSERT INTO task_escalation_rules (id, name, description, applies_to_type, escalate_after_hours, escalate_to_priority, notify_roles, active)
VALUES
  (
    'rule-critical-overdue',
    'Critical Task Overdue',
    'Escalate critical tasks that are overdue by 2 hours',
    'food_safety',
    2,
    'critical',
    '["manager", "district"]'::jsonb,
    true
  ),
  (
    'rule-high-priority-stale',
    'High Priority Stale',
    'Escalate high priority tasks that haven''t been started after 24 hours',
    NULL,
    24,
    'critical',
    '["manager"]'::jsonb,
    true
  ),
  (
    'rule-medium-priority-aging',
    'Medium Priority Aging',
    'Escalate medium priority tasks after 48 hours',
    NULL,
    48,
    'high',
    '["manager"]'::jsonb,
    true
  );

-- Create view for tasks needing escalation
CREATE OR REPLACE VIEW tasks_needing_escalation AS
SELECT
  t.id,
  t.title,
  t.type,
  t.category,
  t.priority,
  t.status,
  t.due_date,
  t.created_at,
  t.escalation_level,
  r.id as rule_id,
  r.name as rule_name,
  r.escalate_to_priority,
  r.notify_roles,
  EXTRACT(EPOCH FROM (NOW() - COALESCE(t.last_escalated_at, t.created_at))) / 3600 as hours_since_last_escalation
FROM tasks t
CROSS JOIN task_escalation_rules r
WHERE r.active = true
  AND t.status IN ('pending', 'in_progress')
  AND (r.applies_to_type IS NULL OR r.applies_to_type = t.type)
  AND (r.applies_to_category IS NULL OR r.applies_to_category = t.category)
  AND (r.applies_to_priority IS NULL OR r.applies_to_priority = t.priority)
  AND EXTRACT(EPOCH FROM (NOW() - COALESCE(t.last_escalated_at, t.created_at))) / 3600 >= r.escalate_after_hours
  AND t.priority != r.escalate_to_priority;
