-- User Management Overhaul Migration
-- Enhanced user profiles, RBAC, permissions, teams, and security features

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  level INTEGER NOT NULL DEFAULT 0,
  is_system_role BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_roles_level ON roles(level);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_permissions_resource ON permissions(resource);
CREATE INDEX idx_permissions_name ON permissions(name);

-- Role permissions (many-to-many)
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id VARCHAR(255) NOT NULL,
  permission_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- User roles (many-to-many)
CREATE TABLE IF NOT EXISTS user_roles (
  user_id VARCHAR(255) NOT NULL,
  role_id VARCHAR(255) NOT NULL,
  location_id VARCHAR(255),
  assigned_by VARCHAR(255),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id, location_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
CREATE INDEX idx_user_roles_location ON user_roles(location_id);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id VARCHAR(255) PRIMARY KEY,
  location_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  team_lead_id VARCHAR(255),
  color VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (team_lead_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_teams_location ON teams(location_id);
CREATE INDEX idx_teams_team_lead ON teams(team_lead_id);

-- Team members
CREATE TABLE IF NOT EXISTS team_members (
  team_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (team_id, user_id),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id VARCHAR(255) PRIMARY KEY,
  theme VARCHAR(50) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(100) DEFAULT 'America/New_York',
  date_format VARCHAR(50) DEFAULT 'MM/DD/YYYY',
  time_format VARCHAR(20) DEFAULT '12h' CHECK (time_format IN ('12h', '24h')),
  temperature_unit VARCHAR(10) DEFAULT 'fahrenheit' CHECK (temperature_unit IN ('fahrenheit', 'celsius')),
  notifications_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  push_notifications BOOLEAN DEFAULT true,
  notification_settings JSONB DEFAULT '{}',
  dashboard_layout JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User profile extensions
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS state VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255);

-- Activity logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),
  details JSONB DEFAULT '{}',
  ip_address VARCHAR(50),
  user_agent TEXT,
  location_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);

CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_resource ON activity_logs(resource_type, resource_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_password_reset_user ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_token ON password_reset_tokens(token_hash);

-- Login attempts (for security)
CREATE TABLE IF NOT EXISTS login_attempts (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(50) NOT NULL,
  success BOOLEAN NOT NULL,
  failure_reason VARCHAR(255),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_login_attempts_email ON login_attempts(email);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX idx_login_attempts_created_at ON login_attempts(created_at);

-- Insert default roles
INSERT INTO roles (id, name, description, level, is_system_role) VALUES
  ('role-super-admin', 'Super Admin', 'Full system access across all locations', 100, true),
  ('role-admin', 'Admin', 'Full access to assigned locations', 90, true),
  ('role-manager', 'Manager', 'Location management and team oversight', 70, true),
  ('role-shift-lead', 'Shift Lead', 'Shift supervision and task management', 50, true),
  ('role-employee', 'Employee', 'Basic employee access', 10, true),
  ('role-readonly', 'Read Only', 'View-only access', 5, true);

-- Insert default permissions
INSERT INTO permissions (id, name, resource, action, description) VALUES
  -- Task permissions
  ('perm-task-create', 'task:create', 'tasks', 'create', 'Create new tasks'),
  ('perm-task-read', 'task:read', 'tasks', 'read', 'View tasks'),
  ('perm-task-update', 'task:update', 'tasks', 'update', 'Update tasks'),
  ('perm-task-delete', 'task:delete', 'tasks', 'delete', 'Delete tasks'),
  ('perm-task-assign', 'task:assign', 'tasks', 'assign', 'Assign tasks to users'),

  -- Temperature permissions
  ('perm-temp-log', 'temperature:log', 'temperatures', 'log', 'Log temperature readings'),
  ('perm-temp-read', 'temperature:read', 'temperatures', 'read', 'View temperature logs'),
  ('perm-temp-manage', 'temperature:manage', 'temperatures', 'manage', 'Manage equipment and alerts'),

  -- Inventory permissions
  ('perm-inv-count', 'inventory:count', 'inventory', 'count', 'Perform inventory counts'),
  ('perm-inv-read', 'inventory:read', 'inventory', 'read', 'View inventory'),
  ('perm-inv-update', 'inventory:update', 'inventory', 'update', 'Update inventory quantities'),
  ('perm-inv-manage', 'inventory:manage', 'inventory', 'manage', 'Full inventory management'),

  -- Schedule permissions
  ('perm-schedule-view', 'schedule:view', 'schedules', 'view', 'View schedules'),
  ('perm-schedule-create', 'schedule:create', 'schedules', 'create', 'Create schedules'),
  ('perm-schedule-update', 'schedule:update', 'schedules', 'update', 'Update schedules'),
  ('perm-schedule-publish', 'schedule:publish', 'schedules', 'publish', 'Publish schedules'),

  -- User permissions
  ('perm-user-read', 'user:read', 'users', 'read', 'View user profiles'),
  ('perm-user-manage', 'user:manage', 'users', 'manage', 'Manage users'),

  -- Analytics permissions
  ('perm-analytics-view', 'analytics:view', 'analytics', 'view', 'View analytics and reports'),
  ('perm-analytics-export', 'analytics:export', 'analytics', 'export', 'Export data'),

  -- Integration permissions
  ('perm-integration-manage', 'integration:manage', 'integrations', 'manage', 'Manage integrations');

-- Assign permissions to roles
-- Super Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role-super-admin', id FROM permissions;

-- Admin gets most permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role-admin', id FROM permissions
WHERE name NOT LIKE 'integration:%';

-- Manager gets operational permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role-manager', id FROM permissions
WHERE name IN (
  'task:create', 'task:read', 'task:update', 'task:assign',
  'temperature:log', 'temperature:read', 'temperature:manage',
  'inventory:count', 'inventory:read', 'inventory:update', 'inventory:manage',
  'schedule:view', 'schedule:create', 'schedule:update', 'schedule:publish',
  'user:read', 'analytics:view', 'analytics:export'
);

-- Shift Lead gets task and monitoring permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role-shift-lead', id FROM permissions
WHERE name IN (
  'task:create', 'task:read', 'task:update', 'task:assign',
  'temperature:log', 'temperature:read',
  'inventory:count', 'inventory:read',
  'schedule:view'
);

-- Employee gets basic permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role-employee', id FROM permissions
WHERE name IN (
  'task:read', 'task:update',
  'temperature:log', 'temperature:read',
  'inventory:count', 'inventory:read',
  'schedule:view'
);

-- Read Only gets only read permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role-readonly', id FROM permissions
WHERE action = 'read' OR action = 'view';

-- Create view for user permissions
CREATE OR REPLACE VIEW user_permissions_view AS
SELECT DISTINCT
  u.id as user_id,
  u.name as user_name,
  u.email,
  r.id as role_id,
  r.name as role_name,
  p.id as permission_id,
  p.name as permission_name,
  p.resource,
  p.action,
  ur.location_id
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id;
