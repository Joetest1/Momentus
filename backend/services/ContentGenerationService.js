// services/ContentGenerationService.js
const { getInstance: getAIProvider } = require('./AIProviderService');
const APIService = require('./APIService');
const LunarService = require('./LunarService');
const FeedbackAnalyzerService = require('./FeedbackAnalyzerService');
const logger = require('../utils/logger');

class ContentGenerationService {
  constructor() {
    this.cache = new Map();
    this.lunarService = new LunarService();
    this.aiProvider = getAIProvider();
    this.feedbackAnalyzer = new FeedbackAnalyzerService();
  }

  async generateContent({ weather, species, preferences, sessionId, lunar, behavior, datetime, timeOfDay, location, moonriseInfo, specialDayGuidance }) {
    const cacheKey = this.generateCacheKey({ weather, species, preferences, lunar, behavior });
    if (this.cache.has(cacheKey)) {
      logger.debug(`Using cached content for session ${sessionId}`);
      return this.cache.get(cacheKey);
    }

    try {
      const prompt = await this.buildPrompt({
        weather,
        species,
        preferences,
        lunar,
        behavior,
        datetime,
        timeOfDay,
        moonriseInfo,
        specialDayGuidance
      });

      // Use AIProviderService instead of direct Google AI
      const result = await this.aiProvider.generateContent(prompt);
      const generatedText = result.text;

      const content = this.parseGeneratedContent(generatedText, preferences);

      this.cache.set(cacheKey, content);
      this.scheduleCacheCleanup(cacheKey);

      logger.info(`Content generated successfully for session ${sessionId}`, {
        provider: result.provider,
        model: result.model
      });
      return content;

    } catch (error) {
      logger.error(`Content generation failed for session ${sessionId}`, {
        error: error.message
      });

      return this.getFallbackContent({ weather, species, preferences, lunar, behavior, timeOfDay, moonriseInfo });
    }
  }

  async buildPrompt({ weather, species, preferences, lunar, behavior, datetime, timeOfDay, moonriseInfo, specialDayGuidance }) {
    const duration = preferences.duration || 300;
    const mood = preferences.mood || 'calm';
    const durationMinutes = Math.floor(duration / 60);
    
    // Advanced customization options (new!)
    const meditationStyle = preferences.meditationStyle || 'naturalist';
    const focusBalance = preferences.focusBalance !== undefined ? preferences.focusBalance : 1; // 0-3
    const instructionDepth = preferences.instructionDepth !== undefined ? preferences.instructionDepth : 1; // 0-2
    const philosophicalDepth = preferences.philosophicalDepth !== undefined ? preferences.philosophicalDepth : 0; // 0-2
    
    // More precise word count targets: 150 words per minute of meditation
    const targetWords = Math.floor(duration / 60 * 150);
    const minWords = Math.floor(targetWords * 0.9);  // 90% of target
    const maxWords = Math.floor(targetWords * 1.1);  // 110% of target

    // Get feedback-based adjustments
    const feedbackAdjustments = await this.feedbackAnalyzer.getPromptAdjustments().catch(() => ({}));

    // Build style-specific guidance
    const styleGuidance = this.getStyleGuidance(meditationStyle, mood);
    const balanceGuidance = this.getBalanceGuidance(focusBalance);
    const instructionGuidance = this.getInstructionGuidance(instructionDepth);
    const philosophicalGuidance = this.getPhilosophicalGuidance(philosophicalDepth);

    // Determine time context
    const hour = datetime ? datetime.getHours() : new Date().getHours();

    // NEW LUNAR RULES:
    // Only mention moon if:
    // 1. Within 10 minutes of moonrise, OR
    // 2. Moon is astronomically visible based on phase and time
    // 3. Always note time of day when mentioning moon
    const nearMoonrise = moonriseInfo && moonriseInfo.near;
    const moonVisible = lunar ? this.lunarService.isMoonVisible(datetime || new Date(), lunar) : false;
    const includeLunar = lunar && (nearMoonrise || moonVisible);

    // Get lunar context formatting
    const lunarContext = lunar ? this.lunarService.formatLunarContext(lunar) : null;

    // Get behavior context
    const behaviorText = behavior ? behavior.behavior : (species.behavior || 'moving through its environment');
    const behaviorDescription = behavior ? behavior.description : '';

    // Build moonrise context if applicable
    let moonriseContext = '';
    if (nearMoonrise && moonriseInfo.moonrise) {
      const moonriseTime = moonriseInfo.moonrise.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      if (moonriseInfo.isPast) {
        moonriseContext = `The moon has just risen at ${moonriseTime}, now visible in the ${timeOfDay} sky. `;
      } else {
        moonriseContext = `The moon is about to rise at ${moonriseTime} during this ${timeOfDay} moment. `;
      }
    }

    // Build special day guidance if applicable (10th or 25th lunar day)
    let specialDayContext = '';
    if (specialDayGuidance) {
      if (specialDayGuidance.day === 10) {
        specialDayContext = `
SPECIAL LUNAR DAY CONTEXT (Day 10 - Activation):
- This is the 10th lunar day, a time of heightened activation and momentum
- Emphasize: ${specialDayGuidance.qualities.join(', ')}
- Tone: ${specialDayGuidance.guidance.tone}
- Imagery suggestions: ${specialDayGuidance.guidance.imagery}
- Frame: The listener is ${specialDayGuidance.energeticState}
- Approach: ${specialDayGuidance.guidance.emphasis}
- Avoid religious terminology; speak in terms of natural cycles, psychology, and energetic tone`;
      } else if (specialDayGuidance.day === 25) {
        specialDayContext = `
SPECIAL LUNAR DAY CONTEXT (Day 25 - Receptivity):
- This is the 25th lunar day, a time of heightened receptivity and intuition
- Emphasize: ${specialDayGuidance.qualities.join(', ')}
- Tone: ${specialDayGuidance.guidance.tone}
- Imagery suggestions: ${specialDayGuidance.guidance.imagery}
- Frame: The listener is ${specialDayGuidance.energeticState}
- Approach: ${specialDayGuidance.guidance.emphasis}
- Avoid religious terminology; speak in terms of natural cycles, psychology, and energetic tone`;
      }
    }

    // Real observation handling
    const isRealObservation = species.observedAt && species.location;

    if (isRealObservation) {
      const timeAgo = this.getTimeAgo(species.observedAt);
      const observerNote = species.description || behaviorDescription || '';
      const locationName = species.location.place || species.location.locality || 'this location';

      return `You are generating a 3-5 minute guided nature meditation in a minimal contemplative style, blending soft nature-documentary narration with meditative awareness.

REAL-TIME ENVIRONMENTAL CONTEXT (DO NOT INVENT):
- Species: ${species.name} (${species.scientificName})
- Behavior: ${behaviorText}${behaviorDescription ? ` — ${behaviorDescription}` : ''}
- Recently observed: ${timeAgo} in ${locationName}
- Observer: ${species.observedBy || 'local naturalist'}
${observerNote ? `- Notes: "${observerNote.substring(0, 250)}"` : ''}
- Current time: ${timeOfDay} ${datetime ? `on ${datetime.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}
${moonriseContext ? `- Moonrise: ${moonriseContext}` : ''}
${includeLunar && !nearMoonrise ? `- Lunar phase: ${lunarContext} (visible in ${timeOfDay} sky)` : ''}
- Weather: ${weather.description}, ${weather.temperature}°C
- Location: ${locationName}
${specialDayContext}

MEDITATION REQUIREMENTS:
1. **Perspective**: Second-person ("You notice...", "Your breath...", "Watch as...")
2. **Sensory Details**: Integrate sight, sound, temperature, touch, breath${this.getFeedbackInstructions(feedbackAdjustments)}
3. **Lunar Integration**: ${nearMoonrise ? `IMPORTANT: Skillfully integrate the moonrise (${moonriseContext.trim()}) as a special moment` : includeLunar ? `Subtly mention the moon as visible in the ${timeOfDay} sky - "${lunarContext}"` : 'Do NOT mention the moon (not astronomically visible at this time)'}
4. **Behavior Focus**: Center on the specific behavior: ${behaviorText}
5. **Tone**: Minimal, contemplative, observational — NO affirmations, metaphysics, or life lessons
6. **Audio Formatting**: Use ellipses (...) between short paragraphs for natural pauses (1-2 breath cycles). Do NOT insert the literal word "pause" or leave blank lines between paragraphs.

FORBIDDEN PHRASES:
- "These remarkable creatures..."
- "You need not control your thoughts..."
- "Let go of..."
- "Connect with your inner..."
- "Day 14", "Day 15", or any lunar day references
- Any exaggeration or motivational language

STRUCTURE (${minWords}-${maxWords} words total for ${durationMinutes} minutes):
- **Opening** (20%): Place listener in ${locationName}, ${timeOfDay}
- **Body** (60%): Vivid scene of ${species.name} ${behaviorText}, using sensory details
- **Closing** (20%): Return to breath, carry this moment forward

FORMAT FOR TTS:
- Short paragraphs (2-3 sentences max)
- Empty line between paragraphs = natural pause
- No stage directions like "pause here" or "breathe"

CRITICAL: This MUST be a full ${durationMinutes}-minute meditation with ${minWords}-${maxWords} words. Generate the COMPLETE meditation script with multiple paragraphs to fill the entire duration.

Write the complete ${durationMinutes}-minute meditation script NOW:`;

    } else {
      // Generic/database species
      return `You are generating a 3-5 minute guided nature meditation in a minimal contemplative style, blending soft nature-documentary narration with meditative awareness.

ENVIRONMENTAL CONTEXT:
- Species: ${species.name} (${species.scientificName})
- Behavior: ${behaviorText}${behaviorDescription ? ` — ${behaviorDescription}` : ''}
- Habitat: ${species.habitat}
- Time: ${timeOfDay}
${moonriseContext ? `- Moonrise: ${moonriseContext}` : ''}
${includeLunar && !nearMoonrise ? `- Lunar phase: ${lunarContext} (visible in ${timeOfDay} sky)` : ''}
- Weather: ${weather.description}, ${weather.temperature}°C
${specialDayContext}

MEDITATION REQUIREMENTS:
1. **Style**: ${styleGuidance}
2. **Content Balance**: ${balanceGuidance}
3. **Instruction Level**: ${instructionGuidance}
4. **Philosophical Approach**: ${philosophicalGuidance}
5. **Perspective**: Second-person ("You notice...", "Your breath...", "Watch as...")
6. **Sensory Details**: Sight, sound, temperature, touch, breath${this.getFeedbackInstructions(feedbackAdjustments)}
7. **Lunar Integration**: ${nearMoonrise ? `IMPORTANT: Skillfully integrate the moonrise (${moonriseContext.trim()}) as a special moment` : includeLunar ? `Subtly mention the moon as visible in the ${timeOfDay} sky - "${lunarContext}"` : 'Do NOT mention the moon (not astronomically visible at this time)'}
8. **Behavior Focus**: ${behaviorText}
9. **Audio Formatting**: Use ellipses (...) between short paragraphs. Do NOT include blank lines between paragraphs or the word "pause".

FORBIDDEN:
- Generic wisdom or life lessons
- "These remarkable creatures..."
- "Let go of..." or similar clichés
- "Day 14", "Day 15", or any lunar day references

STRUCTURE (${minWords}-${maxWords} words total for ${durationMinutes} minutes):
Follow the content distribution specified above. The meditation should flow naturally between nature observation, grounding sensations, and breath awareness according to the balance setting.

FORMAT FOR TTS:
- Short paragraphs
- Empty lines = pauses
- No explicit pause instructions

CRITICAL: This MUST be a full ${durationMinutes}-minute meditation with ${minWords}-${maxWords} words. Generate the COMPLETE meditation script with multiple paragraphs to fill the entire duration.

Write the complete ${durationMinutes}-minute meditation:`;
    }
  }

/**
   * Format meditation text for TTS with natural pauses
   * @param {string} text - Raw meditation text
   * @returns {string} TTS-ready text with pause markers
   */
  formatForTTS(text) {
    if (!text) return '';

    // Split by double newlines (paragraph breaks)
    const paragraphs = text.split('\n\n')
      .map(para => para.trim())
      .filter(para => para.length > 0);

    // Join with ellipses as pause markers, with no blank lines between lines.
    // Example output:
    // "First short paragraph...\nSecond short paragraph...\nThird short paragraph"
    return paragraphs.join('...\n');
  }

  getFeedbackInstructions(adjustments) {
    const instructions = [];

    if (adjustments.environmentalFocus === 'high') {
      instructions.push(' - PRIORITY: Significantly increase environmental relevance with location-specific details and habitat descriptions');
    }

    if (adjustments.groundingEmphasis === 'high') {
      instructions.push(' - PRIORITY: Strengthen grounding elements with more physical sensations, earth connection, and present-moment awareness');
    } else if (adjustments.groundingEmphasis === 'maintain') {
      instructions.push(' - MAINTAIN: Continue strong grounding techniques that have been effective');
    }

    if (adjustments.natureVividness === 'high') {
      instructions.push(' - PRIORITY: Enhance nature engagement with more vivid imagery, dynamic species behaviors, and emotional wildlife connections');
    }

    if (adjustments.audioFormatting === 'review') {
      instructions.push(' - REVIEW: Optimize audio formatting for better natural flow and pause timing');
    }

    return instructions.length > 0 ? '\n' + instructions.join('\n') : '';
  }

  /**
   * Parse generated meditation content
   * @param {string} text - Raw generated text
   * @param {Object} preferences - User preferences
   * @returns {Object} Parsed content object
   */
  parseGeneratedContent(text, preferences) {
    if (!text) {
      return {
        text: '',
        estimatedDuration: preferences.duration || 300,
        sections: []
      };
    }

    // Format for TTS
    const ttsText = this.formatForTTS(text);

    // Split into sections (rough estimation)
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
    const totalParagraphs = paragraphs.length;

    const sections = [];
    if (totalParagraphs > 0) {
      sections.push('introduction');
    }
    if (totalParagraphs > 1) {
      sections.push('body');
    }
    if (totalParagraphs > 2) {
      sections.push('closing');
    }

    // Estimate duration based on word count (average speech: 150 words/min)
    const wordCount = text.split(/\s+/).length;
    const estimatedDuration = Math.ceil((wordCount / 150) * 60); // seconds

    return {
      text: ttsText,
      rawText: text,
      estimatedDuration: estimatedDuration,
      wordCount: wordCount,
      sections: sections,
      paragraphCount: totalParagraphs
    };
  }

  generateCacheKey({ weather, species, preferences, lunar, behavior }) {
    const lunarKey = lunar ? `${lunar.day}_${lunar.phase}` : 'none';
    const behaviorKey = behavior ? behavior.behavior.replace(/\s+/g, '_') : 'default';
    return `${weather.condition}_${species.name}_${behaviorKey}_${lunarKey}_${preferences.duration || 300}`;
  }

  scheduleCacheCleanup(cacheKey) {
    setTimeout(() => {
      this.cache.delete(cacheKey);
      logger.debug(`Cache entry removed: ${cacheKey}`);
    }, 1800000);
  }

  getTimeAgo(observedAt) {
    const observed = new Date(observedAt);
    const now = new Date();
    const diffMs = now - observed;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays === 0 && diffHours < 1) return 'less than an hour ago';
    if (diffDays === 0) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }

/**
   * Get fallback meditation content when generation fails
   * @param {Object} params - Context parameters
   * @returns {Object} Fallback content
   */
  getFallbackContent({ weather, species, preferences, lunar, behavior, timeOfDay, moonriseInfo }) {
    const duration = preferences.duration || 300;
    const timeDescription = duration < 300 ? 'brief' : duration < 600 ? 'gentle' : 'deep';
    const speciesName = species.name || 'a bird';
    const behaviorText = behavior ? behavior.behavior : 'moving through its habitat';

    // Apply lunar rules: only mention moon at night or near moonrise
    const isNight = timeOfDay === 'night' || timeOfDay === 'dusk';
    const nearMoonrise = moonriseInfo && moonriseInfo.near;
    let lunarText = '';
    if (nearMoonrise) {
      lunarText = ` The moon is rising in the ${timeOfDay} sky.`;
    } else if (isNight && lunar && lunar.isFull) {
      lunarText = ` Moonlight filters through the ${timeOfDay} air.`;
    }

    const fallbackText = `Welcome to this ${timeDescription} moment of stillness.

Find yourself in nature during ${timeOfDay}, where ${speciesName} is ${behaviorText}.${lunarText}

Notice the rhythm of your breath. The air is ${Math.round(weather.temperature)}°C. ${weather.description}.

Watch this creature moving with purpose, responding to its environment with the same awareness you bring to this moment.

Each breath connects you here, to this particular place, this particular time.

Nothing to achieve. Simply present.

As this meditation closes, the natural world continues its ancient patterns around you.`;

    return this.parseGeneratedContent(fallbackText, preferences);
  }

  /**
   * Get style-specific guidance for meditation tone
   * @param {string} style - naturalist, guided, contemplative, documentary
   * @param {string} mood - calm, energized, reflective, peaceful, focused
   * @returns {string} Style guidance text
   */
  getStyleGuidance(style, mood) {
    const moodModifiers = {
      calm: 'gentle and soothing',
      energized: 'dynamic and engaging',
      reflective: 'contemplative and introspective',
      peaceful: 'serene and tranquil',
      focused: 'direct and purposeful'
    };
    const moodTone = moodModifiers[mood] || 'gentle';

    const styles = {
      naturalist: `Adopt an observational, naturalist perspective with ${moodTone} tone. Focus on precise biological details and behaviors. Use scientific accuracy while maintaining meditative quality.`,
      guided: `Use explicit, ${moodTone} guidance throughout. Include clear breath cues and body awareness prompts. Provide step-by-step instructions for grounding.`,
      contemplative: `Use ${moodTone} awareness language. Integrate concepts of presence, non-conceptual awareness, and natural mindfulness. Allow space for insight.`,
      documentary: `Take an educational, ${moodTone} approach. Include fascinating species facts, ecological relationships, and biological adaptations while maintaining meditative pacing.`
    };

    return styles[style] || styles.naturalist;
  }

  /**
   * Get balance guidance for content distribution
   * @param {number} balance - 0=nature, 1=balanced, 2=grounding, 3=meditative
   * @returns {string} Balance guidance text
   */
  getBalanceGuidance(balance) {
    const distributions = {
      0: { animal: 80, grounding: 10, breath: 10, desc: 'HEAVILY nature-focused' },
      1: { animal: 60, grounding: 20, breath: 20, desc: 'Balanced nature and mindfulness' },
      2: { animal: 40, grounding: 30, breath: 30, desc: 'Grounding-focused with nature context' },
      3: { animal: 30, grounding: 30, breath: 40, desc: 'MEDITATION-focused with nature as anchor' }
    };

    const dist = distributions[balance] || distributions[1];
    return `Content distribution (${dist.desc}): ${dist.animal}% animal/nature observation, ${dist.grounding}% grounding/sensory awareness, ${dist.breath}% breath/body awareness. Maintain these ratios throughout the meditation.`;
  }

  /**
   * Get instruction depth guidance
   * @param {number} depth - 0=minimal, 1=moderate, 2=detailed
   * @returns {string} Instruction guidance text
   */
  getInstructionGuidance(depth) {
    const instructions = {
      0: 'MINIMAL guidance: No explicit breath cues. Pure observational meditation. Let the scene speak for itself.',
      1: 'MODERATE guidance: Include occasional breath cues (2-3 times). Balance observation with gentle reminders to return to breath.',
      2: 'DETAILED guidance: Frequent breath cues (5-7 times). Explicit body awareness prompts. Clear instructions for grounding throughout.'
    };

    return instructions[depth] || instructions[1];
  }

  /**
   * Get philosophical depth guidance
   * @param {number} depth - 0=secular, 1=subtle, 2=contemplative
   * @returns {string} Philosophical guidance text
   */
  getPhilosophicalGuidance(depth) {
    const philosophies = {
      0: `STRICTLY SECULAR: Forbidden phrases: "awareness", "presence", "consciousness", "non-dual", "non-conceptual mind", "witness", "being". Focus ONLY on sensory observation and breath.`,
      1: `SUBTLY CONTEMPLATIVE: Allowed phrases: "awareness", "presence", "noticing". Forbidden: "non-dual", "non-conceptual mind", "consciousness". Light mindfulness language.`,
      2: `DEEPLY CONTEMPLATIVE: Allowed phrases: "awareness", "presence", "non-conceptual mind", "consciousness", "witness", "being". Integrate contemplative wisdom naturally.`
    };

    return philosophies[depth] || philosophies[0];
  }

  clearCache() {
    const size = this.cache.size;
    this.cache.clear();
    logger.info(`Cleared ${size} cached content entries`);
  }

  getStats() {
    return {
      cacheSize: this.cache.size,
      modelInitialized: !!this.model,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = ContentGenerationService;
