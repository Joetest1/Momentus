// services/eBirdService.js
const axios = require('axios');
const APIService = require('./APIService');
const logger = require('../utils/logger');

/**
 * eBirdService - eBird API integration for real-time bird observations
 *
 * Provides recent bird sightings and activity hotspots from the eBird database.
 * Excellent for time-sensitive bird behavior and seasonal migration data.
 *
 * API Documentation: https://documenter.getpostman.com/view/664302/S1ENwy59
 * Note: Requires free API key from https://ebird.org/api/keygen
 */
class eBirdService {
  constructor() {
    this.apiKey = process.env.EBIRD_API_KEY;
    this.baseUrl = process.env.EBIRD_BASE_URL || 'https://api.ebird.org/v2';
    this.cache = new Map();
    this.cacheDuration = parseInt(process.env.EBIRD_CACHE_DURATION) || 1800000; // 30 minutes

    // Search parameters
    this.maxResults = parseInt(process.env.EBIRD_MAX_RESULTS) || 30;
    this.daysBack = parseInt(process.env.EBIRD_DAYS_BACK) || 14; // Recent observations
    this.hotspotRadius = parseFloat(process.env.EBIRD_HOTSPOT_RADIUS) || 25; // km
  }

  /**
   * Get recent bird observations near a location
   * @param {number} latitude - Location latitude
   * @param {number} longitude - Location longitude
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of recent observations
   */
  async getRecentObservations(latitude, longitude, options = {}) {
    const {
      radius = this.hotspotRadius,
      back = this.daysBack,
      maxResults = this.maxResults,
      includeProvisional = false,
      hotspot = false
    } = options;

    const cacheKey = this.generateCacheKey(latitude, longitude, radius, back);

    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheDuration) {
        logger.debug('Using cached eBird data', { cacheKey });
        return cached.data;
      }
    }

    if (!this.apiKey) {
      logger.warn('eBird API key not configured, skipping eBird data');
      return [];
    }

    try {
      const data = await APIService.queueRequest(
        'ebird',
        async () => {
          const response = await axios.get(
            `${this.baseUrl}/data/obs/geo/recent`,
            {
              params: {
                lat: latitude,
                lng: longitude,
                dist: radius,
                back: back,
                maxResults: maxResults,
                includeProvisional: includeProvisional,
                hotspot: hotspot
              },
              headers: {
                'X-eBirdApiToken': this.apiKey
              },
              timeout: 10000
            }
          );

          return response.data;
        }
      );

      const observations = this.parseObservations(data || []);

      this.cache.set(cacheKey, {
        data: observations,
        timestamp: Date.now()
      });

      logger.info('eBird observations retrieved', {
        count: observations.length,
        radius,
        daysBack: back
      });

      return observations;

    } catch (error) {
      logger.error('Failed to retrieve eBird observations', {
        error: error.message,
        latitude,
        longitude
      });
      return [];
    }
  }

  /**
   * Parse raw eBird observation data
   * @param {Array} results - Raw eBird results
   * @returns {Array} Parsed observations
   */
  parseObservations(results) {
    return results.map(obs => {
      return {
        id: obs.subId,
        checklistId: obs.subId,

        // Species information
        name: obs.comName,
        scientificName: obs.sciName,
        commonName: obs.comName,
        speciesCode: obs.speciesCode,

        // Taxonomy
        category: obs.category,
        taxonOrder: obs.taxonOrder,
        order: obs.order,
        familyCode: obs.familyCode,
        familyComName: obs.familyComName,
        familySciName: obs.familySciName,

        // Observation details
        observedAt: obs.obsDt,
        howMany: obs.howMany || 1,
        locationPrivate: obs.locationPrivate,

        // Location
        location: {
          latitude: obs.lat,
          longitude: obs.lng,
          name: obs.locName,
          id: obs.locId,
          countryCode: obs.countryCode,
          subnational1Code: obs.subnational1Code,
          subnational2Code: obs.subnational2Code
        },

        // Data quality
        obsReviewed: obs.obsReviewed,
        obsValid: obs.obsValid,

        // Source
        source: 'eBird',
        ebirdUrl: `https://ebird.org/checklist/${obs.subId}`
      };
    });
  }

  /**
   * Get notable (rare/unusual) bird sightings
   * @param {number} latitude - Location latitude
   * @param {number} longitude - Location longitude
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Notable observations
   */
  async getNotableObservations(latitude, longitude, options = {}) {
    const {
      radius = this.hotspotRadius,
      back = this.daysBack,
      maxResults = this.maxResults
    } = options;

    if (!this.apiKey) {
      logger.warn('eBird API key not configured');
      return [];
    }

    try {
      const data = await APIService.queueRequest(
        'ebird',
        async () => {
          const response = await axios.get(
            `${this.baseUrl}/data/obs/geo/recent/notable`,
            {
              params: {
                lat: latitude,
                lng: longitude,
                dist: radius,
                back: back,
                maxResults: maxResults
              },
              headers: {
                'X-eBirdApiToken': this.apiKey
              },
              timeout: 10000
            }
          );

          return response.data;
        }
      );

      const observations = this.parseObservations(data || []);

      logger.info('eBird notable observations retrieved', {
        count: observations.length,
        radius
      });

      return observations;

    } catch (error) {
      logger.error('Failed to retrieve eBird notable observations', {
        error: error.message,
        latitude,
        longitude
      });
      return [];
    }
  }

  /**
   * Get nearby birding hotspots
   * @param {number} latitude - Location latitude
   * @param {number} longitude - Location longitude
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Nearby hotspots
   */
  async getNearbyHotspots(latitude, longitude, options = {}) {
    const {
      radius = this.hotspotRadius,
      format = 'json'
    } = options;

    if (!this.apiKey) {
      logger.warn('eBird API key not configured');
      return [];
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/ref/hotspot/geo`,
        {
          params: {
            lat: latitude,
            lng: longitude,
            dist: radius,
            fmt: format
          },
          headers: {
            'X-eBirdApiToken': this.apiKey
          },
          timeout: 10000
        }
      );

      logger.info('eBird hotspots retrieved', {
        count: response.data.length,
        radius
      });

      return response.data;

    } catch (error) {
      logger.error('Failed to retrieve eBird hotspots', {
        error: error.message,
        latitude,
        longitude
      });
      return [];
    }
  }

  /**
   * Get species information by code
   * @param {string} speciesCode - eBird species code
   * @returns {Promise<Object>} Species info
   */
  async getSpeciesInfo(speciesCode) {
    if (!this.apiKey) {
      return null;
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/ref/taxonomy/ebird`,
        {
          params: {
            species: speciesCode
          },
          headers: {
            'X-eBirdApiToken': this.apiKey
          }
        }
      );

      return response.data[0] || null;

    } catch (error) {
      logger.error('Failed to get eBird species info', {
        error: error.message,
        speciesCode
      });
      return null;
    }
  }

  /**
   * Get unique species from observations
   * @param {Array} observations - Array of observations
   * @returns {Array} Unique species with counts
   */
  getUniqueSpecies(observations) {
    const speciesMap = new Map();

    observations.forEach(obs => {
      const key = obs.speciesCode;
      if (!speciesMap.has(key)) {
        speciesMap.set(key, {
          name: obs.name,
          scientificName: obs.scientificName,
          commonName: obs.commonName,
          speciesCode: obs.speciesCode,
          category: obs.category,
          observationCount: 1,
          totalIndividuals: obs.howMany || 0,
          mostRecentObservation: obs.observedAt,
          source: 'eBird'
        });
      } else {
        const species = speciesMap.get(key);
        species.observationCount++;
        species.totalIndividuals += obs.howMany || 0;

        // Update if more recent
        if (new Date(obs.observedAt) > new Date(species.mostRecentObservation)) {
          species.mostRecentObservation = obs.observedAt;
        }
      }
    });

    return Array.from(speciesMap.values())
      .sort((a, b) => b.observationCount - a.observationCount);
  }

  /**
   * Get most active species (by observation frequency)
   * @param {Array} observations - Array of observations
   * @param {number} limit - Max number of species to return
   * @returns {Array} Most active species
   */
  getMostActiveSpecies(observations, limit = 10) {
    const uniqueSpecies = this.getUniqueSpecies(observations);
    return uniqueSpecies.slice(0, limit);
  }

  /**
   * Generate cache key
   * @param {number} latitude
   * @param {number} longitude
   * @param {number} radius
   * @param {number} daysBack
   * @returns {string} Cache key
   */
  generateCacheKey(latitude, longitude, radius, daysBack) {
    const lat = latitude.toFixed(2);
    const lon = longitude.toFixed(2);
    return `ebird_${lat}_${lon}_${radius}_${daysBack}`;
  }

  /**
   * Clear cache
   */
  clearCache() {
    const size = this.cache.size;
    this.cache.clear();
    logger.info(`Cleared ${size} cached eBird entries`);
  }

  /**
   * Get service statistics
   * @returns {Object} Service stats
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      cacheDuration: this.cacheDuration,
      apiConfigured: !!this.apiKey,
      maxResults: this.maxResults,
      daysBack: this.daysBack,
      hotspotRadius: this.hotspotRadius,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = eBirdService;
