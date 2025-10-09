// middleware/validation.js
const logger = require('../utils/logger');

function validateSessionRequest(req, res, next) {
  const { latitude, longitude, preferences } = req.body;

  const errors = [];

  if (latitude === undefined || latitude === null) {
    errors.push('latitude is required');
  } else if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
    errors.push('latitude must be a number between -90 and 90');
  }

  if (longitude === undefined || longitude === null) {
    errors.push('longitude is required');
  } else if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
    errors.push('longitude must be a number between -180 and 180');
  }

  if (preferences !== undefined) {
    if (typeof preferences !== 'object' || Array.isArray(preferences)) {
      errors.push('preferences must be an object');
    } else {
      if (preferences.duration !== undefined) {
        if (typeof preferences.duration !== 'number' || preferences.duration < 60 || preferences.duration > 3600) {
          errors.push('preferences.duration must be between 60 and 3600 seconds');
        }
      }

      if (preferences.mood !== undefined) {
        const validMoods = ['calm', 'energized', 'reflective', 'peaceful', 'focused'];
        if (!validMoods.includes(preferences.mood)) {
          errors.push(`preferences.mood must be one of: ${validMoods.join(', ')}`);
        }
      }

      if (preferences.speciesType !== undefined) {
        const validTypes = ['bird', 'mammal', 'insect', 'fish', 'reptile', 'amphibian'];
        if (!validTypes.includes(preferences.speciesType)) {
          errors.push(`preferences.speciesType must be one of: ${validTypes.join(', ')}`);
        }
      }
    }
  }

  if (errors.length > 0) {
    logger.warn('Session request validation failed', { errors, body: req.body });
    
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors
    });
  }

  next();
}

module.exports = { validateSessionRequest };