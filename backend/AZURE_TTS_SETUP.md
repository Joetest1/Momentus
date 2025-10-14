# Azure Text-to-Speech Setup Guide

## Why Azure TTS?

- ✅ **Free Tier**: 500,000 characters per month (enough for ~80-100 meditations)
- ✅ **High Quality**: Natural neural voices with emotional depth
- ✅ **Easy Setup**: Simple REST API, no complex authentication
- ✅ **British Voice**: Ryan (en-GB-RyanNeural) - perfect for meditation narration

## Setup Instructions

### 1. Create Azure Account
1. Go to https://azure.microsoft.com/free/
2. Sign up for free account (requires credit card for verification, but won't charge without upgrade)
3. Get $200 free credit + free services for 12 months

### 2. Create Speech Service Resource
1. Go to https://portal.azure.com/
2. Click **"Create a resource"**
3. Search for **"Speech"**
4. Click **"Create"** on "Speech Services"
5. Fill in:
   - **Subscription**: Your subscription
   - **Resource group**: Create new (e.g., "momentus-resources")
   - **Region**: Choose closest (e.g., "East US")
   - **Name**: Choose unique name (e.g., "momentus-tts")
   - **Pricing tier**: **Free F0** (500K characters/month)
6. Click **"Review + create"** then **"Create"**

### 3. Get API Key
1. Once deployed, go to your Speech resource
2. Click **"Keys and Endpoint"** in left sidebar
3. Copy **KEY 1** (starts with a long string)
4. Note the **REGION** (e.g., "eastus")

### 4. Add to Environment Variables

**Local Development (.env file):**
```bash
AZURE_TTS_API_KEY=your_key_here
AZURE_TTS_REGION=eastus
DISABLE_TTS=false
```

**Railway Production:**
```bash
railway variables --set AZURE_TTS_API_KEY=your_key_here
railway variables --set AZURE_TTS_REGION=eastus
railway variables --set DISABLE_TTS=false
```

### 5. Test TTS
Generate a meditation and check for audio player. Audio file should download as MP3.

## Voice Information

**Current Voice**: `en-GB-RyanNeural`
- Natural British male voice
- Calm, measured, documentary-style delivery
- Perfect for meditation and mindfulness content

## Troubleshooting

**No audio generated:**
- Check API key is correct
- Verify region matches your Azure resource
- Check Railway logs: `railway logs --tail 50`

**403 Forbidden:**
- API key is invalid
- Resource might be in different region

**429 Too Many Requests:**
- Free tier limit exceeded (500K chars/month)
- Wait until next month or upgrade to paid tier

## Alternative: Disable TTS

If you don't want audio:
```bash
DISABLE_TTS=true
```

Meditations will still work perfectly as text-only.
