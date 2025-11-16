/**
 * Franchise Management Service
 * Phase 22
 *
 * Handles franchise operations, royalties, compliance, and multi-brand management
 */

const { pool } = require('../database/pool');

class FranchiseService {
  // ============================================
  // BRANDS
  // ============================================

  async createBrand(brandData, userId) {
    const result = await pool.query(
      `INSERT INTO brands (
        brand_name, brand_code, description, logo_url,
        primary_color, secondary_color, brand_guidelines_url, website_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        brandData.brand_name,
        brandData.brand_code,
        brandData.description,
        brandData.logo_url,
        brandData.primary_color,
        brandData.secondary_color,
        brandData.brand_guidelines_url,
        brandData.website_url
      ]
    );

    return result.rows[0];
  }

  async getBrands() {
    const result = await pool.query(
      'SELECT * FROM brands WHERE is_active = TRUE ORDER BY brand_name'
    );
    return result.rows;
  }

  async getBrandById(brandId) {
    const result = await pool.query('SELECT * FROM brands WHERE id = $1', [brandId]);
    return result.rows[0];
  }

  // ============================================
  // FRANCHISE AGREEMENTS
  // ============================================

  async createFranchiseAgreement(agreementData, userId) {
    const result = await pool.query(
      `INSERT INTO franchise_agreements (
        brand_id, franchisee_name, franchisee_company, franchisee_email,
        franchisee_phone, agreement_number, agreement_type, territory,
        exclusive_territory, start_date, end_date, term_years,
        initial_franchise_fee, ongoing_royalty_percentage,
        marketing_fee_percentage, minimum_royalty_monthly
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        agreementData.brand_id,
        agreementData.franchisee_name,
        agreementData.franchisee_company,
        agreementData.franchisee_email,
        agreementData.franchisee_phone,
        agreementData.agreement_number,
        agreementData.agreement_type || 'franchise',
        agreementData.territory,
        agreementData.exclusive_territory || false,
        agreementData.start_date,
        agreementData.end_date,
        agreementData.term_years,
        agreementData.initial_franchise_fee,
        agreementData.ongoing_royalty_percentage,
        agreementData.marketing_fee_percentage,
        agreementData.minimum_royalty_monthly
      ]
    );

    return result.rows[0];
  }

  async getFranchiseAgreements(filters = {}) {
    let query = 'SELECT * FROM franchise_agreements WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (filters.brand_id) {
      query += ` AND brand_id = $${paramCount}`;
      values.push(filters.brand_id);
      paramCount++;
    }

    if (filters.status) {
      query += ` AND agreement_status = $${paramCount}`;
      values.push(filters.status);
      paramCount++;
    }

    query += ' ORDER BY franchisee_name';

    const result = await pool.query(query, values);
    return result.rows;
  }

  async getFranchiseAgreementById(agreementId) {
    const result = await pool.query(
      'SELECT * FROM franchise_agreements WHERE id = $1',
      [agreementId]
    );
    return result.rows[0];
  }

  // ============================================
  // ROYALTY MANAGEMENT
  // ============================================

  async calculateRoyalty(agreementId, locationId, periodStart, periodEnd, grossSales) {
    const result = await pool.query(
      'SELECT calculate_franchise_royalty($1, $2, $3, $4, $5) as royalty',
      [agreementId, locationId, periodStart, periodEnd, grossSales]
    );

    return result.rows[0].royalty;
  }

  async getRoyaltyCalculations(filters = {}) {
    let query = 'SELECT * FROM royalty_calculations WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (filters.franchise_agreement_id) {
      query += ` AND franchise_agreement_id = $${paramCount}`;
      values.push(filters.franchise_agreement_id);
      paramCount++;
    }

    if (filters.location_id) {
      query += ` AND location_id = $${paramCount}`;
      values.push(filters.location_id);
      paramCount++;
    }

    if (filters.payment_status) {
      query += ` AND payment_status = $${paramCount}`;
      values.push(filters.payment_status);
      paramCount++;
    }

    query += ' ORDER BY calculation_period_start DESC';

    const result = await pool.query(query, values);
    return result.rows;
  }

  async getRoyaltyPaymentStatus() {
    const result = await pool.query('SELECT * FROM royalty_payment_status');
    return result.rows;
  }

  async markRoyaltyPaid(royaltyId, paymentDate) {
    const result = await pool.query(
      `UPDATE royalty_calculations
       SET payment_status = 'paid', payment_date = $1
       WHERE id = $2
       RETURNING *`,
      [paymentDate, royaltyId]
    );

    return result.rows[0];
  }

  // ============================================
  // BRAND STANDARDS & COMPLIANCE
  // ============================================

  async createBrandStandard(standardData, userId) {
    const result = await pool.query(
      `INSERT INTO brand_standards (
        brand_id, standard_name, category, description,
        measurement_criteria, compliance_threshold,
        inspection_frequency, is_critical
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        standardData.brand_id,
        standardData.standard_name,
        standardData.category,
        standardData.description,
        standardData.measurement_criteria,
        standardData.compliance_threshold,
        standardData.inspection_frequency,
        standardData.is_critical || false
      ]
    );

    return result.rows[0];
  }

  async getBrandStandards(brandId) {
    const result = await pool.query(
      'SELECT * FROM brand_standards WHERE brand_id = $1 AND is_active = TRUE ORDER BY category, standard_name',
      [brandId]
    );
    return result.rows;
  }

  async createInspection(inspectionData, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const inspectionResult = await client.query(
        `INSERT INTO franchise_inspections (
          franchise_agreement_id, location_id, inspection_date,
          inspector_name, inspector_id, inspection_type, overall_score,
          passed, critical_violations, minor_violations,
          recommendations, follow_up_required, follow_up_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          inspectionData.franchise_agreement_id,
          inspectionData.location_id,
          inspectionData.inspection_date,
          inspectionData.inspector_name,
          inspectionData.inspector_id,
          inspectionData.inspection_type,
          inspectionData.overall_score,
          inspectionData.passed,
          inspectionData.critical_violations || 0,
          inspectionData.minor_violations || 0,
          inspectionData.recommendations,
          inspectionData.follow_up_required || false,
          inspectionData.follow_up_date
        ]
      );

      const inspection = inspectionResult.rows[0];

      // Add findings if provided
      if (inspectionData.findings && inspectionData.findings.length > 0) {
        for (const finding of inspectionData.findings) {
          await client.query(
            `INSERT INTO inspection_findings (
              inspection_id, standard_id, finding_type, severity, description, corrective_action
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              inspection.id,
              finding.standard_id,
              finding.finding_type,
              finding.severity,
              finding.description,
              finding.corrective_action
            ]
          );
        }
      }

      await client.query('COMMIT');
      return inspection;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getInspections(locationId) {
    const result = await pool.query(
      `SELECT
        fi.*,
        COALESCE(
          json_agg(json_build_object(
            'id', inf.id,
            'finding_type', inf.finding_type,
            'severity', inf.severity,
            'description', inf.description,
            'corrective_action', inf.corrective_action,
            'is_corrected', inf.is_corrected
          )) FILTER (WHERE inf.id IS NOT NULL),
          '[]'
        ) as findings
      FROM franchise_inspections fi
      LEFT JOIN inspection_findings inf ON fi.id = inf.inspection_id
      WHERE fi.location_id = $1
      GROUP BY fi.id
      ORDER BY fi.inspection_date DESC`,
      [locationId]
    );

    return result.rows;
  }

  // ============================================
  // FRANCHISE SUPPORT
  // ============================================

  async createSupportTicket(ticketData, userId) {
    const result = await pool.query(
      `INSERT INTO franchise_support_tickets (
        franchise_agreement_id, location_id, category, priority,
        subject, description, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        ticketData.franchise_agreement_id,
        ticketData.location_id,
        ticketData.category,
        ticketData.priority || 'medium',
        ticketData.subject,
        ticketData.description,
        userId
      ]
    );

    return result.rows[0];
  }

  async getSupportTickets(filters = {}) {
    let query = 'SELECT * FROM franchise_support_tickets WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (filters.franchise_agreement_id) {
      query += ` AND franchise_agreement_id = $${paramCount}`;
      values.push(filters.franchise_agreement_id);
      paramCount++;
    }

    if (filters.status) {
      query += ` AND status = $${paramCount}`;
      values.push(filters.status);
      paramCount++;
    }

    if (filters.priority) {
      query += ` AND priority = $${paramCount}`;
      values.push(filters.priority);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, values);
    return result.rows;
  }

  async resolveSupportTicket(ticketId, resolutionNotes, userId) {
    const result = await pool.query(
      `UPDATE franchise_support_tickets
       SET status = 'resolved',
           resolved_at = NOW(),
           resolution_notes = $1,
           assigned_to = $2
       WHERE id = $3
       RETURNING *`,
      [resolutionNotes, userId, ticketId]
    );

    return result.rows[0];
  }

  // ============================================
  // PERFORMANCE & REPORTING
  // ============================================

  async getFranchisePerformanceSummary(agreementId = null) {
    let query = 'SELECT * FROM franchise_performance_summary';
    const values = [];

    if (agreementId) {
      query += ' WHERE agreement_id = $1';
      values.push(agreementId);
    }

    const result = await pool.query(query, values);
    return agreementId ? result.rows[0] : result.rows;
  }

  async getBrandPerformanceOverview(brandId = null) {
    let query = 'SELECT * FROM brand_performance_overview';
    const values = [];

    if (brandId) {
      query += ' WHERE brand_id = $1';
      values.push(brandId);
    }

    const result = await pool.query(query, values);
    return brandId ? result.rows[0] : result.rows;
  }
}

module.exports = new FranchiseService();
