// services/INaturalistService.js
const axios = require('axios');
const APIService = require('./APIService');
const logger = require('../utils/logger');

class INaturalistService {
  constructor() {
    this.baseUrl = process.env.INATURALIST_BASE_URL || 'https://api.inaturalist.org/v1';
    this.cache = new Map();
    this.cacheDuration = parseInt(process.env.INATURALIST_CACHE_DURATION) || 3600000;
    
    this.radiusStart = parseFloat(process.env.SPECIES_RADIUS_START) || 1.6;
    this.radiusMid = parseFloat(process.env.SPECIES_RADIUS_MID) || 8.0;
    this.radiusMax = parseFloat(process.env.SPECIES_RADIUS_MAX) || 32.0;
    
    this.minQuality = process.env.SPECIES_MIN_QUALITY || 'research';
    this.maxResults = parseInt(process.env.INATURALIST_MAX_RESULTS) || 10;
  }

  async cascadingRadiusSearch(latitude, longitude) {
    logger.info('Starting cascading radius search', { latitude, longitude });

    try {
      let observations = await this.getObservations(latitude, longitude, {
        radius: this.radiusStart,
        minResults: 3
      });

      if (observations.length >= 3) {
        logger.info('Found sufficient observations at 1 mile radius', {
          count: observations.length
        });
        return observations;
      }

      logger.info('Expanding search to 5 miles');
      observations = await this.getObservations(latitude, longitude, {
        radius: this.radiusMid,
        minResults: 3
      });

      if (observations.length >= 3) {
        logger.info('Found sufficient observations at 5 mile radius', {
          count: observations.length
        });
        return observations;
      }

      logger.info('Expanding search to 20 miles');
      observations = await this.getObservations(latitude, longitude, {
        radius: this.radiusMax,
        minResults: 3
      });

      logger.info('Final observation count', {
        count: observations.length,
        radiusUsed: this.radiusMax
      });

      return observations;

    } catch (error) {
      logger.error('Cascading radius search failed', { 
        error: error.message,
        latitude,
        longitude 
      });
      return [];
    }
  }

  async getObservations(latitude, longitude, options = {}) {
    const {
      radius = this.radiusStart,
      minResults = 3
    } = options;

    const cacheKey = this.generateCacheKey(latitude, longitude, radius);
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheDuration) {
        logger.debug('Using cached iNaturalist data', { cacheKey });
        return cached.data;
      }
    }

    try {
      const data = await APIService.queueRequest(
        'inaturalist',
        async () => {
          const response = await axios.get(`${this.baseUrl}/observations`, {
            params: {
              lat: latitude,
              lng: longitude,
              radius: radius,
              order: 'desc',
              order_by: 'observed_on',
              quality_grade: this.minQuality,
              per_page: this.maxResults,
              taxon_id: 1,
              photos: true,
              verifiable: true,
              locale: 'en'
            },
            timeout: 10000
          });

          return response.data;
        }
      );

      const observations = this.parseObservations(data.results || []);
      const filteredObservations = this.filterObservations(observations);

      this.cache.set(cacheKey, {
        data: filteredObservations,
        timestamp: Date.now()
      });

      logger.info('iNaturalist observations retrieved', {
        total: data.total_results,
        returned: observations.length,
        filtered: filteredObservations.length,
        radius
      });

      return filteredObservations;

    } catch (error) {
      logger.error('Failed to retrieve iNaturalist observations', {
        error: error.message,
        latitude,
        longitude,
        radius
      });
      return [];
    }
  }

  parseObservations(results) {
    return results.map(obs => {
      const taxon = obs.taxon || {};
      const photo = obs.photos && obs.photos[0];

      return {
        id: obs.id,
        name: taxon.preferred_common_name || taxon.name || 'Unknown Species',
        scientificName: taxon.name,
        commonName: taxon.preferred_common_name,
        
        rank: taxon.rank,
        iconicTaxonName: taxon.iconic_taxon_name,
        
        photoUrl: photo ? photo.url.replace('square', 'medium') : null,
        photoAttribution: photo ? photo.attribution : null,
        
        observedAt: obs.observed_on || obs.created_at,
        observedBy: obs.user?.login || 'Anonymous',
        location: {
          latitude: obs.location ? parseFloat(obs.location.split(',')[0]) : null,
          longitude: obs.location ? parseFloat(obs.location.split(',')[1]) : null,
          place: obs.place_guess || 'Unknown location'
        },
        
        qualityGrade: obs.quality_grade,
        numIdentificationAgreements: obs.num_identification_agreements || 0,
        
        description: obs.description || taxon.wikipedia_summary || '',
        
        habitatInfo: this.extractHabitatInfo(taxon),
        behavioralNotes: this.extractBehavioralNotes(obs, taxon),
        
        rawTaxonId: taxon.id,
        rawObsUrl: `https://www.inaturalist.org/observations/${obs.id}`
      };
    }).filter(obs => obs.name !== 'Unknown Species');
  }

  extractHabitatInfo(taxon) {
    const habitats = [];
    
    if (taxon.preferred_common_name) {
      const name = taxon.preferred_common_name.toLowerCase();
      
      if (name.includes('water') || name.includes('duck') || name.includes('heron')) {
        habitats.push('wetlands', 'water bodies');
      }
      if (name.includes('forest') || name.includes('wood')) {
        habitats.push('forests', 'woodland areas');
      }
      if (name.includes('mountain') || name.includes('alpine')) {
        habitats.push('mountainous regions');
      }
      if (name.includes('urban') || name.includes('city')) {
        habitats.push('urban environments');
      }
    }
    
    return habitats.length > 0 ? habitats.join(', ') : 'Various habitats';
  }

  extractBehavioralNotes(obs, taxon) {
    const notes = [];
    
    if (obs.description && obs.description.length > 0) {
      notes.push(obs.description.substring(0, 200));
    }
    
    if (taxon.wikipedia_summary) {
      notes.push(taxon.wikipedia_summary.substring(0, 200));
    }
    
    return notes.join(' ');
  }

  filterObservations(observations) {
    const uniqueSpecies = new Map();
    
    observations.forEach(obs => {
      const key = obs.scientificName;
      if (!uniqueSpecies.has(key) || 
          obs.numIdentificationAgreements > uniqueSpecies.get(key).numIdentificationAgreements) {
        uniqueSpecies.set(key, obs);
      }
    });
    
    return Array.from(uniqueSpecies.values())
      .sort((a, b) => {
        if (a.qualityGrade === 'research' && b.qualityGrade !== 'research') return -1;
        if (b.qualityGrade === 'research' && a.qualityGrade !== 'research') return 1;
        
        return b.numIdentificationAgreements - a.numIdentificationAgreements;
      })
      .slice(0, this.maxResults);
  }

  generateCacheKey(latitude, longitude, radius) {
    const lat = latitude.toFixed(2);
    const lon = longitude.toFixed(2);
    return `${lat}_${lon}_${radius}`;
  }

  async getObservationById(id) {
    try {
      const response = await axios.get(`${this.baseUrl}/observations/${id}`);
      return this.parseObservations([response.data.results[0]])[0];
    } catch (error) {
      logger.error('Failed to get observation by ID', { error: error.message, id });
      return null;
    }
  }

  clearCache() {
    const size = this.cache.size;
    this.cache.clear();
    logger.info(`Cleared ${size} cached iNaturalist entries`);
  }

  getStats() {
    return {
      cacheSize: this.cache.size,
      cacheDuration: this.cacheDuration,
      radiusConfig: {
        start: this.radiusStart,
        mid: this.radiusMid,
        max: this.radiusMax
      },
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = INaturalistService;