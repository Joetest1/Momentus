// services/TTSService.js
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

/**
 * TTSService - Text-to-Speech for meditation audio
 * Uses Azure Cognitive Services TTS with natural British male voice
 */
class TTSService {
  constructor() {
    this.apiKey = process.env.AZURE_TTS_API_KEY || null;
    this.region = process.env.AZURE_TTS_REGION || 'eastus';
    this.endpoint = `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/v1`;
    this.audioDir = path.join(__dirname, '../audio');
    this.isEnabled = false;
    this.initializeTTS();
  }

  async initializeTTS() {
    // Check if TTS is explicitly disabled
    if (process.env.DISABLE_TTS === 'true') {
      logger.info('TTS Service disabled via environment variable');
      this.isEnabled = false;
      return;
    }

    try {
      // Create audio directory if it doesn't exist
      await fs.mkdir(this.audioDir, { recursive: true });

      if (!this.apiKey) {
        logger.warn('Azure TTS API key not configured, audio generation disabled');
        this.isEnabled = false;
        return;
      }

      this.isEnabled = true;
      logger.info('TTS Service initialized successfully with Azure Cognitive Services');
    } catch (error) {
      logger.warn('TTS Service initialization failed, audio generation disabled', {
        error: error.message
      });
      this.isEnabled = false;
    }
  }

  /**
   * Convert meditation text to speech audio using Azure TTS
   * @param {string} text - The meditation text to convert
   * @param {string} sessionId - Session ID for file naming
   * @returns {Promise<Object>} Audio file info
   */
  async generateAudio(text, sessionId) {
    if (!this.isEnabled) {
      logger.debug('TTS not enabled, skipping audio generation');
      return null;
    }

    try {
      // Prepare text for TTS (convert to SSML with pauses)
      const ssmlText = this.prepareTextForTTS(text);

      // Azure TTS request with British male voice (Ryan - natural, documentary-style)
      const ssml = `<speak version='1.0' xml:lang='en-GB'>
        <voice name='en-GB-RyanNeural'>
          <prosody rate='0.85' pitch='-5%'>
            ${ssmlText}
          </prosody>
        </voice>
      </speak>`;

      // Make request to Azure TTS API
      const response = await axios.post(
        this.endpoint,
        ssml,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.apiKey,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3'
          },
          responseType: 'arraybuffer',
          timeout: 60000
        }
      );

      // Save audio file
      const filename = `meditation_${sessionId}.mp3`;
      const filepath = path.join(this.audioDir, filename);
      await fs.writeFile(filepath, Buffer.from(response.data));

      logger.info('Audio generated successfully with Azure TTS', {
        sessionId,
        filename,
        size: response.data.byteLength,
        voice: 'en-GB-RyanNeural'
      });

      return {
        filename,
        filepath,
        url: `/audio/${filename}`,
        size: response.data.byteLength,
        duration: this.estimateDuration(text),
        voice: 'en-GB-RyanNeural'
      };

    } catch (error) {
      logger.error('Audio generation failed with Azure TTS', {
        sessionId,
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      return null;
    }
  }

  /**
   * Prepare text for Azure TTS by converting pause markers to SSML breaks
   * @param {string} text - Raw meditation text
   * @returns {string} SSML formatted text (without outer speak tag)
   */
  prepareTextForTTS(text) {
    // Replace ellipsis pauses (...) with SSML break tags
    let ssml = text.replace(/\.\.\./g, '<break time="2s"/>');

    // Add extra breaks for paragraph spacing (double line breaks)
    ssml = ssml.replace(/\n\n/g, '<break time="1.5s"/>');
    
    // Replace single newlines with shorter breaks
    ssml = ssml.replace(/\n/g, '<break time="800ms"/>');

    return ssml;
  }

  /**
   * Estimate audio duration based on text length
   * @param {string} text - Meditation text
   * @returns {number} Estimated duration in seconds
   */
  estimateDuration(text) {
    // David Attenborough speaks at ~120-130 words per minute (slower, more measured)
    const words = text.split(/\s+/).length;
    const wordsPerSecond = 130 / 60; // ~2.16 words/second
    const baseTime = words / wordsPerSecond;

    // Add time for pauses
    const pauseCount = (text.match(/<pause>/g) || []).length;
    const pauseTime = pauseCount * 2; // 2 seconds per pause

    const paragraphBreaks = (text.match(/\n\n/g) || []).length;
    const breakTime = paragraphBreaks * 1.5; // 1.5 seconds per paragraph

    return Math.round(baseTime + pauseTime + breakTime);
  }

  /**
   * Get available voices for testing
   * @returns {Promise<Array>} Available British male voices
   */
  async getAvailableVoices() {
    if (!this.client) {
      return [];
    }

    try {
      const [result] = await this.client.listVoices({ languageCode: 'en-GB' });
      const voices = result.voices
        .filter(voice => voice.ssmlGender === 'MALE')
        .map(voice => ({
          name: voice.name,
          languageCode: voice.languageCodes[0],
          naturalSampleRateHertz: voice.naturalSampleRateHertz
        }));

      return voices;
    } catch (error) {
      logger.error('Failed to list voices', { error: error.message });
      return [];
    }
  }

  /**
   * Clean up old audio files (older than 24 hours)
   */
  async cleanupOldAudio() {
    try {
      const files = await fs.readdir(this.audioDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const file of files) {
        if (!file.endsWith('.mp3')) continue;

        const filepath = path.join(this.audioDir, file);
        const stats = await fs.stat(filepath);
        const age = now - stats.mtimeMs;

        if (age > maxAge) {
          await fs.unlink(filepath);
          logger.debug('Deleted old audio file', { file, age: Math.round(age / 1000 / 60) });
        }
      }
    } catch (error) {
      logger.error('Audio cleanup failed', { error: error.message });
    }
  }

  getStats() {
    return {
      enabled: !!this.client,
      voice: 'en-GB-Wavenet-B (David Attenborough style)',
      audioDir: this.audioDir
    };
  }
}

module.exports = TTSService;
