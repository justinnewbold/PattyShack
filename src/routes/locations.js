/**
 * Location Management Routes
 * Handles multi-location hierarchy and organization
 */

const express = require('express');
const router = express.Router();
const LocationService = require('../services/LocationService');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/v1/locations - List locations
router.get('/', async (req, res) => {
  try {
    const { districtId, regionId, brandId, type, active, managerId } = req.query;

    const locations = await LocationService.getLocations({
      districtId,
      regionId,
      brandId,
      type,
      active: active !== undefined ? active === 'true' : undefined,
      managerId
    });

    const hierarchy = await LocationService.getHierarchy();

    res.json({
      success: true,
      data: {
        locations,
        hierarchy
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/v1/locations/hierarchy/:level/:id - Get locations by hierarchy
router.get('/hierarchy/:level/:id', async (req, res) => {
  try {
    const { level, id } = req.params;

    const locations = await LocationService.getLocationsByHierarchy(level, id);

    res.json({
      success: true,
      data: {
        level,
        id,
        locations
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/v1/locations/:id/scorecard - Get location scorecard
router.get('/:id/scorecard', async (req, res) => {
  try {
    const { id } = req.params;
    const { period } = req.query;

    const scorecard = await LocationService.getLocationScorecard(id, { period });

    res.json({
      success: true,
      data: scorecard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/v1/locations/:id - Get location details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const location = await LocationService.getLocationById(id);

    if (!location) {
      return res.status(404).json({
        success: false,
        error: 'Location not found'
      });
    }

    res.json({
      success: true,
      data: location
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/v1/locations - Create location
router.post('/', authenticate, authorize('manager', 'district', 'regional', 'corporate'), async (req, res) => {
  try {
    const { name, code, address, city, state, zip, phone, type, brandId, districtId, regionId, managerId, timezone, openingDate, metadata } = req.body;

    // Validate required fields
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        error: 'Name and code are required'
      });
    }

    const location = await LocationService.createLocation({
      name,
      code,
      address,
      city,
      state,
      zip,
      phone,
      type,
      brandId,
      districtId,
      regionId,
      managerId,
      timezone,
      openingDate,
      metadata
    });

    res.status(201).json({
      success: true,
      data: location,
      message: 'Location created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/v1/locations/:id - Update location
router.put('/:id', authenticate, authorize('manager', 'district', 'regional', 'corporate'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const location = await LocationService.updateLocation(id, updates);

    if (!location) {
      return res.status(404).json({
        success: false,
        error: 'Location not found'
      });
    }

    res.json({
      success: true,
      data: location,
      message: 'Location updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/v1/locations/:id - Delete location (soft delete)
router.delete('/:id', authenticate, authorize('regional', 'corporate'), async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await LocationService.deleteLocation(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Location not found'
      });
    }

    res.json({
      success: true,
      message: 'Location deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
