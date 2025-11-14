-- Task Templates Migration
-- Adds task_templates table for reusable task templates

CREATE TABLE IF NOT EXISTS task_templates (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  type VARCHAR(50) CHECK (type IN ('checklist', 'line_check', 'food_safety', 'opening', 'closing', 'custom')),
  priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  estimated_duration INTEGER, -- in minutes
  requires_photo_verification BOOLEAN DEFAULT false,
  requires_signature BOOLEAN DEFAULT false,
  checklist_items JSONB DEFAULT '[]',
  instructions TEXT,
  tags JSONB DEFAULT '[]',
  is_public BOOLEAN DEFAULT false,
  created_by VARCHAR(255),
  brand_id VARCHAR(255), -- null means available to all brands
  active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_task_templates_category ON task_templates(category);
CREATE INDEX idx_task_templates_type ON task_templates(type);
CREATE INDEX idx_task_templates_is_public ON task_templates(is_public);
CREATE INDEX idx_task_templates_brand ON task_templates(brand_id);
CREATE INDEX idx_task_templates_active ON task_templates(active);

-- Add template_id column to tasks table to track which template was used
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS template_id VARCHAR(255);
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_template
  FOREIGN KEY (template_id) REFERENCES task_templates(id) ON DELETE SET NULL;

CREATE INDEX idx_tasks_template ON tasks(template_id);

-- Insert some default templates
INSERT INTO task_templates (id, name, description, category, type, priority, requires_photo_verification, checklist_items, instructions, tags, is_public, active)
VALUES
  (
    'template-opening-checklist',
    'Opening Checklist',
    'Standard opening procedures for all locations',
    'Daily Operations',
    'opening',
    'high',
    true,
    '[
      {"item": "Unlock doors and turn on lights", "required": true},
      {"item": "Check equipment is functioning properly", "required": true},
      {"item": "Verify temperature logs are up to date", "required": true},
      {"item": "Check stock levels and prep inventory", "required": true},
      {"item": "Sanitize all prep surfaces", "required": true},
      {"item": "Review daily specials and 86 list", "required": false},
      {"item": "Set up POS system and cash registers", "required": true},
      {"item": "Brief staff on daily priorities", "required": false}
    ]'::jsonb,
    'Complete all items on the checklist before opening. Take photos of equipment and prep areas.',
    '["opening", "daily", "checklist"]'::jsonb,
    true,
    true
  ),
  (
    'template-closing-checklist',
    'Closing Checklist',
    'Standard closing procedures for all locations',
    'Daily Operations',
    'closing',
    'high',
    true,
    '[
      {"item": "Count and secure cash registers", "required": true},
      {"item": "Clean and sanitize all equipment", "required": true},
      {"item": "Log final temperature readings", "required": true},
      {"item": "Cover and label all food items with dates", "required": true},
      {"item": "Take out trash and recycling", "required": true},
      {"item": "Check walk-in coolers and freezers", "required": true},
      {"item": "Lock all doors and arm security system", "required": true},
      {"item": "Complete daily sales report", "required": true}
    ]'::jsonb,
    'Complete all items on the checklist before leaving. Verify all equipment is properly shut down.',
    '["closing", "daily", "checklist"]'::jsonb,
    true,
    true
  ),
  (
    'template-line-check',
    'Line Check',
    'Pre-service line check for food safety and quality',
    'Food Safety',
    'line_check',
    'critical',
    true,
    '[
      {"item": "Check all food temperatures (cold holding < 41°F)", "required": true},
      {"item": "Check all food temperatures (hot holding > 135°F)", "required": true},
      {"item": "Verify all food items are properly labeled and dated", "required": true},
      {"item": "Check for cross-contamination risks", "required": true},
      {"item": "Inspect for signs of spoilage or damage", "required": true},
      {"item": "Verify proper food storage (FIFO)", "required": true},
      {"item": "Check hand washing stations are stocked", "required": true},
      {"item": "Verify thermometers are calibrated", "required": true}
    ]'::jsonb,
    'Perform before each service period. Document all temperature readings and any corrective actions taken.',
    '["food-safety", "line-check", "haccp"]'::jsonb,
    true,
    true
  ),
  (
    'template-deep-clean',
    'Weekly Deep Clean',
    'Comprehensive cleaning tasks for weekly maintenance',
    'Maintenance',
    'custom',
    'medium',
    true,
    '[
      {"item": "Deep clean oven and grill", "required": true},
      {"item": "Clean hood filters and exhaust system", "required": true},
      {"item": "Clean and degrease floors behind equipment", "required": true},
      {"item": "Clean walk-in cooler shelves and walls", "required": true},
      {"item": "Sanitize ice machine interior", "required": true},
      {"item": "Clean beverage dispensers and nozzles", "required": true},
      {"item": "Organize and clean dry storage areas", "required": true},
      {"item": "Clean windows and glass surfaces", "required": false}
    ]'::jsonb,
    'Schedule during slower periods. May require 2-3 hours depending on location size.',
    '["cleaning", "weekly", "maintenance"]'::jsonb,
    true,
    true
  ),
  (
    'template-inventory-count',
    'Monthly Inventory Count',
    'Complete inventory count for cost control',
    'Inventory',
    'custom',
    'high',
    false,
    '[
      {"item": "Count all dry goods and supplies", "required": true},
      {"item": "Count all refrigerated items", "required": true},
      {"item": "Count all frozen items", "required": true},
      {"item": "Count all beverages and bar items", "required": true},
      {"item": "Verify counts against POS usage", "required": true},
      {"item": "Log waste and shrinkage with reasons", "required": true},
      {"item": "Update par levels for ordering", "required": false},
      {"item": "Submit inventory report to management", "required": true}
    ]'::jsonb,
    'Perform at the end of each month. Ensure all deliveries are received before starting count.',
    '["inventory", "monthly", "cost-control"]'::jsonb,
    true,
    true
  );
