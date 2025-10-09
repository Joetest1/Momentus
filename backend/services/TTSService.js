// services/TTSService.js
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

/**
 * TTSService - Text-to-Speech for meditation audio
 * Uses Google Cloud TTS with British male voice (similar to David Attenborough)
 */
class TTSService {
  constructor() {
    this.client = null;
    this.audioDir = path.join(__dirname, '../audio');
    this.initializeTTS();
  }

  async initializeTTS() {
    // Check if TTS is explicitly disabled
    if (process.env.DISABLE_TTS === 'true') {
      logger.info('TTS Service disabled via environment variable');
      this.client = null;
      return;
    }

    try {
      // Google Cloud TTS will use GOOGLE_APPLICATION_CREDENTIALS env var
      // or Application Default Credentials
      this.client = new textToSpeech.TextToSpeechClient();

      // Create audio directory if it doesn't exist
      await fs.mkdir(this.audioDir, { recursive: true });

      logger.info('TTS Service initialized successfully');
    } catch (error) {
      logger.warn('TTS Service initialization failed, audio generation disabled', {
        error: error.message
      });
      this.client = null;
    }
  }

  /**
   * Convert meditation text to speech audio
   * @param {string} text - The meditation text to convert
   * @param {string} sessionId - Session ID for file naming
   * @returns {Promise<Object>} Audio file info
   */
  async generateAudio(text, sessionId) {
    if (!this.client) {
      logger.warn('TTS client not initialized, skipping audio generation');
      return null;
    }

    try {
      // Prepare text for TTS (remove <pause> markers, add SSML breaks)
      const ssmlText = this.prepareTextForTTS(text);

      // Configure TTS request with David Attenborough-style voice
      const request = {
        input: { ssml: ssmlText },
        voice: {
          languageCode: 'en-GB',  // British English
          name: 'en-GB-Wavenet-B', // Deep male British voice (closest to Attenborough)
          ssmlGender: 'MALE'
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 0.85,  // Slower, more measured pace like Attenborough
          pitch: -2.0,         // Deeper voice
          volumeGainDb: 0.0,
          effectsProfileId: ['headphone-class-device']
        }
      };

      // Generate audio
      const [response] = await this.client.synthesizeSpeech(request);

      // Save audio file
      const filename = `meditation_${sessionId}.mp3`;
      const filepath = path.join(this.audioDir, filename);
      await fs.writeFile(filepath, response.audioContent, 'binary');

      logger.info('Audio generated successfully', {
        sessionId,
        filename,
        size: response.audioContent.length
      });

      return {
        filename,
        filepath,
        url: `/audio/${filename}`,
        size: response.audioContent.length,
        duration: this.estimateDuration(text),
        voice: 'en-GB-Wavenet-B'
      };

    } catch (error) {
      logger.error('Audio generation failed', {
        sessionId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Prepare text for TTS by converting <pause> markers to SSML breaks
   * @param {string} text - Raw meditation text
   * @returns {string} SSML formatted text
   */
  prepareTextForTTS(text) {
    // Replace <pause> markers with SSML break tags
    let ssml = text.replace(/<pause>/g, '<break time="2s"/>');

    // Add extra breaks for paragraph spacing (double line breaks)
    ssml = ssml.replace(/\n\n/g, '<break time="1.5s"/>');

    // Wrap in SSML speak tag
    ssml = `<speak>${ssml}</speak>`;

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
