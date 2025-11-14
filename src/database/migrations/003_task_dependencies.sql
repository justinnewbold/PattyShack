-- Task Dependencies Migration
-- Adds support for task prerequisite chains

CREATE TABLE IF NOT EXISTS task_dependencies (
  id VARCHAR(255) PRIMARY KEY,
  task_id VARCHAR(255) NOT NULL,
  depends_on_task_id VARCHAR(255) NOT NULL,
  dependency_type VARCHAR(50) DEFAULT 'blocks' CHECK (dependency_type IN ('blocks', 'related')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  UNIQUE(task_id, depends_on_task_id)
);

CREATE INDEX idx_task_dependencies_task ON task_dependencies(task_id);
CREATE INDEX idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);
CREATE INDEX idx_task_dependencies_type ON task_dependencies(dependency_type);

-- Add helper view for task readiness
CREATE OR REPLACE VIEW task_readiness AS
SELECT
  t.id as task_id,
  t.status,
  t.title,
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM task_dependencies td
      JOIN tasks dt ON td.depends_on_task_id = dt.id
      WHERE td.task_id = t.id
        AND td.dependency_type = 'blocks'
        AND dt.status != 'completed'
    ) THEN true
    ELSE false
  END as is_ready,
  (
    SELECT COUNT(*) FROM task_dependencies td
    JOIN tasks dt ON td.depends_on_task_id = dt.id
    WHERE td.task_id = t.id
      AND td.dependency_type = 'blocks'
      AND dt.status != 'completed'
  ) as blocking_count
FROM tasks t;
