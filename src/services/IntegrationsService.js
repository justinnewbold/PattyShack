/**
 * Integrations Service
 * Third-party integrations, webhooks, data sync, and API management
 */

const { getPool } = require('../database/pool');
const crypto = require('crypto');
const axios = require('axios');

class IntegrationsService {
  // ===== INTEGRATION PROVIDERS =====

  async getProviders(category = null) {
    const pool = getPool();

    let query = 'SELECT * FROM integration_providers WHERE is_active = true';
    const params = [];

    if (category) {
      query += ' AND category = $1';
      params.push(category);
    }

    query += ' ORDER BY category, name';

    const result = await pool.query(query, params);
    return result.rows;
  }

  async getProvider(providerId) {
    const pool = getPool();

    const result = await pool.query(
      'SELECT * FROM integration_providers WHERE id = $1',
      [providerId]
    );

    return result.rows[0] || null;
  }

  // ===== LOCATION INTEGRATIONS =====

  async connectIntegration(integrationData) {
    const pool = getPool();
    const id = `integration-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Encrypt credentials before storing
    const encryptedCredentials = this.encryptCredentials(integrationData.credentials);

    const result = await pool.query(`
      INSERT INTO location_integrations (
        id, location_id, provider_id, status, credentials, config,
        sync_frequency_minutes, auto_sync_enabled, enabled_features
      ) VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      id,
      integrationData.locationId,
      integrationData.providerId,
      encryptedCredentials,
      JSON.stringify(integrationData.config || {}),
      integrationData.syncFrequencyMinutes || 60,
      integrationData.autoSyncEnabled !== false,
      JSON.stringify(integrationData.enabledFeatures || [])
    ]);

    // Test connection
    const testResult = await this.testIntegrationConnection(id);

    if (testResult.success) {
      await pool.query(
        'UPDATE location_integrations SET status = $1 WHERE id = $2',
        ['active', id]
      );
    } else {
      await pool.query(
        'UPDATE location_integrations SET status = $1, last_error = $2 WHERE id = $3',
        ['error', testResult.error, id]
      );
    }

    return { ...result.rows[0], connectionTest: testResult };
  }

  async getLocationIntegrations(locationId) {
    const pool = getPool();

    const result = await pool.query(`
      SELECT
        li.*,
        ip.name as provider_name,
        ip.category as provider_category,
        ip.supported_features
      FROM location_integrations li
      JOIN integration_providers ip ON li.provider_id = ip.id
      WHERE li.location_id = $1
      ORDER BY ip.category, ip.name
    `, [locationId]);

    return result.rows;
  }

  async updateIntegrationStatus(integrationId, status) {
    const pool = getPool();

    const result = await pool.query(`
      UPDATE location_integrations
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [status, integrationId]);

    return result.rows[0];
  }

  async disconnectIntegration(integrationId) {
    const pool = getPool();

    const result = await pool.query(
      'DELETE FROM location_integrations WHERE id = $1 RETURNING *',
      [integrationId]
    );

    return result.rows[0];
  }

  // ===== SYNC OPERATIONS =====

  async syncIntegration(integrationId, syncType = 'manual') {
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const logId = `synclog-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // Create sync log
      await client.query(`
        INSERT INTO integration_sync_logs (
          id, integration_id, sync_type, direction, status, started_at
        ) VALUES ($1, $2, $3, 'bidirectional', 'in_progress', NOW())
      `, [logId, integrationId, syncType]);

      // Get integration details
      const integrationResult = await client.query(`
        SELECT li.*, ip.* FROM location_integrations li
        JOIN integration_providers ip ON li.provider_id = ip.id
        WHERE li.id = $1
      `, [integrationId]);

      if (integrationResult.rows.length === 0) {
        throw new Error('Integration not found');
      }

      const integration = integrationResult.rows[0];

      // Perform actual sync based on provider
      const syncResult = await this.performSync(integration);

      // Update sync log
      await client.query(`
        UPDATE integration_sync_logs
        SET status = $1,
            completed_at = NOW(),
            records_processed = $2,
            records_succeeded = $3,
            records_failed = $4
        WHERE id = $5
      `, [
        syncResult.success ? 'completed' : 'failed',
        syncResult.processed || 0,
        syncResult.succeeded || 0,
        syncResult.failed || 0,
        logId
      ]);

      // Update integration last sync
      await client.query(`
        UPDATE location_integrations
        SET last_sync_at = NOW(),
            last_sync_status = $1,
            error_count = CASE WHEN $1 = 'success' THEN 0 ELSE error_count + 1 END
        WHERE id = $2
      `, [syncResult.success ? 'success' : 'failure', integrationId]);

      await client.query('COMMIT');

      return { success: true, syncLog: logId, ...syncResult };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Sync error:', error);

      return {
        success: false,
        error: error.message
      };
    } finally {
      client.release();
    }
  }

  async performSync(integration) {
    // Provider-specific sync logic
    switch (integration.provider_id) {
      case 'provider-square':
        return await this.syncSquare(integration);

      case 'provider-toast':
        return await this.syncToast(integration);

      case 'provider-quickbooks':
        return await this.syncQuickBooks(integration);

      default:
        return {
          success: false,
          error: 'Provider sync not implemented'
        };
    }
  }

  async syncSquare(integration) {
    // Placeholder for Square sync implementation
    return {
      success: true,
      processed: 100,
      succeeded: 95,
      failed: 5
    };
  }

  async syncToast(integration) {
    // Placeholder for Toast sync implementation
    return {
      success: true,
      processed: 50,
      succeeded: 50,
      failed: 0
    };
  }

  async syncQuickBooks(integration) {
    // Placeholder for QuickBooks sync implementation
    return {
      success: true,
      processed: 75,
      succeeded: 70,
      failed: 5
    };
  }

  async getSyncLogs(integrationId, limit = 50) {
    const pool = getPool();

    const result = await pool.query(`
      SELECT * FROM integration_sync_logs
      WHERE integration_id = $1
      ORDER BY started_at DESC
      LIMIT $2
    `, [integrationId, limit]);

    return result.rows;
  }

  // ===== WEBHOOKS =====

  async createWebhook(webhookData) {
    const pool = getPool();
    const id = `webhook-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const result = await pool.query(`
      INSERT INTO webhooks (
        id, location_id, name, url, event_types, method, headers,
        auth_type, auth_credentials, is_active, retry_on_failure,
        max_retries, retry_delay_seconds
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      id,
      webhookData.locationId || null,
      webhookData.name,
      webhookData.url,
      JSON.stringify(webhookData.eventTypes),
      webhookData.method || 'POST',
      JSON.stringify(webhookData.headers || {}),
      webhookData.authType || 'none',
      JSON.stringify(webhookData.authCredentials || {}),
      webhookData.isActive !== false,
      webhookData.retryOnFailure !== false,
      webhookData.maxRetries || 3,
      webhookData.retryDelaySeconds || 60
    ]);

    return result.rows[0];
  }

  async getWebhooks(locationId = null) {
    const pool = getPool();

    let query = 'SELECT * FROM webhooks';
    const params = [];

    if (locationId) {
      query += ' WHERE location_id = $1';
      params.push(locationId);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  async updateWebhook(webhookId, updateData) {
    const pool = getPool();

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (updateData.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(updateData.name);
    }

    if (updateData.url !== undefined) {
      updates.push(`url = $${paramCount++}`);
      values.push(updateData.url);
    }

    if (updateData.isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(updateData.isActive);
    }

    if (updateData.eventTypes !== undefined) {
      updates.push(`event_types = $${paramCount++}`);
      values.push(JSON.stringify(updateData.eventTypes));
    }

    values.push(webhookId);

    const result = await pool.query(`
      UPDATE webhooks
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    return result.rows[0];
  }

  async deleteWebhook(webhookId) {
    const pool = getPool();

    const result = await pool.query(
      'DELETE FROM webhooks WHERE id = $1 RETURNING *',
      [webhookId]
    );

    return result.rows[0];
  }

  async triggerWebhook(eventType, payload) {
    const pool = getPool();

    // Find webhooks listening to this event type
    const webhooksResult = await pool.query(`
      SELECT * FROM webhooks
      WHERE is_active = true
        AND event_types @> $1::jsonb
    `, [JSON.stringify([eventType])]);

    const deliveryPromises = webhooksResult.rows.map(webhook =>
      this.deliverWebhook(webhook, eventType, payload)
    );

    return await Promise.allSettled(deliveryPromises);
  }

  async deliverWebhook(webhook, eventType, payload) {
    const pool = getPool();
    const deliveryId = `delivery-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    try {
      // Create delivery log
      await pool.query(`
        INSERT INTO webhook_deliveries (
          id, webhook_id, event_type, payload, status, attempts
        ) VALUES ($1, $2, $3, $4, 'pending', 0)
      `, [deliveryId, webhook.id, eventType, JSON.stringify(payload)]);

      // Prepare request
      const headers = { ...webhook.headers, 'Content-Type': 'application/json' };

      if (webhook.auth_type === 'bearer_token') {
        headers['Authorization'] = `Bearer ${webhook.auth_credentials.token}`;
      }

      const startTime = Date.now();

      // Send webhook
      const response = await axios({
        method: webhook.method,
        url: webhook.url,
        data: payload,
        headers,
        timeout: 30000
      });

      const responseTime = Date.now() - startTime;

      // Update delivery log
      await pool.query(`
        UPDATE webhook_deliveries
        SET status = 'delivered',
            http_status_code = $1,
            response_body = $2,
            response_time_ms = $3,
            attempts = attempts + 1,
            last_attempt_at = NOW()
        WHERE id = $4
      `, [response.status, JSON.stringify(response.data).substring(0, 1000), responseTime, deliveryId]);

      // Update webhook stats
      await pool.query(`
        UPDATE webhooks
        SET success_count = success_count + 1,
            last_triggered_at = NOW(),
            last_status = 'success'
        WHERE id = $1
      `, [webhook.id]);

      return { success: true, deliveryId };

    } catch (error) {
      console.error('Webhook delivery error:', error);

      // Update delivery log with error
      await pool.query(`
        UPDATE webhook_deliveries
        SET status = 'failed',
            error_message = $1,
            attempts = attempts + 1,
            last_attempt_at = NOW(),
            next_retry_at = CASE
              WHEN $2 AND attempts < $3
              THEN NOW() + INTERVAL '1 second' * $4
              ELSE NULL
            END
        WHERE id = $5
      `, [
        error.message,
        webhook.retry_on_failure,
        webhook.max_retries,
        webhook.retry_delay_seconds,
        deliveryId
      ]);

      // Update webhook stats
      await pool.query(`
        UPDATE webhooks
        SET failure_count = failure_count + 1,
            last_triggered_at = NOW(),
            last_status = 'failed'
        WHERE id = $1
      `, [webhook.id]);

      return { success: false, error: error.message, deliveryId };
    }
  }

  // ===== API KEYS =====

  async createApiKey(keyData) {
    const pool = getPool();
    const id = `apikey-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Generate API key
    const apiKey = this.generateApiKey();
    const keyHash = this.hashApiKey(apiKey);
    const keyPrefix = apiKey.substring(0, 8);

    const result = await pool.query(`
      INSERT INTO api_keys (
        id, name, key_hash, key_prefix, location_id, user_id,
        permissions, rate_limit_per_hour, expires_at, ip_whitelist
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, name, key_prefix, created_at
    `, [
      id,
      keyData.name,
      keyHash,
      keyPrefix,
      keyData.locationId || null,
      keyData.userId || null,
      JSON.stringify(keyData.permissions || []),
      keyData.rateLimitPerHour || 1000,
      keyData.expiresAt || null,
      JSON.stringify(keyData.ipWhitelist || [])
    ]);

    // Return the actual key only once (never stored in plain text)
    return {
      ...result.rows[0],
      apiKey // Only returned on creation
    };
  }

  async validateApiKey(apiKey) {
    const pool = getPool();
    const keyHash = this.hashApiKey(apiKey);

    const result = await pool.query(`
      SELECT * FROM api_keys
      WHERE key_hash = $1
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
    `, [keyHash]);

    if (result.rows.length === 0) {
      return { valid: false };
    }

    const key = result.rows[0];

    // Update usage
    await pool.query(`
      UPDATE api_keys
      SET last_used_at = NOW(),
          usage_count = usage_count + 1
      WHERE id = $1
    `, [key.id]);

    return {
      valid: true,
      key: key
    };
  }

  async revokeApiKey(keyId) {
    const pool = getPool();

    const result = await pool.query(`
      UPDATE api_keys
      SET is_active = false
      WHERE id = $1
      RETURNING *
    `, [keyId]);

    return result.rows[0];
  }

  // ===== HELPER METHODS =====

  encryptCredentials(credentials) {
    // Placeholder - implement proper encryption
    return JSON.stringify(credentials);
  }

  decryptCredentials(encryptedCredentials) {
    // Placeholder - implement proper decryption
    return JSON.parse(encryptedCredentials);
  }

  generateApiKey() {
    return 'ps_' + crypto.randomBytes(32).toString('hex');
  }

  hashApiKey(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  async testIntegrationConnection(integrationId) {
    // Placeholder for connection testing
    return {
      success: true,
      message: 'Connection successful'
    };
  }
}

module.exports = new IntegrationsService();
