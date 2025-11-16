-- Migration: Menu Management & Recipe Costing System
-- Phase 18: Complete menu and recipe management
-- Created: 2024-11

BEGIN;

-- Menu categories
CREATE TABLE menu_categories (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  location_id VARCHAR(255) REFERENCES locations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_menu_cat_location (location_id),
  INDEX idx_menu_cat_active (is_active)
);

-- Menu items
CREATE TABLE menu_items (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  location_id VARCHAR(255) REFERENCES locations(id) ON DELETE CASCADE,
  category_id VARCHAR(255) REFERENCES menu_categories(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  base_price NUMERIC(10,2) NOT NULL,
  cost_price NUMERIC(10,2), -- Calculated from recipe
  target_food_cost_percentage NUMERIC(5,2) DEFAULT 30.00,
  suggested_price NUMERIC(10,2), -- Auto-calculated
  sku VARCHAR(100),
  image_url VARCHAR(500),
  prep_time_minutes INTEGER,
  dietary_info JSONB, -- vegetarian, vegan, gluten-free, etc.
  allergens VARCHAR(100)[], -- Array of allergens
  nutrition_info JSONB, -- calories, protein, carbs, fat, etc.
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  popularity_score INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_menu_item_location (location_id),
  INDEX idx_menu_item_category (category_id),
  INDEX idx_menu_item_available (is_available)
);

-- Menu item modifiers (extra cheese, no onions, etc.)
CREATE TABLE menu_modifiers (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  name VARCHAR(255) NOT NULL,
  modifier_type VARCHAR(50) NOT NULL, -- addition, removal, substitution
  price_adjustment NUMERIC(10,2) DEFAULT 0,
  cost_adjustment NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  INDEX idx_modifier_type (modifier_type)
);

-- Menu item to modifiers mapping
CREATE TABLE menu_item_modifiers (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  menu_item_id VARCHAR(255) NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  modifier_id VARCHAR(255) NOT NULL REFERENCES menu_modifiers(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT false,
  max_quantity INTEGER DEFAULT 1,

  UNIQUE(menu_item_id, modifier_id),
  INDEX idx_item_mod_item (menu_item_id)
);

-- Recipes (how to make menu items)
CREATE TABLE recipes (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  menu_item_id VARCHAR(255) REFERENCES menu_items(id) ON DELETE CASCADE,
  version VARCHAR(50) DEFAULT '1.0',
  name VARCHAR(255) NOT NULL,
  yield_quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  yield_unit VARCHAR(50) DEFAULT 'serving',
  prep_instructions TEXT,
  cooking_instructions TEXT,
  plating_instructions TEXT,
  estimated_cost NUMERIC(10,2), -- Auto-calculated
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(255) REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_recipe_menu_item (menu_item_id),
  INDEX idx_recipe_active (is_active)
);

-- Recipe ingredients
CREATE TABLE recipe_ingredients (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  recipe_id VARCHAR(255) NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  inventory_item_id VARCHAR(255) REFERENCES inventory(id),
  ingredient_name VARCHAR(255) NOT NULL,
  quantity NUMERIC(10,3) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  cost_per_unit NUMERIC(10,2),
  total_cost NUMERIC(10,2), -- quantity * cost_per_unit
  prep_notes TEXT,
  is_optional BOOLEAN DEFAULT false,

  INDEX idx_recipe_ing_recipe (recipe_id),
  INDEX idx_recipe_ing_inventory (inventory_item_id)
);

-- Menu engineering analysis
CREATE TABLE menu_performance (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  menu_item_id VARCHAR(255) NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  location_id VARCHAR(255) NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  units_sold INTEGER NOT NULL DEFAULT 0,
  total_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  gross_profit NUMERIC(10,2) NOT NULL DEFAULT 0,
  food_cost_percentage NUMERIC(5,2),
  contribution_margin NUMERIC(10,2),
  menu_mix_percentage NUMERIC(5,2), -- % of total sales
  classification VARCHAR(50), -- star, plow_horse, puzzle, dog

  UNIQUE(menu_item_id, location_id, period_start),
  INDEX idx_menu_perf_item (menu_item_id),
  INDEX idx_menu_perf_location (location_id),
  INDEX idx_menu_perf_period (period_start, period_end)
);

-- Seasonal menus
CREATE TABLE seasonal_menus (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  location_id VARCHAR(255) REFERENCES locations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_seasonal_location (location_id),
  INDEX idx_seasonal_dates (start_date, end_date)
);

-- Seasonal menu items
CREATE TABLE seasonal_menu_items (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  seasonal_menu_id VARCHAR(255) NOT NULL REFERENCES seasonal_menus(id) ON DELETE CASCADE,
  menu_item_id VARCHAR(255) NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,

  UNIQUE(seasonal_menu_id, menu_item_id),
  INDEX idx_seasonal_items_menu (seasonal_menu_id)
);

-- ============================================
-- VIEWS
-- ============================================

-- Menu item profitability view
CREATE VIEW menu_item_profitability AS
SELECT
  mi.id,
  mi.name,
  mi.location_id,
  l.name as location_name,
  mi.base_price,
  r.estimated_cost as recipe_cost,
  mi.base_price - COALESCE(r.estimated_cost, 0) as gross_profit,
  CASE
    WHEN mi.base_price > 0 THEN
      ROUND((COALESCE(r.estimated_cost, 0) / mi.base_price) * 100, 2)
    ELSE 0
  END as food_cost_percentage,
  CASE
    WHEN COALESCE(r.estimated_cost, 0) > 0 THEN
      ROUND(mi.base_price / (mi.target_food_cost_percentage / 100), 2)
    ELSE mi.base_price
  END as suggested_price,
  mi.is_available,
  mi.popularity_score
FROM menu_items mi
LEFT JOIN locations l ON mi.location_id = l.id
LEFT JOIN recipes r ON mi.id = r.menu_item_id AND r.is_active = true
WHERE mi.is_available = true;

-- Menu engineering matrix view
CREATE VIEW menu_engineering_matrix AS
SELECT
  mp.menu_item_id,
  mi.name as item_name,
  mp.location_id,
  mp.period_start,
  mp.period_end,
  mp.units_sold,
  mp.total_revenue,
  mp.contribution_margin,
  mp.menu_mix_percentage,
  mp.food_cost_percentage,
  CASE
    WHEN mp.contribution_margin >= (SELECT AVG(contribution_margin) FROM menu_performance)
      AND mp.menu_mix_percentage >= (SELECT AVG(menu_mix_percentage) FROM menu_performance)
      THEN 'star'
    WHEN mp.contribution_margin >= (SELECT AVG(contribution_margin) FROM menu_performance)
      AND mp.menu_mix_percentage < (SELECT AVG(menu_mix_percentage) FROM menu_performance)
      THEN 'puzzle'
    WHEN mp.contribution_margin < (SELECT AVG(contribution_margin) FROM menu_performance)
      AND mp.menu_mix_percentage >= (SELECT AVG(menu_mix_percentage) FROM menu_performance)
      THEN 'plow_horse'
    ELSE 'dog'
  END as classification
FROM menu_performance mp
JOIN menu_items mi ON mp.menu_item_id = mi.id;

-- Full menu with categories
CREATE VIEW full_menu AS
SELECT
  mc.id as category_id,
  mc.name as category_name,
  mc.display_order as category_order,
  mi.id as item_id,
  mi.name as item_name,
  mi.description,
  mi.base_price,
  mi.image_url,
  mi.dietary_info,
  mi.allergens,
  mi.is_available,
  mi.is_featured,
  mi.popularity_score,
  r.estimated_cost as cost,
  ROUND((COALESCE(r.estimated_cost, 0) / NULLIF(mi.base_price, 0)) * 100, 2) as food_cost_pct
FROM menu_categories mc
LEFT JOIN menu_items mi ON mc.id = mi.category_id
LEFT JOIN recipes r ON mi.id = r.menu_item_id AND r.is_active = true
WHERE mc.is_active = true
ORDER BY mc.display_order, mi.name;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Calculate recipe cost
CREATE OR REPLACE FUNCTION calculate_recipe_cost(p_recipe_id VARCHAR)
RETURNS NUMERIC AS $$
DECLARE
  total_cost NUMERIC;
BEGIN
  SELECT SUM(total_cost) INTO total_cost
  FROM recipe_ingredients
  WHERE recipe_id = p_recipe_id;

  UPDATE recipes
  SET estimated_cost = COALESCE(total_cost, 0),
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_recipe_id;

  RETURN COALESCE(total_cost, 0);
END;
$$ LANGUAGE plpgsql;

-- Update menu item suggested price
CREATE OR REPLACE FUNCTION update_suggested_price(p_menu_item_id VARCHAR)
RETURNS NUMERIC AS $$
DECLARE
  recipe_cost NUMERIC;
  target_pct NUMERIC;
  suggested NUMERIC;
BEGIN
  SELECT r.estimated_cost, mi.target_food_cost_percentage
  INTO recipe_cost, target_pct
  FROM menu_items mi
  LEFT JOIN recipes r ON mi.id = r.menu_item_id AND r.is_active = true
  WHERE mi.id = p_menu_item_id;

  IF recipe_cost > 0 AND target_pct > 0 THEN
    suggested := ROUND(recipe_cost / (target_pct / 100), 2);
  ELSE
    suggested := 0;
  END IF;

  UPDATE menu_items
  SET suggested_price = suggested,
      cost_price = recipe_cost,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_menu_item_id;

  RETURN suggested;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INITIAL DATA
-- ============================================

-- Create default menu categories
INSERT INTO menu_categories (name, description, display_order) VALUES
('Appetizers', 'Start your meal right', 1),
('Salads', 'Fresh and healthy options', 2),
('Entrees', 'Main courses', 3),
('Sides', 'Perfect accompaniments', 4),
('Desserts', 'Sweet endings', 5),
('Beverages', 'Drinks and refreshments', 6);

-- Create default modifiers
INSERT INTO menu_modifiers (name, modifier_type, price_adjustment, cost_adjustment) VALUES
('Extra Cheese', 'addition', 1.50, 0.50),
('No Onions', 'removal', 0, 0),
('Extra Sauce', 'addition', 0.50, 0.25),
('Gluten-Free Bun', 'substitution', 2.00, 1.00),
('Add Bacon', 'addition', 2.50, 1.00),
('Make it Spicy', 'addition', 0, 0),
('Side Salad Instead', 'substitution', 0, 0);

COMMIT;

-- Rollback script (for reference)
-- DROP TABLE IF EXISTS seasonal_menu_items CASCADE;
-- DROP TABLE IF EXISTS seasonal_menus CASCADE;
-- DROP TABLE IF EXISTS menu_performance CASCADE;
-- DROP TABLE IF EXISTS recipe_ingredients CASCADE;
-- DROP TABLE IF EXISTS recipes CASCADE;
-- DROP TABLE IF EXISTS menu_item_modifiers CASCADE;
-- DROP TABLE IF EXISTS menu_modifiers CASCADE;
-- DROP TABLE IF EXISTS menu_items CASCADE;
-- DROP TABLE IF EXISTS menu_categories CASCADE;
-- DROP VIEW IF EXISTS full_menu;
-- DROP VIEW IF EXISTS menu_engineering_matrix;
-- DROP VIEW IF EXISTS menu_item_profitability;
-- DROP FUNCTION IF EXISTS update_suggested_price(VARCHAR);
-- DROP FUNCTION IF EXISTS calculate_recipe_cost(VARCHAR);
