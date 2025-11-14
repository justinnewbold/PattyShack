-- Enhanced Inventory Management Migration
-- Smart reordering, vendor management, recipe costing, and forecasting

-- Vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  payment_terms VARCHAR(100),
  lead_time_days INTEGER DEFAULT 3,
  minimum_order DECIMAL(10, 2),
  active BOOLEAN DEFAULT true,
  rating DECIMAL(3, 2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vendors_active ON vendors(active);
CREATE INDEX idx_vendors_rating ON vendors(rating);

-- Vendor pricing table
CREATE TABLE IF NOT EXISTS vendor_pricing (
  id VARCHAR(255) PRIMARY KEY,
  vendor_id VARCHAR(255) NOT NULL,
  item_id VARCHAR(255) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  unit_size VARCHAR(50),
  case_price DECIMAL(10, 2),
  case_quantity INTEGER,
  effective_date DATE NOT NULL,
  expiry_date DATE,
  is_current BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE INDEX idx_vendor_pricing_vendor ON vendor_pricing(vendor_id);
CREATE INDEX idx_vendor_pricing_item ON vendor_pricing(item_id);
CREATE INDEX idx_vendor_pricing_current ON vendor_pricing(is_current);

-- Add reordering fields to inventory
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS reorder_point DECIMAL(10, 2);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS reorder_quantity DECIMAL(10, 2);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS safety_stock DECIMAL(10, 2);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS avg_daily_usage DECIMAL(10, 2);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 3;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS shelf_life_days INTEGER;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS expiration_date DATE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS lot_number VARCHAR(100);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS preferred_vendor_id VARCHAR(255);

-- Inventory transfers table
CREATE TABLE IF NOT EXISTS inventory_transfers (
  id VARCHAR(255) PRIMARY KEY,
  from_location_id VARCHAR(255) NOT NULL,
  to_location_id VARCHAR(255) NOT NULL,
  item_id VARCHAR(255) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(50),
  transfer_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  requested_by VARCHAR(255),
  approved_by VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_transit', 'received', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (to_location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_transfers_from ON inventory_transfers(from_location_id);
CREATE INDEX idx_transfers_to ON inventory_transfers(to_location_id);
CREATE INDEX idx_transfers_status ON inventory_transfers(status);
CREATE INDEX idx_transfers_date ON inventory_transfers(transfer_date);

-- Recipe components table
CREATE TABLE IF NOT EXISTS recipes (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  serving_size VARCHAR(50),
  servings_per_recipe INTEGER,
  prep_time_minutes INTEGER,
  cost_per_serving DECIMAL(10, 2),
  total_cost DECIMAL(10, 2),
  selling_price DECIMAL(10, 2),
  margin_percent DECIMAL(5, 2),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recipes_category ON recipes(category);
CREATE INDEX idx_recipes_active ON recipes(active);

-- Recipe ingredients table
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id VARCHAR(255) PRIMARY KEY,
  recipe_id VARCHAR(255) NOT NULL,
  item_id VARCHAR(255) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  unit_cost DECIMAL(10, 2),
  total_cost DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_item ON recipe_ingredients(item_id);

-- Inventory forecasting table
CREATE TABLE IF NOT EXISTS inventory_forecasts (
  id VARCHAR(255) PRIMARY KEY,
  location_id VARCHAR(255) NOT NULL,
  item_id VARCHAR(255) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  forecast_date DATE NOT NULL,
  predicted_usage DECIMAL(10, 2) NOT NULL,
  predicted_stockout_date DATE,
  recommended_order_quantity DECIMAL(10, 2),
  confidence_level DECIMAL(3, 2),
  based_on_days INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

CREATE INDEX idx_forecasts_location ON inventory_forecasts(location_id);
CREATE INDEX idx_forecasts_item ON inventory_forecasts(item_id);
CREATE INDEX idx_forecasts_date ON inventory_forecasts(forecast_date);

-- Purchase orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id VARCHAR(255) PRIMARY KEY,
  location_id VARCHAR(255) NOT NULL,
  vendor_id VARCHAR(255) NOT NULL,
  order_number VARCHAR(100) UNIQUE NOT NULL,
  order_date DATE NOT NULL,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'ordered', 'partial', 'received', 'cancelled')),
  subtotal DECIMAL(10, 2),
  tax DECIMAL(10, 2),
  total DECIMAL(10, 2),
  created_by VARCHAR(255),
  approved_by VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_po_location ON purchase_orders(location_id);
CREATE INDEX idx_po_vendor ON purchase_orders(vendor_id);
CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_order_date ON purchase_orders(order_date);

-- Purchase order items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id VARCHAR(255) PRIMARY KEY,
  purchase_order_id VARCHAR(255) NOT NULL,
  item_id VARCHAR(255) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  quantity_ordered DECIMAL(10, 2) NOT NULL,
  quantity_received DECIMAL(10, 2) DEFAULT 0,
  unit VARCHAR(50) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
);

CREATE INDEX idx_po_items_po ON purchase_order_items(purchase_order_id);
CREATE INDEX idx_po_items_item ON purchase_order_items(item_id);

-- Create view for items needing reorder
CREATE OR REPLACE VIEW items_needing_reorder AS
SELECT
  i.id,
  i.location_id,
  i.item_name,
  i.current_stock,
  i.unit,
  i.reorder_point,
  i.reorder_quantity,
  i.safety_stock,
  i.avg_daily_usage,
  i.preferred_vendor_id,
  v.name as vendor_name,
  v.lead_time_days,
  CASE
    WHEN i.current_stock <= i.safety_stock THEN 'critical'
    WHEN i.current_stock <= i.reorder_point THEN 'low'
    ELSE 'adequate'
  END as stock_level,
  CASE
    WHEN i.avg_daily_usage > 0 THEN
      ROUND((i.current_stock / NULLIF(i.avg_daily_usage, 0))::numeric, 1)
    ELSE NULL
  END as days_of_stock,
  i.reorder_quantity as recommended_order_qty
FROM inventory i
LEFT JOIN vendors v ON i.preferred_vendor_id = v.id
WHERE i.current_stock <= i.reorder_point
  AND i.reorder_point IS NOT NULL;

-- Insert sample vendors
INSERT INTO vendors (id, name, contact_name, email, phone, lead_time_days, rating, active)
VALUES
  ('vendor-1', 'Sysco Foods', 'John Smith', 'john@sysco.com', '555-0100', 2, 4.5, true),
  ('vendor-2', 'US Foods', 'Jane Doe', 'jane@usfoods.com', '555-0200', 3, 4.2, true),
  ('vendor-3', 'Restaurant Depot', 'Bob Wilson', 'bob@restaurantdepot.com', '555-0300', 1, 4.8, true);

-- Insert sample recipe
INSERT INTO recipes (id, name, category, serving_size, servings_per_recipe, selling_price, active)
VALUES
  ('recipe-burger', 'Classic Burger', 'Entrees', '1 burger', 10, 12.99, true);

INSERT INTO recipe_ingredients (id, recipe_id, item_id, item_name, quantity, unit, unit_cost, total_cost)
VALUES
  ('ri-1', 'recipe-burger', 'item-beef', 'Ground Beef', 0.33, 'lbs', 4.50, 1.49),
  ('ri-2', 'recipe-burger', 'item-buns', 'Burger Buns', 1, 'each', 0.50, 0.50),
  ('ri-3', 'recipe-burger', 'item-cheese', 'Cheese Slice', 1, 'each', 0.25, 0.25);
