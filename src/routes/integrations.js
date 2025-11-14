/**
 * Integrations Routes
 * Third-party integrations, webhooks, API keys, and data sync
 */

const express = require('express');
const IntegrationsService = require('../services/IntegrationsService');

const router = express.Router();

// ===== INTEGRATION PROVIDERS =====

router.get('/providers', async (req, res, next) => {
  try {
    const { category } = req.query;
    const providers = await IntegrationsService.getProviders(category);
    res.json({ success: true, data: providers });
  } catch (error) {
    next(error);
  }
});

router.get('/providers/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const provider = await IntegrationsService.getProvider(id);
    res.json({ success: true, data: provider });
  } catch (error) {
    next(error);
  }
});

// ===== LOCATION INTEGRATIONS =====

router.post('/connect', async (req, res, next) => {
  try {
    const integration = await IntegrationsService.connectIntegration(req.body);
    res.status(201).json({ success: true, data: integration });
  } catch (error) {
    next(error);
  }
});

router.get('/location/:locationId', async (req, res, next) => {
  try {
    const { locationId } = req.params;
    const integrations = await IntegrationsService.getLocationIntegrations(locationId);
    res.json({ success: true, data: integrations });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const integration = await IntegrationsService.updateIntegrationStatus(id, status);
    res.json({ success: true, data: integration });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const integration = await IntegrationsService.disconnectIntegration(id);
    res.json({ success: true, data: integration });
  } catch (error) {
    next(error);
  }
});

// ===== SYNC OPERATIONS =====

router.post('/:id/sync', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { syncType } = req.body;
    const result = await IntegrationsService.syncIntegration(id, syncType);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/sync-logs', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;
    const logs = await IntegrationsService.getSyncLogs(id, parseInt(limit));
    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
});

// ===== WEBHOOKS =====

router.post('/webhooks', async (req, res, next) => {
  try {
    const webhook = await IntegrationsService.createWebhook(req.body);
    res.status(201).json({ success: true, data: webhook });
  } catch (error) {
    next(error);
  }
});

router.get('/webhooks', async (req, res, next) => {
  try {
    const { locationId } = req.query;
    const webhooks = await IntegrationsService.getWebhooks(locationId);
    res.json({ success: true, data: webhooks });
  } catch (error) {
    next(error);
  }
});

router.put('/webhooks/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const webhook = await IntegrationsService.updateWebhook(id, req.body);
    res.json({ success: true, data: webhook });
  } catch (error) {
    next(error);
  }
});

router.delete('/webhooks/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const webhook = await IntegrationsService.deleteWebhook(id);
    res.json({ success: true, data: webhook });
  } catch (error) {
    next(error);
  }
});

router.post('/webhooks/trigger', async (req, res, next) => {
  try {
    const { eventType, payload } = req.body;
    const results = await IntegrationsService.triggerWebhook(eventType, payload);
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

// ===== API KEYS =====

router.post('/api-keys', async (req, res, next) => {
  try {
    const apiKey = await IntegrationsService.createApiKey(req.body);
    res.status(201).json({
      success: true,
      data: apiKey,
      message: 'Save this API key securely - it will not be shown again'
    });
  } catch (error) {
    next(error);
  }
});

router.post('/api-keys/:id/revoke', async (req, res, next) => {
  try {
    const { id } = req.params;
    const apiKey = await IntegrationsService.revokeApiKey(id);
    res.json({ success: true, data: apiKey });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
