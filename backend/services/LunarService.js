// services/LunarService.js
const logger = require('../utils/logger');
const SunCalc = require('suncalc');

/**
 * LunarService - Calculates lunar phases and days for meditation context
 *
 * Provides real-time lunar calculations based on astronomical algorithms
 * for integrating moon phase and day into nature meditation experiences.
 */
class LunarService {
  constructor() {
    // Reference new moon date (astronomical constant)
    this.referenceNewMoon = new Date('2000-01-06T18:14:00Z');

    // Synodic month = average time between new moons (days)
    this.synodicMonth = 29.530588853;

    // Moon rise/set calculation enabled via SunCalc
    this.moonRiseSetEnabled = true;
  }

  /**
   * Calculate current lunar day and phase from any date
   * @param {Date} date - The date to calculate lunar info for (defaults to now)
   * @returns {Object} Lunar information including day, phase, and illumination
   */
  calculateLunarDay(date = new Date()) {
    try {
      // Calculate days since reference new moon
      const daysSinceReference = (date - this.referenceNewMoon) / (1000 * 60 * 60 * 24);

      // Calculate position in current lunar cycle (0-29.53)
      const cyclePosition = daysSinceReference % this.synodicMonth;

      // Lunar day (1-30, traditional counting)
      const lunarDay = Math.floor(cyclePosition) + 1;

      // Calculate illumination percentage (0-100)
      const percentIlluminated = this.calculateIllumination(cyclePosition);

      // Determine moon phase name
      const phase = this.getPhase(lunarDay);

      // Determine waxing/waning direction
      const direction = lunarDay <= 15 ? 'waxing' : 'waning';

      const result = {
        day: lunarDay,
        phase: phase,
        direction: direction,
        percentIlluminated: Math.round(percentIlluminated),
        cyclePosition: cyclePosition,
        isNew: lunarDay === 1 || lunarDay === 30,
        isFull: lunarDay >= 14 && lunarDay <= 16,
        isFirstQuarter: lunarDay >= 7 && lunarDay <= 8,
        isLastQuarter: lunarDay >= 22 && lunarDay <= 23
      };

      logger.debug('Lunar calculation completed', {
        date: date.toISOString(),
        lunarDay: result.day,
        phase: result.phase
      });

      return result;

    } catch (error) {
      logger.error('Failed to calculate lunar day', { error: error.message });
      return this.getFallbackLunarData();
    }
  }

  /**
   * Calculate moon illumination percentage based on cycle position
   * @param {number} cyclePosition - Position in lunar cycle (0-29.53)
   * @returns {number} Illumination percentage (0-100)
   */
  calculateIllumination(cyclePosition) {
    // Use cosine function for smooth illumination curve
    // 0 at new moon (0 days), 100 at full moon (14.76 days), 0 at next new moon
    const angle = (cyclePosition / this.synodicMonth) * 2 * Math.PI;
    const illumination = 50 * (1 - Math.cos(angle));
    return Math.max(0, Math.min(100, illumination));
  }

  /**
   * Get moon phase name from lunar day
   * @param {number} lunarDay - Day in lunar cycle (1-30)
   * @returns {string} Phase name
   */
  getPhase(lunarDay) {
    if (lunarDay <= 1 || lunarDay >= 30) return 'new moon';
    if (lunarDay <= 7) return 'waxing crescent';
    if (lunarDay <= 9) return 'first quarter';
    if (lunarDay <= 14) return 'waxing gibbous';
    if (lunarDay <= 16) return 'full moon';
    if (lunarDay <= 22) return 'waning gibbous';
    if (lunarDay <= 24) return 'last quarter';
    return 'waning crescent';
  }

  /**
   * Check if this lunar day is significant/noteworthy
   * @param {number} lunarDay - Day in lunar cycle
   * @returns {boolean} True if this is a significant lunar day
   */
  isLunarDayRelevant(lunarDay) {
    // Significant days: New (1), First Quarter (7-8), Full (14-16), Last Quarter (22-23)
    // Also special meditation days: 10, 25 (referenced in original requirements)
    const significantDays = [1, 7, 8, 10, 14, 15, 16, 22, 23, 25, 29, 30];
    return significantDays.includes(lunarDay);
  }

  /**
   * Get special guidance for lunar days with heightened energetic significance
   * @param {number} lunarDay - Day in lunar cycle (1-30)
   * @returns {Object|null} Special guidance or null if not a special day
   */
  getSpecialDayGuidance(lunarDay) {
    if (lunarDay === 10) {
      return {
        day: 10,
        theme: 'activation',
        qualities: ['confidence', 'momentum', 'magnetism', 'purposeful direction'],
        approach: 'empowered will and aligned action',
        guidance: {
          emphasis: 'Emphasize stepping forward, calling in support, focusing intentions, offering effort boldly',
          imagery: 'rising energy, sunlight breaking through, gathering allies (animals or forces of nature)',
          tone: 'What you cultivate today carries extra weight - align thoughts, words, and actions consciously'
        },
        energeticState: 'temporarily closer to higher potential through empowered will'
      };
    }

    if (lunarDay === 25) {
      return {
        day: 25,
        theme: 'receptivity',
        qualities: ['intuition', 'subtle guidance', 'inner clarity', 'surrender'],
        approach: 'quiet perception and surrendered wisdom',
        guidance: {
          emphasis: 'Encourage yielding rather than forcing - listen for signals, synchronicities, and symbols',
          imagery: 'moonlight, flowing water, wind through trees, animals moving silently and gracefully in the night',
          tone: 'Dissolve tension, let go of control, trust inner knowing'
        },
        energeticState: 'temporarily closer to higher potential through quiet perception'
      };
    }

    return null;
  }

  /**
   * Format lunar context into a natural language string for meditation
   * @param {Object} lunarInfo - Lunar data from calculateLunarDay()
   * @returns {string} Natural language description
   */
  formatLunarContext(lunarInfo) {
    const { phase, day, percentIlluminated } = lunarInfo;

    // Create natural, non-mystical descriptions
    if (phase === 'new moon') {
      return `the new moon, invisible in the night sky`;
    }

    if (phase === 'full moon') {
      return `the full moon, bright and round overhead`;
    }

    if (phase.includes('crescent')) {
      return `a ${phase.replace('moon', '').trim()}, ${percentIlluminated}% illuminated`;
    }

    if (phase.includes('gibbous')) {
      return `the ${phase.replace('moon', '').trim()} moon, ${percentIlluminated}% illuminated`;
    }

    if (phase.includes('quarter')) {
      return `the ${phase.replace('moon', '').trim()} moon`;
    }

    // Default format
    return `the moon in its ${phase} phase`;
  }

  /**
   * Get moonrise and moonset times for a given location and date
   * @param {number} latitude - Observer latitude
   * @param {number} longitude - Observer longitude
   * @param {Date} date - Date to calculate for
   * @returns {Object} Moonrise and moonset times
   */
  getMoonTimes(latitude, longitude, date = new Date()) {
    if (!this.moonRiseSetEnabled) {
      logger.warn('Moon rise/set calculations not enabled');
      return null;
    }

    try {
      const moonTimes = SunCalc.getMoonTimes(date, latitude, longitude);
      return {
        rise: moonTimes.rise,
        set: moonTimes.set,
        alwaysUp: moonTimes.alwaysUp,
        alwaysDown: moonTimes.alwaysDown
      };
    } catch (error) {
      logger.error('Failed to calculate moon times', { error: error.message });
      return null;
    }
  }

  /**
   * Check if current time is within 10 minutes of moonrise
   * @param {number} latitude - Observer latitude
   * @param {number} longitude - Observer longitude
   * @param {Date} date - Current date/time
   * @returns {Object} Information about proximity to moonrise
   */
  isNearMoonrise(latitude, longitude, date = new Date()) {
    const moonTimes = this.getMoonTimes(latitude, longitude, date);

    if (!moonTimes || !moonTimes.rise) {
      return { near: false, moonrise: null, minutesUntil: null };
    }

    const now = date.getTime();
    const moonriseTime = moonTimes.rise.getTime();
    const diffMinutes = (moonriseTime - now) / (1000 * 60);

    // Check if within 10 minutes before or after moonrise
    const isNear = Math.abs(diffMinutes) <= 10;

    return {
      near: isNear,
      moonrise: moonTimes.rise,
      minutesUntil: Math.round(diffMinutes),
      isPast: diffMinutes < 0
    };
  }

  /**
   * Check if moon is currently visible (simple day/night heuristic)
   * @param {Date} date - Current date/time
   * @param {Object} lunarInfo - Lunar data from calculateLunarDay()
   * @returns {boolean} True if moon is likely visible
   */
  isMoonVisible(date = new Date(), lunarInfo = null) {
    const hour = date.getHours();

    // Simple heuristic: Moon often visible at night
    const isNightTime = hour >= 20 || hour <= 5;

    if (!lunarInfo) {
      lunarInfo = this.calculateLunarDay(date);
    }

    // Full moon visible all night
    if (lunarInfo.isFull) {
      return isNightTime;
    }

    // New moon not visible
    if (lunarInfo.isNew) {
      return false;
    }

    // Waxing moon visible evening/night
    if (lunarInfo.direction === 'waxing') {
      return hour >= 12; // Afternoon through night
    }

    // Waning moon visible late night/morning
    if (lunarInfo.direction === 'waning') {
      return hour <= 12; // Night through morning
    }

    return isNightTime;
  }

  /**
   * Fallback lunar data when calculations fail
   * @returns {Object} Safe default lunar data
   */
  getFallbackLunarData() {
    logger.warn('Using fallback lunar data');
    return {
      day: 15,
      phase: 'full moon',
      direction: 'waxing',
      percentIlluminated: 100,
      cyclePosition: 14.76,
      isNew: false,
      isFull: true,
      isFirstQuarter: false,
      isLastQuarter: false,
      isFallback: true
    };
  }

  /**
   * Get statistics about lunar service
   * @returns {Object} Service stats
   */
  getStats() {
    const currentLunar = this.calculateLunarDay();
    return {
      currentLunarDay: currentLunar.day,
      currentPhase: currentLunar.phase,
      moonRiseSetEnabled: this.moonRiseSetEnabled,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = LunarService;
