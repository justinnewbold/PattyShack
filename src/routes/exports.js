/**
 * Data Export Routes
 * Data exports to CSV, JSON, XLSX formats
 */

const express = require('express');
const DataExportService = require('../services/DataExportService');

const router = express.Router();

// Create export job
router.post('/', async (req, res, next) => {
  try {
    const exportJob = await DataExportService.createExportJob(req.body);
    res.status(201).json({ success: true, data: exportJob });
  } catch (error) {
    next(error);
  }
});

// Get user's export jobs
router.get('/my-exports', async (req, res, next) => {
  try {
    const { userId } = req.query;
    const { limit = 20 } = req.query;
    const exports = await DataExportService.getUserExports(userId, parseInt(limit));
    res.json({ success: true, data: exports });
  } catch (error) {
    next(error);
  }
});

// Get export job status
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const exportJob = await DataExportService.getExportJob(id);
    res.json({ success: true, data: exportJob });
  } catch (error) {
    next(error);
  }
});

// Download export
router.get('/:id/download', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, filename, contentType } = await DataExportService.downloadExport(id);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
