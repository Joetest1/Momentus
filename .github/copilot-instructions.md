# AI Coding Instructions for Momentus

## Project Overview

**Momentus** is a mindful nature meditation generator that creates personalized guided meditations using real-time environmental context: location, weather, lunar phases, local species observations, and biologically accurate animal behaviors. The system orchestrates multiple APIs to generate contextually rich, nature-based meditation content with TTS audio.

## Architecture & Data Flow

### Core Orchestration Pattern
```
SessionManager → [LunarService, WeatherService, SpeciesService, BehaviorDatabase] → ContentGenerationService → TTSService
```

- **SessionManager** (`services/SessionManager.js`) - Central orchestrator that coordinates all services
- Services are injected as dependencies and follow singleton pattern via `getInstance()`
- All services use structured logging via `utils/logger.js` with file-based persistence in `/logs/`

### Key Service Boundaries

1. **External API Services**: `WeatherService`, `SpeciesService` (iNaturalist/GBIF/eBird), `LunarService`
2. **AI Content Services**: `AIProviderService` (Google Gemini + Anthropic Claude), `ContentGenerationService`
3. **Data Services**: `BehaviorDatabase` (in-memory species behavior patterns), `TTSService`

### Multi-Provider AI Pattern
- `AIProviderService.js` abstracts Google Gemini and Anthropic Claude
- Runtime switching via admin dashboard: `/api/admin/ai-config`
- Provider config stored in service instance, not environment
- Always return `{ text, provider, model }` from `generateContent()`

## Critical Workflows

### Development Commands
```bash
cd backend
npm start          # Production server
npm run dev        # Development with nodemon
npm test           # Jest with coverage
node tests/test-meditation-system.js  # Manual integration test
```

### Environment Setup
- Copy `backend/.env.example` to `backend/.env`
- Required: `GOOGLE_AI_API_KEY`, `OPENWEATHER_API_KEY`, `ANTHROPIC_API_KEY`
- Admin dashboard: `http://localhost:3000/admin.html`

### Testing Pattern
- Manual test scripts in `tests/` directory (not Jest)
- `test-meditation-system.js` - Full system integration test
- `test-inaturalist.js` - Species API validation
- No automated test suite - use manual verification

## Project-Specific Conventions

### Service Singleton Pattern
```javascript
// All services follow this pattern
const { getInstance } = require('./ServiceName');
const service = getInstance();
```

### Error Handling & Fallbacks
- All services provide fallback content on API failures
- `SessionManager.createFallbackSession()` for complete system failures
- Structured error logging with context objects

### Logging Pattern
```javascript
const logger = require('../utils/logger');
logger.info('Message', { contextObject });  // Always include context
logger.debug('Detailed info', { sessionId, data });
```

### Request Validation
- Custom middleware in `middleware/validation.js`
- Validate lat/lng bounds, duration limits (60-3600s), mood enums
- Return structured error responses with field-specific messages

### Lunar Context Rules
- Only mention moon if: within 10min of moonrise OR nighttime
- Use `LunarService.formatLunarContext()` for consistent formatting
- Special lunar days (1, 8, 15, 23) get enhanced context

### Species & Behavior Integration
- `BehaviorDatabase` maps species types to time-of-day/weather behaviors
- Species selection has expanding radius fallback (1.6km → 8km → 32km)
- Always validate species data before behavior selection

## File Organization

### Services Directory Pattern
- Each service is self-contained with error handling
- Caching implemented per-service (not centralized)
- External API services include rate limiting and retry logic

### Routes Structure
- `sessionRoutes.js` - Core meditation session API
- `adminRoutes.js` - Basic admin authentication  
- `adminDashboardRoutes.js` - AI provider management, testing, stats

### Static Assets
- Admin dashboard: `backend/public/admin.html` (single-page app)
- Generated audio files: `backend/audio/` (served via `/audio` route)
- No separate frontend build process

## Integration Points

### External APIs
- **Weather**: OpenWeatherMap with fallback descriptions
- **Species**: iNaturalist (primary), GBIF, eBird (progressive fallback)
- **AI**: Google Gemini models, Anthropic Claude models
- **TTS**: Google Cloud Text-to-Speech (optional)

### Admin Dashboard Communication
- REST API for provider switching: `POST /api/admin/ai-config`
- Real-time testing: `POST /api/admin/test-ai`
- System stats: `GET /api/admin/stats`

## Common Patterns to Follow

- **Service Dependencies**: Inject via constructor, use getInstance() pattern
- **Async Operations**: Always wrap in try/catch with structured error logging
- **API Responses**: Return `{ success: boolean, data/error, message? }` format
- **Caching**: Implement per-service with TTL cleanup using setTimeout
- **Validation**: Use middleware for request validation, service-level for business logic

## Debugging

- Check `/backend/logs/YYYY-MM-DD.log` for structured JSON logs
- Admin dashboard shows live system stats and API test results  
- Set `LOG_LEVEL=debug` in `.env` for detailed service interactions
- Manual test scripts provide step-by-step system verification