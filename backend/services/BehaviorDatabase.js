// services/BehaviorDatabase.js
const logger = require('../utils/logger');

/**
 * BehaviorDatabase - Biologically accurate animal behaviors for meditation generation
 *
 * Stores vetted, realistic behaviors for species commonly encountered in nature.
 * Each behavior includes context for time of day, weather, and lunar phase.
 */
class BehaviorDatabase {
  constructor() {
    this.behaviors = this.initializeBehaviors();
  }

  /**
   * Initialize database of biologically accurate behaviors
   * @returns {Object} Behavior database organized by taxonomic group
   */
  initializeBehaviors() {
    return {
      // BIRDS - Aves
      bird: {
        common: [
          {
            behavior: 'foraging for insects',
            timeOfDay: ['morning', 'afternoon'],
            weather: ['clear', 'clouds'],
            season: ['spring', 'summer', 'fall'],
            description: 'Methodically searching through leaf litter and bark crevices',
            source: 'Cornell Lab of Ornithology'
          },
          {
            behavior: 'singing territorial song',
            timeOfDay: ['dawn', 'morning'],
            weather: ['clear', 'clouds', 'drizzle'],
            season: ['spring', 'summer'],
            description: 'Proclaiming territory from an elevated perch',
            source: 'Cornell Lab of Ornithology'
          },
          {
            behavior: 'preening feathers',
            timeOfDay: ['morning', 'afternoon', 'evening'],
            weather: ['clear', 'clouds'],
            season: ['all'],
            description: 'Carefully maintaining feather condition and waterproofing',
            source: 'General ornithology'
          },
          {
            behavior: 'bathing in shallow water',
            timeOfDay: ['morning', 'afternoon'],
            weather: ['clear', 'clouds'],
            season: ['spring', 'summer', 'fall'],
            description: 'Splashing and ruffling feathers in water',
            source: 'General ornithology'
          },
          {
            behavior: 'hunting from perch',
            timeOfDay: ['morning', 'afternoon', 'evening', 'dusk'],
            weather: ['clear', 'clouds'],
            season: ['all'],
            description: 'Watching intently from a strategic vantage point',
            source: 'Raptor behavior studies'
          }
        ],
        nocturnal: [
          {
            behavior: 'hunting in silent flight',
            timeOfDay: ['dusk', 'night', 'dawn'],
            weather: ['clear', 'clouds'],
            season: ['all'],
            lunarPreference: ['waning', 'new'],
            description: 'Gliding soundlessly over open ground, listening',
            source: 'Owl behavior research'
          },
          {
            behavior: 'calling to mate',
            timeOfDay: ['dusk', 'night'],
            weather: ['clear', 'clouds'],
            season: ['winter', 'spring'],
            description: 'Deep hooting calls echoing through the darkness',
            source: 'Owl behavior research'
          }
        ]
      },

      // MAMMALS - Mammalia
      mammal: {
        common: [
          {
            behavior: 'foraging for food',
            timeOfDay: ['dawn', 'morning', 'dusk', 'evening'],
            weather: ['clear', 'clouds', 'drizzle'],
            season: ['all'],
            description: 'Moving methodically through the landscape, nose to ground',
            source: 'Mammalian behavior studies'
          },
          {
            behavior: 'scent marking territory',
            timeOfDay: ['dawn', 'morning', 'dusk'],
            weather: ['clear', 'clouds'],
            season: ['all'],
            description: 'Deliberate marking of boundaries and pathways',
            source: 'Mammalian territorial behavior'
          },
          {
            behavior: 'grooming',
            timeOfDay: ['morning', 'afternoon', 'evening'],
            weather: ['clear', 'clouds'],
            season: ['all'],
            description: 'Careful self-maintenance, cleaning and inspecting',
            source: 'General mammalogy'
          },
          {
            behavior: 'caching food',
            timeOfDay: ['morning', 'afternoon'],
            weather: ['clear', 'clouds'],
            season: ['fall', 'winter'],
            description: 'Burying or hiding food stores for later retrieval',
            source: 'Squirrel and corvid behavior studies'
          }
        ],
        nocturnal: [
          {
            behavior: 'emerging from den',
            timeOfDay: ['dusk', 'evening'],
            weather: ['clear', 'clouds'],
            season: ['all'],
            lunarPreference: ['waning', 'new'],
            description: 'Cautiously testing the air before leaving shelter',
            source: 'Nocturnal mammal behavior'
          },
          {
            behavior: 'hunting in moonlight',
            timeOfDay: ['night'],
            weather: ['clear'],
            season: ['all'],
            lunarPreference: ['full', 'waxing gibbous'],
            description: 'Using lunar illumination to navigate and hunt',
            source: 'Predator behavior research'
          }
        ]
      },

      // INSECTS - Insecta
      insect: {
        common: [
          {
            behavior: 'nectaring on flowers',
            timeOfDay: ['morning', 'afternoon'],
            weather: ['clear'],
            season: ['spring', 'summer', 'fall'],
            description: 'Moving from bloom to bloom with delicate precision',
            source: 'Pollinator ecology'
          },
          {
            behavior: 'basking in sunlight',
            timeOfDay: ['morning', 'afternoon'],
            weather: ['clear'],
            season: ['spring', 'summer', 'fall'],
            description: 'Wings spread wide to absorb warmth',
            source: 'Butterfly thermoregulation'
          },
          {
            behavior: 'migrating south',
            timeOfDay: ['morning', 'afternoon'],
            weather: ['clear', 'clouds'],
            season: ['fall'],
            description: 'Riding thermal currents on an ancient journey',
            source: 'Monarch butterfly migration studies'
          }
        ]
      },

      // AMPHIBIANS - Amphibia
      amphibian: {
        common: [
          {
            behavior: 'calling for mate',
            timeOfDay: ['dusk', 'night', 'dawn'],
            weather: ['drizzle', 'rain', 'clouds'],
            season: ['spring', 'summer'],
            lunarPreference: ['all'],
            description: 'Rhythmic vocalizations from hidden perches',
            source: 'Anuran behavior studies'
          },
          {
            behavior: 'hunting from ambush',
            timeOfDay: ['dusk', 'night', 'dawn'],
            weather: ['drizzle', 'rain', 'clouds', 'clear'],
            season: ['spring', 'summer', 'fall'],
            description: 'Perfectly still, waiting for movement',
            source: 'Amphibian predation studies'
          },
          {
            behavior: 'absorbing moisture',
            timeOfDay: ['night', 'dawn', 'morning'],
            weather: ['drizzle', 'rain', 'fog'],
            season: ['all'],
            description: 'Skin drinking from damp surfaces',
            source: 'Amphibian physiology'
          }
        ]
      },

      // REPTILES - Reptilia
      reptile: {
        common: [
          {
            behavior: 'basking on rocks',
            timeOfDay: ['morning', 'afternoon'],
            weather: ['clear'],
            season: ['spring', 'summer', 'fall'],
            description: 'Absorbing solar heat, utterly motionless',
            source: 'Reptilian thermoregulation'
          },
          {
            behavior: 'hunting from cover',
            timeOfDay: ['morning', 'afternoon', 'dusk'],
            weather: ['clear', 'clouds'],
            season: ['spring', 'summer', 'fall'],
            description: 'Patient observation from concealment',
            source: 'Snake predation behavior'
          }
        ]
      },

      // FISH - Pisces
      fish: {
        common: [
          {
            behavior: 'feeding near surface',
            timeOfDay: ['dawn', 'morning', 'dusk'],
            weather: ['clear', 'clouds'],
            season: ['spring', 'summer', 'fall'],
            description: 'Rising to take insects from the water surface',
            source: 'Freshwater fish behavior'
          },
          {
            behavior: 'schooling in deeper water',
            timeOfDay: ['morning', 'afternoon'],
            weather: ['clear', 'clouds', 'rain'],
            season: ['all'],
            description: 'Moving in synchronized groups through cool depths',
            source: 'Fish schooling behavior'
          },
          {
            behavior: 'resting in vegetation',
            timeOfDay: ['afternoon', 'evening', 'night'],
            weather: ['all'],
            season: ['all'],
            description: 'Hovering motionless among aquatic plants',
            source: 'Fish habitat studies'
          },
          {
            behavior: 'spawning in shallows',
            timeOfDay: ['dawn', 'morning'],
            weather: ['clear', 'clouds'],
            season: ['spring'],
            description: 'Creating nests and defending territory in shallow water',
            source: 'Fish reproductive behavior'
          }
        ]
      }
    };
  }

  /**
   * Get appropriate behaviors for a species type based on context
   * @param {string} speciesType - Type of species (bird, mammal, insect, etc.)
   * @param {Object} context - Environmental context
   * @returns {Array} Matching behaviors
   */
  getBehaviorsForSpecies(speciesType, context = {}) {
    const { timeOfDay, weather, season, lunar } = context;

    try {
      const typeKey = speciesType.toLowerCase();
      const speciesBehaviors = this.behaviors[typeKey];

      if (!speciesBehaviors) {
        logger.warn(`No behaviors found for species type: ${speciesType}`);
        return [];
      }

      // Combine all behavior categories for this species type
      let allBehaviors = [];
      Object.values(speciesBehaviors).forEach(categoryBehaviors => {
        allBehaviors = allBehaviors.concat(categoryBehaviors);
      });

      // Filter behaviors based on context
      const matchingBehaviors = allBehaviors.filter(behavior => {
        let matches = true;

        // Filter by time of day
        if (timeOfDay && behavior.timeOfDay) {
          matches = matches && behavior.timeOfDay.includes(timeOfDay);
        }

        // Filter by weather
        if (weather && behavior.weather) {
          matches = matches && behavior.weather.includes(weather);
        }

        // Filter by season
        if (season && behavior.season && !behavior.season.includes('all')) {
          matches = matches && behavior.season.includes(season);
        }

        // Filter by lunar preference (if specified)
        if (lunar && behavior.lunarPreference) {
          matches = matches && behavior.lunarPreference.includes(lunar.direction);
        }

        return matches;
      });

      logger.debug('Behaviors filtered', {
        speciesType,
        total: allBehaviors.length,
        matching: matchingBehaviors.length,
        context
      });

      return matchingBehaviors;

    } catch (error) {
      logger.error('Failed to get behaviors for species', {
        error: error.message,
        speciesType
      });
      return [];
    }
  }

  /**
   * Select a single random behavior from matching behaviors
   * @param {string} speciesType - Type of species
   * @param {Object} context - Environmental context
   * @returns {Object|null} Selected behavior or null
   */
  selectBehavior(speciesType, context = {}) {
    const behaviors = this.getBehaviorsForSpecies(speciesType, context);

    if (behaviors.length === 0) {
      // Fallback: get all behaviors without filtering
      const allBehaviors = this.getBehaviorsForSpecies(speciesType);
      if (allBehaviors.length > 0) {
        logger.warn('Using unfiltered behavior fallback', { speciesType });
        return allBehaviors[Math.floor(Math.random() * allBehaviors.length)];
      }
      return null;
    }

    // Random selection from matching behaviors
    return behaviors[Math.floor(Math.random() * behaviors.length)];
  }

  /**
   * Get all available species types
   * @returns {Array} List of species types
   */
  getAvailableSpeciesTypes() {
    return Object.keys(this.behaviors);
  }

  /**
   * Add custom behavior to database
   * @param {string} speciesType - Type of species
   * @param {string} category - Behavior category (common, nocturnal, etc.)
   * @param {Object} behavior - Behavior object
   */
  addBehavior(speciesType, category, behavior) {
    const typeKey = speciesType.toLowerCase();

    if (!this.behaviors[typeKey]) {
      this.behaviors[typeKey] = {};
    }

    if (!this.behaviors[typeKey][category]) {
      this.behaviors[typeKey][category] = [];
    }

    this.behaviors[typeKey][category].push(behavior);

    logger.info('Custom behavior added', { speciesType, category, behavior: behavior.behavior });
  }

  /**
   * Get statistics about behavior database
   * @returns {Object} Database stats
   */
  getStats() {
    const stats = {
      speciesTypes: Object.keys(this.behaviors).length,
      totalBehaviors: 0,
      byType: {}
    };

    Object.entries(this.behaviors).forEach(([type, categories]) => {
      let typeCount = 0;
      Object.values(categories).forEach(behaviors => {
        typeCount += behaviors.length;
      });
      stats.byType[type] = typeCount;
      stats.totalBehaviors += typeCount;
    });

    return stats;
  }
}

module.exports = BehaviorDatabase;
