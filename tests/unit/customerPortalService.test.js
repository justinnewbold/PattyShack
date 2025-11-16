/**
 * CustomerPortalService Unit Tests
 * Tests business logic for online ordering, reservations, and customer accounts
 */

const CustomerPortalService = require('../../src/services/CustomerPortalService');
const bcrypt = require('bcrypt');
const {
  setupTestDatabase,
  clearTestDatabase,
  teardownTestDatabase,
  createTestLocation,
  getTestPool
} = require('../helpers/testDb');
const { initializePool } = require('../../src/database/pool');

describe('CustomerPortalService', () => {
  let testLocation;
  let pool;

  beforeAll(async () => {
    initializePool();
    await setupTestDatabase();
    pool = getTestPool();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    testLocation = await createTestLocation({
      id: 'test-location-1',
      code: 'TEST-001'
    });
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('Customer Accounts', () => {
    it('should create a customer account', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const accountData = {
        email: 'customer@test.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '555-1234',
        preferred_location_id: testLocation.id,
        marketing_opt_in: true
      };

      const customer = await CustomerPortalService.createCustomerAccount(accountData, hashedPassword);

      expect(customer).toBeDefined();
      expect(customer.email).toBe('customer@test.com');
      expect(customer.first_name).toBe('John');
      expect(customer.password_hash).toBeUndefined(); // Should not return password
    });

    it('should authenticate customer with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await pool.query(`
        INSERT INTO customer_accounts (id, email, password_hash, first_name, last_name, account_status)
        VALUES ('cust1', 'customer@test.com', $1, 'John', 'Doe', 'active')
      `, [hashedPassword]);

      const customer = await CustomerPortalService.authenticateCustomer('customer@test.com', 'password123');

      expect(customer).toBeDefined();
      expect(customer.email).toBe('customer@test.com');
      expect(customer.password_hash).toBeUndefined();
    });

    it('should reject authentication with invalid password', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await pool.query(`
        INSERT INTO customer_accounts (id, email, password_hash, first_name, last_name, account_status)
        VALUES ('cust1', 'customer@test.com', $1, 'John', 'Doe', 'active')
      `, [hashedPassword]);

      await expect(
        CustomerPortalService.authenticateCustomer('customer@test.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should update customer profile', async () => {
      const result = await pool.query(`
        INSERT INTO customer_accounts (id, email, password_hash, first_name, last_name)
        VALUES ('cust1', 'customer@test.com', 'hash', 'John', 'Doe')
        RETURNING *
      `);

      const updates = {
        first_name: 'Jane',
        phone: '555-9999'
      };

      const updated = await CustomerPortalService.updateCustomerProfile('cust1', updates);

      expect(updated.first_name).toBe('Jane');
      expect(updated.phone).toBe('555-9999');
    });
  });

  describe('Customer Addresses', () => {
    let testCustomer;

    beforeEach(async () => {
      const result = await pool.query(`
        INSERT INTO customer_accounts (id, email, password_hash, first_name, last_name)
        VALUES ('cust1', 'customer@test.com', 'hash', 'John', 'Doe')
        RETURNING *
      `);
      testCustomer = result.rows[0];
    });

    it('should add customer address', async () => {
      const addressData = {
        label: 'home',
        street_address: '123 Main St',
        city: 'Testville',
        state: 'TS',
        postal_code: '12345',
        is_default: true
      };

      const address = await CustomerPortalService.addCustomerAddress(testCustomer.id, addressData);

      expect(address).toBeDefined();
      expect(address.street_address).toBe('123 Main St');
      expect(address.is_default).toBe(true);
    });

    it('should unset other default addresses when setting new default', async () => {
      await pool.query(`
        INSERT INTO customer_addresses (id, customer_id, street_address, city, state, postal_code, is_default)
        VALUES ('addr1', $1, '123 Main St', 'Testville', 'TS', '12345', true)
      `, [testCustomer.id]);

      const newAddressData = {
        street_address: '456 Oak Ave',
        city: 'Testville',
        state: 'TS',
        postal_code: '12345',
        is_default: true
      };

      await CustomerPortalService.addCustomerAddress(testCustomer.id, newAddressData);

      const result = await pool.query(`
        SELECT * FROM customer_addresses WHERE customer_id = $1 AND is_default = true
      `, [testCustomer.id]);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].street_address).toBe('456 Oak Ave');
    });
  });

  describe('Online Orders', () => {
    let testCustomer;
    let testMenuItem;

    beforeEach(async () => {
      const custResult = await pool.query(`
        INSERT INTO customer_accounts (id, email, password_hash, first_name, last_name)
        VALUES ('cust1', 'customer@test.com', 'hash', 'John', 'Doe')
        RETURNING *
      `);
      testCustomer = custResult.rows[0];

      await pool.query(`
        INSERT INTO menu_categories (id, location_id, name, display_order)
        VALUES ('cat1', $1, 'Burgers', 1)
      `, [testLocation.id]);

      const itemResult = await pool.query(`
        INSERT INTO menu_items (id, category_id, name, base_price)
        VALUES ('item1', 'cat1', 'Cheeseburger', 9.99)
        RETURNING *
      `);
      testMenuItem = itemResult.rows[0];
    });

    it('should create an online order', async () => {
      const orderData = {
        location_id: testLocation.id,
        order_type: 'pickup',
        subtotal: 9.99,
        tax_amount: 0.80,
        total_amount: 10.79,
        items: [
          {
            menu_item_id: testMenuItem.id,
            quantity: 1,
            unit_price: 9.99,
            subtotal: 9.99
          }
        ]
      };

      const order = await CustomerPortalService.createOnlineOrder(orderData, testCustomer.id);

      expect(order).toBeDefined();
      expect(order.order_type).toBe('pickup');
      expect(parseFloat(order.total_amount)).toBe(10.79);
      expect(order.order_number).toBeDefined();
    });

    it('should calculate and award loyalty points', async () => {
      const orderData = {
        location_id: testLocation.id,
        order_type: 'pickup',
        subtotal: 25.00,
        total_amount: 25.00,
        items: [
          {
            menu_item_id: testMenuItem.id,
            quantity: 2,
            unit_price: 9.99,
            subtotal: 19.98
          }
        ]
      };

      const order = await CustomerPortalService.createOnlineOrder(orderData, testCustomer.id);

      expect(order.loyalty_points_earned).toBe(25); // $1 = 1 point
    });

    it('should get customer order history', async () => {
      await pool.query(`
        INSERT INTO online_orders (id, order_number, customer_id, location_id, order_type, subtotal, total_amount, placed_at)
        VALUES
          ('order1', 'ORD001', $1, $2, 'pickup', 10.00, 10.00, NOW()),
          ('order2', 'ORD002', $1, $2, 'delivery', 15.00, 15.00, NOW())
      `, [testCustomer.id, testLocation.id]);

      const orders = await CustomerPortalService.getCustomerOrders(testCustomer.id);

      expect(orders).toHaveLength(2);
    });

    it('should update order status', async () => {
      await pool.query(`
        INSERT INTO online_orders (id, order_number, customer_id, location_id, order_type, subtotal, total_amount, order_status)
        VALUES ('order1', 'ORD001', $1, $2, 'pickup', 10.00, 10.00, 'pending')
      `, [testCustomer.id, testLocation.id]);

      const updated = await CustomerPortalService.updateOrderStatus('order1', 'confirmed', 'user1');

      expect(updated.order_status).toBe('confirmed');
    });
  });

  describe('Table Reservations', () => {
    let testCustomer;

    beforeEach(async () => {
      const result = await pool.query(`
        INSERT INTO customer_accounts (id, email, password_hash, first_name, last_name)
        VALUES ('cust1', 'customer@test.com', 'hash', 'John', 'Doe')
        RETURNING *
      `);
      testCustomer = result.rows[0];
    });

    it('should create a reservation', async () => {
      const reservationData = {
        location_id: testLocation.id,
        guest_name: 'John Doe',
        guest_email: 'customer@test.com',
        guest_phone: '555-1234',
        party_size: 4,
        reservation_date: '2025-12-15',
        reservation_time: '19:00:00',
        special_requests: 'Window seat please'
      };

      const reservation = await CustomerPortalService.createReservation(reservationData, testCustomer.id);

      expect(reservation).toBeDefined();
      expect(reservation.party_size).toBe(4);
      expect(reservation.guest_name).toBe('John Doe');
      expect(reservation.reservation_number).toBeDefined();
    });

    it('should get active reservations', async () => {
      await pool.query(`
        INSERT INTO table_reservations (id, reservation_number, customer_id, location_id, guest_name, party_size, reservation_date, reservation_time, status)
        VALUES
          ('res1', 'RES001', $1, $2, 'John Doe', 4, CURRENT_DATE, '19:00', 'confirmed'),
          ('res2', 'RES002', $1, $2, 'Jane Doe', 2, CURRENT_DATE + INTERVAL '1 day', '20:00', 'pending')
      `, [testCustomer.id, testLocation.id]);

      const reservations = await CustomerPortalService.getActiveReservations(testLocation.id);

      expect(reservations.length).toBeGreaterThan(0);
    });

    it('should cancel a reservation', async () => {
      await pool.query(`
        INSERT INTO table_reservations (id, reservation_number, customer_id, location_id, guest_name, party_size, reservation_date, reservation_time, status)
        VALUES ('res1', 'RES001', $1, $2, 'John Doe', 4, CURRENT_DATE, '19:00', 'confirmed')
      `, [testCustomer.id, testLocation.id]);

      const cancelled = await CustomerPortalService.cancelReservation('res1', 'Customer cancelled');

      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.cancellation_reason).toBe('Customer cancelled');
    });
  });

  describe('Loyalty Program', () => {
    let testCustomer;

    beforeEach(async () => {
      const result = await pool.query(`
        INSERT INTO customer_accounts (id, email, password_hash, first_name, last_name, loyalty_points)
        VALUES ('cust1', 'customer@test.com', 'hash', 'John', 'Doe', 1000)
        RETURNING *
      `);
      testCustomer = result.rows[0];
    });

    it('should get customer loyalty summary', async () => {
      await pool.query(`
        INSERT INTO loyalty_transactions (customer_id, transaction_type, points, description)
        VALUES
          ($1, 'earned', 500, 'Purchase reward'),
          ($1, 'earned', 500, 'Purchase reward'),
          ($1, 'redeemed', -200, 'Reward redemption')
      `, [testCustomer.id]);

      const summary = await CustomerPortalService.getCustomerLoyaltySummary(testCustomer.id);

      expect(summary).toBeDefined();
      expect(summary.customer_email).toBe('customer@test.com');
    });

    it('should get available loyalty rewards', async () => {
      await pool.query(`
        INSERT INTO loyalty_rewards (id, name, points_required, reward_type, is_active)
        VALUES
          ('reward1', '$5 Off', 500, 'discount', true),
          ('reward2', '10% Off', 1000, 'percentage_off', true),
          ('reward3', 'Expired', 200, 'discount', false)
      `);

      const rewards = await CustomerPortalService.getLoyaltyRewards();

      expect(rewards).toHaveLength(2); // Only active rewards
      expect(rewards[0].name).toBe('$5 Off');
    });

    it('should redeem loyalty reward', async () => {
      await pool.query(`
        INSERT INTO loyalty_rewards (id, name, points_required, reward_type, is_active)
        VALUES ('reward1', '$5 Off', 500, 'discount', true)
      `);

      const reward = await CustomerPortalService.redeemLoyaltyReward(testCustomer.id, 'reward1', 'order1');

      expect(reward).toBeDefined();
      expect(reward.name).toBe('$5 Off');

      // Check points were deducted
      const customerResult = await pool.query(`
        SELECT loyalty_points FROM customer_accounts WHERE id = $1
      `, [testCustomer.id]);

      expect(customerResult.rows[0].loyalty_points).toBe(500); // 1000 - 500
    });

    it('should reject redemption with insufficient points', async () => {
      await pool.query(`
        UPDATE customer_accounts SET loyalty_points = 100 WHERE id = $1
      `, [testCustomer.id]);

      await pool.query(`
        INSERT INTO loyalty_rewards (id, name, points_required, reward_type, is_active)
        VALUES ('reward1', '$5 Off', 500, 'discount', true)
      `);

      await expect(
        CustomerPortalService.redeemLoyaltyReward(testCustomer.id, 'reward1', 'order1')
      ).rejects.toThrow('Insufficient loyalty points');
    });
  });

  describe('Customer Reviews', () => {
    let testCustomer;

    beforeEach(async () => {
      const result = await pool.query(`
        INSERT INTO customer_accounts (id, email, password_hash, first_name, last_name)
        VALUES ('cust1', 'customer@test.com', 'hash', 'John', 'Doe')
        RETURNING *
      `);
      testCustomer = result.rows[0];
    });

    it('should create a customer review', async () => {
      const reviewData = {
        location_id: testLocation.id,
        rating: 5,
        food_rating: 5,
        service_rating: 4,
        review_text: 'Great food and service!'
      };

      const review = await CustomerPortalService.createReview(reviewData, testCustomer.id);

      expect(review).toBeDefined();
      expect(review.rating).toBe(5);
      expect(review.review_text).toBe('Great food and service!');
    });

    it('should get location reviews', async () => {
      await pool.query(`
        INSERT INTO customer_reviews (id, customer_id, location_id, rating, review_text, is_published)
        VALUES
          ('rev1', $1, $2, 5, 'Excellent!', true),
          ('rev2', $1, $2, 4, 'Good', true),
          ('rev3', $1, $2, 2, 'Bad', false)
      `, [testCustomer.id, testLocation.id]);

      const reviews = await CustomerPortalService.getLocationReviews(testLocation.id);

      expect(reviews).toHaveLength(2); // Only published reviews
    });

    it('should filter reviews by minimum rating', async () => {
      await pool.query(`
        INSERT INTO customer_reviews (id, customer_id, location_id, rating, review_text, is_published)
        VALUES
          ('rev1', $1, $2, 5, 'Excellent!', true),
          ('rev2', $1, $2, 4, 'Good', true),
          ('rev3', $1, $2, 3, 'OK', true)
      `, [testCustomer.id, testLocation.id]);

      const reviews = await CustomerPortalService.getLocationReviews(testLocation.id, { min_rating: 4 });

      expect(reviews).toHaveLength(2);
    });
  });

  describe('Delivery Management', () => {
    beforeEach(async () => {
      await pool.query(`
        INSERT INTO delivery_zones (id, location_id, zone_name, postal_codes, delivery_fee, is_active)
        VALUES ('zone1', $1, 'Downtown', ARRAY['12345', '12346'], 2.99, true)
      `, [testLocation.id]);
    });

    it('should get delivery zone by postal code', async () => {
      const zone = await CustomerPortalService.getDeliveryZone(testLocation.id, '12345');

      expect(zone).toBeDefined();
      expect(zone.zone_name).toBe('Downtown');
      expect(parseFloat(zone.delivery_fee)).toBe(2.99);
    });

    it('should return null for postal code not in any zone', async () => {
      const zone = await CustomerPortalService.getDeliveryZone(testLocation.id, '99999');

      expect(zone).toBeUndefined();
    });

    it('should assign driver to order', async () => {
      await pool.query(`
        INSERT INTO delivery_drivers (id, location_id, first_name, last_name, phone, driver_status, is_active)
        VALUES ('driver1', $1, 'Mike', 'Driver', '555-7777', 'available', true)
      `, [testLocation.id]);

      await pool.query(`
        INSERT INTO customer_accounts (id, email, password_hash, first_name, last_name)
        VALUES ('cust1', 'customer@test.com', 'hash', 'John', 'Doe')
      `);

      await pool.query(`
        INSERT INTO online_orders (id, order_number, customer_id, location_id, order_type, subtotal, total_amount, order_status)
        VALUES ('order1', 'ORD001', 'cust1', $1, 'delivery', 20.00, 22.99, 'preparing')
      `, [testLocation.id]);

      const order = await CustomerPortalService.assignDriverToOrder('order1', 'driver1');

      expect(order.delivery_driver_id).toBe('driver1');
    });
  });
});
