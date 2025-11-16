/**
 * Customer Portal Service
 * Phase 19
 *
 * Handles online ordering, reservations, loyalty, and customer accounts
 */

const { pool } = require('../database/pool');
const bcrypt = require('bcrypt');

class CustomerPortalService {
  // ============================================
  // CUSTOMER ACCOUNTS
  // ============================================

  async createCustomerAccount(accountData, hashedPassword) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO customer_accounts (
          email, password_hash, first_name, last_name, phone,
          date_of_birth, dietary_preferences, allergens,
          preferred_location_id, marketing_opt_in
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          accountData.email,
          hashedPassword,
          accountData.first_name,
          accountData.last_name,
          accountData.phone,
          accountData.date_of_birth,
          JSON.stringify(accountData.dietary_preferences || []),
          accountData.allergens || [],
          accountData.preferred_location_id,
          accountData.marketing_opt_in || false
        ]
      );

      await client.query('COMMIT');
      const account = result.rows[0];
      delete account.password_hash;
      return account;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async authenticateCustomer(email, password) {
    const result = await pool.query(
      'SELECT * FROM customer_accounts WHERE email = $1 AND account_status = $2',
      [email, 'active']
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid credentials');
    }

    const customer = result.rows[0];
    const validPassword = await bcrypt.compare(password, customer.password_hash);

    if (!validPassword) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await pool.query(
      'UPDATE customer_accounts SET last_login_at = NOW() WHERE id = $1',
      [customer.id]
    );

    delete customer.password_hash;
    return customer;
  }

  async getCustomerProfile(customerId) {
    const result = await pool.query(
      `SELECT
        c.*,
        COALESCE(
          json_agg(DISTINCT addr.*) FILTER (WHERE addr.id IS NOT NULL),
          '[]'
        ) as addresses
      FROM customer_accounts c
      LEFT JOIN customer_addresses addr ON c.id = addr.customer_id
      WHERE c.id = $1
      GROUP BY c.id`,
      [customerId]
    );

    if (result.rows.length === 0) {
      throw new Error('Customer not found');
    }

    const customer = result.rows[0];
    delete customer.password_hash;
    return customer;
  }

  async updateCustomerProfile(customerId, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'first_name', 'last_name', 'phone', 'date_of_birth',
      'profile_image_url', 'dietary_preferences', 'allergens',
      'preferred_location_id', 'marketing_opt_in'
    ];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(customerId);
    const result = await pool.query(
      `UPDATE customer_accounts
       SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    const customer = result.rows[0];
    delete customer.password_hash;
    return customer;
  }

  // ============================================
  // CUSTOMER ADDRESSES
  // ============================================

  async addCustomerAddress(customerId, addressData) {
    const result = await pool.query(
      `INSERT INTO customer_addresses (
        customer_id, label, street_address, street_address_2,
        city, state, postal_code, country, delivery_instructions,
        is_default, latitude, longitude
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        customerId,
        addressData.label || 'other',
        addressData.street_address,
        addressData.street_address_2,
        addressData.city,
        addressData.state,
        addressData.postal_code,
        addressData.country || 'USA',
        addressData.delivery_instructions,
        addressData.is_default || false,
        addressData.latitude,
        addressData.longitude
      ]
    );

    // If set as default, unset other defaults
    if (addressData.is_default) {
      await pool.query(
        `UPDATE customer_addresses
         SET is_default = FALSE
         WHERE customer_id = $1 AND id != $2`,
        [customerId, result.rows[0].id]
      );
    }

    return result.rows[0];
  }

  // ============================================
  // ONLINE ORDERS
  // ============================================

  async createOnlineOrder(orderData, customerId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Calculate loyalty points
      const loyaltyPoints = await this.calculateLoyaltyPoints(orderData.total_amount);

      // Create order
      const orderResult = await client.query(
        `INSERT INTO online_orders (
          customer_id, location_id, order_type, subtotal,
          tax_amount, delivery_fee, tip_amount, discount_amount,
          loyalty_points_used, loyalty_points_earned, total_amount,
          special_instructions, delivery_address_id, scheduled_for,
          estimated_ready_time
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          customerId,
          orderData.location_id,
          orderData.order_type,
          orderData.subtotal,
          orderData.tax_amount || 0,
          orderData.delivery_fee || 0,
          orderData.tip_amount || 0,
          orderData.discount_amount || 0,
          orderData.loyalty_points_used || 0,
          loyaltyPoints,
          orderData.total_amount,
          orderData.special_instructions,
          orderData.delivery_address_id,
          orderData.scheduled_for,
          orderData.estimated_ready_time || new Date(Date.now() + 30 * 60000) // 30 min default
        ]
      );

      const order = orderResult.rows[0];

      // Insert order items
      for (const item of orderData.items) {
        await client.query(
          `INSERT INTO online_order_items (
            order_id, menu_item_id, quantity, unit_price,
            modifiers, special_instructions, subtotal
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            order.id,
            item.menu_item_id,
            item.quantity,
            item.unit_price,
            JSON.stringify(item.modifiers || []),
            item.special_instructions,
            item.subtotal
          ]
        );
      }

      // Record loyalty transaction if points earned
      if (loyaltyPoints > 0) {
        await client.query(
          `INSERT INTO loyalty_transactions (
            customer_id, transaction_type, points, order_id, description
          ) VALUES ($1, 'earned', $2, $3, $4)`,
          [customerId, loyaltyPoints, order.id, `Earned from order ${order.order_number}`]
        );
      }

      // Deduct loyalty points if used
      if (orderData.loyalty_points_used > 0) {
        await client.query(
          `INSERT INTO loyalty_transactions (
            customer_id, transaction_type, points, order_id, description
          ) VALUES ($1, 'redeemed', $2, $3, $4)`,
          [customerId, -orderData.loyalty_points_used, order.id, `Redeemed on order ${order.order_number}`]
        );
      }

      await client.query('COMMIT');
      return await this.getOrderById(order.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getOrderById(orderId) {
    const result = await pool.query(
      `SELECT
        o.*,
        COALESCE(
          json_agg(json_build_object(
            'id', oi.id,
            'menu_item_id', oi.menu_item_id,
            'menu_item_name', mi.name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'modifiers', oi.modifiers,
            'special_instructions', oi.special_instructions,
            'subtotal', oi.subtotal
          )) FILTER (WHERE oi.id IS NOT NULL),
          '[]'
        ) as items,
        ca.street_address as delivery_address
      FROM online_orders o
      LEFT JOIN online_order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      LEFT JOIN customer_addresses ca ON o.delivery_address_id = ca.id
      WHERE o.id = $1
      GROUP BY o.id, ca.street_address`,
      [orderId]
    );

    return result.rows[0];
  }

  async getCustomerOrders(customerId, filters = {}) {
    let query = `
      SELECT * FROM customer_order_history
      WHERE customer_id = $1
    `;
    const values = [customerId];
    let paramCount = 2;

    if (filters.status) {
      query += ` AND order_status = $${paramCount}`;
      values.push(filters.status);
      paramCount++;
    }

    query += ' ORDER BY placed_at DESC LIMIT 50';

    const result = await pool.query(query, values);
    return result.rows;
  }

  async updateOrderStatus(orderId, status, userId) {
    const result = await pool.query(
      `UPDATE online_orders
       SET order_status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, orderId]
    );

    return result.rows[0];
  }

  // ============================================
  // TABLE RESERVATIONS
  // ============================================

  async createReservation(reservationData, customerId) {
    const result = await pool.query(
      `INSERT INTO table_reservations (
        customer_id, location_id, guest_name, guest_email, guest_phone,
        party_size, reservation_date, reservation_time, duration_minutes,
        special_requests, dietary_restrictions, occasion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        customerId,
        reservationData.location_id,
        reservationData.guest_name,
        reservationData.guest_email,
        reservationData.guest_phone,
        reservationData.party_size,
        reservationData.reservation_date,
        reservationData.reservation_time,
        reservationData.duration_minutes || 90,
        reservationData.special_requests,
        JSON.stringify(reservationData.dietary_restrictions || []),
        reservationData.occasion
      ]
    );

    return result.rows[0];
  }

  async getReservationById(reservationId) {
    const result = await pool.query(
      'SELECT * FROM table_reservations WHERE id = $1',
      [reservationId]
    );

    return result.rows[0];
  }

  async getActiveReservations(locationId, date) {
    let query = 'SELECT * FROM active_reservations WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (locationId) {
      query += ` AND location_id = $${paramCount}`;
      values.push(locationId);
      paramCount++;
    }

    if (date) {
      query += ` AND reservation_date = $${paramCount}`;
      values.push(date);
      paramCount++;
    }

    const result = await pool.query(query, values);
    return result.rows;
  }

  async updateReservationStatus(reservationId, status) {
    const result = await pool.query(
      `UPDATE table_reservations
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, reservationId]
    );

    return result.rows[0];
  }

  async cancelReservation(reservationId, reason) {
    const result = await pool.query(
      `UPDATE table_reservations
       SET status = 'cancelled',
           cancelled_at = NOW(),
           cancellation_reason = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [reason, reservationId]
    );

    return result.rows[0];
  }

  // ============================================
  // LOYALTY PROGRAM
  // ============================================

  async calculateLoyaltyPoints(orderAmount) {
    // $1 spent = 1 point
    return Math.floor(orderAmount);
  }

  async getCustomerLoyaltySummary(customerId) {
    const result = await pool.query(
      'SELECT * FROM customer_loyalty_summary WHERE customer_id = $1',
      [customerId]
    );

    return result.rows[0];
  }

  async getLoyaltyRewards(includeInactive = false) {
    let query = 'SELECT * FROM loyalty_rewards';
    if (!includeInactive) {
      query += ' WHERE is_active = TRUE';
    }
    query += ' ORDER BY points_required ASC';

    const result = await pool.query(query);
    return result.rows;
  }

  async redeemLoyaltyReward(customerId, rewardId, orderId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get reward details
      const rewardResult = await client.query(
        'SELECT * FROM loyalty_rewards WHERE id = $1 AND is_active = TRUE',
        [rewardId]
      );

      if (rewardResult.rows.length === 0) {
        throw new Error('Reward not found or inactive');
      }

      const reward = rewardResult.rows[0];

      // Check customer has enough points
      const customerResult = await client.query(
        'SELECT loyalty_points FROM customer_accounts WHERE id = $1',
        [customerId]
      );

      const customer = customerResult.rows[0];
      if (customer.loyalty_points < reward.points_required) {
        throw new Error('Insufficient loyalty points');
      }

      // Create redemption
      await client.query(
        `INSERT INTO loyalty_redemptions (customer_id, reward_id, order_id, points_spent)
         VALUES ($1, $2, $3, $4)`,
        [customerId, rewardId, orderId, reward.points_required]
      );

      // Deduct points
      await client.query(
        `UPDATE customer_accounts
         SET loyalty_points = loyalty_points - $1
         WHERE id = $2`,
        [reward.points_required, customerId]
      );

      // Record transaction
      await client.query(
        `INSERT INTO loyalty_transactions (customer_id, transaction_type, points, description)
         VALUES ($1, 'redeemed', $2, $3)`,
        [customerId, -reward.points_required, `Redeemed: ${reward.name}`]
      );

      await client.query('COMMIT');
      return reward;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================
  // REVIEWS
  // ============================================

  async createReview(reviewData, customerId) {
    const result = await pool.query(
      `INSERT INTO customer_reviews (
        customer_id, order_id, location_id, rating,
        food_rating, service_rating, delivery_rating, review_text
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        customerId,
        reviewData.order_id,
        reviewData.location_id,
        reviewData.rating,
        reviewData.food_rating,
        reviewData.service_rating,
        reviewData.delivery_rating,
        reviewData.review_text
      ]
    );

    return result.rows[0];
  }

  async getLocationReviews(locationId, filters = {}) {
    let query = `
      SELECT
        r.*,
        c.first_name || ' ' || SUBSTRING(c.last_name, 1, 1) || '.' as customer_name
      FROM customer_reviews r
      JOIN customer_accounts c ON r.customer_id = c.id
      WHERE r.location_id = $1 AND r.is_published = TRUE
    `;
    const values = [locationId];
    let paramCount = 2;

    if (filters.min_rating) {
      query += ` AND r.rating >= $${paramCount}`;
      values.push(filters.min_rating);
      paramCount++;
    }

    query += ' ORDER BY r.created_at DESC LIMIT 100';

    const result = await pool.query(query, values);
    return result.rows;
  }

  // ============================================
  // DELIVERY
  // ============================================

  async getDeliveryZone(locationId, postalCode) {
    const result = await pool.query(
      `SELECT * FROM delivery_zones
       WHERE location_id = $1
         AND $2 = ANY(postal_codes)
         AND is_active = TRUE
       LIMIT 1`,
      [locationId, postalCode]
    );

    return result.rows[0];
  }

  async getAvailableDrivers(locationId) {
    const result = await pool.query(
      `SELECT * FROM delivery_drivers
       WHERE location_id = $1
         AND driver_status = 'available'
         AND is_active = TRUE
       ORDER BY total_deliveries ASC
       LIMIT 10`,
      [locationId]
    );

    return result.rows;
  }

  async assignDriverToOrder(orderId, driverId) {
    const result = await pool.query(
      `UPDATE online_orders
       SET delivery_driver_id = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [driverId, orderId]
    );

    // Update driver status
    await pool.query(
      `UPDATE delivery_drivers
       SET driver_status = 'on_delivery',
           current_order_id = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [orderId, driverId]
    );

    return result.rows[0];
  }
}

module.exports = new CustomerPortalService();
