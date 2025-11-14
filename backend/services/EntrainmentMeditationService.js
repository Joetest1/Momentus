// services/EntrainmentMeditationService.js
const { getInstance: getAIProvider } = require('./AIProviderService');
const { getInstance: getTTSService } = require('./TTSService');
const logger = require('../utils/logger');

class EntrainmentMeditationService {
  constructor() {
    this.aiProvider = getAIProvider();
    this.ttsService = getTTSService();
    
    // Theme-specific content databases
    this.themePatterns = {
      circadian: {
        concepts: [
          'internal biological clocks',
          '24-hour light-dark cycles',
          'zeitgeber synchronization',
          'cellular oscillators',
          'melatonin rhythms',
          'cortisol patterns',
          'body temperature fluctuations',
          'sleep-wake cycles'
        ],
        focusPatterns: [
          'dawn light awareness',
          'solar positioning',
          'internal rhythm sensing',
          'cellular clock alignment',
          'natural time awareness'
        ],
        organisms: [
          'cyanobacteria with circadian oscillators',
          'plants tracking daily light cycles',
          'insects following solar patterns',
          'mammals with internal clocks',
          'migratory birds using light cues'
        ]
      },
      
      acoustic: {
        concepts: [
          'synchronized bioluminescence',
          'acoustic entrainment',
          'phase-locked oscillations',
          'collective rhythmic behavior',
          'sound wave synchronization',
          'harmonic resonance',
          'frequency matching',
          'rhythmic coordination'
        ],
        focusPatterns: [
          'listening to natural rhythms',
          'breath synchronization',
          'heartbeat awareness',
          'vibrational attunement',
          'sound wave meditation'
        ],
        organisms: [
          'Southeast Asian fireflies creating light waves',
          'male crickets in synchronized choruses',
          'cicada broods with precise timing',
          'frogs calling in acoustic harmony',
          'whales coordinating song patterns'
        ]
      },
      
      marine: {
        concepts: [
          'tidal clock mechanisms',
          'lunar cycle entrainment',
          'mass spawning synchronization',
          'circatidal rhythms',
          'gravitational influences',
          'temperature-triggered events',
          'seasonal reproduction timing',
          'oceanic current awareness'
        ],
        focusPatterns: [
          'tidal breathing patterns',
          'lunar connection sensing',
          'gravitational awareness',
          'oceanic rhythm attunement',
          'seasonal cycle consciousness'
        ],
        organisms: [
          'crabs anticipating tidal changes',
          'mollusks with internal tidal clocks',
          'coral reefs in mass spawning events',
          'sea turtles following lunar cycles',
          'fish schooling with current patterns'
        ]
      },
      
      movement: {
        concepts: [
          'locomotor entrainment',
          'collective motion dynamics',
          'emergent coordination',
          'local interaction rules',
          'synchronized turning waves',
          'velocity matching',
          'directional alignment',
          'swarm intelligence'
        ],
        focusPatterns: [
          'movement coordination',
          'directional awareness',
          'flow state consciousness',
          'collective motion sensing',
          'synchronized movement meditation'
        ],
        organisms: [
          'flocking birds in coordinated formations',
          'schooling fish moving as one entity',
          'swarming insects following neighbors',
          'migrating herds with shared direction',
          'bacterial colonies in synchronized motion'
        ]
      },
      
      fungal: {
        concepts: [
          'mycelial network oscillations',
          'electrical wave propagation',
          'resource distribution coordination',
          'network synchronization',
          'information transmission',
          'growth pattern coordination',
          'underground communication',
          'root-fungal partnerships'
        ],
        focusPatterns: [
          'underground network awareness',
          'electrical current sensing',
          'root system connection',
          'nutrient flow consciousness',
          'network pulse meditation'
        ],
        organisms: [
          'mycelial networks with electrical waves',
          'forest trees connected by fungal webs',
          'mushroom colonies sharing resources',
          'root systems in fungal partnerships',
          'decomposer networks cycling nutrients'
        ]
      },
      
      ecological: {
        concepts: [
          'population cycle entrainment',
          'predator-prey oscillations',
          'masting synchronization',
          'predator satiation strategy',
          'resource pulse timing',
          'ecosystem rhythm patterns',
          'boom-crash cycles',
          'environmental feedback loops'
        ],
        focusPatterns: [
          'ecosystem rhythm awareness',
          'natural cycle consciousness',
          'abundance-scarcity balance',
          'ecological pulse sensing',
          'system-wide synchronization'
        ],
        organisms: [
          'lynx and hare in population cycles',
          'forest trees in synchronized masting',
          'insect emergence coordinated timing',
          'plant flowering following climate cues',
          'animal migrations triggered by seasons'
        ]
      }
    };
  }

  async generateMeditation({ theme, duration, intensity, latitude, longitude, generateAudio = false }) {
    try {
      logger.info('Generating entrainment meditation', { theme, duration, intensity });

      // Get theme-specific content
      const themeData = this.themePatterns[theme] || this.createMixedTheme();
      
      // Build meditation prompt
      const meditationPrompt = this.buildMeditationPrompt(themeData, theme, duration, intensity, latitude, longitude);
      
      // Generate meditation content using AI
      const aiResponse = await this.aiProvider.generateContent(meditationPrompt);
      const meditationText = aiResponse.text || aiResponse;

      // Create metadata
      const metadata = {
        theme: theme,
        duration: duration,
        intensity: intensity,
        focusPatterns: themeData.focusPatterns,
        scientificConcepts: themeData.concepts.slice(0, 4), // Top 4 concepts
        organisms: themeData.organisms.slice(0, 3), // Top 3 organism examples
        generatedAt: new Date().toISOString(),
        aiProvider: aiResponse.provider || 'unknown',
        hasLocation: !!(latitude && longitude)
      };

      let audioUrl = null;
      
      // Generate audio if requested
      if (generateAudio) {
        try {
          const audioResult = await this.ttsService.generateAudio(meditationText, `entrainment-${theme}-${Date.now()}`);
          if (audioResult && audioResult.url) {
            audioUrl = audioResult.url;
          }
        } catch (audioError) {
          logger.warn('Failed to generate audio for entrainment meditation', { error: audioError.message });
        }
      }

      return {
        meditation: {
          text: meditationText,
          theme: theme,
          duration: duration
        },
        metadata: metadata,
        audioUrl: audioUrl
      };

    } catch (error) {
      logger.error('Error in entrainment meditation generation', { error: error.message });
      throw error;
    }
  }

  buildMeditationPrompt(themeData, theme, duration, intensity, latitude, longitude) {
    const minutes = Math.floor(duration / 60);
    const intensityDescriptions = {
      gentle: 'accessible to beginners with gentle scientific metaphors',
      moderate: 'engaging scientific concepts without overwhelming detail',
      deep: 'rich scientific detail and complex entrainment principles'
    };

    const locationContext = (latitude && longitude) ? 
      `\nThe meditation will be experienced at coordinates ${latitude}, ${longitude}. Consider local environmental context if relevant to the theme.` : '';

    const basePrompt = `Create a ${minutes}-minute guided meditation focused on natural entrainment and synchronization patterns, specifically: ${theme.toUpperCase()} RHYTHMS.

SCIENTIFIC FOUNDATION:
Theme: ${theme}
Key Concepts: ${themeData.concepts.join(', ')}
Organism Examples: ${themeData.organisms.join('; ')}
Focus Techniques: ${themeData.focusPatterns.join(', ')}

MEDITATION REQUIREMENTS:
- Duration: ${minutes} minutes (${duration} seconds)
- Style: ${intensityDescriptions[intensity]}
- Structure: Opening (1-2 min) → Core Practice (${minutes-3} min) → Integration (1-2 min)
- Scientific Integration: Weave entrainment science naturally into mindfulness guidance
- Core Principle: Coupled oscillators with feedback mechanisms naturally synchronize when coupling strength exceeds threshold${locationContext}

SPECIFIC FOCUS - ${theme.toUpperCase()}:
${this.getThemeSpecificGuidance(theme, themeData)}

MEDITATION STRUCTURE:
1. OPENING: Ground the participant in their body and breath, introduce the concept of natural synchronization
2. CORE PRACTICE: Guide awareness to ${themeData.focusPatterns[0]}, using ${themeData.organisms[0]} as a central metaphor
3. DEEPENING: Expand awareness to include ${themeData.concepts.slice(0, 3).join(', ')}
4. INTEGRATION: Connect personal rhythms to universal entrainment patterns
5. CLOSING: Carry synchronized awareness into daily life

TONE: Contemplative, scientifically grounded, inspiring connection to natural world
LANGUAGE: Poetic yet precise, accessible scientific concepts, emphasize interconnection
LENGTH: Approximately ${Math.floor(duration/4)} words for natural pacing

Generate a complete guided meditation script that helps practitioners experience entrainment through direct awareness and scientific understanding.`;

    return basePrompt;
  }

  getThemeSpecificGuidance(theme, themeData) {
    const guidance = {
      circadian: `Guide participants to sense their internal biological clock, connecting breath rhythm to cellular oscillations. Use sunrise/sunset imagery and the 24-hour cycle as a meditation anchor. Help them feel synchronized with planetary rotation and light cycles.`,
      
      acoustic: `Focus on synchronized sound patterns - breath coordination, heartbeat rhythm, and vibrational awareness. Use firefly bioluminescence waves as a central metaphor for collective synchronization. Guide listening meditation that attunes to natural acoustic rhythms.`,
      
      marine: `Center on tidal breathing patterns and lunar gravitational awareness. Use coral spawning synchronization as a metaphor for perfectly timed biological events. Guide awareness of cyclical changes and rhythmic oceanic movements.`,
      
      movement: `Focus on synchronized movement awareness - breath coordinated with imagined flock movements. Use bird flocking as a metaphor for emergent coordination through simple local rules. Guide kinesthetic awareness of collective motion dynamics.`,
      
      fungal: `Guide awareness to underground network connections, sensing electrical current-like energy through the body. Use mycelial networks as a metaphor for communication and resource sharing. Focus on slow, steady rhythms and network pulse awareness.`,
      
      ecological: `Center on boom-crash cycles and predator-prey oscillations as metaphors for life's natural rhythms. Guide awareness of abundance and scarcity cycles, using forest masting synchronization as a central metaphor for community coordination.`,
      
      mixed: `Combine multiple entrainment patterns - begin with circadian awareness, flow through acoustic synchronization, incorporate tidal rhythms, and end with ecological cycles. Create a comprehensive entrainment experience touching all major natural synchronization phenomena.`
    };

    return guidance[theme] || guidance.mixed;
  }

  createMixedTheme() {
    // Combine elements from multiple themes for 'mixed' option
    const allConcepts = [];
    const allFocusPatterns = [];
    const allOrganisms = [];

    Object.values(this.themePatterns).forEach(pattern => {
      allConcepts.push(...pattern.concepts.slice(0, 2));
      allFocusPatterns.push(...pattern.focusPatterns.slice(0, 1));
      allOrganisms.push(...pattern.organisms.slice(0, 1));
    });

    return {
      concepts: allConcepts,
      focusPatterns: allFocusPatterns,
      organisms: allOrganisms
    };
  }

  // Get theme information for UI display
  getThemeInfo() {
    return {
      circadian: {
        name: 'Circadian Rhythms',
        description: 'Internal biological clocks synchronized to 24-hour light-dark cycles',
        icon: '🌅',
        examples: 'Cellular oscillators, sleep-wake cycles, hormone patterns'
      },
      acoustic: {
        name: 'Acoustic Synchronization', 
        description: 'Fireflies, crickets, and cicadas creating synchronized choruses',
        icon: '🦗',
        examples: 'Bioluminescent waves, cricket choruses, whale songs'
      },
      marine: {
        name: 'Marine & Tidal Rhythms',
        description: 'Coastal organisms entrained to tidal cycles and lunar patterns',
        icon: '🌊', 
        examples: 'Tidal clocks, coral spawning, lunar cycles'
      },
      movement: {
        name: 'Collective Movement',
        description: 'Flocking birds and schooling fish demonstrating locomotor entrainment',
        icon: '🐦',
        examples: 'Bird flocks, fish schools, insect swarms'
      },
      fungal: {
        name: 'Fungal Network Oscillations',
        description: 'Mycelial electrical waves synchronizing across fungal bodies',
        icon: '🍄',
        examples: 'Mycelial networks, electrical waves, resource distribution'
      },
      ecological: {
        name: 'Ecological Cycles',
        description: 'Predator-prey populations and forest masting cycles',
        icon: '🌲',
        examples: 'Population cycles, masting events, ecosystem rhythms'
      },
      mixed: {
        name: 'Mixed Entrainment Patterns',
        description: 'Combination of multiple natural synchronization phenomena',
        icon: '🔄',
        examples: 'Multi-pattern integration, comprehensive entrainment'
      }
    };
  }

  // Validate theme and parameters
  validateParameters({ theme, duration, intensity }) {
    const validThemes = Object.keys(this.themePatterns).concat(['mixed']);
    const validIntensities = ['gentle', 'moderate', 'deep'];
    const validDurations = [300, 600, 900, 1200, 1800]; // 5, 10, 15, 20, 30 minutes

    if (!validThemes.includes(theme)) {
      throw new Error(`Invalid theme: ${theme}. Valid themes: ${validThemes.join(', ')}`);
    }

    if (!validIntensities.includes(intensity)) {
      throw new Error(`Invalid intensity: ${intensity}. Valid intensities: ${validIntensities.join(', ')}`);
    }

    if (!validDurations.includes(duration)) {
      throw new Error(`Invalid duration: ${duration}. Valid durations: ${validDurations.join(', ')} seconds`);
    }

    return true;
  }
}

let instance = null;

function getInstance() {
  if (!instance) {
    instance = new EntrainmentMeditationService();
  }
  return instance;
}

module.exports = { EntrainmentMeditationService, getInstance };