# Admin Dashboard Guide

## 🎯 Overview

The Momentus Admin Dashboard lets you:
- **Switch AI providers** between Google Gemini and Anthropic Claude
- **Test different models** (Gemini 1.5 Pro, 2.0 Flash, Claude 3.5 Sonnet, etc.)
- **Preview meditations** with different API combinations
- **Monitor system stats** (sessions, lunar phase, behaviors)

---

## 🚀 Quick Start

### 1. Get Your Anthropic Claude API Key

**Visit:** https://console.anthropic.com/settings/keys

1. Sign up or log in to Anthropic Console
2. Click "Create Key"
3. Copy your API key (starts with `sk-ant-...`)

### 2. Add API Key to .env

Open `/backend/.env` and update line 14:

```bash
ANTHROPIC_API_KEY=sk-ant-your_actual_key_here
```

### 3. Start the Server

```bash
cd backend
npm start
```

### 4. Open the Dashboard

Visit: **http://localhost:3000/admin.html**

---

## 📊 Dashboard Features

### AI Provider & Model Selection

**Google Gemini Models:**
- `gemini-1.5-pro` - High quality, medium speed
- `gemini-1.5-flash` - Fast, good quality
- `gemini-2.0-flash-exp` - Very fast, experimental (cutting edge!)

**Anthropic Claude Models:**
- `claude-3-5-sonnet-20241022` - **Latest & Best** - Fast, excellent quality
- `claude-3-opus-20240229` - Highest quality, medium speed
- `claude-3-sonnet-20240229` - Fast, high quality

### How to Use

1. **Select Provider:** Click on Google or Claude card
2. **Choose Model:** Pick from dropdown
3. **Test Provider:** Click "Test Provider" to verify it works
4. **Save Config:** Click "💾 Save Configuration"

### Test Meditation Generation

1. Enter latitude/longitude (default: Loma Linda, CA)
2. Click "Generate Test Meditation"
3. See real-time meditation with:
   - Selected AI provider
   - Real species from your location
   - Lunar phase context
   - Biologically accurate behavior

### System Statistics

Monitor in real-time:
- Active sessions
- Current lunar day
- Total behavior patterns (21)
- Species types (5)

---

## 🔧 API Combinations

### Available Combinations:

| Provider | Model | Speed | Quality | Best For |
|----------|-------|-------|---------|----------|
| Google | gemini-2.0-flash-exp | ⚡⚡⚡ Very Fast | ⭐⭐⭐⭐ Excellent | Latest tech, fastest |
| Anthropic | claude-3-5-sonnet | ⚡⚡ Fast | ⭐⭐⭐⭐⭐ Excellent | Best balance |
| Anthropic | claude-3-opus | ⚡ Medium | ⭐⭐⭐⭐⭐ Highest | Max quality |
| Google | gemini-1.5-pro | ⚡⚡ Fast | ⭐⭐⭐⭐ High | Reliable choice |

### Current Configuration

**What's Working:**
✅ OpenWeather API (real weather data)
✅ eBird API (real bird observations)
✅ iNaturalist (species photos + observations)
✅ GBIF (biodiversity data)
✅ Lunar calculations
✅ 21 biologically accurate behaviors

---

## 🧪 Testing Workflow

### Quick Test Checklist:

1. **Test Google Gemini:**
   - Select "Google Gemini"
   - Choose `gemini-2.0-flash-exp` (latest!)
   - Click "Test Provider"
   - Should see ✅ Success

2. **Test Claude (if key added):**
   - Select "Anthropic Claude"
   - Choose `claude-3-5-sonnet-20241022`
   - Click "Test Provider"
   - Should see ✅ Success

3. **Generate Full Meditation:**
   - Enter coordinates (or use default)
   - Click "Generate Test Meditation"
   - Review the output for:
     - Real species name
     - Lunar phase mention
     - Biologically accurate behavior
     - Natural language flow

4. **Save Best Config:**
   - Once you find the best provider/model
   - Click "💾 Save Configuration"
   - This becomes the default for all meditations

---

## 📈 Performance Comparison

### Response Times (Typical):

- **gemini-2.0-flash-exp**: 1-2 seconds ⚡
- **claude-3-5-sonnet**: 2-3 seconds ⚡
- **gemini-1.5-pro**: 3-4 seconds
- **claude-3-opus**: 5-8 seconds (highest quality)

### Quality Assessment:

**For Nature Meditations:**
- **Claude 3.5 Sonnet** → Best sensory detail, natural flow
- **Gemini 2.0 Flash** → Fast, vivid imagery, good variety
- **Claude 3 Opus** → Most sophisticated language, slowest
- **Gemini 1.5 Pro** → Reliable, balanced

**Recommendation:** Start with **claude-3-5-sonnet-20241022** for best overall results.

---

## 🔐 Security Notes

### API Key Security:
- ✅ Never commit `.env` to git
- ✅ Dashboard is local (localhost only by default)
- ✅ Rate limiting active on all endpoints
- ✅ Admin routes can be IP-restricted (see `ADMIN_ALLOWED_IPS`)

### Production Deployment:
If deploying to production:
1. Add authentication to `/admin.html` route
2. Restrict `ADMIN_ALLOWED_IPS` to your IP
3. Use HTTPS
4. Set up environment-specific `.env` files

---

## 💰 Cost Estimates

### Google Gemini:
- **Free tier**: 15 requests/minute, 1,500/day
- **Paid**: ~$0.00025 per meditation (very cheap)

### Anthropic Claude:
- **Free tier**: None (pay-as-you-go)
- **Claude 3.5 Sonnet**: ~$0.003 per meditation
- **Claude 3 Opus**: ~$0.015 per meditation

**Recommendation**: Use Google for high-volume testing, Claude for production quality.

---

## 🛠️ Troubleshooting

### "Provider not initialized"
**Solution:**
- Check API key in `.env`
- Restart server: `npm start`
- Verify key format:
  - Google: starts with `AIza...`
  - Anthropic: starts with `sk-ant-...`

### "404 Not Found" for models
**Google Models:**
- Try `gemini-1.5-pro` instead of `gemini-pro`
- Use `gemini-2.0-flash-exp` for latest

**Claude Models:**
- Use full version string: `claude-3-5-sonnet-20241022`
- Not just: `claude-3-sonnet`

### Dashboard not loading
**Check:**
```bash
# Is server running?
curl http://localhost:3000/health

# Is static files enabled?
# Should see: app.use(express.static('public')); in server.js
```

---

## 📱 API Endpoints

### Admin API Endpoints:

```bash
# Get current config
GET /api/admin/ai-config

# Update config
POST /api/admin/ai-config
{
  "provider": "anthropic",
  "model": "claude-3-5-sonnet-20241022"
}

# Test provider
POST /api/admin/test-ai
{
  "provider": "google",
  "model": "gemini-2.0-flash-exp"
}

# Test meditation
POST /api/admin/test-meditation
{
  "latitude": 34.0522,
  "longitude": -117.2437,
  "provider": "anthropic",
  "model": "claude-3-5-sonnet-20241022"
}

# Get stats
GET /api/admin/stats
```

---

## 🎯 Next Steps

1. ✅ Add Anthropic API key to `.env`
2. ✅ Start server: `npm start`
3. ✅ Open dashboard: `http://localhost:3000/admin.html`
4. ✅ Test both providers
5. ✅ Compare meditation quality
6. ✅ Save best configuration
7. ✅ Generate production meditations!

---

## 📚 Additional Resources

- **Google AI Studio**: https://aistudio.google.com/app/apikey
- **Anthropic Console**: https://console.anthropic.com/settings/keys
- **Gemini Models**: https://ai.google.dev/models/gemini
- **Claude Models**: https://docs.anthropic.com/claude/docs/models-overview

---

**Need help?** Check the server logs or test individual endpoints with curl!
