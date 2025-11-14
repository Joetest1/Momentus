# Google Cloud Text-to-Speech Setup Guide

This guide walks you through setting up Google Cloud Text-to-Speech for the Momentus meditation generator.

## Prerequisites

- Google Cloud account (free tier available)
- Node.js project with `@google-cloud/text-to-speech` installed

## Setup Steps

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

### 2. Enable Text-to-Speech API

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Cloud Text-to-Speech API"
3. Click on it and press "Enable"

### 3. Create Service Account

1. Go to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Name: `momentus-tts`
4. Description: `Text-to-Speech service for Momentus meditation app`
5. Click "Create and Continue"
6. For roles, add: `Text-to-Speech Client`
7. Click "Done"

### 4. Generate Service Account Key

1. Click on your newly created service account
2. Go to the "Keys" tab
3. Click "Add Key" > "Create new key"
4. Choose "JSON" format
5. Download the key file

### 5. Configure Environment

#### Option A: Service Account Key File (Recommended for Development)

1. Place the downloaded JSON key file in a secure location (e.g., `backend/config/`)
2. Add to your `.env` file:
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account-key.json
   DISABLE_TTS=false
   ```

#### Option B: Application Default Credentials (for Production)

1. Install Google Cloud SDK
2. Run: `gcloud auth application-default login`
3. Set environment variable: `GOOGLE_APPLICATION_CREDENTIALS` (optional)

### 6. Security Best Practices

1. **Never commit service account keys to version control**
2. Add the key file path to `.gitignore`:
   ```gitignore
   # Google Cloud credentials
   backend/config/*.json
   *.json
   ```
3. Use environment variables or secret management in production
4. Rotate keys regularly

### 7. Voice Configuration

The service uses British male voices by default:
- `en-GB-Standard-B` - Standard British male voice
- `en-GB-Standard-D` - Alternative British male voice
- `en-GB-Wavenet-B` - Higher quality Wavenet voice (costs more)

### 8. Pricing

- **Free Tier**: 1 million characters per month for Standard voices
- **Standard voices**: $4.00 per 1 million characters after free tier
- **WaveNet voices**: $16.00 per 1 million characters

### 9. Testing

1. Restart your Momentus server
2. Check logs for: "TTS Service initialized successfully with Google Cloud Text-to-Speech"
3. Generate an entrainment meditation with audio
4. Look for generated `.mp3` files in `backend/audio/`

### 10. Troubleshooting

#### "Authentication failed" errors:
- Verify the service account key file path is correct
- Ensure the Text-to-Speech API is enabled
- Check that the service account has the correct roles

#### "Quota exceeded" errors:
- Check your Google Cloud Console quotas
- Monitor usage in the API dashboard

#### Mock TTS fallback:
- If Google Cloud TTS fails, the service automatically falls back to mock audio generation
- Check logs for fallback messages

## Environment Variables Summary

```bash
# Required for Google Cloud TTS
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json

# Optional - disable TTS entirely
DISABLE_TTS=false
```

## Support

For Google Cloud specific issues, see the [official documentation](https://cloud.google.com/text-to-speech/docs).