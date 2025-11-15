-- Migration: Advanced Search System
-- Phase 16: Global search, saved filters, full-text search
-- Created: 2024-11

BEGIN;

-- Search index configuration
CREATE TABLE search_indexes (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  entity_type VARCHAR(100) NOT NULL UNIQUE, -- tasks, users, inventory, etc.
  table_name VARCHAR(100) NOT NULL,
  searchable_columns VARCHAR(100)[], -- Columns to search
  weight_config JSONB, -- Column weights for ranking
  is_active BOOLEAN DEFAULT true,
  last_indexed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_search_index_entity (entity_type)
);

-- Saved searches
CREATE TABLE saved_searches (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  search_query TEXT NOT NULL,
  filters JSONB, -- Filter criteria
  entity_types VARCHAR(100)[], -- Which entities to search
  is_favorite BOOLEAN DEFAULT false,
  is_shared BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_saved_search_user (user_id),
  INDEX idx_saved_search_favorite (is_favorite)
);

-- Search history
CREATE TABLE search_history (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  search_query TEXT NOT NULL,
  filters JSONB,
  entity_types VARCHAR(100)[],
  results_count INTEGER,
  search_duration_ms INTEGER,
  searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_search_history_user (user_id),
  INDEX idx_search_history_time (searched_at)
);

-- Global search view (combines multiple entity types)
CREATE VIEW global_search_index AS
-- Tasks
SELECT
  'task' as entity_type,
  id as entity_id,
  title as primary_text,
  description as secondary_text,
  location_id,
  created_at,
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B') as search_vector
FROM tasks
WHERE status != 'deleted'

UNION ALL

-- Users
SELECT
  'user' as entity_type,
  id as entity_id,
  first_name || ' ' || last_name as primary_text,
  email as secondary_text,
  NULL as location_id,
  created_at,
  setweight(to_tsvector('english', COALESCE(first_name || ' ' || last_name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(email, '')), 'C') as search_vector
FROM users

UNION ALL

-- Inventory items
SELECT
  'inventory' as entity_type,
  id as entity_id,
  item_name as primary_text,
  category as secondary_text,
  location_id,
  created_at,
  setweight(to_tsvector('english', COALESCE(item_name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(category, '')), 'B') as search_vector
FROM inventory

UNION ALL

-- Equipment
SELECT
  'equipment' as entity_type,
  id as entity_id,
  name as primary_text,
  equipment_type as secondary_text,
  location_id,
  created_at,
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(equipment_type, '')), 'B') as search_vector
FROM equipment;

-- Full-text search function
CREATE OR REPLACE FUNCTION global_search(
  p_query TEXT,
  p_entity_types VARCHAR[] DEFAULT NULL,
  p_location_id VARCHAR DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  entity_type VARCHAR,
  entity_id VARCHAR,
  primary_text TEXT,
  secondary_text TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gsi.entity_type,
    gsi.entity_id,
    gsi.primary_text,
    gsi.secondary_text,
    ts_rank(gsi.search_vector, plainto_tsquery('english', p_query)) as rank
  FROM global_search_index gsi
  WHERE gsi.search_vector @@ plainto_tsquery('english', p_query)
    AND (p_entity_types IS NULL OR gsi.entity_type = ANY(p_entity_types))
    AND (p_location_id IS NULL OR gsi.location_id = p_location_id OR gsi.location_id IS NULL)
  ORDER BY rank DESC, gsi.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Initialize search indexes
INSERT INTO search_indexes (entity_type, table_name, searchable_columns, weight_config) VALUES
('task', 'tasks', ARRAY['title', 'description'], '{"title": "A", "description": "B"}'),
('user', 'users', ARRAY['first_name', 'last_name', 'email'], '{"name": "A", "email": "C"}'),
('inventory', 'inventory', ARRAY['item_name', 'category'], '{"item_name": "A", "category": "B"}'),
('equipment', 'equipment', ARRAY['name', 'equipment_type'], '{"name": "A", "type": "B"}');

COMMIT;
