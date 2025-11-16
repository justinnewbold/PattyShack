/**
 * Customer Portal API Routes
 * Phase 19
 *
 * Endpoints for online ordering, reservations, and customer accounts
 */

const express = require('express');
const router = express.Router();
const CustomerPortalService = require('../services/CustomerPortalService');
const bcrypt = require('bcrypt');

// Middleware to authenticate customer requests
const authenticateCustomer = (req, res, next) => {
  // Simple authentication - in production use JWT
  const customerId = req.headers['x-customer-id'];
  if (!customerId) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  req.customer = { id: customerId };
  next();
};

// ============================================
// CUSTOMER ACCOUNTS
// ============================================

/**
 * POST /api/customers/register
 * Register new customer account
 */
router.post('/register', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const customer = await CustomerPortalService.createCustomerAccount(req.body, hashedPassword);
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    console.error('[Customer API] Error registering customer:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/customers/login
 * Customer login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const customer = await CustomerPortalService.authenticateCustomer(email, password);
    res.json({ success: true, data: customer });
  } catch (error) {
    console.error('[Customer API] Error logging in:', error);
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

/**
 * GET /api/customers/profile
 * Get customer profile
 */
router.get('/profile', authenticateCustomer, async (req, res) => {
  try {
    const customer = await CustomerPortalService.getCustomerProfile(req.customer.id);
    res.json({ success: true, data: customer });
  } catch (error) {
    console.error('[Customer API] Error getting profile:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/customers/profile
 * Update customer profile
 */
router.put('/profile', authenticateCustomer, async (req, res) => {
  try {
    const customer = await CustomerPortalService.updateCustomerProfile(req.customer.id, req.body);
    res.json({ success: true, data: customer });
  } catch (error) {
    console.error('[Customer API] Error updating profile:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/customers/addresses
 * Add customer address
 */
router.post('/addresses', authenticateCustomer, async (req, res) => {
  try {
    const address = await CustomerPortalService.addCustomerAddress(req.customer.id, req.body);
    res.status(201).json({ success: true, data: address });
  } catch (error) {
    console.error('[Customer API] Error adding address:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ONLINE ORDERS
// ============================================

/**
 * POST /api/customers/orders
 * Create online order
 */
router.post('/orders', authenticateCustomer, async (req, res) => {
  try {
    const order = await CustomerPortalService.createOnlineOrder(req.body, req.customer.id);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    console.error('[Customer API] Error creating order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/customers/orders
 * Get customer order history
 */
router.get('/orders', authenticateCustomer, async (req, res) => {
  try {
    const orders = await CustomerPortalService.getCustomerOrders(req.customer.id, req.query);
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('[Customer API] Error getting orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/customers/orders/:id
 * Get specific order details
 */
router.get('/orders/:id', authenticateCustomer, async (req, res) => {
  try {
    const order = await CustomerPortalService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    res.json({ success: true, data: order });
  } catch (error) {
    console.error('[Customer API] Error getting order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/customers/orders/:id/status
 * Update order status (for staff/admin)
 */
router.put('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await CustomerPortalService.updateOrderStatus(
      req.params.id,
      status,
      req.headers['x-user-id']
    );
    res.json({ success: true, data: order });
  } catch (error) {
    console.error('[Customer API] Error updating order status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// TABLE RESERVATIONS
// ============================================

/**
 * POST /api/customers/reservations
 * Create table reservation
 */
router.post('/reservations', authenticateCustomer, async (req, res) => {
  try {
    const reservation = await CustomerPortalService.createReservation(req.body, req.customer.id);
    res.status(201).json({ success: true, data: reservation });
  } catch (error) {
    console.error('[Customer API] Error creating reservation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/customers/reservations/:id
 * Get reservation details
 */
router.get('/reservations/:id', authenticateCustomer, async (req, res) => {
  try {
    const reservation = await CustomerPortalService.getReservationById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ success: false, error: 'Reservation not found' });
    }
    res.json({ success: true, data: reservation });
  } catch (error) {
    console.error('[Customer API] Error getting reservation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/customers/reservations
 * Get active reservations for location
 */
router.get('/reservations', async (req, res) => {
  try {
    const { location_id, date } = req.query;
    const reservations = await CustomerPortalService.getActiveReservations(location_id, date);
    res.json({ success: true, data: reservations });
  } catch (error) {
    console.error('[Customer API] Error getting reservations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/customers/reservations/:id/status
 * Update reservation status
 */
router.put('/reservations/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const reservation = await CustomerPortalService.updateReservationStatus(req.params.id, status);
    res.json({ success: true, data: reservation });
  } catch (error) {
    console.error('[Customer API] Error updating reservation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/customers/reservations/:id/cancel
 * Cancel reservation
 */
router.post('/reservations/:id/cancel', authenticateCustomer, async (req, res) => {
  try {
    const { reason } = req.body;
    const reservation = await CustomerPortalService.cancelReservation(req.params.id, reason);
    res.json({ success: true, data: reservation });
  } catch (error) {
    console.error('[Customer API] Error cancelling reservation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// LOYALTY PROGRAM
// ============================================

/**
 * GET /api/customers/loyalty/summary
 * Get customer loyalty summary
 */
router.get('/loyalty/summary', authenticateCustomer, async (req, res) => {
  try {
    const summary = await CustomerPortalService.getCustomerLoyaltySummary(req.customer.id);
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('[Customer API] Error getting loyalty summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/customers/loyalty/rewards
 * Get available loyalty rewards
 */
router.get('/loyalty/rewards', async (req, res) => {
  try {
    const rewards = await CustomerPortalService.getLoyaltyRewards();
    res.json({ success: true, data: rewards });
  } catch (error) {
    console.error('[Customer API] Error getting rewards:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/customers/loyalty/redeem
 * Redeem loyalty reward
 */
router.post('/loyalty/redeem', authenticateCustomer, async (req, res) => {
  try {
    const { reward_id, order_id } = req.body;
    const reward = await CustomerPortalService.redeemLoyaltyReward(
      req.customer.id,
      reward_id,
      order_id
    );
    res.json({ success: true, data: reward });
  } catch (error) {
    console.error('[Customer API] Error redeeming reward:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// REVIEWS
// ============================================

/**
 * POST /api/customers/reviews
 * Create customer review
 */
router.post('/reviews', authenticateCustomer, async (req, res) => {
  try {
    const review = await CustomerPortalService.createReview(req.body, req.customer.id);
    res.status(201).json({ success: true, data: review });
  } catch (error) {
    console.error('[Customer API] Error creating review:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/customers/reviews
 * Get location reviews
 */
router.get('/reviews', async (req, res) => {
  try {
    const { location_id, min_rating } = req.query;
    if (!location_id) {
      return res.status(400).json({ success: false, error: 'location_id is required' });
    }
    const reviews = await CustomerPortalService.getLocationReviews(location_id, { min_rating });
    res.json({ success: true, data: reviews });
  } catch (error) {
    console.error('[Customer API] Error getting reviews:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// DELIVERY
// ============================================

/**
 * GET /api/customers/delivery/zone
 * Check delivery zone availability
 */
router.get('/delivery/zone', async (req, res) => {
  try {
    const { location_id, postal_code } = req.query;
    if (!location_id || !postal_code) {
      return res.status(400).json({
        success: false,
        error: 'location_id and postal_code are required'
      });
    }
    const zone = await CustomerPortalService.getDeliveryZone(location_id, postal_code);
    if (!zone) {
      return res.json({ success: true, data: null, message: 'Delivery not available in this area' });
    }
    res.json({ success: true, data: zone });
  } catch (error) {
    console.error('[Customer API] Error checking delivery zone:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/customers/orders/:id/assign-driver
 * Assign driver to order
 */
router.post('/orders/:id/assign-driver', async (req, res) => {
  try {
    const { driver_id } = req.body;
    const order = await CustomerPortalService.assignDriverToOrder(req.params.id, driver_id);
    res.json({ success: true, data: order });
  } catch (error) {
    console.error('[Customer API] Error assigning driver:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
