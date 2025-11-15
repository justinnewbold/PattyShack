/**
 * Predictive Analytics Service
 *
 * Manages ML models, predictions, smart recommendations, anomaly detection,
 * and automated actions.
 * Part of Phase 12: AI-Powered Predictive Analytics & Automation
 */

const pool = require('../database/pool').getPool();
const AuditLogService = require('./AuditLogService');

class PredictiveAnalyticsService {
  /**
   * Get all ML models
   */
  async getModels(filters = {}) {
    try {
      let query = `SELECT * FROM ml_models WHERE 1=1`;
      const params = [];
      let paramIndex = 1;

      if (filters.model_type) {
        query += ` AND model_type = $${paramIndex++}`;
        params.push(filters.model_type);
      }

      if (filters.is_active !== undefined) {
        query += ` AND is_active = $${paramIndex++}`;
        params.push(filters.is_active);
      }

      query += ` ORDER BY name ASC`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('[PredictiveAnalytics] Error getting models:', error);
      throw error;
    }
  }

  /**
   * Get model by ID
   */
  async getModelById(modelId) {
    try {
      const result = await pool.query(
        `SELECT * FROM ml_models WHERE id = $1`,
        [modelId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('[PredictiveAnalytics] Error getting model:', error);
      throw error;
    }
  }

  /**
   * Train/update ML model
   */
  async trainModel(modelId, trainingData, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const before = await client.query(
        `SELECT * FROM ml_models WHERE id = $1`,
        [modelId]
      );

      const { hyperparameters, accuracy_metrics } = trainingData;

      const result = await client.query(
        `UPDATE ml_models
         SET hyperparameters = $1,
             accuracy_metrics = $2,
             trained_at = CURRENT_TIMESTAMP,
             trained_by = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [JSON.stringify(hyperparameters), JSON.stringify(accuracy_metrics), userId, modelId]
      );

      const model = result.rows[0];

      await AuditLogService.logUpdate('ml_model', modelId, before.rows[0], model, userId);
      await client.query('COMMIT');

      return model;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[PredictiveAnalytics] Error training model:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create prediction
   */
  async createPrediction(predictionData, modelId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { prediction_type, location_id, prediction_date, prediction_horizon,
              predicted_value, confidence_score, lower_bound, upper_bound,
              input_features, metadata } = predictionData;

      const result = await client.query(
        `INSERT INTO predictions
         (model_id, prediction_type, location_id, prediction_date, prediction_horizon,
          predicted_value, confidence_score, lower_bound, upper_bound, input_features, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [modelId, prediction_type, location_id, prediction_date, prediction_horizon,
         predicted_value, confidence_score, lower_bound, upper_bound,
         JSON.stringify(input_features || {}), JSON.stringify(metadata || {})]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[PredictiveAnalytics] Error creating prediction:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get predictions with filters
   */
  async getPredictions(filters = {}) {
    try {
      let query = `
        SELECT p.*, m.name as model_name, l.name as location_name
        FROM predictions p
        LEFT JOIN ml_models m ON p.model_id = m.id
        LEFT JOIN locations l ON p.location_id = l.id
        WHERE 1=1
      `;
      const params = [];
      let paramIndex = 1;

      if (filters.model_id) {
        query += ` AND p.model_id = $${paramIndex++}`;
        params.push(filters.model_id);
      }

      if (filters.location_id) {
        query += ` AND p.location_id = $${paramIndex++}`;
        params.push(filters.location_id);
      }

      if (filters.prediction_type) {
        query += ` AND p.prediction_type = $${paramIndex++}`;
        params.push(filters.prediction_type);
      }

      if (filters.start_date) {
        query += ` AND p.prediction_date >= $${paramIndex++}`;
        params.push(filters.start_date);
      }

      if (filters.end_date) {
        query += ` AND p.prediction_date <= $${paramIndex++}`;
        params.push(filters.end_date);
      }

      query += ` ORDER BY p.prediction_date DESC, p.created_at DESC LIMIT 100`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('[PredictiveAnalytics] Error getting predictions:', error);
      throw error;
    }
  }

  /**
   * Update prediction with actual value (for accuracy tracking)
   */
  async evaluatePrediction(predictionId, actualValue) {
    try {
      const predictionResult = await pool.query(
        `SELECT * FROM predictions WHERE id = $1`,
        [predictionId]
      );

      if (predictionResult.rows.length === 0) {
        throw new Error('Prediction not found');
      }

      const prediction = predictionResult.rows[0];
      const predicted = parseFloat(prediction.predicted_value);
      const actual = parseFloat(actualValue);

      // Calculate accuracy percentage
      const accuracy = predicted !== 0
        ? 100 - (Math.abs((actual - predicted) / predicted) * 100)
        : (actual === 0 ? 100 : 0);

      const result = await pool.query(
        `UPDATE predictions
         SET actual_value = $1,
             accuracy_percentage = $2,
             evaluated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [actualValue, accuracy, predictionId]
      );

      return result.rows[0];
    } catch (error) {
      console.error('[PredictiveAnalytics] Error evaluating prediction:', error);
      throw error;
    }
  }

  /**
   * Create smart recommendation
   */
  async createRecommendation(recommendationData, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { recommendation_type, location_id, title, description, rationale,
              priority, confidence_score, predicted_impact, recommendation_data,
              source_prediction_id, created_by_model_id, expires_at } = recommendationData;

      const result = await client.query(
        `INSERT INTO smart_recommendations
         (recommendation_type, location_id, title, description, rationale, priority,
          confidence_score, predicted_impact, recommendation_data, source_prediction_id,
          created_by_model_id, expires_at, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending')
         RETURNING *`,
        [recommendation_type, location_id, title, description, rationale, priority,
         confidence_score, JSON.stringify(predicted_impact || {}),
         JSON.stringify(recommendation_data), source_prediction_id,
         created_by_model_id, expires_at]
      );

      const recommendation = result.rows[0];

      await AuditLogService.logCreate('smart_recommendation', recommendation.id, recommendation, userId || 'system', location_id);
      await client.query('COMMIT');

      return recommendation;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[PredictiveAnalytics] Error creating recommendation:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get recommendations with filters
   */
  async getRecommendations(filters = {}) {
    try {
      let query = `
        SELECT sr.*, l.name as location_name, m.name as model_name
        FROM smart_recommendations sr
        LEFT JOIN locations l ON sr.location_id = l.id
        LEFT JOIN ml_models m ON sr.created_by_model_id = m.id
        WHERE 1=1
      `;
      const params = [];
      let paramIndex = 1;

      if (filters.location_id) {
        query += ` AND sr.location_id = $${paramIndex++}`;
        params.push(filters.location_id);
      }

      if (filters.status) {
        query += ` AND sr.status = $${paramIndex++}`;
        params.push(filters.status);
      }

      if (filters.priority) {
        query += ` AND sr.priority = $${paramIndex++}`;
        params.push(filters.priority);
      }

      if (filters.recommendation_type) {
        query += ` AND sr.recommendation_type = $${paramIndex++}`;
        params.push(filters.recommendation_type);
      }

      // Exclude expired
      if (filters.exclude_expired) {
        query += ` AND (sr.expires_at IS NULL OR sr.expires_at > CURRENT_TIMESTAMP)`;
      }

      query += ` ORDER BY sr.priority DESC, sr.created_at DESC`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('[PredictiveAnalytics] Error getting recommendations:', error);
      throw error;
    }
  }

  /**
   * Accept recommendation
   */
  async acceptRecommendation(recommendationId, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const before = await client.query(
        `SELECT * FROM smart_recommendations WHERE id = $1`,
        [recommendationId]
      );

      const result = await client.query(
        `UPDATE smart_recommendations
         SET status = 'accepted',
             reviewed_by = $1,
             reviewed_at = CURRENT_TIMESTAMP,
             applied_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [userId, recommendationId]
      );

      const recommendation = result.rows[0];

      await AuditLogService.logUpdate('smart_recommendation', recommendationId, before.rows[0], recommendation, userId, recommendation.location_id);
      await client.query('COMMIT');

      return recommendation;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[PredictiveAnalytics] Error accepting recommendation:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reject recommendation
   */
  async rejectRecommendation(recommendationId, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const before = await client.query(
        `SELECT * FROM smart_recommendations WHERE id = $1`,
        [recommendationId]
      );

      const result = await client.query(
        `UPDATE smart_recommendations
         SET status = 'rejected',
             reviewed_by = $1,
             reviewed_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [userId, recommendationId]
      );

      const recommendation = result.rows[0];

      await AuditLogService.logUpdate('smart_recommendation', recommendationId, before.rows[0], recommendation, userId, recommendation.location_id);
      await client.query('COMMIT');

      return recommendation;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[PredictiveAnalytics] Error rejecting recommendation:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Detect and create anomaly
   */
  async createAnomaly(anomalyData, userId = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { anomaly_type, location_id, severity, title, description,
              metric_name, expected_value, actual_value, deviation_percentage,
              confidence_score, related_entity_type, related_entity_id,
              root_cause_hypothesis, requires_investigation } = anomalyData;

      const result = await client.query(
        `INSERT INTO anomalies
         (anomaly_type, location_id, severity, title, description, metric_name,
          expected_value, actual_value, deviation_percentage, confidence_score,
          related_entity_type, related_entity_id, root_cause_hypothesis,
          requires_investigation, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'detected')
         RETURNING *`,
        [anomaly_type, location_id, severity, title, description, metric_name,
         expected_value, actual_value, deviation_percentage, confidence_score,
         related_entity_type, related_entity_id, root_cause_hypothesis,
         requires_investigation]
      );

      const anomaly = result.rows[0];

      await AuditLogService.logCreate('anomaly', anomaly.id, anomaly, userId || 'system', location_id);
      await client.query('COMMIT');

      return anomaly;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[PredictiveAnalytics] Error creating anomaly:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get anomalies with filters
   */
  async getAnomalies(filters = {}) {
    try {
      let query = `
        SELECT a.*, l.name as location_name
        FROM anomalies a
        LEFT JOIN locations l ON a.location_id = l.id
        WHERE 1=1
      `;
      const params = [];
      let paramIndex = 1;

      if (filters.location_id) {
        query += ` AND a.location_id = $${paramIndex++}`;
        params.push(filters.location_id);
      }

      if (filters.anomaly_type) {
        query += ` AND a.anomaly_type = $${paramIndex++}`;
        params.push(filters.anomaly_type);
      }

      if (filters.severity) {
        query += ` AND a.severity = $${paramIndex++}`;
        params.push(filters.severity);
      }

      if (filters.status) {
        query += ` AND a.status = $${paramIndex++}`;
        params.push(filters.status);
      }

      query += ` ORDER BY a.severity DESC, a.detected_at DESC`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('[PredictiveAnalytics] Error getting anomalies:', error);
      throw error;
    }
  }

  /**
   * Resolve anomaly
   */
  async resolveAnomaly(anomalyId, resolutionNotes, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const before = await client.query(
        `SELECT * FROM anomalies WHERE id = $1`,
        [anomalyId]
      );

      const result = await client.query(
        `UPDATE anomalies
         SET status = 'resolved',
             resolution_notes = $1,
             investigated_by = $2,
             investigated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [resolutionNotes, userId, anomalyId]
      );

      const anomaly = result.rows[0];

      await AuditLogService.logUpdate('anomaly', anomalyId, before.rows[0], anomaly, userId, anomaly.location_id);
      await client.query('COMMIT');

      return anomaly;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[PredictiveAnalytics] Error resolving anomaly:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get automation rules
   */
  async getAutomationRules(filters = {}) {
    try {
      let query = `SELECT * FROM automation_rules WHERE 1=1`;
      const params = [];
      let paramIndex = 1;

      if (filters.location_id) {
        query += ` AND location_id = $${paramIndex++}`;
        params.push(filters.location_id);
      }

      if (filters.rule_type) {
        query += ` AND rule_type = $${paramIndex++}`;
        params.push(filters.rule_type);
      }

      if (filters.is_active !== undefined) {
        query += ` AND is_active = $${paramIndex++}`;
        params.push(filters.is_active);
      }

      query += ` ORDER BY name ASC`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('[PredictiveAnalytics] Error getting automation rules:', error);
      throw error;
    }
  }

  /**
   * Create automation rule
   */
  async createAutomationRule(ruleData, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { name, description, rule_type, location_id, trigger_condition,
              action_config, requires_approval } = ruleData;

      const result = await client.query(
        `INSERT INTO automation_rules
         (name, description, rule_type, location_id, trigger_condition,
          action_config, requires_approval, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [name, description, rule_type, location_id,
         JSON.stringify(trigger_condition), JSON.stringify(action_config),
         requires_approval, userId]
      );

      const rule = result.rows[0];

      await AuditLogService.logCreate('automation_rule', rule.id, rule, userId, location_id);
      await client.query('COMMIT');

      return rule;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[PredictiveAnalytics] Error creating automation rule:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create automated action
   */
  async createAutomatedAction(actionData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { action_type, location_id, trigger_type, trigger_id,
              action_details, requires_approval } = actionData;

      const result = await client.query(
        `INSERT INTO automated_actions
         (action_type, location_id, trigger_type, trigger_id, action_details,
          requires_approval, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')
         RETURNING *`,
        [action_type, location_id, trigger_type, trigger_id,
         JSON.stringify(action_details), requires_approval]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[PredictiveAnalytics] Error creating automated action:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get automated actions
   */
  async getAutomatedActions(filters = {}) {
    try {
      let query = `SELECT * FROM automated_actions WHERE 1=1`;
      const params = [];
      let paramIndex = 1;

      if (filters.location_id) {
        query += ` AND location_id = $${paramIndex++}`;
        params.push(filters.location_id);
      }

      if (filters.status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(filters.status);
      }

      if (filters.action_type) {
        query += ` AND action_type = $${paramIndex++}`;
        params.push(filters.action_type);
      }

      query += ` ORDER BY created_at DESC`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('[PredictiveAnalytics] Error getting automated actions:', error);
      throw error;
    }
  }

  /**
   * Approve automated action
   */
  async approveAutomatedAction(actionId, userId) {
    try {
      const result = await pool.query(
        `UPDATE automated_actions
         SET status = 'executing',
             approved_by = $1,
             approved_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [userId, actionId]
      );

      return result.rows[0];
    } catch (error) {
      console.error('[PredictiveAnalytics] Error approving action:', error);
      throw error;
    }
  }

  /**
   * Get prediction accuracy summary
   */
  async getPredictionAccuracySummary(filters = {}) {
    try {
      let query = `SELECT * FROM prediction_accuracy_summary WHERE 1=1`;
      const params = [];
      let paramIndex = 1;

      if (filters.model_id) {
        query += ` AND model_id = $${paramIndex++}`;
        params.push(filters.model_id);
      }

      if (filters.location_id) {
        query += ` AND location_id = $${paramIndex++}`;
        params.push(filters.location_id);
      }

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('[PredictiveAnalytics] Error getting accuracy summary:', error);
      throw error;
    }
  }

  /**
   * Get insights
   */
  async getInsights(filters = {}) {
    try {
      let query = `SELECT * FROM insights WHERE 1=1`;
      const params = [];
      let paramIndex = 1;

      if (filters.location_id) {
        query += ` AND location_id = $${paramIndex++}`;
        params.push(filters.location_id);
      }

      if (filters.insight_type) {
        query += ` AND insight_type = $${paramIndex++}`;
        params.push(filters.insight_type);
      }

      if (filters.category) {
        query += ` AND category = $${paramIndex++}`;
        params.push(filters.category);
      }

      if (filters.status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(filters.status);
      }

      query += ` ORDER BY significance_score DESC, discovered_at DESC`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('[PredictiveAnalytics] Error getting insights:', error);
      throw error;
    }
  }
}

module.exports = new PredictiveAnalyticsService();
