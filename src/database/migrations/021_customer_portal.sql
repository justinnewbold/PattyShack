/**
 * Migration: Customer-Facing Portal (Online Ordering & Reservations)
 * Phase 19
 *
 * Features:
 * - Online ordering system
 * - Table reservations
 * - Customer accounts
 * - Order tracking
 * - Loyalty program integration
 * - Delivery management
 */

-- ============================================
-- CUSTOMER ACCOUNTS
-- ============================================

CREATE TABLE IF NOT EXISTS customer_accounts (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('cust_' || gen_random_uuid()::TEXT),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  date_of_birth DATE,
  profile_image_url TEXT,
  dietary_preferences JSONB DEFAULT '[]',
  allergens VARCHAR(100)[],
  preferred_location_id VARCHAR(255) REFERENCES locations(id),
  loyalty_points INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  account_status VARCHAR(50) DEFAULT 'active',
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  marketing_opt_in BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX idx_customer_accounts_email ON customer_accounts(email);
CREATE INDEX idx_customer_accounts_phone ON customer_accounts(phone);
CREATE INDEX idx_customer_accounts_status ON customer_accounts(account_status);

-- ============================================
-- CUSTOMER ADDRESSES
-- ============================================

CREATE TABLE IF NOT EXISTS customer_addresses (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('addr_' || gen_random_uuid()::TEXT),
  customer_id VARCHAR(255) REFERENCES customer_accounts(id) ON DELETE CASCADE,
  label VARCHAR(50), -- home, work, other
  street_address VARCHAR(255) NOT NULL,
  street_address_2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(50) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(50) DEFAULT 'USA',
  delivery_instructions TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customer_addresses_customer ON customer_addresses(customer_id);

-- ============================================
-- ONLINE ORDERS
-- ============================================

CREATE TABLE IF NOT EXISTS online_orders (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('order_' || gen_random_uuid()::TEXT),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id VARCHAR(255) REFERENCES customer_accounts(id),
  location_id VARCHAR(255) REFERENCES locations(id) NOT NULL,
  order_type VARCHAR(50) NOT NULL, -- delivery, pickup, dine-in
  order_status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, preparing, ready, out_for_delivery, completed, cancelled
  payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, failed, refunded
  subtotal NUMERIC(10,2) NOT NULL,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  delivery_fee NUMERIC(10,2) DEFAULT 0,
  tip_amount NUMERIC(10,2) DEFAULT 0,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  loyalty_points_used INTEGER DEFAULT 0,
  loyalty_points_earned INTEGER DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL,
  special_instructions TEXT,
  estimated_ready_time TIMESTAMPTZ,
  actual_ready_time TIMESTAMPTZ,
  delivery_address_id VARCHAR(255) REFERENCES customer_addresses(id),
  delivery_driver_id VARCHAR(255),
  delivery_estimated_time TIMESTAMPTZ,
  delivery_actual_time TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  placed_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_online_orders_customer ON online_orders(customer_id);
CREATE INDEX idx_online_orders_location ON online_orders(location_id);
CREATE INDEX idx_online_orders_status ON online_orders(order_status);
CREATE INDEX idx_online_orders_placed_at ON online_orders(placed_at);
CREATE INDEX idx_online_orders_number ON online_orders(order_number);

-- ============================================
-- ORDER ITEMS
-- ============================================

CREATE TABLE IF NOT EXISTS online_order_items (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('item_' || gen_random_uuid()::TEXT),
  order_id VARCHAR(255) REFERENCES online_orders(id) ON DELETE CASCADE,
  menu_item_id VARCHAR(255) REFERENCES menu_items(id),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  modifiers JSONB DEFAULT '[]', -- [{modifier_id, name, price}]
  special_instructions TEXT,
  subtotal NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_online_order_items_order ON online_order_items(order_id);
CREATE INDEX idx_online_order_items_menu_item ON online_order_items(menu_item_id);

-- ============================================
-- TABLE RESERVATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS table_reservations (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('res_' || gen_random_uuid()::TEXT),
  reservation_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id VARCHAR(255) REFERENCES customer_accounts(id),
  location_id VARCHAR(255) REFERENCES locations(id) NOT NULL,
  guest_name VARCHAR(255) NOT NULL,
  guest_email VARCHAR(255),
  guest_phone VARCHAR(20),
  party_size INTEGER NOT NULL,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 90,
  table_number VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, seated, completed, cancelled, no_show
  special_requests TEXT,
  dietary_restrictions JSONB DEFAULT '[]',
  occasion VARCHAR(100), -- birthday, anniversary, business, etc
  confirmation_sent BOOLEAN DEFAULT FALSE,
  reminder_sent BOOLEAN DEFAULT FALSE,
  seated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_table_reservations_customer ON table_reservations(customer_id);
CREATE INDEX idx_table_reservations_location ON table_reservations(location_id);
CREATE INDEX idx_table_reservations_date ON table_reservations(reservation_date, reservation_time);
CREATE INDEX idx_table_reservations_status ON table_reservations(status);

-- ============================================
-- LOYALTY PROGRAM
-- ============================================

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('loy_' || gen_random_uuid()::TEXT),
  customer_id VARCHAR(255) REFERENCES customer_accounts(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL, -- earned, redeemed, expired, adjusted
  points INTEGER NOT NULL,
  order_id VARCHAR(255) REFERENCES online_orders(id),
  description TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255)
);

CREATE INDEX idx_loyalty_transactions_customer ON loyalty_transactions(customer_id);
CREATE INDEX idx_loyalty_transactions_type ON loyalty_transactions(transaction_type);

CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('reward_' || gen_random_uuid()::TEXT),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL,
  reward_type VARCHAR(50) NOT NULL, -- discount, free_item, percentage_off
  reward_value NUMERIC(10,2),
  menu_item_id VARCHAR(255) REFERENCES menu_items(id),
  discount_percentage NUMERIC(5,2),
  max_redemptions INTEGER,
  current_redemptions INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loyalty_redemptions (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('redeem_' || gen_random_uuid()::TEXT),
  customer_id VARCHAR(255) REFERENCES customer_accounts(id) ON DELETE CASCADE,
  reward_id VARCHAR(255) REFERENCES loyalty_rewards(id),
  order_id VARCHAR(255) REFERENCES online_orders(id),
  points_spent INTEGER NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_loyalty_redemptions_customer ON loyalty_redemptions(customer_id);

-- ============================================
-- DELIVERY MANAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS delivery_zones (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('zone_' || gen_random_uuid()::TEXT),
  location_id VARCHAR(255) REFERENCES locations(id) NOT NULL,
  zone_name VARCHAR(255) NOT NULL,
  postal_codes VARCHAR(20)[],
  delivery_fee NUMERIC(10,2) NOT NULL,
  minimum_order_amount NUMERIC(10,2) DEFAULT 0,
  estimated_delivery_minutes INTEGER DEFAULT 45,
  is_active BOOLEAN DEFAULT TRUE,
  boundary_polygon JSONB, -- GeoJSON polygon
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_delivery_zones_location ON delivery_zones(location_id);

CREATE TABLE IF NOT EXISTS delivery_drivers (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('driver_' || gen_random_uuid()::TEXT),
  user_id VARCHAR(255) REFERENCES users(id),
  location_id VARCHAR(255) REFERENCES locations(id),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  vehicle_type VARCHAR(50),
  vehicle_plate VARCHAR(50),
  license_number VARCHAR(100),
  driver_status VARCHAR(50) DEFAULT 'offline', -- offline, available, on_delivery, break
  current_location JSONB, -- {lat, lng, timestamp}
  current_order_id VARCHAR(255) REFERENCES online_orders(id),
  total_deliveries INTEGER DEFAULT 0,
  average_rating NUMERIC(3,2) DEFAULT 5.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_delivery_drivers_location ON delivery_drivers(location_id);
CREATE INDEX idx_delivery_drivers_status ON delivery_drivers(driver_status);

-- ============================================
-- CUSTOMER REVIEWS
-- ============================================

CREATE TABLE IF NOT EXISTS customer_reviews (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('review_' || gen_random_uuid()::TEXT),
  customer_id VARCHAR(255) REFERENCES customer_accounts(id) ON DELETE CASCADE,
  order_id VARCHAR(255) REFERENCES online_orders(id),
  location_id VARCHAR(255) REFERENCES locations(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  food_rating INTEGER CHECK (food_rating >= 1 AND food_rating <= 5),
  service_rating INTEGER CHECK (service_rating >= 1 AND service_rating <= 5),
  delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
  review_text TEXT,
  response_text TEXT,
  response_by VARCHAR(255),
  response_at TIMESTAMPTZ,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customer_reviews_customer ON customer_reviews(customer_id);
CREATE INDEX idx_customer_reviews_location ON customer_reviews(location_id);
CREATE INDEX idx_customer_reviews_rating ON customer_reviews(rating);

-- ============================================
-- VIEWS
-- ============================================

-- Customer order history
CREATE OR REPLACE VIEW customer_order_history AS
SELECT
  c.id as customer_id,
  c.email,
  c.first_name || ' ' || c.last_name as customer_name,
  o.id as order_id,
  o.order_number,
  o.order_type,
  o.order_status,
  o.total_amount,
  o.placed_at,
  l.name as location_name,
  COUNT(oi.id) as item_count
FROM customer_accounts c
JOIN online_orders o ON c.id = o.customer_id
JOIN locations l ON o.location_id = l.id
LEFT JOIN online_order_items oi ON o.id = oi.order_id
GROUP BY c.id, c.email, c.first_name, c.last_name, o.id, o.order_number,
         o.order_type, o.order_status, o.total_amount, o.placed_at, l.name;

-- Active reservations
CREATE OR REPLACE VIEW active_reservations AS
SELECT
  r.*,
  c.email as customer_email,
  c.phone as customer_phone,
  l.name as location_name
FROM table_reservations r
LEFT JOIN customer_accounts c ON r.customer_id = c.id
JOIN locations l ON r.location_id = l.id
WHERE r.status IN ('pending', 'confirmed', 'seated')
  AND r.reservation_date >= CURRENT_DATE
ORDER BY r.reservation_date, r.reservation_time;

-- Customer loyalty summary
CREATE OR REPLACE VIEW customer_loyalty_summary AS
SELECT
  c.id as customer_id,
  c.email,
  c.first_name || ' ' || c.last_name as customer_name,
  c.loyalty_points as current_points,
  COALESCE(SUM(CASE WHEN lt.transaction_type = 'earned' THEN lt.points ELSE 0 END), 0) as total_earned,
  COALESCE(SUM(CASE WHEN lt.transaction_type = 'redeemed' THEN lt.points ELSE 0 END), 0) as total_redeemed,
  COUNT(DISTINCT lr.id) as total_redemptions,
  c.total_orders,
  c.total_spent
FROM customer_accounts c
LEFT JOIN loyalty_transactions lt ON c.id = lt.customer_id
LEFT JOIN loyalty_redemptions lr ON c.id = lr.customer_id
GROUP BY c.id, c.email, c.first_name, c.last_name, c.loyalty_points, c.total_orders, c.total_spent;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Calculate loyalty points for order
CREATE OR REPLACE FUNCTION calculate_loyalty_points(p_order_amount NUMERIC)
RETURNS INTEGER AS $$
DECLARE
  points INTEGER;
BEGIN
  -- $1 spent = 1 point
  points := FLOOR(p_order_amount);
  RETURN points;
END;
$$ LANGUAGE plpgsql;

-- Update customer stats on order
CREATE OR REPLACE FUNCTION update_customer_stats_on_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_status = 'completed' AND NEW.payment_status = 'paid' THEN
    UPDATE customer_accounts
    SET
      total_orders = total_orders + 1,
      total_spent = total_spent + NEW.total_amount,
      loyalty_points = loyalty_points + NEW.loyalty_points_earned - NEW.loyalty_points_used,
      updated_at = NOW()
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_stats_on_order
AFTER UPDATE ON online_orders
FOR EACH ROW
WHEN (OLD.order_status IS DISTINCT FROM NEW.order_status OR
      OLD.payment_status IS DISTINCT FROM NEW.payment_status)
EXECUTE FUNCTION update_customer_stats_on_order();

-- Generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  order_num VARCHAR(50);
BEGIN
  IF NEW.order_number IS NULL THEN
    order_num := 'ORD' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(nextval('order_number_seq')::TEXT, 6, '0');
    NEW.order_number := order_num;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

CREATE TRIGGER trigger_generate_order_number
BEFORE INSERT ON online_orders
FOR EACH ROW
EXECUTE FUNCTION generate_order_number();

-- Generate reservation number
CREATE OR REPLACE FUNCTION generate_reservation_number()
RETURNS TRIGGER AS $$
DECLARE
  res_num VARCHAR(50);
BEGIN
  IF NEW.reservation_number IS NULL THEN
    res_num := 'RES' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(nextval('reservation_number_seq')::TEXT, 6, '0');
    NEW.reservation_number := res_num;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS reservation_number_seq START 1;

CREATE TRIGGER trigger_generate_reservation_number
BEFORE INSERT ON table_reservations
FOR EACH ROW
EXECUTE FUNCTION generate_reservation_number();

-- ============================================
-- SEED DATA
-- ============================================

-- Insert sample loyalty rewards
INSERT INTO loyalty_rewards (name, description, points_required, reward_type, discount_percentage, is_active)
VALUES
  ('$5 Off', 'Get $5 off your next order', 500, 'discount', NULL, TRUE),
  ('10% Off', 'Get 10% off your entire order', 1000, 'percentage_off', 10.00, TRUE),
  ('Free Appetizer', 'Get a free appetizer of your choice', 750, 'free_item', NULL, TRUE),
  ('Free Dessert', 'Get a free dessert of your choice', 500, 'free_item', NULL, TRUE),
  ('20% Off', 'Get 20% off your entire order', 2000, 'percentage_off', 20.00, TRUE)
ON CONFLICT DO NOTHING;

-- Migration complete
