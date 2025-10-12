// services/FeedbackAnalyzerService.js
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class FeedbackAnalyzerService {
  constructor() {
    this.feedbackFile = path.join(__dirname, '../logs/feedback.json');
    this.cache = null;
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.lastCacheTime = 0;
  }

  async getFeedbackData() {
    const now = Date.now();
    if (this.cache && (now - this.lastCacheTime) < this.cacheExpiry) {
      return this.cache;
    }

    try {
      const data = await fs.readFile(this.feedbackFile, 'utf8');
      this.cache = JSON.parse(data);
      this.lastCacheTime = now;
      return this.cache;
    } catch (error) {
      logger.warn('Could not read feedback data', { error: error.message });
      return [];
    }
  }

  async analyzeRecentFeedback(hoursBack = 24) {
    const feedback = await this.getFeedbackData();
    const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);

    const recentFeedback = feedback.filter(entry =>
      new Date(entry.timestamp).getTime() > cutoffTime
    );

    if (recentFeedback.length === 0) {
      return {
        sampleSize: 0,
        averages: {},
        adjustments: {},
        insights: 'No recent feedback available'
      };
    }

    // Calculate averages
    const ratings = recentFeedback.map(f => f.ratings);
    const averages = {};
    const keys = ['relevance', 'groundedness', 'engagement', 'ttsQuality', 'overall'];

    keys.forEach(key => {
      const values = ratings.map(r => r[key]).filter(v => v != null);
      averages[key] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 5;
    });

    // Generate adjustments based on averages
    const adjustments = this.generateAdjustments(averages);

    // Generate insights
    const insights = this.generateInsights(averages, recentFeedback.length);

    return {
      sampleSize: recentFeedback.length,
      averages,
      adjustments,
      insights
    };
  }

  generateAdjustments(averages) {
    const adjustments = {};

    // Relevance adjustments
    if (averages.relevance < 6) {
      adjustments.relevance = {
        priority: 'high',
        suggestions: [
          'Increase emphasis on location-specific environmental details',
          'Add more weather and lunar context integration',
          'Enhance species behavior descriptions with local habitat info'
        ]
      };
    }

    // Groundedness adjustments
    if (averages.groundedness < 6) {
      adjustments.groundedness = {
        priority: 'high',
        suggestions: [
          'Add more sensory grounding elements (touch, breath, earth connection)',
          'Include more present-moment awareness phrases',
          'Strengthen connection to physical sensations and stability'
        ]
      };
    } else if (averages.groundedness > 8) {
      adjustments.groundedness = {
        priority: 'maintain',
        suggestions: [
          'Continue emphasizing grounding techniques',
          'Build on successful stability imagery'
        ]
      };
    }

    // Engagement adjustments
    if (averages.engagement < 6) {
      adjustments.engagement = {
        priority: 'high',
        suggestions: [
          'Increase vivid nature imagery and sensory details',
          'Add more dynamic species behavior descriptions',
          'Enhance emotional connection to wildlife observations'
        ]
      };
    }

    // TTS Quality adjustments (affects formatting)
    if (averages.ttsQuality < 6) {
      adjustments.ttsQuality = {
        priority: 'medium',
        suggestions: [
          'Review TTS formatting for better natural pauses',
          'Consider adjusting paragraph lengths for audio flow'
        ]
      };
    }

    // Overall satisfaction
    if (averages.overall < 6) {
      adjustments.overall = {
        priority: 'critical',
        suggestions: [
          'Review all aspects - multiple areas need improvement',
          'Consider fundamental changes to meditation structure'
        ]
      };
    }

    return adjustments;
  }

  generateInsights(averages, sampleSize) {
    const insights = [];

    insights.push(`Based on ${sampleSize} recent feedback entr${sampleSize === 1 ? 'y' : 'ies'}`);

    // Find strengths and weaknesses
    const strengths = [];
    const weaknesses = [];

    Object.entries(averages).forEach(([key, value]) => {
      if (value >= 8) strengths.push(key);
      if (value <= 5) weaknesses.push(key);
    });

    if (strengths.length > 0) {
      insights.push(`Strong areas: ${strengths.join(', ')}`);
    }

    if (weaknesses.length > 0) {
      insights.push(`Areas for improvement: ${weaknesses.join(', ')}`);
    }

    // Overall assessment
    const overallAvg = averages.overall;
    if (overallAvg >= 8) {
      insights.push('Overall highly rated - maintain current approach');
    } else if (overallAvg >= 6) {
      insights.push('Overall moderately rated - focus on identified improvements');
    } else {
      insights.push('Overall needs significant improvement - review core experience');
    }

    return insights.join('. ');
  }

  async getPromptAdjustments() {
    const analysis = await this.analyzeRecentFeedback(24); // Last 24 hours

    if (analysis.sampleSize === 0) {
      return {}; // No adjustments if no feedback
    }

    const promptMods = {};

    // Convert adjustments to prompt modifications
    if (analysis.adjustments.relevance?.priority === 'high') {
      promptMods.environmentalFocus = 'high';
    }

    if (analysis.adjustments.groundedness?.priority === 'high') {
      promptMods.groundingEmphasis = 'high';
    } else if (analysis.adjustments.groundedness?.priority === 'maintain') {
      promptMods.groundingEmphasis = 'maintain';
    }

    if (analysis.adjustments.engagement?.priority === 'high') {
      promptMods.natureVividness = 'high';
    }

    if (analysis.adjustments.ttsQuality?.priority === 'medium') {
      promptMods.audioFormatting = 'review';
    }

    return promptMods;
  }

  async getStats() {
    const feedback = await this.getFeedbackData();
    const analysis = await this.analyzeRecentFeedback(168); // Last week

    return {
      totalEntries: feedback.length,
      recentAnalysis: analysis,
      lastUpdated: new Date().toISOString()
    };
  }
}

module.exports = FeedbackAnalyzerService;