// services/WeatherService.js
const axios = require('axios');
const APIService = require('./APIService');
const logger = require('../utils/logger');

class WeatherService {
  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY;
    this.baseUrl = 'https://api.openweathermap.org/data/2.5/weather';
    this.cache = new Map();
    this.cacheDuration = 600000;
  }

  async getWeather(latitude, longitude) {
    const cacheKey = `${latitude.toFixed(2)}_${longitude.toFixed(2)}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheDuration) {
        logger.debug('Using cached weather data', { cacheKey });
        return cached.data;
      }
    }

    try {
      const weatherData = await APIService.queueRequest(
        'weather',
        async () => {
          if (!this.apiKey) {
            throw new Error('Weather API key not configured');
          }

          const response = await axios.get(this.baseUrl, {
            params: {
              lat: latitude,
              lon: longitude,
              appid: this.apiKey,
              units: 'metric'
            },
            timeout: 10000
          });

          return response.data;
        }
      );

      const parsed = this.parseWeatherData(weatherData);
      
      this.cache.set(cacheKey, {
        data: parsed,
        timestamp: Date.now()
      });

      logger.info('Weather data retrieved successfully', { 
        location: { latitude, longitude },
        condition: parsed.condition 
      });

      return parsed;

    } catch (error) {
      logger.error('Failed to retrieve weather data', { 
        error: error.message,
        latitude,
        longitude 
      });

      return this.getFallbackWeather();
    }
  }

  parseWeatherData(data) {
    const condition = data.weather[0]?.main?.toLowerCase() || 'clear';
    const description = data.weather[0]?.description || 'pleasant conditions';
    const temperature = Math.round(data.main?.temp || 20);
    const humidity = data.main?.humidity || 50;
    const windSpeed = data.wind?.speed || 0;
    const cloudiness = data.clouds?.all || 0;

    return {
      condition,
      description: this.enrichDescription(condition, description),
      temperature,
      humidity,
      windSpeed,
      cloudiness,
      feels_like: Math.round(data.main?.feels_like || temperature),
      pressure: data.main?.pressure,
      visibility: data.visibility,
      sunrise: data.sys?.sunrise,
      sunset: data.sys?.sunset,
      location: {
        name: data.name,
        country: data.sys?.country
      },
      rawCondition: data.weather[0]?.main,
      rawDescription: data.weather[0]?.description
    };
  }

  enrichDescription(condition, description) {
    const enrichments = {
      clear: 'The sky is clear and open, with unobstructed views above',
      clouds: 'Clouds drift across the sky, ever-changing patterns of light and shadow',
      rain: 'Rain falls steadily, each drop a small percussion in nature\'s rhythm',
      drizzle: 'A gentle drizzle mists the air, soft and persistent',
      thunderstorm: 'Thunder rolls in the distance, nature\'s grand percussion',
      snow: 'Snow falls quietly, each flake a unique crystalline creation',
      mist: 'Mist hangs in the air, softening the edges of the world',
      fog: 'Fog blankets the landscape, creating an intimate, enclosed space',
      wind: 'Wind moves through the air, invisible but powerfully present'
    };

    return enrichments[condition] || description;
  }

  getFallbackWeather() {
    logger.info('Using fallback weather data');
    
    return {
      condition: 'unknown',
      description: 'Current weather conditions',
      temperature: 20,
      humidity: 50,
      windSpeed: 0,
      cloudiness: 50,
      feels_like: 20,
      isFallback: true
    };
  }

  clearCache() {
    const size = this.cache.size;
    this.cache.clear();
    logger.info(`Cleared ${size} cached weather entries`);
  }

  getStats() {
    return {
      cacheSize: this.cache.size,
      apiConfigured: !!this.apiKey,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = WeatherService;