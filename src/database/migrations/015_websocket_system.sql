-- Migration: WebSocket & Real-time System
-- Phase 13: Real-time communication infrastructure
-- Created: 2024-11

BEGIN;

-- WebSocket connections tracking
CREATE TABLE websocket_connections (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  socket_id VARCHAR(255) NOT NULL UNIQUE,
  location_id VARCHAR(255) REFERENCES locations(id),
  device_type VARCHAR(50), -- web, mobile_ios, mobile_android
  device_info JSONB,
  ip_address VARCHAR(45),
  connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_ping_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active', -- active, idle, disconnected

  INDEX idx_ws_user (user_id),
  INDEX idx_ws_socket (socket_id),
  INDEX idx_ws_status (status)
);

-- User presence tracking
CREATE TABLE user_presence (
  user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'offline', -- online, away, busy, offline
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  current_location_id VARCHAR(255) REFERENCES locations(id),
  status_message VARCHAR(255),
  custom_status JSONB,

  INDEX idx_presence_status (status)
);

-- Real-time events log
CREATE TABLE realtime_events (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  event_type VARCHAR(100) NOT NULL,
  event_category VARCHAR(50) NOT NULL, -- notification, message, task_update, dashboard_update, etc.
  payload JSONB NOT NULL,
  target_users VARCHAR(255)[], -- Array of user IDs
  target_roles VARCHAR(100)[], -- Array of role names
  target_locations VARCHAR(255)[], -- Array of location IDs
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
  acknowledged_by VARCHAR(255)[], -- Array of user IDs who acknowledged

  INDEX idx_rt_event_type (event_type),
  INDEX idx_rt_category (event_category),
  INDEX idx_rt_created (created_at),
  INDEX idx_rt_priority (priority)
);

-- Room/Channel subscriptions for WebSocket
CREATE TABLE websocket_subscriptions (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  connection_id VARCHAR(255) NOT NULL REFERENCES websocket_connections(id) ON DELETE CASCADE,
  room_type VARCHAR(50) NOT NULL, -- location, user, channel, task, dashboard
  room_id VARCHAR(255) NOT NULL,
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(connection_id, room_type, room_id),
  INDEX idx_ws_sub_room (room_type, room_id)
);

-- Live dashboard sessions
CREATE TABLE dashboard_sessions (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  dashboard_id VARCHAR(255) NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connection_id VARCHAR(255) REFERENCES websocket_connections(id) ON DELETE CASCADE,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_refresh_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  auto_refresh_interval INTEGER DEFAULT 30, -- seconds
  active_filters JSONB,
  is_active BOOLEAN DEFAULT true,

  INDEX idx_dash_session_user (user_id),
  INDEX idx_dash_session_dashboard (dashboard_id),
  INDEX idx_dash_session_active (is_active)
);

-- Typing indicators for messaging
CREATE TABLE typing_indicators (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  channel_id VARCHAR(255) REFERENCES channels(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '10 seconds'),

  UNIQUE(channel_id, user_id),
  INDEX idx_typing_channel (channel_id),
  INDEX idx_typing_expires (expires_at)
);

-- ============================================
-- VIEWS
-- ============================================

-- Active connections view
CREATE VIEW active_connections AS
SELECT
  wc.id,
  wc.user_id,
  u.first_name || ' ' || u.last_name as user_name,
  u.email,
  wc.socket_id,
  wc.location_id,
  l.name as location_name,
  wc.device_type,
  wc.connected_at,
  wc.last_ping_at,
  wc.status,
  up.status as presence_status,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - wc.last_ping_at)) as seconds_since_ping
FROM websocket_connections wc
JOIN users u ON wc.user_id = u.id
LEFT JOIN locations l ON wc.location_id = l.id
LEFT JOIN user_presence up ON wc.user_id = up.user_id
WHERE wc.status = 'active';

-- Online users view
CREATE VIEW online_users AS
SELECT
  u.id,
  u.first_name || ' ' || u.last_name as user_name,
  u.email,
  up.status,
  up.status_message,
  up.current_location_id,
  l.name as location_name,
  up.last_seen_at,
  COUNT(DISTINCT wc.id) as active_connections
FROM users u
JOIN user_presence up ON u.id = up.user_id
LEFT JOIN locations l ON up.current_location_id = l.id
LEFT JOIN websocket_connections wc ON u.id = wc.user_id AND wc.status = 'active'
WHERE up.status != 'offline'
GROUP BY u.id, u.first_name, u.last_name, u.email, up.status,
         up.status_message, up.current_location_id, l.name, up.last_seen_at;

-- Room activity view
CREATE VIEW room_activity AS
SELECT
  ws.room_type,
  ws.room_id,
  COUNT(DISTINCT ws.connection_id) as active_subscribers,
  COUNT(DISTINCT wc.user_id) as unique_users,
  MAX(wc.last_ping_at) as last_activity_at
FROM websocket_subscriptions ws
JOIN websocket_connections wc ON ws.connection_id = wc.id
WHERE wc.status = 'active'
GROUP BY ws.room_type, ws.room_id;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to cleanup stale connections
CREATE OR REPLACE FUNCTION cleanup_stale_connections()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Mark connections as disconnected if no ping in 5 minutes
  UPDATE websocket_connections
  SET status = 'disconnected'
  WHERE status = 'active'
    AND last_ping_at < CURRENT_TIMESTAMP - INTERVAL '5 minutes';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Update user presence for disconnected users
  UPDATE user_presence up
  SET status = 'offline',
      last_seen_at = CURRENT_TIMESTAMP
  WHERE NOT EXISTS (
    SELECT 1 FROM websocket_connections wc
    WHERE wc.user_id = up.user_id AND wc.status = 'active'
  ) AND up.status != 'offline';

  -- Delete old disconnected connections (older than 1 day)
  DELETE FROM websocket_connections
  WHERE status = 'disconnected'
    AND connected_at < CURRENT_TIMESTAMP - INTERVAL '1 day';

  -- Delete expired typing indicators
  DELETE FROM typing_indicators
  WHERE expires_at < CURRENT_TIMESTAMP;

  -- Delete old realtime events (older than 7 days)
  DELETE FROM realtime_events
  WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '7 days'
    OR (expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP);

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to broadcast event to room
CREATE OR REPLACE FUNCTION broadcast_to_room(
  p_room_type VARCHAR,
  p_room_id VARCHAR,
  p_event_type VARCHAR,
  p_payload JSONB
)
RETURNS VARCHAR AS $$
DECLARE
  event_id VARCHAR;
  target_user_ids VARCHAR[];
BEGIN
  -- Get all users subscribed to this room
  SELECT ARRAY_AGG(DISTINCT wc.user_id)
  INTO target_user_ids
  FROM websocket_subscriptions ws
  JOIN websocket_connections wc ON ws.connection_id = wc.id
  WHERE ws.room_type = p_room_type
    AND ws.room_id = p_room_id
    AND wc.status = 'active';

  -- Create realtime event
  INSERT INTO realtime_events (event_type, event_category, payload, target_users)
  VALUES (p_event_type, p_room_type, p_payload, target_user_ids)
  RETURNING id INTO event_id;

  RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INITIAL DATA
-- ============================================

-- Initialize presence for all existing users
INSERT INTO user_presence (user_id, status, last_seen_at)
SELECT id, 'offline', CURRENT_TIMESTAMP
FROM users
ON CONFLICT (user_id) DO NOTHING;

COMMIT;

-- Rollback script (for reference)
-- DROP TABLE IF EXISTS typing_indicators CASCADE;
-- DROP TABLE IF EXISTS dashboard_sessions CASCADE;
-- DROP TABLE IF EXISTS websocket_subscriptions CASCADE;
-- DROP TABLE IF EXISTS realtime_events CASCADE;
-- DROP TABLE IF EXISTS user_presence CASCADE;
-- DROP TABLE IF EXISTS websocket_connections CASCADE;
-- DROP VIEW IF EXISTS room_activity;
-- DROP VIEW IF EXISTS online_users;
-- DROP VIEW IF EXISTS active_connections;
-- DROP FUNCTION IF EXISTS cleanup_stale_connections();
-- DROP FUNCTION IF EXISTS broadcast_to_room(VARCHAR, VARCHAR, VARCHAR, JSONB);
