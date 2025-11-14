// services/TTSService.js
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

/**
 * TTSService - Text-to-Speech for meditation audio
 * Uses Google Cloud Text-to-Speech with natural British male voice
 */
class TTSService {
  constructor() {
    this.client = null;
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

      // Initialize Google Cloud TTS client
      try {
        this.client = new textToSpeech.TextToSpeechClient();
        
        // Test the client with a simple request to verify credentials
        await this.client.listVoices({ languageCode: 'en-GB' });
        
        this.isEnabled = true;
        logger.info('TTS Service initialized successfully with Google Cloud Text-to-Speech');
      } catch (authError) {
        logger.warn('Google Cloud TTS credentials not configured, using mock TTS for development', {
          error: authError.message
        });
        this.client = null;
        this.isEnabled = true; // Enable mock TTS
      }
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
  async generateAudio(text, options = {}) {
    if (!this.isEnabled) {
      throw new Error('TTS Service is not enabled');
    }

    const {
      voice = 'en-GB-Standard-B', // Google Cloud male British voice
      speed = 0.9,
      pitch = 0,
      outputFormat = 'MP3'
    } = options;

    try {
      logger.debug('Generating audio with Google Cloud TTS', {
        voice,
        speed,
        pitch,
        textLength: text.length
      });

      // Use Google Cloud TTS if client is available
      if (this.client) {
        const request = {
          input: { text },
          voice: {
            languageCode: 'en-GB',
            name: voice,
            ssmlGender: 'MALE'
          },
          audioConfig: {
            audioEncoding: outputFormat,
            speakingRate: speed,
            pitch: pitch
          }
        };

        const [response] = await this.client.synthesizeSpeech(request);
        const audioData = response.audioContent;
        
        const filename = `meditation_${Date.now()}.mp3`;
        const filepath = path.join(this.audioDir, filename);

        await fs.writeFile(filepath, audioData, 'binary');

        logger.info('Audio generated successfully with Google Cloud TTS', {
          filename,
          size: audioData.length,
          voice
        });

        return {
          filename,
          filepath,
          size: audioData.length,
          duration: this.estimateDuration(text)
        };
      }

      // Fallback to mock TTS if Google Cloud is not configured
      logger.info('Google Cloud TTS not available, using mock audio generation');
      return await this.generateMockAudio(text, voice);

    } catch (error) {
      logger.error('Audio generation failed', {
        error: error.message,
        voice,
        textLength: text.length
      });

      // Fallback to mock audio on error
      logger.info('Falling back to mock audio generation');
      return await this.generateMockAudio(text, voice);
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

  /**
   * Generate mock audio file for development when Azure TTS is not configured
   * @param {string} text - The meditation text
   * @param {string} sessionId - Session ID for file naming
   * @returns {Promise<Object>} Mock audio file info
   */
  async generateMockAudio(text, sessionId) {
    try {
      // Calculate duration first
      const estimatedDuration = this.estimateDuration(text);
      const audioDuration = Math.max(estimatedDuration, 30); // At least 30 seconds
      
      // Create both a text file for the script and a simple WAV file for the audio player
      const baseFilename = `meditation_${sessionId}`;
      const txtFilename = `${baseFilename}.txt`;
      const wavFilename = `${baseFilename}.wav`;
      const txtFilepath = path.join(this.audioDir, txtFilename);
      const wavFilepath = path.join(this.audioDir, wavFilename);
      
      // Create a text file with the script
      const mockContent = `MOCK AUDIO FILE - DEVELOPMENT MODE
Generated: ${new Date().toISOString()}
Session: ${sessionId}
Text Length: ${text.length} characters
Estimated Duration: ${audioDuration} seconds (${Math.round(audioDuration/60)} minutes)
Voice: en-GB-RyanNeural (British Documentary Style)

AUDIO EXPERIENCE:
The WAV file contains ${audioDuration} seconds of silence as a placeholder.
In production with Azure TTS, this would be a full spoken meditation
with natural British male voice, documentary-style pacing, and proper
meditation pauses and breathing spaces.

MEDITATION CONTENT THAT WOULD BE SPOKEN:
${text}

[TO ENABLE REAL TTS AUDIO:
1. Get Azure Cognitive Services TTS API key from Microsoft Azure
2. Add AZURE_TTS_API_KEY=your_key to .env file
3. Add AZURE_TTS_REGION=eastus to .env file  
4. Restart server
5. The same meditation will then generate with full voice narration]`;

      await fs.writeFile(txtFilepath, mockContent, 'utf8');

      // Create a WAV file with silence matching the meditation duration
      const sampleRate = 44100;
      const duration = audioDuration; // Use the calculated duration from above
      const numSamples = sampleRate * duration;
      const numChannels = 1;
      const bytesPerSample = 2;
      
      const bufferSize = 44 + (numSamples * numChannels * bytesPerSample);
      const buffer = Buffer.alloc(bufferSize);
      
      // WAV header
      buffer.write('RIFF', 0);
      buffer.writeUInt32LE(bufferSize - 8, 4);
      buffer.write('WAVE', 8);
      buffer.write('fmt ', 12);
      buffer.writeUInt32LE(16, 16); // PCM format chunk size
      buffer.writeUInt16LE(1, 20);  // PCM format
      buffer.writeUInt16LE(numChannels, 22);
      buffer.writeUInt32LE(sampleRate, 24);
      buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28);
      buffer.writeUInt16LE(numChannels * bytesPerSample, 32);
      buffer.writeUInt16LE(bytesPerSample * 8, 34);
      buffer.write('data', 36);
      buffer.writeUInt32LE(numSamples * numChannels * bytesPerSample, 40);
      
      // Fill with silence (zeros)
      buffer.fill(0, 44);
      
      await fs.writeFile(wavFilepath, buffer);

      logger.info('Mock audio files generated for development', {
        sessionId,
        txtFilename,
        wavFilename,
        textLength: text.length
      });

      return {
        filename: wavFilename,
        filepath: wavFilepath,
        url: `/audio/${wavFilename}`,
        size: buffer.length,
        duration: this.estimateDuration(text),
        voice: 'mock-en-GB-RyanNeural',
        isMock: true,
        scriptUrl: `/audio/${txtFilename}`
      };

    } catch (error) {
      logger.error('Mock audio generation failed', { sessionId, error: error.message });
      return null;
    }
  }

  getStats() {
    return {
      enabled: this.isEnabled,
      voice: this.apiKey ? 'en-GB-RyanNeural (Azure TTS)' : 'Mock TTS for Development',
      audioDir: this.audioDir,
      hasAzureKey: !!this.apiKey
    };
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new TTSService();
    }
    return instance;
  },
  TTSService
};
