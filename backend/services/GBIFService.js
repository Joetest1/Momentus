// services/GBIFService.js
const axios = require('axios');
const APIService = require('./APIService');
const logger = require('../utils/logger');

/**
 * GBIFService - Global Biodiversity Information Facility API integration
 *
 * Provides species occurrence data and taxonomic information from GBIF.
 * Used to complement iNaturalist with additional species observations and ranges.
 *
 * API Documentation: https://www.gbif.org/developer/summary
 * Note: GBIF API is free and does not require authentication
 */
class GBIFService {
  constructor() {
    this.baseUrl = process.env.GBIF_BASE_URL || 'https://api.gbif.org/v1';
    this.cache = new Map();
    this.cacheDuration = parseInt(process.env.GBIF_CACHE_DURATION) || 3600000; // 1 hour

    // Search parameters
    this.maxResults = parseInt(process.env.GBIF_MAX_RESULTS) || 20;
    this.searchRadius = parseFloat(process.env.GBIF_SEARCH_RADIUS) || 5; // km

    // Only include species with recent observations
    this.recentYears = parseInt(process.env.GBIF_RECENT_YEARS) || 2;
  }

  /**
   * Get species occurrences near a location
   * @param {number} latitude - Location latitude
   * @param {number} longitude - Location longitude
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of species occurrences
   */
  async getOccurrences(latitude, longitude, options = {}) {
    const {
      radius = this.searchRadius,
      limit = this.maxResults,
      taxonKey = null, // Filter by specific taxon (e.g., birds only)
      hasCoordinate = true,
      hasGeospatialIssue = false
    } = options;

    const cacheKey = this.generateCacheKey(latitude, longitude, radius, taxonKey);

    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheDuration) {
        logger.debug('Using cached GBIF data', { cacheKey });
        return cached.data;
      }
    }

    try {
      const currentYear = new Date().getFullYear();
      const yearThreshold = currentYear - this.recentYears;

      const data = await APIService.queueRequest(
        'gbif',
        async () => {
          const params = {
            decimalLatitude: latitude,
            decimalLongitude: longitude,
            limit: limit,
            hasCoordinate: hasCoordinate,
            hasGeospatialIssue: hasGeospatialIssue,
            year: `${yearThreshold},${currentYear}`, // Recent observations only
            occurrenceStatus: 'PRESENT'
          };

          // Add taxon filter if specified
          if (taxonKey) {
            params.taxonKey = taxonKey;
          }

          const response = await axios.get(`${this.baseUrl}/occurrence/search`, {
            params: params,
            timeout: 10000
          });

          return response.data;
        }
      );

      // Filter by radius (GBIF doesn't support native radius search)
      const occurrences = this.parseOccurrences(data.results || []);
      const filtered = this.filterByRadius(occurrences, latitude, longitude, radius);

      this.cache.set(cacheKey, {
        data: filtered,
        timestamp: Date.now()
      });

      logger.info('GBIF occurrences retrieved', {
        total: data.count,
        returned: occurrences.length,
        filtered: filtered.length,
        radius
      });

      return filtered;

    } catch (error) {
      logger.error('Failed to retrieve GBIF occurrences', {
        error: error.message,
        latitude,
        longitude
      });
      return [];
    }
  }

  /**
   * Parse raw GBIF occurrence data
   * @param {Array} results - Raw GBIF results
   * @returns {Array} Parsed occurrences
   */
  parseOccurrences(results) {
    return results.map(occ => {
      return {
        id: occ.key,
        gbifKey: occ.key,

        // Species information
        name: occ.vernacularName || occ.species || occ.scientificName || 'Unknown',
        scientificName: occ.scientificName,
        commonName: occ.vernacularName,

        // Taxonomy
        kingdom: occ.kingdom,
        phylum: occ.phylum,
        class: occ.class,
        order: occ.order,
        family: occ.family,
        genus: occ.genus,
        species: occ.species,
        taxonRank: occ.taxonRank,

        // Location
        location: {
          latitude: occ.decimalLatitude,
          longitude: occ.decimalLongitude,
          country: occ.country,
          stateProvince: occ.stateProvince,
          locality: occ.locality || occ.verbatimLocality,
          coordinateUncertainty: occ.coordinateUncertaintyInMeters
        },

        // Observation details
        observedAt: occ.eventDate,
        year: occ.year,
        month: occ.month,
        day: occ.day,

        // Data quality
        basisOfRecord: occ.basisOfRecord,
        individualCount: occ.individualCount,

        // Attribution
        datasetKey: occ.datasetKey,
        publishingOrgKey: occ.publishingOrgKey,

        // Links
        gbifUrl: `https://www.gbif.org/occurrence/${occ.key}`,

        // Source
        source: 'GBIF'
      };
    }).filter(occ => occ.name !== 'Unknown');
  }

  /**
   * Filter occurrences by radius from center point
   * @param {Array} occurrences - Parsed occurrences
   * @param {number} centerLat - Center latitude
   * @param {number} centerLon - Center longitude
   * @param {number} radiusKm - Radius in kilometers
   * @returns {Array} Filtered occurrences
   */
  filterByRadius(occurrences, centerLat, centerLon, radiusKm) {
    return occurrences.filter(occ => {
      if (!occ.location.latitude || !occ.location.longitude) {
        return false;
      }

      const distance = this.calculateDistance(
        centerLat,
        centerLon,
        occ.location.latitude,
        occ.location.longitude
      );

      return distance <= radiusKm;
    });
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param {number} lat1 - First latitude
   * @param {number} lon1 - First longitude
   * @param {number} lat2 - Second latitude
   * @param {number} lon2 - Second longitude
   * @returns {number} Distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees
   * @returns {number} Radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get species details by GBIF taxon key
   * @param {number} taxonKey - GBIF taxon key
   * @returns {Promise<Object>} Species details
   */
  async getSpeciesByKey(taxonKey) {
    try {
      const response = await axios.get(`${this.baseUrl}/species/${taxonKey}`);
      return this.parseSpeciesDetails(response.data);
    } catch (error) {
      logger.error('Failed to get GBIF species by key', {
        error: error.message,
        taxonKey
      });
      return null;
    }
  }

  /**
   * Parse GBIF species details
   * @param {Object} data - Raw GBIF species data
   * @returns {Object} Parsed species details
   */
  parseSpeciesDetails(data) {
    return {
      gbifKey: data.key,
      name: data.vernacularName || data.canonicalName,
      scientificName: data.scientificName,
      canonicalName: data.canonicalName,
      commonNames: data.vernacularNames || [],
      taxonomy: {
        kingdom: data.kingdom,
        phylum: data.phylum,
        class: data.class,
        order: data.order,
        family: data.family,
        genus: data.genus
      },
      rank: data.rank,
      taxonomicStatus: data.taxonomicStatus,
      nubKey: data.nubKey,
      source: 'GBIF'
    };
  }

  /**
   * Search for species by name
   * @param {string} name - Species name (common or scientific)
   * @returns {Promise<Array>} Matching species
   */
  async searchSpecies(name) {
    try {
      const response = await axios.get(`${this.baseUrl}/species/search`, {
        params: {
          q: name,
          limit: 10,
          status: 'ACCEPTED'
        }
      });

      return (response.data.results || []).map(sp => this.parseSpeciesDetails(sp));

    } catch (error) {
      logger.error('Failed to search GBIF species', {
        error: error.message,
        name
      });
      return [];
    }
  }

  /**
   * Get unique species from occurrences
   * @param {Array} occurrences - Array of occurrences
   * @returns {Array} Unique species
   */
  getUniqueSpecies(occurrences) {
    const speciesMap = new Map();

    occurrences.forEach(occ => {
      const key = occ.scientificName || occ.name;
      if (!speciesMap.has(key)) {
        speciesMap.set(key, {
          name: occ.name,
          scientificName: occ.scientificName,
          commonName: occ.commonName,
          taxonRank: occ.taxonRank,
          class: occ.class,
          order: occ.order,
          family: occ.family,
          occurrenceCount: 1,
          gbifKey: occ.gbifKey,
          source: 'GBIF'
        });
      } else {
        speciesMap.get(key).occurrenceCount++;
      }
    });

    return Array.from(speciesMap.values())
      .sort((a, b) => b.occurrenceCount - a.occurrenceCount);
  }

  /**
   * Generate cache key
   * @param {number} latitude
   * @param {number} longitude
   * @param {number} radius
   * @param {number|null} taxonKey
   * @returns {string} Cache key
   */
  generateCacheKey(latitude, longitude, radius, taxonKey = null) {
    const lat = latitude.toFixed(2);
    const lon = longitude.toFixed(2);
    return `gbif_${lat}_${lon}_${radius}_${taxonKey || 'all'}`;
  }

  /**
   * Clear cache
   */
  clearCache() {
    const size = this.cache.size;
    this.cache.clear();
    logger.info(`Cleared ${size} cached GBIF entries`);
  }

  /**
   * Get service statistics
   * @returns {Object} Service stats
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      cacheDuration: this.cacheDuration,
      maxResults: this.maxResults,
      searchRadius: this.searchRadius,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = GBIFService;
