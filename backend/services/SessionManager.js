// services/SessionManager.js
const WeatherService = require('./WeatherService');
const RobustSpeciesService = require('./RobustSpeciesService');
const ContentGenerationService = require('./ContentGenerationService');
const LunarService = require('./LunarService');
const BehaviorDatabase = require('./BehaviorDatabase');
const { getInstance: getTTSService } = require('./TTSService');
const logger = require('../utils/logger');
const moment = require('moment-timezone');

class SessionManager {
  constructor() {
    this.weatherService = new WeatherService();
    this.speciesService = new RobustSpeciesService();
    this.contentService = new ContentGenerationService();
    this.lunarService = new LunarService();
    this.behaviorDatabase = new BehaviorDatabase();
    this.ttsService = getTTSService();
    this.activeSessions = new Map();
  }

  async createSession({ latitude, longitude, preferences = {} }) {
    const sessionId = this.generateSessionId();

    try {
      logger.info(`Creating session ${sessionId}`, { latitude, longitude, preferences });

      // Get timezone for the user's location
      const timezone = this.getTimezoneFromCoordinates(latitude, longitude);

      // Get current datetime in user's local timezone (client can override via preferences.datetime)
      const datetime = preferences.datetime
        ? moment.tz(preferences.datetime, timezone).toDate()
        : moment.tz(timezone).toDate();

      logger.debug(`Using timezone ${timezone} for session ${sessionId}`, {
        localTime: datetime.toISOString(),
        hour: datetime.getHours()
      });

      // Calculate lunar context
      const lunar = this.lunarService.calculateLunarDay(datetime);

      // Check for moonrise proximity (within 10 minutes)
      const moonriseInfo = this.lunarService.isNearMoonrise(latitude, longitude, datetime);

      // Get special day guidance if applicable
      const specialDayGuidance = this.lunarService.getSpecialDayGuidance(lunar.day);

      logger.debug(`Lunar data calculated for session ${sessionId}`, {
        lunarDay: lunar.day,
        phase: lunar.phase,
        nearMoonrise: moonriseInfo.near,
        specialDay: specialDayGuidance?.day || null
      });

      const weather = await this.weatherService.getWeather(latitude, longitude);
      logger.debug(`Weather data retrieved for session ${sessionId}`, { weather });

      const species = await this.speciesService.selectSpecies({
        latitude,
        longitude,
        weather,
        preferences
      });
      logger.debug(`Species selected for session ${sessionId}`, { species });

      // Determine time of day using weather API's sunrise/sunset data for accuracy
      const timeOfDay = this.getTimeOfDayFromWeather(datetime, weather);
      
      logger.debug(`Time of day determined for session ${sessionId}`, {
        localTime: datetime.toISOString(),
        hour: datetime.getHours(),
        timeOfDay: timeOfDay,
        sunrise: weather.sunrise ? new Date(weather.sunrise * 1000).toLocaleTimeString() : 'N/A',
        sunset: weather.sunset ? new Date(weather.sunset * 1000).toLocaleTimeString() : 'N/A'
      });

      // Select biologically accurate behavior based on context
      const behavior = this.behaviorDatabase.selectBehavior(species.type || 'bird', {
        timeOfDay,
        weather: weather.condition,
        lunar
      });

      if (behavior) {
        logger.debug(`Behavior selected for session ${sessionId}`, {
          behavior: behavior.behavior
        });
      }

      const content = await this.contentService.generateContent({
        weather,
        species,
        preferences,
        sessionId,
        lunar,
        behavior,
        datetime,
        timeOfDay,
        location: { latitude, longitude },
        moonriseInfo,
        specialDayGuidance
      });
      logger.debug(`Content generated for session ${sessionId}`);

      // Generate audio with David Attenborough-style voice
      const audio = await this.ttsService.generateAudio(content.text, sessionId);

      const session = {
        id: sessionId,
        timestamp: datetime.toISOString(),
        location: { latitude, longitude },
        weather: {
          condition: weather.condition,
          temperature: weather.temperature,
          description: weather.description
        },
        species: {
          name: species.name,
          scientificName: species.scientificName,
          habitat: species.habitat,
          type: species.type
        },
        lunar: {
          day: lunar.day,
          phase: lunar.phase,
          direction: lunar.direction,
          illumination: lunar.percentIlluminated
        },
        behavior: behavior ? {
          action: behavior.behavior,
          description: behavior.description,
          source: behavior.source
        } : null,
        content: {
          text: content.text,
          duration: content.estimatedDuration,
          sections: content.sections
        },
        audio: audio || null,  // Include audio info if generated
        preferences
      };

      this.activeSessions.set(sessionId, session);
      this.scheduleSessionCleanup(sessionId);

      logger.info(`Session ${sessionId} created successfully`);
      return session;

    } catch (error) {
      logger.error(`Failed to create session ${sessionId}`, { error: error.message, stack: error.stack });
      
      return this.createFallbackSession(sessionId, { latitude, longitude, preferences });
    }
  }

  getSession(sessionId) {
    return this.activeSessions.get(sessionId) || null;
  }

  createFallbackSession(sessionId, { latitude, longitude, preferences }) {
    logger.info(`Creating fallback session ${sessionId}`);

    return {
      id: sessionId,
      timestamp: new Date().toISOString(),
      location: { latitude, longitude },
      weather: { condition: 'unknown', description: 'Current conditions' },
      species: { 
        name: 'Natural Surroundings',
        description: 'The living world around you'
      },
      content: {
        text: this.getFallbackContent(preferences),
        duration: preferences.duration || 300,
        sections: ['introduction', 'body', 'closing']
      },
      preferences,
      isFallback: true
    };
  }

  getFallbackContent(preferences) {
    const duration = preferences.duration || 300;
    const timeDescription = duration < 300 ? 'brief' : duration < 600 ? 'gentle' : 'deep';

    return `Welcome to this ${timeDescription} moment of stillness. 

Find yourself a comfortable position, and allow your awareness to settle. Notice the rhythm of your breath—neither forcing nor controlling, simply observing.

In the natural world, every creature finds its rhythm. The slow unfurling of leaves, the patient flow of water over stone, the steady beat of wings in flight. You too are part of this living tapestry.

Let your thoughts drift like clouds across an open sky. Some dark, some light, all passing. Each breath connects you to the ancient patterns of life—the same air that has sustained countless generations.

There is nowhere you need to be, nothing you need to do. Just this moment, just this breath, just this gentle awareness of being alive.

As we come to a close, carry this sense of natural rhythm with you. You are not separate from nature—you are nature, observing itself with wonder.`;
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  scheduleSessionCleanup(sessionId) {
    setTimeout(() => {
      this.activeSessions.delete(sessionId);
      logger.debug(`Session ${sessionId} cleaned up from memory`);
    }, 3600000);
  }

  /**
   * Get timezone from latitude/longitude coordinates
   * Uses moment-timezone's best guess based on coordinates
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @returns {string} Timezone name (e.g., 'America/Los_Angeles')
   */
  getTimezoneFromCoordinates(latitude, longitude) {
    // Rough mapping of longitude to timezone
    // This is a simplified approach - for production, use a proper geo-to-timezone library

    // US timezones based on longitude
    if (latitude > 24 && latitude < 50 && longitude < -60) {
      if (longitude < -120) return 'America/Los_Angeles';
      if (longitude < -104) return 'America/Denver';
      if (longitude < -87) return 'America/Chicago';
      return 'America/New_York';
    }

    // Use moment-timezone's guess method
    const guessedTimezone = moment.tz.guess();
    logger.debug('Guessed timezone', { latitude, longitude, timezone: guessedTimezone });
    return guessedTimezone;
  }

  /**
   * Determine time of day using actual sunrise/sunset from weather API
   * This is more accurate than timezone-based hour calculations
   * @param {Date} date - Current date/time
   * @param {Object} weather - Weather data with sunrise/sunset timestamps
   * @returns {string} Time of day (dawn, morning, afternoon, evening, dusk, night)
   */
  getTimeOfDayFromWeather(date, weather) {
    const currentTime = date.getTime() / 1000; // Convert to Unix timestamp (seconds)
    
    // If we have sunrise/sunset data, use it for accurate determination
    if (weather.sunrise && weather.sunset) {
      const sunrise = weather.sunrise;
      const sunset = weather.sunset;
      const dawnStart = sunrise - 1800; // 30 minutes before sunrise
      const morningEnd = sunrise + 21600; // 6 hours after sunrise (typically noon)
      const eveningStart = sunset - 7200; // 2 hours before sunset
      const duskStart = sunset - 1800; // 30 minutes before sunset
      const duskEnd = sunset + 1800; // 30 minutes after sunset
      
      if (currentTime >= dawnStart && currentTime < sunrise) return 'dawn';
      if (currentTime >= sunrise && currentTime < morningEnd) return 'morning';
      if (currentTime >= morningEnd && currentTime < eveningStart) return 'afternoon';
      if (currentTime >= eveningStart && currentTime < duskStart) return 'evening';
      if (currentTime >= duskStart && currentTime < duskEnd) return 'dusk';
      return 'night';
    }
    
    // Fallback to hour-based calculation if no sunrise/sunset data
    return this.getTimeOfDayFromHour(date);
  }

  /**
   * Fallback time of day calculation based on hour only
   * Less accurate than using actual sunrise/sunset
   */
  getTimeOfDayFromHour(date = new Date()) {
    const hour = date.getHours();
    if (hour >= 5 && hour < 6) return 'dawn';
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 19) return 'evening';
    if (hour >= 19 && hour < 21) return 'dusk';
    return 'night';
  }

  /**
   * Check if location change requires user confirmation
   * @param {number} latitude 
   * @param {number} longitude 
   * @returns {Promise<Object>} Location change status
   */
  async checkLocationChange(latitude, longitude) {
    try {
      return await this.speciesService.checkLocationChange(latitude, longitude);
    } catch (error) {
      logger.error('Location change check failed', { error: error.message });
      return { requiresPrompt: false };
    }
  }

  /**
   * Confirm location change and update species data
   * @param {number} latitude 
   * @param {number} longitude 
   * @returns {Promise<Object>} Update result
   */
  async confirmLocationChange(latitude, longitude) {
    try {
      return await this.speciesService.confirmLocationChange(latitude, longitude);
    } catch (error) {
      logger.error('Location change confirmation failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  getStats() {
    return {
      activeSessions: this.activeSessions.size,
      lunarStats: this.lunarService.getStats(),
      behaviorStats: this.behaviorDatabase.getStats(),
      speciesStats: this.speciesService.getStats(),
      timestamp: new Date().toISOString()
    };
  }
}

let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new SessionManager();
    }
    return instance;
  },
  SessionManager
};