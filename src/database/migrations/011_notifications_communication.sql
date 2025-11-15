-- Phase 9: Real-time Notifications & Communication System

-- Notification rules define when and how to send notifications
CREATE TABLE notification_rules (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  name VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL, -- task_assigned, task_due, temperature_alert, inventory_low, etc.
  location_id VARCHAR(255),
  role_filter VARCHAR(100), -- Send to users with this role
  condition_json JSONB, -- Additional conditions for triggering
  delivery_channels VARCHAR(50)[] DEFAULT ARRAY['in_app'], -- in_app, email, sms, push
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(255) REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- Notifications sent to users
CREATE TABLE notifications (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  location_id VARCHAR(255) REFERENCES locations(id),
  notification_type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium',
  action_url VARCHAR(500), -- Deep link to relevant item
  action_label VARCHAR(100), -- Button text like "View Task"
  metadata JSONB, -- Additional context data
  delivery_channels VARCHAR(50)[] DEFAULT ARRAY['in_app'],
  delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id, delivered_at DESC);
CREATE INDEX idx_notifications_location ON notifications(location_id);
CREATE INDEX idx_notifications_type ON notifications(notification_type);

-- Notification read status
CREATE TABLE notification_reads (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  notification_id VARCHAR(255) NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMP,
  UNIQUE(notification_id, user_id)
);

CREATE INDEX idx_notification_reads_user ON notification_reads(user_id);

-- User notification preferences
CREATE TABLE notification_preferences (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  notification_type VARCHAR(100) NOT NULL,
  in_app_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  push_enabled BOOLEAN DEFAULT true,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, notification_type)
);

-- Communication channels (team chat, departments, locations)
CREATE TABLE channels (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  channel_type VARCHAR(50) NOT NULL, -- public, private, direct, location, department
  location_id VARCHAR(255) REFERENCES locations(id),
  created_by VARCHAR(255) REFERENCES users(id),
  is_archived BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_channels_type ON channels(channel_type);
CREATE INDEX idx_channels_location ON channels(location_id);

-- Channel members
CREATE TABLE channel_members (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  channel_id VARCHAR(255) NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  role VARCHAR(50) DEFAULT 'member', -- admin, member
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_read_at TIMESTAMP,
  is_muted BOOLEAN DEFAULT false,
  UNIQUE(channel_id, user_id)
);

CREATE INDEX idx_channel_members_user ON channel_members(user_id);
CREATE INDEX idx_channel_members_channel ON channel_members(channel_id);

-- Messages in channels
CREATE TABLE messages (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  channel_id VARCHAR(255) NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  parent_message_id VARCHAR(255) REFERENCES messages(id), -- For threading
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text', -- text, image, file, system
  attachments JSONB, -- Array of file URLs and metadata
  mentions VARCHAR(255)[], -- Array of user IDs mentioned
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_channel ON messages(channel_id, created_at DESC);
CREATE INDEX idx_messages_user ON messages(user_id);
CREATE INDEX idx_messages_parent ON messages(parent_message_id);

-- Message read receipts
CREATE TABLE message_reads (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  message_id VARCHAR(255) NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(message_id, user_id)
);

CREATE INDEX idx_message_reads_message ON message_reads(message_id);
CREATE INDEX idx_message_reads_user ON message_reads(user_id);

-- Message reactions (emojis)
CREATE TABLE message_reactions (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  message_id VARCHAR(255) NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  emoji VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX idx_message_reactions_message ON message_reactions(message_id);

-- Announcements (company-wide or location-specific)
CREATE TABLE announcements (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  announcement_type VARCHAR(50) DEFAULT 'general', -- general, urgent, policy, event
  priority VARCHAR(20) DEFAULT 'medium',
  location_id VARCHAR(255) REFERENCES locations(id), -- NULL for company-wide
  target_roles VARCHAR(100)[], -- Specific roles to notify
  created_by VARCHAR(255) REFERENCES users(id),
  published_at TIMESTAMP,
  expires_at TIMESTAMP,
  requires_acknowledgment BOOLEAN DEFAULT false,
  attachments JSONB,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_announcements_location ON announcements(location_id);
CREATE INDEX idx_announcements_published ON announcements(published_at DESC);

-- Announcement acknowledgments
CREATE TABLE announcement_acknowledgments (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  announcement_id VARCHAR(255) NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  acknowledged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(announcement_id, user_id)
);

CREATE INDEX idx_announcement_acks_announcement ON announcement_acknowledgments(announcement_id);
CREATE INDEX idx_announcement_acks_user ON announcement_acknowledgments(user_id);

-- WebSocket connections tracking (for real-time updates)
CREATE TABLE websocket_sessions (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  session_token VARCHAR(255) NOT NULL UNIQUE,
  device_info JSONB,
  connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_ping_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  disconnected_at TIMESTAMP
);

CREATE INDEX idx_websocket_sessions_user ON websocket_sessions(user_id);
CREATE INDEX idx_websocket_sessions_token ON websocket_sessions(session_token);

-- Views for common queries

-- Unread notifications count per user
CREATE VIEW unread_notifications_count AS
SELECT
  n.user_id,
  COUNT(*) as unread_count,
  COUNT(*) FILTER (WHERE n.priority = 'urgent') as urgent_count,
  MAX(n.delivered_at) as latest_notification_at
FROM notifications n
LEFT JOIN notification_reads nr ON n.id = nr.notification_id AND n.user_id = nr.user_id
WHERE nr.id IS NULL
  AND (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)
GROUP BY n.user_id;

-- Channel activity summary
CREATE VIEW channel_activity AS
SELECT
  c.id as channel_id,
  c.name as channel_name,
  c.channel_type,
  COUNT(DISTINCT m.id) as message_count,
  COUNT(DISTINCT m.user_id) as active_users,
  MAX(m.created_at) as last_message_at,
  COUNT(DISTINCT cm.user_id) as member_count
FROM channels c
LEFT JOIN messages m ON c.id = m.channel_id AND m.is_deleted = false
LEFT JOIN channel_members cm ON c.id = cm.channel_id
WHERE c.is_archived = false
GROUP BY c.id, c.name, c.channel_type;

-- User mention notifications (unread)
CREATE VIEW user_mentions AS
SELECT
  m.id as message_id,
  m.channel_id,
  c.name as channel_name,
  m.user_id as sender_id,
  u.name as sender_name,
  unnest(m.mentions) as mentioned_user_id,
  m.content,
  m.created_at
FROM messages m
JOIN channels c ON m.channel_id = c.id
JOIN users u ON m.user_id = u.id
WHERE array_length(m.mentions, 1) > 0
  AND m.is_deleted = false;

-- Pending acknowledgments for users
CREATE VIEW pending_acknowledgments AS
SELECT
  a.id as announcement_id,
  a.title,
  a.content,
  a.priority,
  a.published_at,
  a.expires_at,
  u.id as user_id,
  u.name as user_name
FROM announcements a
CROSS JOIN users u
LEFT JOIN announcement_acknowledgments aa ON a.id = aa.announcement_id AND u.id = aa.user_id
WHERE a.requires_acknowledgment = true
  AND aa.id IS NULL
  AND a.published_at <= CURRENT_TIMESTAMP
  AND (a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)
  AND (
    a.location_id IS NULL
    OR EXISTS (
      SELECT 1 FROM user_locations ul
      WHERE ul.user_id = u.id AND ul.location_id = a.location_id
    )
  )
  AND (
    a.target_roles IS NULL
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = u.id AND r.name = ANY(a.target_roles)
    )
  );

-- Sample notification rules
INSERT INTO notification_rules (id, name, event_type, delivery_channels, priority) VALUES
('rule-task-assigned', 'Task Assigned', 'task_assigned', ARRAY['in_app', 'push'], 'medium'),
('rule-task-due-soon', 'Task Due Soon', 'task_due_soon', ARRAY['in_app', 'push'], 'high'),
('rule-task-overdue', 'Task Overdue', 'task_overdue', ARRAY['in_app', 'email', 'push'], 'urgent'),
('rule-temp-alert', 'Temperature Alert', 'temperature_alert', ARRAY['in_app', 'sms', 'push'], 'urgent'),
('rule-inventory-low', 'Low Inventory', 'inventory_low', ARRAY['in_app', 'email'], 'medium'),
('rule-schedule-change', 'Schedule Changed', 'schedule_change', ARRAY['in_app', 'push'], 'high'),
('rule-shift-reminder', 'Shift Reminder', 'shift_reminder', ARRAY['in_app', 'push'], 'medium'),
('rule-new-announcement', 'New Announcement', 'new_announcement', ARRAY['in_app', 'push'], 'medium');

-- Sample default channels
INSERT INTO channels (id, name, description, channel_type) VALUES
('channel-general', 'General', 'Company-wide general discussion', 'public'),
('channel-urgent', 'Urgent', 'Urgent operational issues', 'public'),
('channel-announcements', 'Announcements', 'Official company announcements', 'public');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pattyshack_user;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO pattyshack_user;
