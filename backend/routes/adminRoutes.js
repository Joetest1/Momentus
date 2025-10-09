// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/adminAuth');
const APIService = require('../services/APIService');
const logger = require('../utils/logger');

router.use(adminAuth);

router.get('/stats', async (req, res, next) => {
  try {
    const stats = {
      apiService: APIService.getAllStats(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    next(error);
  }
});

router.post('/cache/clear', async (req, res, next) => {
  try {
    const ContentGenerationService = require('../services/ContentGenerationService');
    const WeatherService = require('../services/WeatherService');

    const contentService = new ContentGenerationService();
    const weatherService = new WeatherService();

    contentService.clearCache();
    weatherService.clearCache();

    logger.info('All caches cleared via admin', { adminIp: req.ip });

    res.json({
      success: true,
      message: 'All caches cleared successfully'
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
