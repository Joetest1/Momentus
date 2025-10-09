// services/AIProviderService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');

/**
 * AIProviderService - Multi-provider AI content generation
 * Supports: Google Gemini, Anthropic Claude
 */
class AIProviderService {
  constructor() {
    this.providers = {
      google: null,
      anthropic: null
    };

    // Available models (using correct model IDs)
    this.availableModels = {
      google: ['gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-1.5-pro'],
      anthropic: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
    };

    // Current configuration (can be changed via admin dashboard)
    this.config = {
      provider: process.env.AI_PROVIDER || 'google',
      model: process.env.AI_MODEL || 'gemini-2.0-flash-exp'
    };

    this.initializeProviders();
  }

  initializeProviders() {
    // Initialize Google AI
    try {
      const googleKey = process.env.GOOGLE_AI_API_KEY;
      if (googleKey) {
        this.providers.google = new GoogleGenerativeAI(googleKey);
        logger.info('Google AI provider initialized');
      }
    } catch (error) {
      logger.error('Failed to initialize Google AI', { error: error.message });
    }

    // Initialize Anthropic Claude
    try {
      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      if (anthropicKey) {
        this.providers.anthropic = new Anthropic({
          apiKey: anthropicKey
        });
        logger.info('Anthropic Claude provider initialized');
      }
    } catch (error) {
      logger.error('Failed to initialize Anthropic', { error: error.message });
    }
  }

  /**
   * Generate content using configured provider
   */
  async generateContent(prompt, options = {}) {
    const provider = options.provider || this.config.provider;
    const model = options.model || this.config.model;

    logger.info('Generating content', { provider, model });

    switch (provider) {
      case 'google':
        return await this.generateWithGoogle(prompt, model);
      case 'anthropic':
        return await this.generateWithClaude(prompt, model);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Generate with Google Gemini
   */
  async generateWithGoogle(prompt, model) {
    if (!this.providers.google) {
      throw new Error('Google AI not initialized');
    }

    const geminiModel = this.providers.google.getGenerativeModel({ model });
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;

    return {
      text: response.text(),
      provider: 'google',
      model: model,
      usage: {
        promptTokens: result.response?.usageMetadata?.promptTokenCount || 0,
        completionTokens: result.response?.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: result.response?.usageMetadata?.totalTokenCount || 0
      }
    };
  }

  /**
   * Generate with Anthropic Claude
   */
  async generateWithClaude(prompt, model) {
    if (!this.providers.anthropic) {
      throw new Error('Anthropic not initialized');
    }

    const response = await this.providers.anthropic.messages.create({
      model: model,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    return {
      text: response.content[0].text,
      provider: 'anthropic',
      model: model,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens
      }
    };
  }

  /**
   * Set configuration (called from admin dashboard)
   */
  setConfig(provider, model) {
    if (!this.availableModels[provider]) {
      throw new Error(`Invalid provider: ${provider}`);
    }

    if (!this.availableModels[provider].includes(model)) {
      throw new Error(`Invalid model ${model} for provider ${provider}`);
    }

    this.config = { provider, model };
    logger.info('AI configuration updated', { provider, model });

    return this.config;
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      ...this.config,
      availableProviders: Object.keys(this.providers).filter(p => this.providers[p] !== null),
      availableModels: this.availableModels,
      providersInitialized: {
        google: !!this.providers.google,
        anthropic: !!this.providers.anthropic
      }
    };
  }

  /**
   * Test a provider/model combination
   */
  async testProvider(provider, model) {
    try {
      const testPrompt = 'Generate a single sentence about mindfulness in nature.';
      const result = await this.generateContent(testPrompt, { provider, model });

      return {
        success: true,
        provider,
        model,
        responseLength: result.text.length,
        usage: result.usage,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        provider,
        model,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get provider statistics
   */
  getStats() {
    return {
      currentConfig: this.config,
      providers: {
        google: {
          initialized: !!this.providers.google,
          models: this.availableModels.google
        },
        anthropic: {
          initialized: !!this.providers.anthropic,
          models: this.availableModels.anthropic
        }
      },
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new AIProviderService();
    }
    return instance;
  },
  AIProviderService
};
