// routes/adminDashboardRoutes.js
const express = require('express');
const router = express.Router();
const { getInstance: getAIProvider } = require('../services/AIProviderService');
const { getInstance: getSessionManager } = require('../services/SessionManager');
const FeedbackAnalyzerService = require('../services/FeedbackAnalyzerService');
const logger = require('../utils/logger');

/**
 * Admin Dashboard Routes
 * Manage AI providers, test configurations, view stats
 */

// Get current AI configuration
router.get('/ai-config', async (req, res, next) => {
  try {
    const aiProvider = getAIProvider();
    const config = aiProvider.getConfig();

    res.json({
      success: true,
      config
    });
  } catch (error) {
    next(error);
  }
});

// Update AI configuration
router.post('/ai-config', async (req, res, next) => {
  try {
    const { provider, model } = req.body;

    if (!provider || !model) {
      return res.status(400).json({
        success: false,
        error: 'Provider and model are required'
      });
    }

    const aiProvider = getAIProvider();
    const updatedConfig = aiProvider.setConfig(provider, model);

    logger.info('AI configuration updated via admin dashboard', { provider, model });

    res.json({
      success: true,
      config: updatedConfig,
      message: `AI provider set to ${provider} with model ${model}`
    });
  } catch (error) {
    next(error);
  }
});

// Test an AI provider/model combination
router.post('/test-ai', async (req, res, next) => {
  try {
    const { provider, model } = req.body;

    if (!provider || !model) {
      return res.status(400).json({
        success: false,
        error: 'Provider and model are required'
      });
    }

    const aiProvider = getAIProvider();
    const testResult = await aiProvider.testProvider(provider, model);

    res.json({
      success: testResult.success,
      result: testResult
    });
  } catch (error) {
    next(error);
  }
});

// Test species identification robustness for a location
router.post('/test-species', async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude || 
        typeof latitude !== 'number' || typeof longitude !== 'number' ||
        latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        error: 'Valid latitude (-90 to 90) and longitude (-180 to 180) are required'
      });
    }

    const sessionManager = getSessionManager();
    const speciesService = sessionManager.speciesService;

    // Test RobustSpeciesService with comprehensive fallback system - request 50 species per class
  const speciesResults = await speciesService.getSpeciesForMeditation(latitude, longitude, null, 50);
  // If GBIF returned a diagnostic error (non-JSON or rate limit), include it for admin debugging
  const gbifDiagnostic = speciesService.lastGBIFError || null;
      
      let totalSpecies = 0;
      let sourceBreakdown = {};
      
      // Analyze results by category
      for (const categoryResult of speciesResults) {
        totalSpecies += categoryResult.count;
        sourceBreakdown[categoryResult.type] = {
          count: categoryResult.count,
          source: categoryResult.source,
          species: categoryResult.species.map(s => s.name)
        };
      }

      // Build summary for RobustSpeciesService response
      const summary = {
        total: totalSpecies,
        byCategory: Object.keys(sourceBreakdown).reduce((acc, category) => {
          acc[category] = sourceBreakdown[category].count;
          return acc;
        }, {}),
        systemType: 'RobustSpeciesService',
        fallbacksWorking: true
      };

      // Convert to legacy format for admin UI compatibility
      const categories = {};
      const results = [];
      
      for (const [categoryName, categoryData] of Object.entries(sourceBreakdown)) {
        categories[categoryName] = categoryData.species.map(name => ({
          name: name,
          source: categoryData.source,
          habitat: 'varied'
        }));

        // Add results array format expected by admin dashboard
        results.push({
          class: categoryData.displayName || categoryName.charAt(0).toUpperCase() + categoryName.slice(1),
          count: categoryData.count,
          species: categoryData.species,
          sources: [categoryData.source]
        });
      }

      // Build summary with expected properties
      const enhancedSummary = {
        ...summary,
        totalClasses: results.length,
        successfulClasses: results.filter(r => r.count > 0).length,
        failedClasses: results.filter(r => r.count === 0).length
      };

      const responsePayload = {
        success: true,
        location: { latitude, longitude },
        summary: enhancedSummary,
        results,
        categories,
        sourceBreakdown,
        systemStatus: 'RobustSpeciesService with guaranteed fallbacks',
        timestamp: new Date().toISOString()
      };

      if (gbifDiagnostic) {
        responsePayload.gbifDiagnostic = {
          message: gbifDiagnostic.message || gbifDiagnostic.error || 'GBIF diagnostic present',
          status: gbifDiagnostic.status || null,
          rawSnippet: gbifDiagnostic.raw ? gbifDiagnostic.raw.slice(0, 512) : null
        };
      }

      // Final sanitize of all returned species names for admin UI (remove digits/placeholders)
      try {
        const sessionManager = getSessionManager();
        const speciesService = sessionManager.speciesService;
        // sanitize results array
        if (Array.isArray(responsePayload.results)) {
          responsePayload.results.forEach(r => {
            if (Array.isArray(r.species)) {
              r.species = r.species.map(raw => {
                try {
                  const cleaned = speciesService.sanitizeDisplayName(String(raw));
                  const binomial = speciesService.extractBinomial(String(raw));
                  const finalName = speciesService.isValidCommonName(cleaned) ? speciesService.capitalizeWords(cleaned) : (binomial || speciesService.capitalizeWords(cleaned) || String(raw));
                  return finalName;
                } catch (e) {
                  return String(raw);
                }
              });
            }
          });
        }

        // sanitize categories
        if (responsePayload.categories && typeof responsePayload.categories === 'object') {
          for (const [cat, list] of Object.entries(responsePayload.categories)) {
            if (Array.isArray(list)) {
              responsePayload.categories[cat] = list.map(item => {
                try {
                  const name = item.name || item;
                  const cleaned = speciesService.sanitizeDisplayName(String(name));
                  const binomial = speciesService.extractBinomial(String(name));
                  const finalName = speciesService.isValidCommonName(cleaned) ? speciesService.capitalizeWords(cleaned) : (binomial || speciesService.capitalizeWords(cleaned) || String(name));
                  return { ...(typeof item === 'object' ? item : {}), name: finalName };
                } catch (e) {
                  return item;
                }
              });
            }
          }
        }
      } catch (err) {
        logger.warn('Failed to sanitize admin species payload', { err: err.message });
      }

      res.json(responsePayload);

  } catch (error) {
    logger.error('Species testing failed', { error: error.message });
    next(error);
  }
});

// Get system statistics
router.get('/stats', async (req, res, next) => {
  try {
    const sessionManager = getSessionManager();
    const aiProvider = getAIProvider();

    const stats = {
      session: sessionManager.getStats(),
      ai: aiProvider.getStats(),
      timestamp: new Date().toISOString()
    };

    // Merge species service stats into session stats for easier UI consumption
    try {
      const speciesService = sessionManager.speciesService;
      if (speciesService && typeof speciesService.getStats === 'function') {
        const svcStats = speciesService.getStats();
        stats.session.speciesStats = { ...(stats.session.speciesStats || {}), ...svcStats };
  // (svcStats merged into speciesStats)
      }
      // If the species service supports cache diagnostics, include them
      try {
        if (speciesService && typeof speciesService.getCacheStats === 'function') {
          const cacheStats = speciesService.getCacheStats();
          stats.session.speciesStats = { ...(stats.session.speciesStats || {}), cache: cacheStats };
        }
      } catch (err) {
        logger.warn('Failed to append speciesService cache stats', { err: err.message });
      }
    } catch (err) {
      logger.warn('Failed to append speciesService stats to admin stats', { err: err.message });
    }

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    next(error);
  }
});

// Get or update runtime species configuration (no-repeat days)
router.get('/species-config', async (req, res, next) => {
  try {
    const sessionManager = getSessionManager();
    const speciesService = sessionManager.speciesService;
    if (!speciesService) return res.json({ success: false, error: 'Species service unavailable' });

    return res.json({ success: true, config: { noRepeatDays: speciesService.noRepeatDays || 2 } });
  } catch (err) {
    next(err);
  }
});

router.post('/species-config', async (req, res, next) => {
  try {
    const { noRepeatDays } = req.body;
    if (noRepeatDays === undefined || noRepeatDays === null || !Number.isFinite(Number(noRepeatDays)) || Number(noRepeatDays) < 0) {
      return res.status(400).json({ success: false, error: 'noRepeatDays must be a non-negative number' });
    }

    const sessionManager = getSessionManager();
    const speciesService = sessionManager.speciesService;
    if (!speciesService) return res.status(500).json({ success: false, error: 'Species service unavailable' });

    speciesService.noRepeatDays = Math.floor(Number(noRepeatDays));
    logger.info('Species no-repeat days updated via admin dashboard', { noRepeatDays: speciesService.noRepeatDays });

    res.json({ success: true, config: { noRepeatDays: speciesService.noRepeatDays } });
  } catch (err) {
    next(err);
  }
});

// (Developer only) Temporary test route removed

// Test meditation generation with specific configuration
router.post('/test-meditation', async (req, res, next) => {
  try {
    const {
      latitude,
      longitude,
      provider,
      model,
      preferences = {}
    } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    // Temporarily set AI config if provided
    const aiProvider = getAIProvider();
    const originalConfig = aiProvider.getConfig();

    if (provider && model) {
      aiProvider.setConfig(provider, model);
    }

    try {
      // Generate meditation
      const sessionManager = getSessionManager();
      const session = await sessionManager.createSession({
        latitude,
        longitude,
        preferences
      });

      res.json({
        success: true,
        session,
        aiConfig: aiProvider.getConfig()
      });
    } finally {
      // Restore original config
      if (provider && model) {
        aiProvider.setConfig(originalConfig.provider, originalConfig.model);
      }
    }
  } catch (error) {
    next(error);
  }
});

// Generate entrainment-based meditation
router.post('/generate-entrainment', async (req, res, next) => {
  try {
    const {
      theme,
      duration = 600,
      intensity = 'moderate',
      latitude,
      longitude,
      generateAudio = false
    } = req.body;

    if (!theme) {
      return res.status(400).json({
        success: false,
        error: 'Theme is required'
      });
    }

    // Get entrainment meditation service instance
    const { getInstance: getEntrainmentService } = require('../services/EntrainmentMeditationService');
    const entrainmentService = getEntrainmentService();

    // Generate the meditation
    const result = await entrainmentService.generateMeditation({
      theme,
      duration,
      intensity,
      latitude,
      longitude,
      generateAudio
    });

    logger.info('Entrainment meditation generated via admin dashboard', { 
      theme, 
      duration, 
      intensity, 
      hasLocation: !!(latitude && longitude),
      generateAudio 
    });

    res.json({
      success: true,
      meditation: result.meditation,
      metadata: result.metadata,
      audioUrl: result.audioUrl || null
    });

  } catch (error) {
    logger.error('Error generating entrainment meditation', { error: error.message });
    next(error);
  }
});

// Get available API combinations
router.get('/api-combinations', async (req, res, next) => {
  try {
    const combinations = {
      aiProviders: {
        google: {
          name: 'Google Gemini',
          models: [
            { id: 'gemini-pro', name: 'Gemini Pro', speed: 'medium', quality: 'high' },
            { id: 'gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash', speed: 'fast', quality: 'good' },
            { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Experimental)', speed: 'very fast', quality: 'excellent' }
          ]
        },
        anthropic: {
          name: 'Anthropic Claude',
          models: [
            { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', speed: 'slow', quality: 'highest' },
            { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', speed: 'fast', quality: 'good' },
            { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', speed: 'very fast', quality: 'fast' }
          ]
        }
      },
      speciesSources: {
        inaturalist: { name: 'iNaturalist', requiresKey: false, enabled: true },
        gbif: { name: 'GBIF', requiresKey: false, enabled: true },
        ebird: { name: 'eBird', requiresKey: true, enabled: !!process.env.EBIRD_API_KEY }
      },
      weatherProviders: {
        openweather: { name: 'OpenWeather', requiresKey: true, enabled: !!process.env.OPENWEATHER_API_KEY }
      },
      features: {
        realtimeSpecies: process.env.USE_REALTIME_SPECIES === 'true',
        lunarIntegration: true,
        behaviorDatabase: true
      }
    };

    res.json({
      success: true,
      combinations
    });
  } catch (error) {
    next(error);
  }
});

// Get species in user's area (real-time data only, no fallback)
// Legacy endpoint - redirect to new robust testing endpoint
router.post('/species-in-area', async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    const sessionManager = getSessionManager();
    const speciesService = sessionManager.speciesService;
    
    // Use the new robust species testing
    const results = [];
    const errors = [];
    
    for (const taxonomicClass of speciesService.taxonomicClasses) {
      try {
        const species = await speciesService.getSpeciesForClass(
          parseFloat(latitude), 
          parseFloat(longitude), 
          taxonomicClass, 
          10 // Get more species for legacy format
        );
        
        results.push({
          type: taxonomicClass.name,
          species: species.map(s => ({
            name: s.name,
            scientificName: s.scientificName || s.name,
            source: s.source
          }))
        });
        
      } catch (error) {
        errors.push({
          class: taxonomicClass.displayName,
          message: error.message
        });
      }
    }
    
    // Convert to legacy format
    const categories = {
      birds: [],
      mammals: [], 
      insects: [],
      amphibians: [],
      reptiles: [],
      fish: [],
      other: []
    };
    
    results.forEach(result => {
      const category = result.type === 'fish' ? 'fish' : result.type;
      if (categories.hasOwnProperty(category)) {
        categories[category] = result.species;
      }
    });
    
    const summary = {
      total: results.reduce((sum, r) => sum + r.species.length, 0),
      byCategory: Object.keys(categories).reduce((acc, cat) => {
        acc[cat] = categories[cat].length;
        return acc;
      }, {}),
      bySource: { GBIF: 'primary', fallbacks: 'as_needed' }
    };

    logger.info('Legacy species in area request completed', {
      latitude,
      longitude,
      totalSpecies: summary.total,
      errors: errors.length
    });

    res.json({
      success: true,
      location: { latitude, longitude },
      summary,
      categories,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Legacy species in area request failed', { error: error.message });
    next(error);
  }
});

// Toggle feature flags
router.post('/toggle-feature', async (req, res, next) => {
  try {
    const { feature, enabled } = req.body;

    // Note: This would require env file updates or database
    // For now, just return current state
    res.json({
      success: false,
      message: 'Feature toggling requires environment configuration update',
      feature,
      enabled
    });
  } catch (error) {
    next(error);
  }
});

// Submit meditation feedback
router.post('/feedback', async (req, res, next) => {
  try {
    const { ratings, context, userAgent, source, sessionId, timestamp, comments } = req.body;

    let relevance, groundedness, engagement, ttsQuality, overall;

    // Handle both formats: individual ratings or ratings object
    if (ratings && typeof ratings === 'object') {
      // New format from user app
      relevance = ratings.relevance;
      groundedness = ratings.groundedness;
      engagement = ratings.engagement;
      ttsQuality = ratings.tts;
      overall = ratings.overall;
    } else {
      // Legacy format from admin dashboard
      ({ relevance, groundedness, engagement, ttsQuality, overall } = req.body);
    }

    // Convert to numbers if they're strings (from JSON parsing)
    relevance = Number(relevance);
    groundedness = Number(groundedness);
    engagement = Number(engagement);
    ttsQuality = Number(ttsQuality);
    overall = Number(overall);

    // Validate required fields
    if (typeof relevance !== 'number' || typeof groundedness !== 'number' ||
        typeof engagement !== 'number' || typeof ttsQuality !== 'number' ||
        typeof overall !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'All rating fields must be numbers between 1-10'
      });
    }

    // Validate ranges
    const ratingValues = [relevance, groundedness, engagement, ttsQuality, overall];
    if (ratingValues.some(r => r < 1 || r > 10)) {
      return res.status(400).json({
        success: false,
        error: 'Ratings must be between 1 and 10'
      });
    }

    const feedbackEntry = {
      sessionId: sessionId || 'unknown',
      timestamp: timestamp || new Date().toISOString(),
      ratings: {
        relevance,
        groundedness,
        engagement,
        ttsQuality,
        overall
      },
      comments: comments || '',
      context: context || {},
      userAgent: userAgent || '',
      source: source || 'admin-dashboard'
    };

    // Store in feedback.json file
    const fs = require('fs').promises;
    const path = require('path');
    const feedbackFile = path.join(__dirname, '../logs/feedback.json');

    let feedbackData = [];
    try {
      const existingData = await fs.readFile(feedbackFile, 'utf8');
      feedbackData = JSON.parse(existingData);
    } catch (err) {
      // File doesn't exist or is invalid, start fresh
      feedbackData = [];
    }

    feedbackData.push(feedbackEntry);
    await fs.writeFile(feedbackFile, JSON.stringify(feedbackData, null, 2));

    logger.info('Meditation feedback submitted', {
      sessionId: feedbackEntry.sessionId,
      averageRating: ratingValues.reduce((a, b) => a + b, 0) / 5,
      source: feedbackEntry.source
    });

    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      entryId: feedbackData.length
    });
  } catch (error) {
    next(error);
  }
});

// Get feedback analytics
router.get('/feedback-stats', async (req, res, next) => {
  try {
    const feedbackAnalyzer = new FeedbackAnalyzerService();
    const stats = await feedbackAnalyzer.getStats();

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
