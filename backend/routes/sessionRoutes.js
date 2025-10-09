// routes/sessionRoutes.js
const express = require('express');
const router = express.Router();
const { getInstance: getSessionManager } = require('../services/SessionManager');
const { validateSessionRequest } = require('../middleware/validation');
const logger = require('../utils/logger');

// Check location change before session creation
router.post('/check-location', validateSessionRequest, async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;

    const sessionManager = getSessionManager();
    const locationStatus = await sessionManager.checkLocationChange(latitude, longitude);

    res.json({
      success: true,
      ...locationStatus
    });

  } catch (error) {
    next(error);
  }
});

// Confirm location change and update species data
router.post('/confirm-location', validateSessionRequest, async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;

    const sessionManager = getSessionManager();
    const updateResult = await sessionManager.confirmLocationChange(latitude, longitude);

    res.json({
      success: true,
      ...updateResult
    });

  } catch (error) {
    next(error);
  }
});

router.post('/', validateSessionRequest, async (req, res, next) => {
  try {
    const { latitude, longitude, preferences = {}, skipLocationCheck = false } = req.body;

    logger.info('Session creation requested', { 
      latitude, 
      longitude, 
      preferences,
      skipLocationCheck,
      ip: req.ip 
    });

    const sessionManager = getSessionManager();

    // Check for location changes unless explicitly skipped
    if (!skipLocationCheck) {
      const locationStatus = await sessionManager.checkLocationChange(latitude, longitude);
      
      if (locationStatus.requiresPrompt) {
        return res.json({
          success: false,
          requiresLocationConfirmation: true,
          ...locationStatus,
          message: 'Location change detected. Please confirm before creating session.'
        });
      }
    }

    const session = await sessionManager.createSession({
      latitude,
      longitude,
      preferences
    });

    res.status(201).json({
      success: true,
      session,
      message: 'Session created successfully'
    });

  } catch (error) {
    next(error);
  }
});

router.get('/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    
    const sessionManager = getSessionManager();
    const session = sessionManager.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        message: 'The requested session does not exist or has expired'
      });
    }

    res.json({
      success: true,
      session
    });

  } catch (error) {
    next(error);
  }
});

router.get('/system/stats', async (req, res, next) => {
  try {
    const sessionManager = getSessionManager();
    const stats = sessionManager.getStats();

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
