// services/SpeciesService.js
const INaturalistService = require('./INaturalistService');
const GBIFService = require('./GBIFService');
const eBirdService = require('./eBirdService');
const logger = require('../utils/logger');

class SpeciesService {
  constructor() {
    this.speciesDatabase = this.initializeSpeciesDatabase();

    // Initialize API services for real-time data
    this.inaturalist = new INaturalistService();
    this.gbif = new GBIFService();
    this.ebird = new eBirdService();

    // Feature flags
    this.useRealTimeData = process.env.USE_REALTIME_SPECIES === 'true' || false;
    this.preferLocalObservations = true;

    // Species cooldown tracking (2-day exclusion)
    this.recentlyUsedSpecies = new Map(); // Map<speciesName, timestamp>
    this.cooldownPeriod = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds
  }

  async selectSpecies({ latitude, longitude, weather, preferences }) {
    try {
      // If real-time data is enabled, fetch from APIs
      if (this.useRealTimeData) {
        logger.info('Fetching real-time species data', { latitude, longitude });

        const localSpecies = await this.fetchLocalSpecies(latitude, longitude, {
          weather,
          preferences
        });

        if (localSpecies.length > 0) {
          // Filter out recently used species
          const availableSpecies = this.filterRecentlyUsed(localSpecies);

          if (availableSpecies.length === 0) {
            logger.warn('All species recently used, clearing cooldown and retrying');
            this.clearOldCooldowns();
            // Use all species if all are in cooldown
            const selected = this.selectFromRealTimeData(localSpecies, weather, preferences);
            this.markSpeciesAsUsed(selected.name);
            return selected;
          }

          const selected = this.selectFromRealTimeData(availableSpecies, weather, preferences);

          // Track this species as used
          this.markSpeciesAsUsed(selected.name);

          logger.info('Species selected from real-time data', {
            species: selected.name,
            source: selected.source,
            weather: weather.condition,
            availableCount: availableSpecies.length,
            totalCount: localSpecies.length
          });

          return selected;
        }

        logger.warn('No real-time species found, falling back to database');
      }

      // Fallback to hardcoded database
      const biome = this.determineBiome(latitude, longitude);

      let candidates = this.speciesDatabase.filter(species => {
        return species.biomes.includes(biome) &&
               this.isWeatherCompatible(species, weather);
      });

      if (preferences.speciesType) {
        const filtered = candidates.filter(s =>
          s.type === preferences.speciesType
        );
        if (filtered.length > 0) {
          candidates = filtered;
        }
      }

      const selected = this.weightedSelection(candidates, weather);

      logger.info('Species selected from database', {
        species: selected.name,
        biome,
        weather: weather.condition
      });

      return selected;

    } catch (error) {
      logger.error('Species selection failed', { error: error.message });
      return this.getFallbackSpecies();
    }
  }

  determineBiome(latitude, longitude) {
    const absLat = Math.abs(latitude);
    
    if (absLat > 66) return 'polar';
    if (absLat > 50) return 'temperate';
    if (absLat > 23) return 'subtropical';
    return 'tropical';
  }

  isWeatherCompatible(species, weather) {
    if (weather.condition === 'rain' && species.weatherPreference?.includes('rain')) {
      return true;
    }
    
    if (weather.condition === 'clear' && species.weatherPreference?.includes('clear')) {
      return true;
    }

    return !species.weatherAvoidance?.includes(weather.condition);
  }

  weightedSelection(candidates, weather) {
    if (candidates.length === 0) {
      return this.getFallbackSpecies();
    }

    const weights = candidates.map(species => {
      let weight = 1;
      
      if (species.weatherPreference?.includes(weather.condition)) {
        weight *= 2;
      }
      
      return weight;
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < candidates.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return candidates[i];
      }
    }

    return candidates[0];
  }

  initializeSpeciesDatabase() {
    return [
      // MAMMALS - Common widespread species
      {
        name: 'White-tailed Deer',
        scientificName: 'Odocoileus virginianus',
        type: 'mammal',
        biomes: ['temperate', 'subtropical'],
        habitat: 'Forests, fields, and suburban areas',
        weatherPreference: ['clear', 'clouds'],
        behavior: 'Graceful movement, alert and watchful, gentle grazing',
        meditativeQuality: 'Graceful presence and mindful awareness'
      },
      {
        name: 'Raccoon',
        scientificName: 'Procyon lotor',
        type: 'mammal',
        biomes: ['temperate', 'subtropical'],
        habitat: 'Forests, urban areas, and near water',
        weatherPreference: ['clear', 'clouds', 'rain'],
        behavior: 'Intelligent problem-solving, dexterous movements, nocturnal activities',
        meditativeQuality: 'Curiosity and adaptive intelligence'
      },
      {
        name: 'Striped Skunk',
        scientificName: 'Mephitis mephitis',
        type: 'mammal',
        biomes: ['temperate', 'subtropical'],
        habitat: 'Various environments, fields, and woodlands',
        weatherPreference: ['clear', 'clouds'],
        behavior: 'Confident movement, purposeful foraging, peaceful nature',
        meditativeQuality: 'Self-confidence and peaceful coexistence'
      },
      {
        name: 'Bobcat',
        scientificName: 'Lynx rufus',
        type: 'mammal',
        biomes: ['temperate', 'subtropical'],
        habitat: 'Forests, rocky areas, and brushlands',
        weatherPreference: ['clear', 'clouds'],
        behavior: 'Stealthy movement, patient hunting, solitary observation',
        meditativeQuality: 'Solitude and focused intention'
      },
      {
        name: 'American Beaver',
        scientificName: 'Castor canadensis',
        type: 'mammal',
        biomes: ['temperate'],
        habitat: 'Near lakes, rivers, and ponds',
        weatherPreference: ['clear', 'clouds', 'rain'],
        behavior: 'Diligent building, purposeful work, family cooperation',
        meditativeQuality: 'Patient persistence and community harmony'
      },
      {
        name: 'Red Fox',
        scientificName: 'Vulpes vulpes',
        type: 'mammal',
        biomes: ['temperate', 'subtropical'],
        habitat: 'Forests, grasslands, and suburban areas',
        weatherPreference: ['clear', 'clouds', 'snow'],
        behavior: 'Adaptable and observant, moves with quiet precision',
        meditativeQuality: 'Alertness and adaptability'
      },
      {
        name: 'Coyote',
        scientificName: 'Canis latrans',
        type: 'mammal',
        biomes: ['temperate', 'subtropical', 'polar'],
        habitat: 'Diverse habitats from deserts to forests',
        weatherPreference: ['clear', 'clouds', 'snow'],
        behavior: 'Adaptable hunting, pack communication, resilient survival',
        meditativeQuality: 'Resilience and adaptability'
      },
      {
        name: 'Deer Mouse',
        scientificName: 'Peromyscus maniculatus',
        type: 'mammal',
        biomes: ['temperate', 'subtropical', 'polar'],
        habitat: 'Various habitats, fields, and woodlands',
        weatherPreference: ['clear', 'clouds'],
        behavior: 'Quick movements, careful foraging, small but determined',
        meditativeQuality: 'Attention to small details and quiet determination'
      },

      // BIRDS - Common widespread species
      {
        name: 'Red-tailed Hawk',
        scientificName: 'Buteo jamaicensis',
        type: 'bird',
        biomes: ['temperate', 'subtropical', 'tropical'],
        habitat: 'Open country, fields, and woodlands',
        weatherPreference: ['clear', 'clouds'],
        behavior: 'Soaring flight, keen observation, patient hunting',
        meditativeQuality: 'Elevated perspective and focused vision'
      },
      {
        name: 'American Robin',
        scientificName: 'Turdus migratorius',
        type: 'bird',
        biomes: ['temperate', 'subtropical'],
        habitat: 'Suburban yards, parks, and woodlands',
        weatherPreference: ['clear', 'clouds', 'rain'],
        behavior: 'Cheerful singing, ground foraging, seasonal awareness',
        meditativeQuality: 'Joy and seasonal mindfulness'
      },
      {
        name: 'Bald Eagle',
        scientificName: 'Haliaeetus leucocephalus',
        type: 'bird',
        biomes: ['temperate', 'subtropical'],
        habitat: 'Near water bodies, coasts, and large rivers',
        weatherPreference: ['clear', 'clouds'],
        behavior: 'Majestic soaring, powerful presence, masterful fishing',
        meditativeQuality: 'Strength and dignified presence'
      },
      {
        name: 'Barn Owl',
        scientificName: 'Tyto alba',
        type: 'bird',
        biomes: ['temperate', 'subtropical', 'tropical'],
        habitat: 'Open countryside, grasslands, and farmland',
        weatherPreference: ['clear', 'clouds'],
        behavior: 'Silent flight, exceptional hearing, nocturnal wisdom',
        meditativeQuality: 'Silent observation and deep listening'
      },
      {
        name: 'Mourning Dove',
        scientificName: 'Zenaida macroura',
        type: 'bird',
        biomes: ['temperate', 'subtropical'],
        habitat: 'Open and semi-open habitats, suburban areas',
        weatherPreference: ['clear', 'clouds'],
        behavior: 'Gentle cooing, peaceful movement, devoted pair bonding',
        meditativeQuality: 'Peaceful presence and gentle devotion'
      },
      {
        name: 'Northern Cardinal',
        scientificName: 'Cardinalis cardinalis',
        type: 'bird',
        biomes: ['temperate', 'subtropical'],
        habitat: 'Woodlands, gardens, and backyards',
        weatherPreference: ['clear', 'clouds'],
        behavior: 'Vibrant presence, melodious calls, year-round companionship',
        meditativeQuality: 'Vibrant energy and faithful presence'
      },
      {
        name: 'Turkey Vulture',
        scientificName: 'Cathartes aura',
        type: 'bird',
        biomes: ['temperate', 'subtropical', 'tropical'],
        habitat: 'Open country and roadsides',
        weatherPreference: ['clear', 'clouds'],
        behavior: 'Effortless soaring, patient circles, natural recycling',
        meditativeQuality: 'Effortless flow and natural cycles'
      },
      {
        name: 'Great Blue Heron',
        scientificName: 'Ardea herodias',
        type: 'bird',
        biomes: ['temperate', 'subtropical'],
        habitat: 'Wetlands, shores, and shallow waters',
        weatherPreference: ['clear', 'clouds'],
        behavior: 'Patient hunter, stands motionless for long periods',
        meditativeQuality: 'Stillness and focused awareness'
      },

      // INSECTS & INVERTEBRATES - Common widespread species
      {
        name: 'Monarch Butterfly',
        scientificName: 'Danaus plexippus',
        type: 'insect',
        biomes: ['temperate', 'subtropical', 'tropical'],
        habitat: 'Meadows, gardens, and milkweed fields',
        weatherPreference: ['clear'],
        weatherAvoidance: ['rain', 'thunderstorm'],
        behavior: 'Graceful flight, remarkable migration, transformation cycle',
        meditativeQuality: 'Transformation and purposeful journey'
      },
      {
        name: 'American Bumble Bee',
        scientificName: 'Bombus impatiens',
        type: 'insect',
        biomes: ['temperate', 'subtropical'],
        habitat: 'Gardens, meadows, and flowering areas',
        weatherPreference: ['clear', 'clouds'],
        behavior: 'Diligent pollinating, gentle buzzing, flower-to-flower movement',
        meditativeQuality: 'Purposeful service and gentle industry'
      },
      {
        name: 'Dragonfly',
        scientificName: 'Libellula species',
        type: 'insect',
        biomes: ['temperate', 'subtropical', 'tropical'],
        habitat: 'Near water, ponds, and wetlands',
        weatherPreference: ['clear', 'clouds'],
        behavior: 'Precise hovering, sudden direction changes, ancient wisdom',
        meditativeQuality: 'Present moment awareness and ancient wisdom'
      },
      {
        name: 'Carpenter Ant',
        scientificName: 'Camponotus species',
        type: 'insect',
        biomes: ['temperate', 'subtropical'],
        habitat: 'Woodlands and human structures',
        weatherPreference: ['clear', 'clouds'],
        behavior: 'Organized colonies, purposeful building, community cooperation',
        meditativeQuality: 'Community harmony and purposeful work'
      },

      // AMPHIBIANS - Common species
      {
        name: 'Pacific Tree Frog',
        scientificName: 'Pseudacris regilla',
        type: 'amphibian',
        biomes: ['temperate'],
        habitat: 'Near water, in trees and vegetation',
        weatherPreference: ['rain', 'drizzle', 'clouds'],
        behavior: 'Vocal at night, blends perfectly with surroundings',
        meditativeQuality: 'Voice and presence in the moment'
      },
      {
        name: 'American Bullfrog',
        scientificName: 'Lithobates catesbeianus',
        type: 'amphibian',
        biomes: ['temperate', 'subtropical'],
        habitat: 'Ponds, lakes, and slow-moving waters',
        weatherPreference: ['rain', 'clouds', 'clear'],
        behavior: 'Deep resonant calls, patient waiting, powerful leaps',
        meditativeQuality: 'Deep voice and patient presence'
      },

      // REPTILES - Common species
      {
        name: 'Garter Snake',
        scientificName: 'Thamnophis species',
        type: 'reptile',
        biomes: ['temperate', 'subtropical'],
        habitat: 'Gardens, fields, and near water',
        weatherPreference: ['clear', 'clouds'],
        behavior: 'Graceful movement, sun-basking, gentle nature',
        meditativeQuality: 'Fluid movement and sun-warmed contentment'
      },
      {
        name: 'Painted Turtle',
        scientificName: 'Chrysemys picta',
        type: 'reptile',
        biomes: ['temperate'],
        habitat: 'Ponds, lakes, and slow streams',
        weatherPreference: ['clear', 'clouds'],
        behavior: 'Basking in sun, slow deliberate swimming, ancient patience',
        meditativeQuality: 'Solar warmth and unhurried wisdom'
      },

      // FISH - Common freshwater species
      {
        name: 'Largemouth Bass',
        scientificName: 'Micropterus salmoides',
        type: 'fish',
        biomes: ['temperate', 'subtropical'],
        habitat: 'Lakes, ponds, and slow rivers',
        weatherPreference: ['clear', 'clouds'],
        behavior: 'Patient hunting, sudden strikes, underwater navigation',
        meditativeQuality: 'Fluid patience and underwater tranquility'
      }
    ];
  }

  getFallbackSpecies() {
    return {
      name: 'Natural World',
      scientificName: 'Terra vivens',
      type: 'universal',
      biomes: ['all'],
      habitat: 'Everywhere life exists',
      behavior: 'The interconnected web of all living things',
      meditativeQuality: 'Universal connection and awareness'
    };
  }

  getAllSpecies() {
    return this.speciesDatabase;
  }

  getSpeciesByType(type) {
    return this.speciesDatabase.filter(s => s.type === type);
  }

  /**
   * Fetch species from real-time API sources
   * @param {number} latitude
   * @param {number} longitude
   * @param {Object} options
   * @returns {Promise<Array>} Aggregated species list
   */
  async fetchLocalSpecies(latitude, longitude, options = {}) {
    const { weather, preferences } = options;

    try {
      // Fetch from all sources in parallel
      const [iNatObs, gbifObs, ebirdObs] = await Promise.allSettled([
        this.inaturalist.cascadingRadiusSearch(latitude, longitude),
        this.gbif.getOccurrences(latitude, longitude),
        this.ebird.getRecentObservations(latitude, longitude)
      ]);

      const allSpecies = [];

      // Process iNaturalist observations
      if (iNatObs.status === 'fulfilled' && iNatObs.value.length > 0) {
        logger.debug('iNaturalist species found', { count: iNatObs.value.length });
        allSpecies.push(...this.normalizeSpecies(iNatObs.value, 'iNaturalist'));
      }

      // Process GBIF occurrences
      if (gbifObs.status === 'fulfilled' && gbifObs.value.length > 0) {
        logger.debug('GBIF species found', { count: gbifObs.value.length });
        const uniqueGBIF = this.gbif.getUniqueSpecies(gbifObs.value);
        allSpecies.push(...this.normalizeSpecies(uniqueGBIF, 'GBIF'));
      }

      // Process eBird observations
      if (ebirdObs.status === 'fulfilled' && ebirdObs.value.length > 0) {
        logger.debug('eBird species found', { count: ebirdObs.value.length });
        const uniqueeBird = this.ebird.getUniqueSpecies(ebirdObs.value);
        allSpecies.push(...this.normalizeSpecies(uniqueeBird, 'eBird'));
      }

      // Deduplicate and rank species
      const rankedSpecies = this.rankSpecies(allSpecies, { weather, preferences });

      logger.info('Local species aggregated', {
        total: allSpecies.length,
        unique: rankedSpecies.length,
        sources: {
          iNaturalist: iNatObs.status === 'fulfilled' ? iNatObs.value.length : 0,
          GBIF: gbifObs.status === 'fulfilled' ? gbifObs.value.length : 0,
          eBird: ebirdObs.status === 'fulfilled' ? ebirdObs.value.length : 0
        }
      });

      return rankedSpecies;

    } catch (error) {
      logger.error('Failed to fetch local species', { error: error.message });
      return [];
    }
  }

  /**
   * Normalize species data from different sources into consistent format
   * @param {Array} species - Species from API
   * @param {string} source - Source name
   * @returns {Array} Normalized species
   */
  normalizeSpecies(species, source) {
    return species.map(sp => ({
      name: sp.name || sp.commonName || sp.scientificName,
      scientificName: sp.scientificName,
      commonName: sp.commonName || sp.name,
      type: this.inferSpeciesType(sp),
      habitat: sp.habitat || sp.habitatInfo || 'Various habitats',
      source: source,
      observedAt: sp.observedAt,
      location: sp.location,
      photoUrl: sp.photoUrl,
      observedBy: sp.observedBy,
      occurrenceCount: sp.occurrenceCount || sp.observationCount || 1,
      description: sp.description || sp.behavioralNotes || '',
      rawData: sp
    }));
  }

  /**
   * Infer species type from taxonomic information
   * @param {Object} species - Species object
   * @returns {string} Type (bird, mammal, insect, etc.)
   */
  inferSpeciesType(species) {
    // Check class/iconicTaxonName for type
    const taxonomic = (species.class || species.iconicTaxonName || species.category || '').toLowerCase();

    if (taxonomic.includes('aves') || taxonomic === 'bird' || species.speciesCode) {
      return 'bird';
    }
    if (taxonomic.includes('mammalia')) {
      return 'mammal';
    }
    if (taxonomic.includes('insecta')) {
      return 'insect';
    }
    if (taxonomic.includes('amphibia')) {
      return 'amphibian';
    }
    if (taxonomic.includes('reptilia')) {
      return 'reptile';
    }

    // Default to bird if uncertain (most observations are birds)
    return 'bird';
  }

  /**
   * Rank and score species based on context
   * @param {Array} species - All species
   * @param {Object} context - Weather, preferences, etc.
   * @returns {Array} Ranked species (top candidates first)
   */
  rankSpecies(species, context = {}) {
    const { weather, preferences } = context;

    // Deduplicate by scientific name
    const speciesMap = new Map();

    species.forEach(sp => {
      const key = sp.scientificName || sp.name;
      if (!speciesMap.has(key)) {
        speciesMap.set(key, { ...sp, score: 0 });
      } else {
        // Merge data, prefer sources with more info
        const existing = speciesMap.get(key);
        if (!existing.photoUrl && sp.photoUrl) {
          existing.photoUrl = sp.photoUrl;
        }
        if (!existing.description && sp.description) {
          existing.description = sp.description;
        }
        existing.occurrenceCount += sp.occurrenceCount || 1;
      }
    });

    // Score each species
    const scored = Array.from(speciesMap.values()).map(sp => {
      let score = sp.occurrenceCount || 1;

      // Boost if has photo
      if (sp.photoUrl) score += 5;

      // Boost if has description
      if (sp.description && sp.description.length > 50) score += 3;

      // Boost if recently observed
      if (sp.observedAt) {
        const hoursAgo = (Date.now() - new Date(sp.observedAt)) / (1000 * 60 * 60);
        if (hoursAgo < 24) score += 10;
        else if (hoursAgo < 72) score += 5;
        else if (hoursAgo < 168) score += 2;
      }

      // Boost if type matches preference
      if (preferences?.speciesType && sp.type === preferences.speciesType) {
        score += 15;
      }

      sp.score = score;
      return sp;
    });

    // Sort by score descending
    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * Select species from real-time data
   * @param {Array} rankedSpecies - Species ranked by relevance
   * @param {Object} weather
   * @param {Object} preferences
   * @returns {Object} Selected species
   */
  selectFromRealTimeData(rankedSpecies, weather, preferences) {
    // Filter by species type if specified
    let filteredSpecies = rankedSpecies;
    if (preferences && preferences.speciesType) {
      filteredSpecies = rankedSpecies.filter(species => 
        species.type && species.type.toLowerCase() === preferences.speciesType.toLowerCase()
      );
      // If no matches found for the preferred type, use all species
      if (filteredSpecies.length === 0) {
        logger.warn('No species found for preferred type, using all available', {
          preferredType: preferences.speciesType,
          availableTypes: [...new Set(rankedSpecies.map(s => s.type).filter(Boolean))]
        });
        filteredSpecies = rankedSpecies;
      }
    }
    
    // Get top 3 candidates from filtered list
    const topCandidates = filteredSpecies.slice(0, 3);

    if (topCandidates.length === 0) {
      return this.getFallbackSpecies();
    }

    // Weighted random selection from top candidates
    const weights = topCandidates.map((sp, index) => {
      // Exponential decay: first candidate gets most weight
      return Math.pow(2, topCandidates.length - index);
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < topCandidates.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return topCandidates[i];
      }
    }

    return topCandidates[0];
  }

  getStats() {
    return {
      totalSpecies: this.speciesDatabase.length,
      types: [...new Set(this.speciesDatabase.map(s => s.type))],
      useRealTimeData: this.useRealTimeData,
      apiServices: {
        inaturalist: this.inaturalist.getStats(),
        gbif: this.gbif.getStats(),
        ebird: this.ebird.getStats()
      },
      recentlyUsedCount: this.recentlyUsedSpecies.size,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Mark a species as recently used (2-day cooldown)
   */
  markSpeciesAsUsed(speciesName) {
    this.recentlyUsedSpecies.set(speciesName, Date.now());
    logger.debug(`Species marked as used: ${speciesName}`, {
      cooldownUntil: new Date(Date.now() + this.cooldownPeriod).toISOString()
    });
  }

  /**
   * Filter out species that were used within the last 2 days
   */
  filterRecentlyUsed(species) {
    const now = Date.now();
    return species.filter(s => {
      const lastUsed = this.recentlyUsedSpecies.get(s.name);
      if (!lastUsed) return true;

      const elapsed = now - lastUsed;
      return elapsed > this.cooldownPeriod;
    });
  }

  /**
   * Clear cooldowns older than 2 days
   */
  clearOldCooldowns() {
    const now = Date.now();
    for (const [speciesName, timestamp] of this.recentlyUsedSpecies.entries()) {
      if (now - timestamp > this.cooldownPeriod) {
        this.recentlyUsedSpecies.delete(speciesName);
        logger.debug(`Cleared cooldown for: ${speciesName}`);
      }
    }
  }
}

module.exports = SpeciesService;