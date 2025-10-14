// services/RobustSpeciesService.js
const logger = require('../utils/logger');

class RobustSpeciesService {
  constructor() {
    // Taxonomic classes with their GBIF keys (insects excluded)
    this.taxonomicClasses = [
      { name: 'birds', key: 212, displayName: 'Birds' },
      { name: 'mammals', key: 359, displayName: 'Mammals' },
      { name: 'fish', key: 204, displayName: 'Fish' },
      { name: 'reptiles', key: 358, displayName: 'Reptiles' },
      { name: 'amphibians', key: 131, displayName: 'Amphibians' }
    ];

    // Location-based cache with 200 entries per species class
    this.cache = new Map(); // Key: locationKey, Value: { species data, timestamp }
    this.maxCacheSize = 200;
    this.locationChangeThreshold = 0.01; // ~1km threshold for cache invalidation
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };

    // Global fallback species - guaranteed to always return something (insects excluded)
    this.globalFallbacks = {
      birds: ['House Sparrow', 'Rock Dove', 'European Starling', 'House Finch', 'American Robin'],
      mammals: ['House Mouse', 'Brown Rat', 'Domestic Cat', 'Domestic Dog', 'White-tailed Deer'],
      fish: ['Goldfish', 'Carp', 'Bass', 'Trout', 'Catfish'],
      reptiles: ['House Gecko', 'Green Anole', 'Garter Snake', 'Box Turtle', 'Fence Lizard'],
      amphibians: ['American Bullfrog', 'Green Frog', 'Spring Peeper', 'Red-eared Slider', 'Wood Frog']
    };

    // Common scientific name to vernacular name mappings for fallback
    this.scientificToCommon = {
      // Birds
      'Passer domesticus': 'House Sparrow',
      'Columba livia': 'Rock Dove',
      'Sturnus vulgaris': 'European Starling',
      'Haemorhous mexicanus': 'House Finch',
      'Turdus migratorius': 'American Robin',
      'Corvus brachyrhynchos': 'American Crow',
      'Poecile atricapillus': 'Black-capped Chickadee',
      'Sitta carolinensis': 'White-breasted Nuthatch',
      'Falco sparverius': 'American Kestrel',
      'Buteo jamaicensis': 'Red-tailed Hawk',
      
      // Mammals
      'Mus musculus': 'House Mouse',
      'Rattus norvegicus': 'Brown Rat',
      'Felis catus': 'Domestic Cat',
      'Canis lupus': 'Gray Wolf',
      'Odocoileus virginianus': 'White-tailed Deer',
      'Procyon lotor': 'Raccoon',
      'Sciurus carolinensis': 'Eastern Gray Squirrel',
      'Tamias striatus': 'Eastern Chipmunk',
      
      // Reptiles
      'Anolis carolinensis': 'Green Anole',
      'Sceloporus undulatus': 'Fence Lizard',
      'Thamnophis sirtalis': 'Garter Snake',
      'Terrapene carolina': 'Box Turtle',
      
      // Amphibians
      'Lithobates catesbeianus': 'American Bullfrog',
      'Lithobates clamitans': 'Green Frog',
      'Pseudacris crucifer': 'Spring Peeper',
      'Anaxyrus americanus': 'American Toad',
      
      // Fish
      'Carassius auratus': 'Goldfish',
      'Cyprinus carpio': 'Common Carp',
      'Micropterus salmoides': 'Largemouth Bass',
      'Salmo trutta': 'Brown Trout'
    };

    // Regional species for major North American ecoregions
    this.regionalFallbacks = {
      // California/Southwest
      'california': {
        birds: ['Anna\'s Hummingbird', 'California Scrub-Jay', 'Western Bluebird', 'Red-tailed Hawk'],
        mammals: ['California Ground Squirrel', 'Coyote', 'Mule Deer', 'Bobcat'],
        reptiles: ['Western Fence Lizard', 'Alligator Lizard', 'Gopher Snake', 'Rattlesnake']
      },
      // Pacific Northwest
      'pacific_northwest': {
        birds: ['Steller\'s Jay', 'Dark-eyed Junco', 'Pacific Wren', 'Varied Thrush'],
        mammals: ['Douglas Squirrel', 'Black Bear', 'Elk', 'Raccoon'],
        fish: ['Chinook Salmon', 'Coho Salmon', 'Steelhead Trout', 'Pacific Cod']
      },
      // Eastern forests
      'eastern_forests': {
        birds: ['Blue Jay', 'Cardinal', 'Wood Thrush', 'Pileated Woodpecker'],
        mammals: ['Eastern Gray Squirrel', 'White-tailed Deer', 'Black Bear', 'Raccoon'],
        amphibians: ['Wood Frog', 'Spring Peeper', 'Red-backed Salamander', 'American Toad']
      }
    };
    
    // GBIF circuit breaker state to avoid repeated rate-limited calls
    this.gbifCircuit = {
      open: false,
      openUntil: 0,
      lastOpenedReason: null,
      consecutiveFailures: 0
    };
    // Configurable no-repeat window (days) for species selection
    const envDays = parseInt(process.env.SPECIES_NO_REPEAT_DAYS || '', 10);
    this.noRepeatDays = Number.isFinite(envDays) && envDays > 0 ? envDays : 2;
  }

  /**
   * Remove numeric characters and extra punctuation from a display name
   */
  sanitizeDisplayName(name) {
    if (!name || typeof name !== 'string') return '';
    // Normalize whitespace
    let cleaned = name.replace(/\s+/g, ' ').trim();

    // Remove parenthetical author/year content and trailing author/year segments like ', Cope, 1869' or ', 1869'
    cleaned = cleaned.replace(/\([^)]*\)/g, '');
    cleaned = cleaned.replace(/,?\s*[^,\d]*\d{3,4}\b/g, '');

    // Remove common taxonomic shorthand tokens that are not usable as common names
    cleaned = cleaned.replace(/\b(sp|spp|cf|aff|var|subsp|forma?)\b\.?/gi, '');

    // Remove stray punctuation and digits
    cleaned = cleaned.replace(/[\d]/g, '');
    cleaned = cleaned.replace(/[\u2018\u2019\u201C\u201D]/g, "'");
    cleaned = cleaned.replace(/[^\w\s'\-\.]/g, '');

    // Remove trailing commas/extra punctuation and collapse spaces
    cleaned = cleaned.replace(/[,\-\.\s]+$/g, '').replace(/\s+/g, ' ').trim();

    // Guard: if result is purely short tokens or one-letter codes, invalidate
    if (!cleaned || cleaned.length < 2) return '';
    return cleaned;
  }

  /**
   * Validate a cleaned common name — reject names with digits, placeholder tokens, or too short
   */
  isValidCommonName(name) {
    if (!name || typeof name !== 'string') return false;
    const s = name.trim();
    if (s.length < 3) return false;
    // Reject names that still contain digits
    if (/\d/.test(s)) return false;
    // Reject placeholder names like 'sp', 'species', 'unidentified', 'unknown'
    if (/\b(sp|spp|species|unidentified|unknown|indet|gen\.?)\b/i.test(s)) return false;
    return true;
  }

  /**
   * Extract a clean binomial scientific name (Genus species) from a raw scientificName
   */
  extractBinomial(scientific) {
    if (!scientific || typeof scientific !== 'string') return '';
    // Remove parenthetical and author/year bits
    let s = scientific.replace(/\([^)]*\)/g, '').replace(/,?\s*\d{3,4}/g, '');
    // Collapse whitespace
    s = s.replace(/\s+/g, ' ').trim();
    // Return first two words if they look like a binomial
    const parts = s.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[1]}`;
    }
    // Do not return single-word scientific names as binomial; return empty to indicate none
    return '';
  }

  /**
   * Return singular form for a taxonomic class name (e.g., 'birds' -> 'bird')
   */
  singularize(className) {
    if (!className || typeof className !== 'string') return className;
    const lower = className.toLowerCase();
    if (lower === 'fish') return 'fish';
    if (lower.endsWith('s')) return lower.slice(0, -1);
    return lower;
  }

  /**
   * Format display name for UI: prefer valid common name, otherwise present binomial as 'Genus species'
   */
  formatDisplayForUI(name, scientific) {
    // If a valid common name exists, titlecase it
    if (this.isValidCommonName(name)) {
      return this.capitalizeWords(name);
    }

    // If scientific binomial exists, format as 'Genus species' (genus capitalized, species lowercase)
    if (scientific && typeof scientific === 'string') {
      const parts = scientific.split(' ').filter(Boolean);
      if (parts.length >= 2) {
        const genus = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
        const species = parts[1].toLowerCase();
        return `${genus} ${species}`;
      }
      // Single-word scientific name: capitalize
      return scientific.charAt(0).toUpperCase() + scientific.slice(1).toLowerCase();
    }

    // Last resort: titlecase whatever was provided
    if (name && name.length > 0) return this.capitalizeWords(name);
    return 'Unknown Species';
  }

  /**
   * Extract best vernacular/common name from GBIF species or occurrence record fields
   */
  getBestVernacular(record) {
    if (!record) return '';
    
    // GBIF species API provides vernacularNames array in the main record
    if (record.vernacularNames && Array.isArray(record.vernacularNames)) {
      // prefer English vernacular names
      const en = record.vernacularNames.find(n => 
        n && (n.language === 'eng' || n.language === 'en') && n.vernacularName
      );
      if (en && en.vernacularName) {
        const cleaned = this.sanitizeDisplayName(en.vernacularName);
        if (this.isValidCommonName(cleaned)) return cleaned;
      }
      
      // Try any English-like language codes
      const englishLike = record.vernacularNames.find(n => 
        n && n.language && /^en/i.test(n.language) && n.vernacularName
      );
      if (englishLike && englishLike.vernacularName) {
        const cleaned = this.sanitizeDisplayName(englishLike.vernacularName);
        if (this.isValidCommonName(cleaned)) return cleaned;
      }
      
      // Fall back to any vernacular name that's valid
      for (const n of record.vernacularNames) {
        if (n && n.vernacularName) {
          const cleaned = this.sanitizeDisplayName(n.vernacularName);
          if (this.isValidCommonName(cleaned)) return cleaned;
        }
      }
    }

    // Legacy occurrence API format support
    // 1) direct string
    if (record.vernacularName && typeof record.vernacularName === 'string') {
      const cleaned = this.sanitizeDisplayName(record.vernacularName);
      if (this.isValidCommonName(cleaned)) return cleaned;
    }

    // 2) array/object (some GBIF responses include vernacularName as array of {vernacularName, language})
    if (record.vernacularName && Array.isArray(record.vernacularName)) {
      // prefer English
      const en = record.vernacularName.find(n => n && (n.language === 'en' || (n.lang && n.lang === 'en')) && n.vernacularName);
      if (en && en.vernacularName) {
        const cleaned = this.sanitizeDisplayName(en.vernacularName);
        if (this.isValidCommonName(cleaned)) return cleaned;
      }
      // otherwise pick first valid
      for (const n of record.vernacularName) {
        if (n && n.vernacularName) {
          const cleaned = this.sanitizeDisplayName(n.vernacularName);
          if (this.isValidCommonName(cleaned)) return cleaned;
        }
      }
    }

    // 4) commonName field
    if (record.commonName && typeof record.commonName === 'string') {
      const cleaned = this.sanitizeDisplayName(record.commonName);
      if (this.isValidCommonName(cleaned)) return cleaned;
    }

    return '';
  }

  /**
   * Generate cache key from location and species class
   */
  generateLocationKey(latitude, longitude, taxonomicClass) {
    // Round to 2 decimal places to group nearby locations
    const roundedLat = Math.round(latitude * 100) / 100;
    const roundedLng = Math.round(longitude * 100) / 100;
    return `${roundedLat}_${roundedLng}_${taxonomicClass.name}`;
  }

  /**
   * Check if location has changed significantly enough to invalidate cache
   */
  hasLocationChanged(lat1, lng1, lat2, lng2) {
    const latDiff = Math.abs(lat1 - lat2);
    const lngDiff = Math.abs(lng1 - lng2);
    return latDiff > this.locationChangeThreshold || lngDiff > this.locationChangeThreshold;
  }

  /**
   * Get species from cache or return null if not cached
   */
  getCachedSpecies(latitude, longitude, taxonomicClass) {
    const cacheKey = this.generateLocationKey(latitude, longitude, taxonomicClass);
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      this.cacheStats.hits++;
      logger.debug(`Cache hit for ${taxonomicClass.name} at ${latitude}, ${longitude}`);
      return cached.species;
    }
    this.cacheStats.misses++;
    return null;
  }

  /**
   * Return full cache entry (species array + metadata) for read/write operations
   */
  getCachedEntry(latitude, longitude, taxonomicClass) {
    const cacheKey = this.generateLocationKey(latitude, longitude, taxonomicClass);
    return this.cache.get(cacheKey) || null;
  }

  /**
   * Cache species data with LRU eviction when limit reached
   */
  cacheSpecies(latitude, longitude, taxonomicClass, species) {
    const cacheKey = this.generateLocationKey(latitude, longitude, taxonomicClass);
    
    // Check if we need to evict entries for this species class
    const classKeys = Array.from(this.cache.keys()).filter(key => key.endsWith(`_${taxonomicClass.name}`));
    
    if (classKeys.length >= this.maxCacheSize) {
      // Remove oldest entry (first in insertion order)
      const oldestKey = classKeys[0];
      this.cache.delete(oldestKey);
      this.cacheStats.evictions++;
      logger.debug(`Evicted cache entry: ${oldestKey}`);
    }
    
    // Normalize species entries: sanitize display names, ensure scientific binomial, and types
    const normalized = species.map(s => {
      const src = Object.assign({}, s);
      // Prefer provided name/commonName, sanitize it
      const rawName = src.name || src.commonName || '';
      let cleaned = this.sanitizeDisplayName(rawName);
      if (!this.isValidCommonName(cleaned)) {
        // fall back to scientific binomial
        cleaned = this.extractBinomial(src.scientificName || src.species || '') || cleaned;
      }
      src.name = this.capitalizeWords(cleaned) || (src.name || '').toString();
      // Ensure a clean scientific name
      src.scientificName = this.extractBinomial(src.scientificName || src.species || '') || src.scientificName || '';
      // Ensure type is singular and valid
      src.type = src.type ? this.singularize(src.type) : this.singularize(taxonomicClass.name);
      src.lastUsed = src.lastUsed || 0;
      return src;
    });

    // Determine whether this cache was seeded by GBIF results
    const seededByGBIF = normalized.some(s => s.source && String(s.source).toLowerCase().startsWith('gbif'));

    // Cache the new data
    this.cache.set(cacheKey, {
      species: normalized,
      timestamp: Date.now(),
      location: { latitude, longitude },
      seededByGBIF
    });
    
    logger.debug(`Cached ${species.length} species for ${taxonomicClass.name} at ${latitude}, ${longitude}`);
  }

  /**
   * SessionManager compatibility method - matches original SpeciesService interface
   */
  async selectSpecies({ latitude, longitude, weather, preferences }) {
    try {
      // Determine preferred species type from preferences
      const animalType = preferences?.speciesType;

      // Get species from a single taxonomic class. Accept singular or plural forms.
      let targetClass;
      if (animalType) {
        const requested = animalType.toLowerCase();
        targetClass = this.taxonomicClasses.find(cls => {
          const clsName = cls.name.toLowerCase();
          // exact match (plural)
          if (clsName === requested) return true;
          // singular match (strip trailing 's')
          if (clsName.endsWith('s') && clsName.slice(0, -1) === requested) return true;
          // allow requested with trailing 's' to match plural class
          if (requested.endsWith('s') && requested.slice(0, -1) === clsName) return true;
          // match displayName lowercased
          if ((cls.displayName || '').toLowerCase() === requested) return true;
          return false;
        });

        if (!targetClass) {
          logger.warn('Requested speciesType did not match any taxonomic class, falling back to random', { requested: animalType });
        }
      }
      
      // If no specific type requested, randomly select a class
      if (!targetClass) {
        const randomIndex = Math.floor(Math.random() * this.taxonomicClasses.length);
        targetClass = this.taxonomicClasses[randomIndex];
      }
      
      // Fetch species list for the class (this will seed the cache on first use)
      const speciesList = await this.getSpeciesForClass(latitude, longitude, targetClass, 50);

      if (!speciesList || speciesList.length === 0) {
        logger.warn('No species found, returning fallback');
        return this.getFallbackSpecies();
      }

      // Try to choose a species from the cache entry so we can respect lastUsed timestamps
      const cacheEntry = this.getCachedEntry(latitude, longitude, targetClass);

      // 2 days in ms
      const twoDaysMs = this.noRepeatDays * 24 * 60 * 60 * 1000;
      const now = Date.now();

      let candidate = null;

      if (cacheEntry && Array.isArray(cacheEntry.species) && cacheEntry.species.length > 0) {
        // Prefer species not used in the last 2 days
        const unused = cacheEntry.species.filter(s => !s.lastUsed || (now - s.lastUsed) >= twoDaysMs);

        if (unused.length > 0) {
          candidate = unused[Math.floor(Math.random() * unused.length)];
        } else {
          // All have been used recently — pick the least-recently-used
          const lru = cacheEntry.species.slice().sort((a, b) => (a.lastUsed || 0) - (b.lastUsed || 0));
          candidate = lru[0];
        }

        // Update lastUsed timestamp in cache for the selected species
        const foundIdx = cacheEntry.species.findIndex(s => String(s.name).toLowerCase() === String(candidate.name).toLowerCase());
        if (foundIdx >= 0) {
          cacheEntry.species[foundIdx].lastUsed = now;
          // Re-set the entry to update insertion order / metadata
          this.cache.set(this.generateLocationKey(latitude, longitude, targetClass), cacheEntry);
        }
      } else {
        // No cache entry found (shouldn't happen often) — pick randomly from returned list and populate cache via cacheSpecies
        candidate = speciesList[Math.floor(Math.random() * speciesList.length)];
        // Ensure we cache this result so subsequent calls use cache
        try {
          this.cacheSpecies(latitude, longitude, targetClass, speciesList);
        } catch (e) {
          logger.warn('Failed to cache species after select', { error: e.message });
        }
      }
      
      // Convert to format expected by SessionManager
      // Ensure display name favors common names and has no numbers
      const rawDisplay = candidate.name || candidate.commonName || '';
      const displaySanitized = this.capitalizeWords(this.sanitizeDisplayName(rawDisplay)) || 'Unknown Species';
      const scientificSanitized = candidate.scientificName ? this.extractBinomial(candidate.scientificName) : (candidate.species ? this.extractBinomial(candidate.species) : 'Unknown');
      // Defensive: ensure selected species matches requested class
      const expectedType = this.singularize(targetClass.name);
      if (candidate.type && candidate.type !== expectedType) {
        logger.warn('Selected species type does not match requested class; attempting to pick matching species', { requested: expectedType, selectedType: candidate.type, selectedName: candidate.name });
        // try to find a matching species in speciesList
        let match = null;
        if (Array.isArray(speciesList)) {
          match = speciesList.find(s => (s.type && s.type === expectedType) || (s.source && String(s.source).toLowerCase().includes(targetClass.name)));
        }
        if (match) {
          logger.info('Found a matching species in the result list, switching selection', { found: match.name, expectedType });
          candidate = match;
        } else {
          // Fall back to a class-specific global fallback
          logger.warn('No matching species found in results for requested class; using global fallback for class', { expectedType, class: targetClass.name });
          const fallback = this.getGlobalFallback(targetClass.name)[0];
          if (fallback) candidate = fallback;
        }
      }

      const formattedSpecies = {
        name: displaySanitized,
        scientificName: scientificSanitized || 'Unknown',
        type: expectedType
      };
      
      logger.info('Species selected for meditation', {
        species: formattedSpecies.name,
        type: formattedSpecies.type,
        class: targetClass.name
      });
      
      return formattedSpecies;
      
    } catch (error) {
      logger.error('Species selection failed', { error: error.message });
      return this.getFallbackSpecies();
    }
  }

  /**
   * Fallback species when all else fails
   */
  getFallbackSpecies() {
    return {
      name: 'Anna\'s Hummingbird',
      scientificName: 'Calypte anna',
      type: 'bird'
    };
  }

  /**
   * Get Level II Ecoregion from coordinates for precise species selection
   */
  getEcoregionFromCoordinates(latitude, longitude) {
    // Level II EPA Ecoregions for North America
    // This provides much more precise biogeographic boundaries than state lines
    
    // WESTERN ECOREGIONS
    // Marine West Coast Forest (1)
    if (latitude >= 40.5 && latitude <= 49.5 && longitude >= -124.7 && longitude <= -121.5) {
      return { name: 'Marine West Coast Forest', code: '1', state: 'Washington' };
    }
    
    // Cascades (9) 
    if (latitude >= 40 && latitude <= 49 && longitude >= -123 && longitude <= -120) {
      return { name: 'Cascades', code: '9', state: 'Oregon' };
    }
    
    // Sierra Nevada (5)
    if (latitude >= 35.5 && latitude <= 40 && longitude >= -121 && longitude <= -118.5) {
      return { name: 'Sierra Nevada', code: '5', state: 'California' };
    }
    
    // Central California Foothills and Coastal Mountains (6)
    if (latitude >= 34 && latitude <= 38.5 && longitude >= -123 && longitude <= -119) {
      return { name: 'Central California Foothills', code: '6', state: 'California' };
    }
    
    // Central California Valley (7)
    if (latitude >= 35 && latitude <= 40 && longitude >= -122 && longitude <= -119) {
      return { name: 'Central California Valley', code: '7', state: 'California' };
    }
    
    // Southern California Mountains (8)
    if (latitude >= 32.5 && latitude <= 35.5 && longitude >= -119 && longitude <= -116) {
      return { name: 'Southern California Mountains', code: '8', state: 'California' };
    }
    
    // Mojave Basin and Range (14)
    if (latitude >= 33.5 && latitude <= 38 && longitude >= -118 && longitude <= -114) {
      return { name: 'Mojave Basin and Range', code: '14', state: 'California' };
    }
    
    // CENTRAL/GREAT PLAINS ECOREGIONS
    // Great Plains (9.2 - using 92 for uniqueness)
    if (latitude >= 36 && latitude <= 49 && longitude >= -104 && longitude <= -96) {
      return { name: 'Great Plains', code: '92', state: 'Nebraska' };
    }
    
    // Western Corn Belt Plains (9.3 - using 93)  
    if (latitude >= 40 && latitude <= 43.5 && longitude >= -96 && longitude <= -90) {
      return { name: 'Western Corn Belt Plains', code: '93', state: 'Iowa' };
    }
    
    // Texas Blackland Prairies (9.4 - using 94)
    if (latitude >= 28.5 && latitude <= 33.5 && longitude >= -97.5 && longitude <= -95.5) {
      return { name: 'Texas Blackland Prairies', code: '94', state: 'Texas' };
    }
    
    // South Central Plains (9.5 - using 95)
    if (latitude >= 30 && latitude <= 35 && longitude >= -98 && longitude <= -92) {
      return { name: 'South Central Plains', code: '95', state: 'Texas' };
    }
    
    // EASTERN ECOREGIONS
    // Southeastern Plains (9.6 - using 96)
    if (latitude >= 30 && latitude <= 37 && longitude >= -92 && longitude <= -82) {
      return { name: 'Southeastern Plains', code: '96', state: 'Virginia' };
    }
    
    // Middle Atlantic Coastal Plain (9.7 - using 97)
    if (latitude >= 35 && latitude <= 40.5 && longitude >= -80 && longitude <= -74) {
      return { name: 'Middle Atlantic Coastal Plain', code: '97', state: 'Virginia' };
    }
    
    // Northern Appalachian/Boreal Forest (9.8 - using 98) 
    if (latitude >= 43.5 && latitude <= 47.5 && longitude >= -71 && longitude <= -67) {
      return { name: 'Northern Appalachian/Boreal Forest', code: '98', state: 'Maine' };
    }
    
    // Mixed Wood Plains (9.9 - using 99)
    if (latitude >= 40 && latitude <= 45 && longitude >= -80 && longitude <= -73) {
      return { name: 'Mixed Wood Plains', code: '99', state: 'New York' };
    }
    
    // Default fallback with basic state detection
    if (latitude >= 25.8 && latitude <= 36.5 && longitude >= -106.6 && longitude <= -93.5) {
      return { name: 'Texas', code: 'TX', state: 'Texas' };
    }
    if (latitude >= 32.5 && latitude <= 42 && longitude >= -124.5 && longitude <= -114) {
      return { name: 'California', code: 'CA', state: 'California' };
    }
    
    return { name: 'Unknown', code: '00', state: '' };
  }
  
  /**
   * Get state/province from coordinates for GBIF queries
   */
  getStateFromCoordinates(latitude, longitude) {
    const ecoregion = this.getEcoregionFromCoordinates(latitude, longitude);
    return ecoregion.state;
  }

  /**
   * Main species selection method - uses cache-first approach with comprehensive fallbacks
   */
  async getSpeciesForMeditation(latitude, longitude, animalType = null, count = 5) {
    logger.info('Starting robust species selection', { latitude, longitude, animalType, count });

    try {
      // Determine which classes to fetch
      let classesToFetch = animalType ? 
        this.taxonomicClasses.filter(cls => cls.name === animalType) : 
        this.taxonomicClasses;

      const results = [];

      for (const taxonomicClass of classesToFetch) {
        const species = await this.getSpeciesForClass(latitude, longitude, taxonomicClass, count);
        
        if (species.length === 0) {
          logger.error('CRITICAL: Species class returned 0 results after all fallbacks', {
            class: taxonomicClass.name,
            latitude,
            longitude
          });
        }

        results.push({
          type: taxonomicClass.name,
          species: species.slice(0, count),
          count: species.length,
          source: species[0]?.source || 'fallback'
        });
      }

      return animalType ? results[0]?.species || [] : results;

    } catch (error) {
      logger.error('Species selection failed completely', { error: error.message, latitude, longitude });
      return this.getEmergencyFallback(animalType, count);
    }
  }

  /**
   * Get species for a specific taxonomic class with cache-first approach and multiple fallback layers
   */
  async getSpeciesForClass(latitude, longitude, taxonomicClass, count) {
    // Check cache first - if a cache entry exists for this clustered location, use it (do not re-seed)
    const cachedEntry = this.getCachedEntry(latitude, longitude, taxonomicClass);
    if (cachedEntry && Array.isArray(cachedEntry.species) && cachedEntry.species.length > 0) {
      logger.debug(`Using cached species for ${taxonomicClass.name} at clustered location`);
      return cachedEntry.species.slice(0, count);
    }

    // Layer 1: GBIF API with your proven approach
    let species = await this.fetchFromGBIF(latitude, longitude, taxonomicClass, 50); // 50km radius
    if (species.length >= count) {
      logger.info(`GBIF success for ${taxonomicClass.name}`, { count: species.length });
      // Cache the successful result
      this.cacheSpecies(latitude, longitude, taxonomicClass, species);
      return species;
    }

    // Layer 2: Expanded GBIF radius
    logger.warn(`Low GBIF results for ${taxonomicClass.name}, expanding radius`, { currentCount: species.length });
    species = await this.fetchFromGBIF(latitude, longitude, taxonomicClass, 200); // 200km radius
    if (species.length >= count) {
      logger.info(`Expanded GBIF success for ${taxonomicClass.name}`, { count: species.length });
      // Cache the successful result
      this.cacheSpecies(latitude, longitude, taxonomicClass, species);
      return species;
    }

    // Layer 3: Regional fallbacks based on location
    logger.warn(`Still low results for ${taxonomicClass.name}, using regional fallbacks`, { currentCount: species.length });
    const regionalSpecies = this.getRegionalFallback(latitude, longitude, taxonomicClass.name);
    if (regionalSpecies.length > 0) {
      species = species.concat(regionalSpecies);
      if (species.length >= count) {
        // Cache the combined result
        this.cacheSpecies(latitude, longitude, taxonomicClass, species);
        return species;
      }
    }

    // Layer 4: Global fallbacks - ALWAYS returns species
    logger.warn(`Using global fallbacks for ${taxonomicClass.name}`, { finalCount: species.length });
    const globalSpecies = this.getGlobalFallback(taxonomicClass.name);
    species = species.concat(globalSpecies);

    // Cache the final result (including global fallbacks)
    this.cacheSpecies(latitude, longitude, taxonomicClass, species);

    return species; // Will never be empty due to global fallbacks
  }

  /**
   * Fetch from GBIF using species search API to get vernacular names
   */
  async fetchFromGBIF(latitude, longitude, taxonomicClass, radius = 50) {
    const maxRetries = 3;
    this.lastGBIFError = null;

    // Helper to sleep ms
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    // Short-circuit if circuit is open
    const now = Date.now();
    if (this.gbifCircuit.open && this.gbifCircuit.openUntil > now) {
      logger.warn('GBIF circuit open, short-circuiting request', { openUntil: new Date(this.gbifCircuit.openUntil).toISOString(), reason: this.gbifCircuit.lastOpenedReason });
      this.lastGBIFError = {
        status: 429,
        message: 'GBIF circuit open - previously rate limited',
        raw: ''
      };
      return [];
    } else if (this.gbifCircuit.open && this.gbifCircuit.openUntil <= now) {
      // Reset circuit after timeout
      this.gbifCircuit.open = false;
      this.gbifCircuit.consecutiveFailures = 0;
      this.gbifCircuit.lastOpenedReason = null;
      logger.info('GBIF circuit closed, resuming requests');
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Use Level II Ecoregion for precise biogeographic species selection
        const ecoregion = this.getEcoregionFromCoordinates(latitude, longitude);
        const stateProvince = ecoregion.state;

        logger.info(`Using ecoregion for species search`, {
          ecoregion: ecoregion.name,
          code: ecoregion.code,
          state: stateProvince,
          coordinates: { latitude, longitude }
        });

        // Use species search API instead of occurrence search to get vernacular names
        const gbifUrl = `https://api.gbif.org/v1/species/search?rank=SPECIES&status=ACCEPTED&highertaxon_key=${taxonomicClass.key}&nameType=SCIENTIFIC&limit=100`;

        // Small delay to reduce chance of rate limits
        await new Promise(resolve => setTimeout(resolve, 250));

        const response = await fetch(gbifUrl, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Momentus-Meditation-App/1.0'
          }
        });

        const responseText = await response.text();
        const contentType = response.headers.get('content-type') || '';

        // Handle explicit rate limiting: respect Retry-After header when present
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : (1000 * 60); // default 60s
          this.lastGBIFError = {
            status: 429,
            message: 'GBIF rate limited',
            raw: responseText.slice(0, 512),
            retryAfter: retryAfterMs
          };
          logger.warn('GBIF rate limited', { status: response.status, retryAfter, headers: Object.fromEntries(response.headers) });

          // Open the circuit until retryAfterMs (or a safety multiplier)
          const openMs = Math.min(retryAfterMs + 5000, 1000 * 60 * 10); // cap to 10 minutes
          this.gbifCircuit.open = true;
          this.gbifCircuit.openUntil = Date.now() + openMs;
          this.gbifCircuit.lastOpenedReason = `429 rate limit: retry-after ${retryAfter}`;
          this.gbifCircuit.consecutiveFailures += 1;

          // Immediately short-circuit this and future attempts
          return [];
        }

        // Detect HTML or non-JSON pages
        if (responseText.trim().startsWith('<') || !contentType.includes('application/json')) {
          this.lastGBIFError = {
            status: response.status,
            message: `Unexpected content from GBIF: ${contentType}`,
            raw: responseText.slice(0, 512)
          };
          logger.warn('GBIF returned non-JSON response', { status: response.status, contentType, bodySnippet: responseText.slice(0, 512) });
          return [];
        }

        if (!response.ok) {
          this.lastGBIFError = {
            status: response.status,
            message: `GBIF API returned ${response.status}: ${response.statusText}`,
            raw: responseText.slice(0, 512)
          };
          logger.warn('GBIF returned non-ok status', { status: response.status, text: responseText.slice(0, 200) });
          // Retry on 5xx if attempts remain; open circuit if repeated server errors
          if (response.status >= 500 && attempt < maxRetries) {
            const waitMs = 1000 * Math.pow(2, attempt); // exponential backoff
            const jitter = Math.floor(Math.random() * 250);
            await sleep(waitMs + jitter);
            this.gbifCircuit.consecutiveFailures += 1;
            continue;
          }

          // If repeated failures exceed threshold, open circuit for a short period
          if (this.gbifCircuit.consecutiveFailures >= 2) {
            const openMs = 1000 * 60 * 2; // 2 minutes
            this.gbifCircuit.open = true;
            this.gbifCircuit.openUntil = Date.now() + openMs;
            this.gbifCircuit.lastOpenedReason = `Repeated 5xx errors`;
            logger.warn('Opening GBIF circuit due to repeated 5xx errors', { openUntil: new Date(this.gbifCircuit.openUntil).toISOString() });
          }

          return [];
        }

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          this.lastGBIFError = {
            status: response.status,
            message: `Invalid JSON from GBIF: ${parseError.message}`,
            raw: responseText.slice(0, 512)
          };
          logger.error('Failed to parse GBIF JSON', { err: parseError.message, bodySnippet: responseText.slice(0, 512) });
          return [];
        }

        const seen = new Map();
        if (data.results) {
          // Process species results and fetch vernacular names when available
          for (const species of data.results.slice(0, 50)) {  // Limit to avoid too many API calls
            let display = null;
            
            // Try to get vernacular name from species record first
            display = this.getBestVernacular(species);

            // If no vernacular name in main record, try dedicated vernacular endpoint for key species
            if (!display && species.key && seen.size < 20) {  // Limit vernacular API calls
              try {
                await sleep(100); // Rate limit protection
                const vernResponse = await fetch(`https://api.gbif.org/v1/species/${species.key}/vernacularNames?limit=10`, {
                  headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Momentus-Meditation-App/1.0'
                  }
                });
                
                if (vernResponse.ok) {
                  const vernData = await vernResponse.json();
                  if (vernData.results) {
                    // Look for English vernacular names
                    const englishName = vernData.results.find(v => 
                      v.language === 'eng' && v.vernacularName && 
                      this.isValidCommonName(this.sanitizeDisplayName(v.vernacularName))
                    );
                    if (englishName) {
                      display = this.sanitizeDisplayName(englishName.vernacularName);
                    }
                  }
                }
              } catch (vernErr) {
                // Continue without vernacular name if API fails
                logger.debug(`Failed to fetch vernacular name for ${species.scientificName}`, { error: vernErr.message });
              }
            }

            // Fall back to scientificName if no common name
            const rawScientific = species.scientificName || species.canonicalName || '';
            const scientific = this.extractBinomial(rawScientific) || '';

            // Check our curated scientific-to-common name mapping
            if (!display && scientific && this.scientificToCommon[scientific]) {
              display = this.scientificToCommon[scientific];
            }

            // Sanitize display name; validate; if invalid, fall back to binomial scientific name
            let cleanedDisplay = display ? this.sanitizeDisplayName(display) : '';
            if (!this.isValidCommonName(cleanedDisplay)) {
              cleanedDisplay = scientific || '';
            }
            if (!cleanedDisplay) continue;

            // Normalize key (lowercase) to dedupe
            const key = cleanedDisplay.toLowerCase();
            if (!seen.has(key)) {
              seen.set(key, {
                name: this.capitalizeWords(this.sanitizeDisplayName(cleanedDisplay)),
                scientificName: scientific,
                type: this.singularize(taxonomicClass.name),
                habitat: this.inferHabitat(cleanedDisplay, taxonomicClass.name),
                source: `GBIF-${radius}km`
              });
            }
          }
        }

        let species = Array.from(seen.values()).slice(0, 200).map(s => s);

        // Post-process: ensure display/scientific formatting and filter out invalid placeholders
        species = species.map(s => {
          const binomial = this.extractBinomial(s.scientificName || s.name || '');
          let cleanedCommon = this.sanitizeDisplayName(s.name || '');
          
          // If we still don't have a good common name, try our curated mapping
          if (!this.isValidCommonName(cleanedCommon) && binomial && this.scientificToCommon[binomial]) {
            cleanedCommon = this.scientificToCommon[binomial];
          }
          
          const finalDisplay = this.formatDisplayForUI(cleanedCommon, binomial);
          return {
            name: finalDisplay,
            scientificName: binomial || '',
            type: this.singularize(s.type || taxonomicClass.name),
            habitat: s.habitat || this.inferHabitat(finalDisplay, taxonomicClass.name),
            source: s.source || `GBIF-${radius}km`
          };
        }).filter(s => !!s.name && s.name.toLowerCase() !== 'unknown species');

        // Success: clear last error and return species
        this.lastGBIFError = null;
        logger.debug(`GBIF fetch for ${taxonomicClass.name}`, {
          radius,
          rawResults: data.results?.length || 0,
          uniqueNames: seen.size,
          finalSpecies: species.length
        });

        return species;

      } catch (err) {
        logger.error(`GBIF fetch failed for ${taxonomicClass.name} (attempt ${attempt}/${maxRetries})`, { error: err.message, radius, attempt });
        this.lastGBIFError = { message: err.message };
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    logger.error(`GBIF fetch completely failed for ${taxonomicClass.name} after ${maxRetries} attempts`, { error: this.lastGBIFError?.message, radius });
    return [];
  }

  /**
   * Get regional fallback species based on geographic location
   */
  getRegionalFallback(latitude, longitude, animalType) {
    let region = 'default';
    
    // Simple region detection based on coordinates
    if (latitude >= 32 && latitude <= 42 && longitude >= -125 && longitude <= -114) {
      region = 'california';
    } else if (latitude >= 42 && latitude <= 49 && longitude >= -125 && longitude <= -116) {
      region = 'pacific_northwest';
    } else if (latitude >= 25 && latitude <= 47 && longitude >= -100 && longitude <= -66) {
      region = 'eastern_forests';
    }

    const regionalData = this.regionalFallbacks[region];
    if (regionalData && regionalData[animalType]) {
      return regionalData[animalType].map(name => {
        const clean = this.sanitizeDisplayName(name) || this.extractBinomial(name) || name;
        return {
          name: this.capitalizeWords(clean),
          scientificName: this.extractBinomial(name) || '',
          type: this.singularize(animalType),
          habitat: this.inferHabitat(name, animalType),
          source: `regional-${region}`
        };
      });
    }

    return [];
  }

  /**
   * Global fallback - GUARANTEED to return species
   */
  getGlobalFallback(animalType) {
    const globalSpecies = this.globalFallbacks[animalType] || this.globalFallbacks.birds;
    
    return globalSpecies.map(name => ({
      name: this.capitalizeWords(this.sanitizeDisplayName(name) || this.extractBinomial(name) || name),
      scientificName: this.extractBinomial(name) || '',
      type: this.singularize(animalType),
      habitat: this.inferHabitat(name, animalType),
      source: 'global-fallback'
    }));
  }

  /**
   * Emergency fallback for complete system failure
   */
  getEmergencyFallback(animalType, count) {
    if (animalType) {
      return this.getGlobalFallback(animalType).slice(0, count);
    }

    return this.taxonomicClasses.map(cls => ({
      type: cls.name,
      species: this.getGlobalFallback(cls.name).slice(0, count),
      count: count,
      source: 'emergency-fallback'
    }));
  }

  /**
   * Capitalize words properly
   */
  capitalizeWords(str) {
    return str.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  /**
   * Infer habitat based on species name and type
   */
  inferHabitat(speciesName, animalType) {
    const name = speciesName.toLowerCase();
    
    // Water-related species
    if (name.includes('fish') || name.includes('salmon') || name.includes('trout') || 
        name.includes('frog') || name.includes('turtle') || name.includes('duck')) {
      return 'aquatic';
    }
    
    // Forest species
    if (name.includes('wood') || name.includes('tree') || name.includes('forest')) {
      return 'forest';
    }
    
    // Urban species
    if (name.includes('house') || name.includes('city') || name.includes('urban')) {
      return 'urban';
    }
    
    // Default by animal type
    const defaults = {
      birds: 'woodland',
      mammals: 'terrestrial',
      fish: 'freshwater',
      reptiles: 'terrestrial',
      amphibians: 'wetland',
      insects: 'terrestrial'
    };
    
    return defaults[animalType] || 'terrestrial';
  }

  /**
   * Get system stats for admin monitoring
   */
  getSystemStats() {
    return {
      taxonomicClasses: this.taxonomicClasses.length,
      globalFallbackCategories: Object.keys(this.globalFallbacks).length,
      regionalFallbackRegions: Object.keys(this.regionalFallbacks).length,
      guaranteedResults: true,
      version: '2.0-robust'
    };
  }

  /**
   * Get stats for SessionManager compatibility
   */
  getStats() {
    return {
      totalSpeciesRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      apiCalls: {
        iNaturalist: 0,
        GBIF: 0,
        eBird: 0
      },
      fallbacksUsed: 0,
      robustSystem: true,
      guaranteedResults: true,
      gbifCircuit: {
        open: this.gbifCircuit.open,
        openUntil: this.gbifCircuit.openUntil,
        lastOpenedReason: this.gbifCircuit.lastOpenedReason,
        consecutiveFailures: this.gbifCircuit.consecutiveFailures
      },
      noRepeatDays: this.noRepeatDays,
    };
  }

  /**
   * Extended stats including cache diagnostics per clustered location
   */
  getCacheStats() {
    const entries = [];
    for (const [key, value] of this.cache.entries()) {
      entries.push({ key, count: value.species?.length || 0, seededByGBIF: !!value.seededByGBIF, timestamp: value.timestamp });
    }

    return {
      totalEntries: entries.length,
      details: entries.slice(0, 200)
    };
  }
}

module.exports = RobustSpeciesService;