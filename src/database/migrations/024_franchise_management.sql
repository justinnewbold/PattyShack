/**
 * Migration: Franchise & Multi-Brand Management
 * Phase 22
 *
 * Features:
 * - Franchise operations
 * - Multi-brand support
 * - Royalty tracking
 * - Brand standards compliance
 * - Territory management
 * - Franchise reporting
 */

-- ============================================
-- BRANDS
-- ============================================

CREATE TABLE IF NOT EXISTS brands (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('brand_' || gen_random_uuid()::TEXT),
  brand_name VARCHAR(255) UNIQUE NOT NULL,
  brand_code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  primary_color VARCHAR(20),
  secondary_color VARCHAR(20),
  brand_guidelines_url TEXT,
  website_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_brands_code ON brands(brand_code);

-- ============================================
-- FRANCHISE AGREEMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS franchise_agreements (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('agr_' || gen_random_uuid()::TEXT),
  brand_id VARCHAR(255) REFERENCES brands(id) NOT NULL,
  franchisee_name VARCHAR(255) NOT NULL,
  franchisee_company VARCHAR(255),
  franchisee_email VARCHAR(255),
  franchisee_phone VARCHAR(20),
  agreement_number VARCHAR(100) UNIQUE NOT NULL,
  agreement_type VARCHAR(50) DEFAULT 'franchise', -- franchise, area_development, master_franchise
  territory VARCHAR(255),
  territory_polygon JSONB,
  exclusive_territory BOOLEAN DEFAULT FALSE,
  start_date DATE NOT NULL,
  end_date DATE,
  term_years INTEGER,
  renewal_option BOOLEAN DEFAULT TRUE,
  initial_franchise_fee NUMERIC(12,2),
  ongoing_royalty_percentage NUMERIC(5,2),
  marketing_fee_percentage NUMERIC(5,2),
  minimum_royalty_monthly NUMERIC(12,2),
  agreement_status VARCHAR(50) DEFAULT 'active', -- pending, active, expired, terminated
  signed_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_franchise_agreements_brand ON franchise_agreements(brand_id);
CREATE INDEX idx_franchise_agreements_status ON franchise_agreements(agreement_status);

-- Link locations to franchise agreements
ALTER TABLE locations ADD COLUMN IF NOT EXISTS brand_id VARCHAR(255) REFERENCES brands(id);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS franchise_agreement_id VARCHAR(255) REFERENCES franchise_agreements(id);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS is_franchised BOOLEAN DEFAULT FALSE;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS is_corporate BOOLEAN DEFAULT TRUE;

-- ============================================
-- ROYALTY TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS royalty_calculations (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('roy_' || gen_random_uuid()::TEXT),
  franchise_agreement_id VARCHAR(255) REFERENCES franchise_agreements(id) NOT NULL,
  location_id VARCHAR(255) REFERENCES locations(id),
  calculation_period_start DATE NOT NULL,
  calculation_period_end DATE NOT NULL,
  gross_sales NUMERIC(12,2) NOT NULL,
  royalty_percentage NUMERIC(5,2) NOT NULL,
  calculated_royalty NUMERIC(12,2) NOT NULL,
  minimum_royalty NUMERIC(12,2),
  final_royalty NUMERIC(12,2) NOT NULL,
  marketing_fee_percentage NUMERIC(5,2),
  marketing_fee NUMERIC(12,2),
  total_fees NUMERIC(12,2) NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, overdue, disputed
  payment_due_date DATE,
  payment_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_royalty_calculations_agreement ON royalty_calculations(franchise_agreement_id);
CREATE INDEX idx_royalty_calculations_location ON royalty_calculations(location_id);
CREATE INDEX idx_royalty_calculations_period ON royalty_calculations(calculation_period_start, calculation_period_end);
CREATE INDEX idx_royalty_calculations_status ON royalty_calculations(payment_status);

-- ============================================
-- BRAND STANDARDS & COMPLIANCE
-- ============================================

CREATE TABLE IF NOT EXISTS brand_standards (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('std_' || gen_random_uuid()::TEXT),
  brand_id VARCHAR(255) REFERENCES brands(id) NOT NULL,
  standard_name VARCHAR(255) NOT NULL,
  category VARCHAR(100), -- operations, quality, cleanliness, service, marketing
  description TEXT NOT NULL,
  measurement_criteria TEXT,
  compliance_threshold NUMERIC(5,2), -- percentage
  inspection_frequency VARCHAR(50), -- weekly, monthly, quarterly, annual
  is_critical BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_brand_standards_brand ON brand_standards(brand_id);
CREATE INDEX idx_brand_standards_category ON brand_standards(category);

CREATE TABLE IF NOT EXISTS franchise_inspections (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('insp_' || gen_random_uuid()::TEXT),
  franchise_agreement_id VARCHAR(255) REFERENCES franchise_agreements(id),
  location_id VARCHAR(255) REFERENCES locations(id) NOT NULL,
  inspection_date DATE NOT NULL,
  inspector_name VARCHAR(255),
  inspector_id VARCHAR(255),
  inspection_type VARCHAR(50), -- routine, follow_up, complaint, pre_opening
  overall_score NUMERIC(5,2),
  passed BOOLEAN,
  critical_violations INTEGER DEFAULT 0,
  minor_violations INTEGER DEFAULT 0,
  recommendations TEXT,
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_franchise_inspections_location ON franchise_inspections(location_id);
CREATE INDEX idx_franchise_inspections_date ON franchise_inspections(inspection_date);

CREATE TABLE IF NOT EXISTS inspection_findings (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('finding_' || gen_random_uuid()::TEXT),
  inspection_id VARCHAR(255) REFERENCES franchise_inspections(id) ON DELETE CASCADE,
  standard_id VARCHAR(255) REFERENCES brand_standards(id),
  finding_type VARCHAR(50), -- violation, observation, commendation
  severity VARCHAR(50), -- critical, major, minor
  description TEXT NOT NULL,
  corrective_action TEXT,
  corrected_date DATE,
  is_corrected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inspection_findings_inspection ON inspection_findings(inspection_id);
CREATE INDEX idx_inspection_findings_standard ON inspection_findings(standard_id);

-- ============================================
-- TERRITORY MANAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS territories (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('terr_' || gen_random_uuid()::TEXT),
  brand_id VARCHAR(255) REFERENCES brands(id),
  territory_name VARCHAR(255) NOT NULL,
  territory_code VARCHAR(50),
  territory_type VARCHAR(50), -- city, county, state, zip_codes, radius
  geographic_data JSONB, -- boundaries, zip codes, coordinates
  population INTEGER,
  market_size VARCHAR(50), -- small, medium, large, metro
  is_available BOOLEAN DEFAULT TRUE,
  assigned_agreement_id VARCHAR(255) REFERENCES franchise_agreements(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_territories_brand ON territories(brand_id);
CREATE INDEX idx_territories_available ON territories(is_available);

-- ============================================
-- FRANCHISE SUPPORT
-- ============================================

CREATE TABLE IF NOT EXISTS franchise_support_tickets (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('ticket_' || gen_random_uuid()::TEXT),
  franchise_agreement_id VARCHAR(255) REFERENCES franchise_agreements(id),
  location_id VARCHAR(255) REFERENCES locations(id),
  ticket_number VARCHAR(50) UNIQUE NOT NULL,
  category VARCHAR(100), -- operations, marketing, it, equipment, hr
  priority VARCHAR(50) DEFAULT 'medium', -- low, medium, high, urgent
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'open', -- open, in_progress, resolved, closed
  assigned_to VARCHAR(255),
  created_by VARCHAR(255),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_franchise_support_tickets_agreement ON franchise_support_tickets(franchise_agreement_id);
CREATE INDEX idx_franchise_support_tickets_status ON franchise_support_tickets(status);
CREATE INDEX idx_franchise_support_tickets_priority ON franchise_support_tickets(priority);

-- ============================================
-- MULTI-BRAND MENU MANAGEMENT
-- ============================================

-- Link menu items to brands
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS brand_id VARCHAR(255) REFERENCES brands(id);
ALTER TABLE menu_categories ADD COLUMN IF NOT EXISTS brand_id VARCHAR(255) REFERENCES brands(id);

-- ============================================
-- FRANCHISE TRAINING
-- ============================================

CREATE TABLE IF NOT EXISTS training_programs (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('prog_' || gen_random_uuid()::TEXT),
  brand_id VARCHAR(255) REFERENCES brands(id),
  program_name VARCHAR(255) NOT NULL,
  program_type VARCHAR(100), -- initial, ongoing, management, certification
  description TEXT,
  duration_hours NUMERIC(5,2),
  is_mandatory BOOLEAN DEFAULT TRUE,
  is_online BOOLEAN DEFAULT FALSE,
  certification_required BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS franchise_training_records (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('train_' || gen_random_uuid()::TEXT),
  franchise_agreement_id VARCHAR(255) REFERENCES franchise_agreements(id),
  location_id VARCHAR(255) REFERENCES locations(id),
  user_id VARCHAR(255) REFERENCES users(id),
  program_id VARCHAR(255) REFERENCES training_programs(id),
  training_date DATE NOT NULL,
  completion_date DATE,
  score NUMERIC(5,2),
  passed BOOLEAN,
  certified BOOLEAN DEFAULT FALSE,
  certification_expires_at DATE,
  trainer_name VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_franchise_training_records_agreement ON franchise_training_records(franchise_agreement_id);
CREATE INDEX idx_franchise_training_records_program ON franchise_training_records(program_id);

-- ============================================
-- VIEWS
-- ============================================

-- Franchise performance summary
CREATE OR REPLACE VIEW franchise_performance_summary AS
SELECT
  fa.id as agreement_id,
  fa.franchisee_name,
  b.brand_name,
  COUNT(DISTINCT l.id) as total_locations,
  SUM(rc.gross_sales) as total_sales,
  SUM(rc.final_royalty) as total_royalties,
  AVG(fi.overall_score) as avg_inspection_score,
  COUNT(DISTINCT fst.id) FILTER (WHERE fst.status IN ('open', 'in_progress')) as open_support_tickets
FROM franchise_agreements fa
JOIN brands b ON fa.brand_id = b.id
LEFT JOIN locations l ON fa.id = l.franchise_agreement_id
LEFT JOIN royalty_calculations rc ON fa.id = rc.franchise_agreement_id
LEFT JOIN franchise_inspections fi ON l.id = fi.location_id
LEFT JOIN franchise_support_tickets fst ON fa.id = fst.franchise_agreement_id
WHERE fa.agreement_status = 'active'
GROUP BY fa.id, fa.franchisee_name, b.brand_name;

-- Brand performance across all locations
CREATE OR REPLACE VIEW brand_performance_overview AS
SELECT
  b.id as brand_id,
  b.brand_name,
  COUNT(DISTINCT l.id) as total_locations,
  COUNT(DISTINCT l.id) FILTER (WHERE l.is_franchised = TRUE) as franchised_locations,
  COUNT(DISTINCT l.id) FILTER (WHERE l.is_corporate = TRUE) as corporate_locations,
  COUNT(DISTINCT fa.id) as total_franchisees,
  AVG(fi.overall_score) as avg_compliance_score
FROM brands b
LEFT JOIN locations l ON b.id = l.brand_id
LEFT JOIN franchise_agreements fa ON b.id = fa.brand_id AND fa.agreement_status = 'active'
LEFT JOIN franchise_inspections fi ON l.id = fi.location_id
GROUP BY b.id, b.brand_name;

-- Royalty payment status
CREATE OR REPLACE VIEW royalty_payment_status AS
SELECT
  fa.franchisee_name,
  l.name as location_name,
  rc.calculation_period_start,
  rc.calculation_period_end,
  rc.gross_sales,
  rc.final_royalty,
  rc.total_fees,
  rc.payment_status,
  rc.payment_due_date,
  CASE
    WHEN rc.payment_status = 'overdue' THEN CURRENT_DATE - rc.payment_due_date
    ELSE 0
  END as days_overdue
FROM royalty_calculations rc
JOIN franchise_agreements fa ON rc.franchise_agreement_id = fa.id
LEFT JOIN locations l ON rc.location_id = l.id
ORDER BY rc.payment_due_date DESC;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Calculate royalty for period
CREATE OR REPLACE FUNCTION calculate_franchise_royalty(
  p_agreement_id VARCHAR,
  p_location_id VARCHAR,
  p_period_start DATE,
  p_period_end DATE,
  p_gross_sales NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  agreement RECORD;
  calculated_royalty NUMERIC;
  final_royalty NUMERIC;
BEGIN
  -- Get agreement details
  SELECT * INTO agreement FROM franchise_agreements WHERE id = p_agreement_id;

  -- Calculate royalty
  calculated_royalty := p_gross_sales * (agreement.ongoing_royalty_percentage / 100);

  -- Apply minimum if specified
  IF agreement.minimum_royalty_monthly IS NOT NULL AND calculated_royalty < agreement.minimum_royalty_monthly THEN
    final_royalty := agreement.minimum_royalty_monthly;
  ELSE
    final_royalty := calculated_royalty;
  END IF;

  -- Insert royalty calculation
  INSERT INTO royalty_calculations (
    franchise_agreement_id,
    location_id,
    calculation_period_start,
    calculation_period_end,
    gross_sales,
    royalty_percentage,
    calculated_royalty,
    minimum_royalty,
    final_royalty,
    marketing_fee_percentage,
    marketing_fee,
    total_fees
  ) VALUES (
    p_agreement_id,
    p_location_id,
    p_period_start,
    p_period_end,
    p_gross_sales,
    agreement.ongoing_royalty_percentage,
    calculated_royalty,
    agreement.minimum_royalty_monthly,
    final_royalty,
    agreement.marketing_fee_percentage,
    p_gross_sales * (agreement.marketing_fee_percentage / 100),
    final_royalty + (p_gross_sales * (agreement.marketing_fee_percentage / 100))
  );

  RETURN final_royalty;
END;
$$ LANGUAGE plpgsql;

-- Generate franchise support ticket number
CREATE OR REPLACE FUNCTION generate_support_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
  ticket_num VARCHAR(50);
BEGIN
  IF NEW.ticket_number IS NULL THEN
    ticket_num := 'TICK' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(nextval('support_ticket_seq')::TEXT, 6, '0');
    NEW.ticket_number := ticket_num;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS support_ticket_seq START 1;

CREATE TRIGGER trigger_generate_support_ticket_number
BEFORE INSERT ON franchise_support_tickets
FOR EACH ROW
EXECUTE FUNCTION generate_support_ticket_number();

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default brand
INSERT INTO brands (brand_name, brand_code, description, is_active)
VALUES
  ('PattyShack', 'PS', 'Original PattyShack burger concept', TRUE)
ON CONFLICT DO NOTHING;

-- Update existing locations to reference default brand
UPDATE locations
SET brand_id = (SELECT id FROM brands WHERE brand_code = 'PS' LIMIT 1),
    is_corporate = TRUE,
    is_franchised = FALSE
WHERE brand_id IS NULL;

-- Migration complete
