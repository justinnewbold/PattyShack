-- Audit Logs Table Migration
-- Creates table for tracking security and user activity events

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255),
  username VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Add comment for documentation
COMMENT ON TABLE audit_logs IS 'Tracks user actions and security events for audit trail and compliance';
COMMENT ON COLUMN audit_logs.action IS 'Type of action performed (e.g., login, logout, create, update, delete)';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource affected (e.g., user, task, inventory_item)';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context about the action (JSON)';
