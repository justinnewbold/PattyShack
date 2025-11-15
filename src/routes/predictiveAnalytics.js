/**
 * Predictive Analytics API Routes
 *
 * Endpoints for ML models, predictions, recommendations, anomalies, and automation.
 */

const express = require('express');
const router = express.Router();
const PredictiveAnalyticsService = require('../services/PredictiveAnalyticsService');

// Middleware to authenticate requests (placeholder)
const authenticate = (req, res, next) => {
  // TODO: Implement actual authentication
  req.user = { id: req.headers['x-user-id'] || 'system' };
  next();
};

// ============================================
// ML MODELS
// ============================================

/**
 * GET /api/ml/models
 * Get all ML models
 */
router.get('/models', authenticate, async (req, res) => {
  try {
    const { model_type, is_active } = req.query;
    const filters = {};

    if (model_type) filters.model_type = model_type;
    if (is_active !== undefined) filters.is_active = is_active === 'true';

    const models = await PredictiveAnalyticsService.getModels(filters);
    res.json({ success: true, data: models });
  } catch (error) {
    console.error('[ML API] Error getting models:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ml/models/:id
 * Get model by ID
 */
router.get('/models/:id', authenticate, async (req, res) => {
  try {
    const model = await PredictiveAnalyticsService.getModelById(req.params.id);
    if (!model) {
      return res.status(404).json({ success: false, error: 'Model not found' });
    }
    res.json({ success: true, data: model });
  } catch (error) {
    console.error('[ML API] Error getting model:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/ml/models/:id/train
 * Train/update ML model
 */
router.put('/models/:id/train', authenticate, async (req, res) => {
  try {
    const model = await PredictiveAnalyticsService.trainModel(
      req.params.id,
      req.body,
      req.user.id
    );
    res.json({ success: true, data: model });
  } catch (error) {
    console.error('[ML API] Error training model:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// PREDICTIONS
// ============================================

/**
 * POST /api/ml/predictions
 * Create new prediction
 */
router.post('/predictions', authenticate, async (req, res) => {
  try {
    const { model_id, ...predictionData } = req.body;
    if (!model_id) {
      return res.status(400).json({ success: false, error: 'model_id is required' });
    }
    const prediction = await PredictiveAnalyticsService.createPrediction(
      predictionData,
      model_id
    );
    res.status(201).json({ success: true, data: prediction });
  } catch (error) {
    console.error('[ML API] Error creating prediction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ml/predictions
 * Get predictions with filters
 */
router.get('/predictions', authenticate, async (req, res) => {
  try {
    const { model_id, location_id, prediction_type, start_date, end_date } = req.query;
    const filters = {};

    if (model_id) filters.model_id = model_id;
    if (location_id) filters.location_id = location_id;
    if (prediction_type) filters.prediction_type = prediction_type;
    if (start_date) filters.start_date = start_date;
    if (end_date) filters.end_date = end_date;

    const predictions = await PredictiveAnalyticsService.getPredictions(filters);
    res.json({ success: true, data: predictions });
  } catch (error) {
    console.error('[ML API] Error getting predictions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/ml/predictions/:id/evaluate
 * Update prediction with actual value for accuracy tracking
 */
router.put('/predictions/:id/evaluate', authenticate, async (req, res) => {
  try {
    const { actual_value } = req.body;
    if (actual_value === undefined) {
      return res.status(400).json({ success: false, error: 'actual_value is required' });
    }
    const prediction = await PredictiveAnalyticsService.evaluatePrediction(
      req.params.id,
      actual_value
    );
    res.json({ success: true, data: prediction });
  } catch (error) {
    console.error('[ML API] Error evaluating prediction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ml/prediction-accuracy
 * Get prediction accuracy summary
 */
router.get('/prediction-accuracy', authenticate, async (req, res) => {
  try {
    const { model_id, location_id } = req.query;
    const filters = {};

    if (model_id) filters.model_id = model_id;
    if (location_id) filters.location_id = location_id;

    const accuracy = await PredictiveAnalyticsService.getPredictionAccuracySummary(filters);
    res.json({ success: true, data: accuracy });
  } catch (error) {
    console.error('[ML API] Error getting prediction accuracy:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// SMART RECOMMENDATIONS
// ============================================

/**
 * POST /api/ml/recommendations
 * Create smart recommendation
 */
router.post('/recommendations', authenticate, async (req, res) => {
  try {
    const recommendation = await PredictiveAnalyticsService.createRecommendation(
      req.body,
      req.user.id
    );
    res.status(201).json({ success: true, data: recommendation });
  } catch (error) {
    console.error('[ML API] Error creating recommendation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ml/recommendations
 * Get recommendations with filters
 */
router.get('/recommendations', authenticate, async (req, res) => {
  try {
    const { location_id, status, priority, recommendation_type, exclude_expired } = req.query;
    const filters = {};

    if (location_id) filters.location_id = location_id;
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (recommendation_type) filters.recommendation_type = recommendation_type;
    if (exclude_expired) filters.exclude_expired = exclude_expired === 'true';

    const recommendations = await PredictiveAnalyticsService.getRecommendations(filters);
    res.json({ success: true, data: recommendations });
  } catch (error) {
    console.error('[ML API] Error getting recommendations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/ml/recommendations/:id/accept
 * Accept a recommendation
 */
router.put('/recommendations/:id/accept', authenticate, async (req, res) => {
  try {
    const recommendation = await PredictiveAnalyticsService.acceptRecommendation(
      req.params.id,
      req.user.id
    );
    res.json({ success: true, data: recommendation });
  } catch (error) {
    console.error('[ML API] Error accepting recommendation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/ml/recommendations/:id/reject
 * Reject a recommendation
 */
router.put('/recommendations/:id/reject', authenticate, async (req, res) => {
  try {
    const recommendation = await PredictiveAnalyticsService.rejectRecommendation(
      req.params.id,
      req.user.id
    );
    res.json({ success: true, data: recommendation });
  } catch (error) {
    console.error('[ML API] Error rejecting recommendation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ANOMALY DETECTION
// ============================================

/**
 * POST /api/ml/anomalies
 * Create anomaly detection
 */
router.post('/anomalies', authenticate, async (req, res) => {
  try {
    const anomaly = await PredictiveAnalyticsService.createAnomaly(
      req.body,
      req.user.id
    );
    res.status(201).json({ success: true, data: anomaly });
  } catch (error) {
    console.error('[ML API] Error creating anomaly:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ml/anomalies
 * Get anomalies with filters
 */
router.get('/anomalies', authenticate, async (req, res) => {
  try {
    const { location_id, anomaly_type, severity, status } = req.query;
    const filters = {};

    if (location_id) filters.location_id = location_id;
    if (anomaly_type) filters.anomaly_type = anomaly_type;
    if (severity) filters.severity = severity;
    if (status) filters.status = status;

    const anomalies = await PredictiveAnalyticsService.getAnomalies(filters);
    res.json({ success: true, data: anomalies });
  } catch (error) {
    console.error('[ML API] Error getting anomalies:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/ml/anomalies/:id/resolve
 * Resolve an anomaly
 */
router.put('/anomalies/:id/resolve', authenticate, async (req, res) => {
  try {
    const { resolution_notes } = req.body;
    const anomaly = await PredictiveAnalyticsService.resolveAnomaly(
      req.params.id,
      resolution_notes,
      req.user.id
    );
    res.json({ success: true, data: anomaly });
  } catch (error) {
    console.error('[ML API] Error resolving anomaly:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// AUTOMATION RULES
// ============================================

/**
 * GET /api/ml/automation-rules
 * Get automation rules
 */
router.get('/automation-rules', authenticate, async (req, res) => {
  try {
    const { location_id, rule_type, is_active } = req.query;
    const filters = {};

    if (location_id) filters.location_id = location_id;
    if (rule_type) filters.rule_type = rule_type;
    if (is_active !== undefined) filters.is_active = is_active === 'true';

    const rules = await PredictiveAnalyticsService.getAutomationRules(filters);
    res.json({ success: true, data: rules });
  } catch (error) {
    console.error('[ML API] Error getting automation rules:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/ml/automation-rules
 * Create automation rule
 */
router.post('/automation-rules', authenticate, async (req, res) => {
  try {
    const rule = await PredictiveAnalyticsService.createAutomationRule(
      req.body,
      req.user.id
    );
    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    console.error('[ML API] Error creating automation rule:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// AUTOMATED ACTIONS
// ============================================

/**
 * POST /api/ml/automated-actions
 * Create automated action
 */
router.post('/automated-actions', authenticate, async (req, res) => {
  try {
    const action = await PredictiveAnalyticsService.createAutomatedAction(req.body);
    res.status(201).json({ success: true, data: action });
  } catch (error) {
    console.error('[ML API] Error creating automated action:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ml/automated-actions
 * Get automated actions
 */
router.get('/automated-actions', authenticate, async (req, res) => {
  try {
    const { location_id, status, action_type } = req.query;
    const filters = {};

    if (location_id) filters.location_id = location_id;
    if (status) filters.status = status;
    if (action_type) filters.action_type = action_type;

    const actions = await PredictiveAnalyticsService.getAutomatedActions(filters);
    res.json({ success: true, data: actions });
  } catch (error) {
    console.error('[ML API] Error getting automated actions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/ml/automated-actions/:id/approve
 * Approve an automated action
 */
router.put('/automated-actions/:id/approve', authenticate, async (req, res) => {
  try {
    const action = await PredictiveAnalyticsService.approveAutomatedAction(
      req.params.id,
      req.user.id
    );
    res.json({ success: true, data: action });
  } catch (error) {
    console.error('[ML API] Error approving automated action:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// INSIGHTS
// ============================================

/**
 * GET /api/ml/insights
 * Get AI-generated insights
 */
router.get('/insights', authenticate, async (req, res) => {
  try {
    const { location_id, insight_type, category, status } = req.query;
    const filters = {};

    if (location_id) filters.location_id = location_id;
    if (insight_type) filters.insight_type = insight_type;
    if (category) filters.category = category;
    if (status) filters.status = status;

    const insights = await PredictiveAnalyticsService.getInsights(filters);
    res.json({ success: true, data: insights });
  } catch (error) {
    console.error('[ML API] Error getting insights:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
