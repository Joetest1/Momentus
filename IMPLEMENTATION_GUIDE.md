# Mindful Nature Meditation Generator - Implementation Guide

## Overview

The **iphone2-Momentus** app generates guided nature meditations using **real-time environmental context**: device location, datetime, lunar phase, local species observations, and biologically accurate animal behaviors.

---

## System Architecture

### Core Flow

```
User Request (lat, lng, preferences)
    ↓
SessionManager orchestrates:
    ↓
1. LunarService → Calculate moon phase/day
2. WeatherService → Get current conditions
3. SpeciesService → Query APIs (iNaturalist/GBIF/eBird)
4. BehaviorDatabase → Select context-aware behavior
    ↓
ContentGenerationService → Generate meditation
    ↓
Return TTS-ready meditation with:
- Species + biologically accurate behavior
- Lunar context (when relevant)
- Real-time weather + location
- Natural pause markers for audio
```

---

## New Services

### 1. LunarService.js
**Purpose**: Real-time lunar calculations
**Location**: `backend/services/LunarService.js`

**Key Methods**:
- `calculateLunarDay(date)` → Returns:
  ```javascript
  {
    day: 13,                    // Lunar day 1-30
    phase: "waxing gibbous",    // Moon phase name
    direction: "waxing",        // waxing/waning
    percentIlluminated: 87,     // 0-100%
    isFull: false,
    isNew: false
  }
  ```
- `formatLunarContext(lunarInfo)` → Natural language string
  - Example: "the waxing gibbous moon on Day 13"
- `isLunarDayRelevant(day)` → Checks if day is significant (1, 7-8, 10, 14-16, etc.)
- `isMoonVisible(date, lunarInfo)` → Heuristic for visibility

**Algorithm**: Synodic month calculation (29.53 days) from reference new moon (2000-01-06)

---

### 2. BehaviorDatabase.js
**Purpose**: Biologically accurate animal behaviors
**Location**: `backend/services/BehaviorDatabase.js`

**Database Structure**:
```javascript
{
  bird: {
    common: [
      {
        behavior: "foraging for insects",
        timeOfDay: ["morning", "afternoon"],
        weather: ["clear", "clouds"],
        season: ["spring", "summer", "fall"],
        description: "Methodically searching through leaf litter...",
        source: "Cornell Lab of Ornithology"
      }
    ],
    nocturnal: [...]
  },
  mammal: {...},
  insect: {...},
  amphibian: {...},
  reptile: {...}
}
```

**Key Methods**:
- `getBehaviorsForSpecies(type, context)` → Filter by time/weather/season/lunar
- `selectBehavior(type, context)` → Weighted random selection

**Total Behaviors**: 20+ sourced from Cornell Lab, behavior studies

---

### 3. GBIFService.js
**Purpose**: Global Biodiversity Information Facility API integration
**Location**: `backend/services/GBIFService.js`

**Features**:
- **Free, no API key required**
- Species occurrences with geospatial filtering
- Radius-based search using Haversine formula
- Recent observations only (last 2 years)

**Key Methods**:
- `getOccurrences(lat, lng, options)` → Recent species in area
- `getUniqueSpecies(occurrences)` → Deduplicated list with counts
- `searchSpecies(name)` → Lookup by common/scientific name

**Configuration** (.env):
```bash
GBIF_BASE_URL=https://api.gbif.org/v1
GBIF_MAX_RESULTS=20
GBIF_SEARCH_RADIUS=5  # km
GBIF_RECENT_YEARS=2
```

---

### 4. eBirdService.js
**Purpose**: Real-time bird observations from eBird
**Location**: `backend/services/eBirdService.js`

**Features**:
- Recent bird sightings (last 14 days)
- Notable/rare bird detection
- Birding hotspot discovery
- **Requires free API key**: https://ebird.org/api/keygen

**Key Methods**:
- `getRecentObservations(lat, lng)` → Recent bird activity
- `getNotableObservations(lat, lng)` → Rare sightings
- `getNearbyHotspots(lat, lng)` → Active birding locations
- `getMostActiveSpecies(observations, limit)` → Ranked by frequency

**Configuration** (.env):
```bash
EBIRD_API_KEY=your_key_here
EBIRD_BASE_URL=https://api.ebird.org/v2
EBIRD_DAYS_BACK=14
EBIRD_HOTSPOT_RADIUS=25  # km
```

---

## Enhanced Services

### 5. SpeciesService.js (Enhanced)
**Purpose**: Aggregate real-time species data from multiple APIs
**Location**: `backend/services/SpeciesService.js`

**New Features**:
- Parallel API querying (iNaturalist + GBIF + eBird)
- Cross-source data normalization
- Intelligent species ranking by:
  - Occurrence frequency
  - Observation recency (24hr boost = +10 points)
  - Photo availability (+5 points)
  - Description quality (+3 points)
  - User preference match (+15 points)
- Taxonomic type inference (bird/mammal/insect/amphibian/reptile)

**Key Methods**:
- `fetchLocalSpecies(lat, lng, options)` → Aggregates all sources
- `normalizeSpecies(species, source)` → Unifies data format
- `rankSpecies(species, context)` → Scores and sorts
- `selectFromRealTimeData(rankedSpecies)` → Weighted random from top 3

**Feature Flag**:
```bash
USE_REALTIME_SPECIES=false  # Set to true to enable
```

**Fallback**: If APIs fail or flag is false, uses hardcoded database (5 species)

---

### 6. SessionManager.js (Enhanced)
**Purpose**: Orchestrate meditation session creation
**Location**: `backend/services/SessionManager.js`

**New Flow**:
```javascript
1. Get device datetime (or current server time)
2. Calculate lunar day/phase using LunarService
3. Fetch weather (existing)
4. Fetch species (now supports real-time APIs)
5. Determine time of day (dawn/morning/afternoon/evening/dusk/night)
6. Select biologically accurate behavior from BehaviorDatabase
7. Pass ALL context to ContentGenerationService
8. Return session with lunar, behavior, species metadata
```

**New Session Output**:
```javascript
{
  id: "session_...",
  timestamp: "2025-10-04T10:12:00Z",
  location: { latitude: 34.05, longitude: -117.25 },
  weather: {...},
  species: {
    name: "California Scrub Jay",
    scientificName: "Aphelocoma californica",
    type: "bird",
    source: "iNaturalist"
  },
  lunar: {
    day: 13,
    phase: "waxing gibbous",
    direction: "waxing",
    illumination: 87
  },
  behavior: {
    action: "caching acorns",
    description: "Burying or hiding food stores for later retrieval",
    source: "Squirrel and corvid behavior studies"
  },
  content: {
    text: "...",  // TTS-ready with <pause> markers
    duration: 342,
    wordCount: 512
  }
}
```

---

### 7. ContentGenerationService.js (Complete Rewrite)
**Purpose**: Generate meditation text with full environmental context
**Location**: `backend/services/ContentGenerationService.js`

**New Prompt System**:

**Real Observation Mode** (when species has photo/location/observer):
```
REAL-TIME ENVIRONMENTAL CONTEXT:
- Species: California Scrub Jay (Aphelocoma californica)
- Behavior: caching acorns — Burying food stores for later retrieval
- Recently observed: 2 hours ago in Loma Linda, CA
- Observer: naturalist_user
- Current time: morning on October 4, 2025
- Lunar phase: the waxing gibbous moon on Day 13
- Weather: Clear skies, 18°C
- Location: Loma Linda, CA

MEDITATION REQUIREMENTS:
1. Second-person perspective ("You notice...")
2. Sensory details: sight, sound, temperature, touch, breath
3. Lunar integration: Subtly weave in moon context
4. Behavior focus: caching acorns
5. Tone: Minimal contemplative + nature documentary
6. Audio formatting: Empty lines for pauses

FORBIDDEN PHRASES:
- "These remarkable creatures..."
- "You need not control your thoughts..."
- "Let go of..."

STRUCTURE (300-600 words):
- Opening: Place listener in location
- Body: Vivid scene of species doing behavior
- Closing: Return to breath

FORMAT FOR TTS:
- Short paragraphs (2-3 sentences)
- Empty line = pause
- No explicit pause instructions
```

**Generic Mode** (database species):
- Similar structure, less specific location
- Uses habitat instead of exact place
- Still includes lunar when relevant (night/full moon/significant days)

**Lunar Integration Logic**:
- Included when:
  - Time is night or dusk, OR
  - Moon is full, OR
  - Lunar day is significant (1, 7-8, 10, 14-16, 22-23, 25, 29-30)
- Formatted naturally: "under the waxing gibbous moon" or "by moonlight"

**New Methods**:
- `formatForTTS(text)` → Inserts `<pause>` markers between paragraphs
- `parseGeneratedContent(text)` → Returns:
  ```javascript
  {
    text: "...",           // TTS-ready with pauses
    rawText: "...",        // Original without markers
    estimatedDuration: 342, // Based on 150 words/min speech
    wordCount: 512,
    sections: ["introduction", "body", "closing"],
    paragraphCount: 8
  }
  ```
- `getFallbackContent()` → Uses lunar/behavior in fallback

**Cache Key**: Now includes lunar day/phase + behavior for granular caching

---

## Configuration

### Environment Variables

Add to `backend/.env`:

```bash
# Existing variables...

# GBIF Configuration (No API key required!)
GBIF_BASE_URL=https://api.gbif.org/v1
GBIF_MAX_RESULTS=20
GBIF_CACHE_DURATION=3600000
GBIF_SEARCH_RADIUS=5
GBIF_RECENT_YEARS=2

# eBird Configuration (Requires free API key)
EBIRD_API_KEY=your_ebird_api_key_here
EBIRD_BASE_URL=https://api.ebird.org/v2
EBIRD_MAX_RESULTS=30
EBIRD_CACHE_DURATION=1800000
EBIRD_DAYS_BACK=14
EBIRD_HOTSPOT_RADIUS=25

# Real-time Species Feature
USE_REALTIME_SPECIES=false  # Set to true to enable
```

### Getting API Keys

**eBird API Key** (optional but recommended):
1. Visit https://ebird.org/api/keygen
2. Sign in or create account
3. Request API key (instant approval)
4. Add to `.env` as `EBIRD_API_KEY`

**GBIF** and **iNaturalist**: No keys required!

---

## Testing

### Manual Test

**Start server**:
```bash
cd backend
npm install
node server.js
```

**Create test session** (using curl or Postman):
```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 34.05,
    "longitude": -117.25,
    "preferences": {
      "duration": 300,
      "mood": "calm"
    }
  }'
```

**Expected response**:
```json
{
  "success": true,
  "session": {
    "id": "session_...",
    "lunar": {
      "day": 13,
      "phase": "waxing gibbous",
      "illumination": 87
    },
    "species": {
      "name": "Great Blue Heron",
      "type": "bird"
    },
    "behavior": {
      "action": "foraging for insects",
      "description": "..."
    },
    "content": {
      "text": "...",
      "duration": 342,
      "wordCount": 512
    }
  }
}
```

---

## Sample Output

**Context**:
- Location: Loma Linda, CA (34.05, -117.25)
- Time: 6:12 AM, October 4, 2025
- Lunar: Waxing gibbous, Day 13
- Species: California Scrub Jay (from iNaturalist)
- Behavior: Caching acorns

**Generated Meditation** (excerpt):
```
Right now, as dawn breaks over Loma Linda, a California Scrub Jay begins its morning work.

<pause>

Under the waxing gibbous moon still fading in the western sky, this bird moves with precise intention. Watch as it selects an acorn, tests its weight, and carries it to a hidden cache.

<pause>

The air is cool—eighteen degrees—and the clarity of this October morning sharpens every detail. Each acorn placed is a bet on winter, a small act of preparation embedded in the bird's ancient memory.

<pause>

Notice your own breath, steady like the jay's focused rhythm. No hurry, no waste. Just this moment, this action, this quiet intelligence at work.

<pause>

As the meditation closes, carry with you this sense of purposeful presence. The jay doesn't question its work—it simply does what the season calls for.
```

---

## Key Improvements Over Original

| Feature | Original | New System |
|---------|----------|------------|
| **Lunar Context** | None | Real-time calculation with phase/day |
| **Species Source** | 5 hardcoded | Real-time from 3 APIs (optional) |
| **Behavior** | Generic text | 20+ biologically accurate, context-aware |
| **Location** | Generic "temperate zone" | Exact place name from observation |
| **Time Awareness** | Static | Real device datetime integrated |
| **TTS Formatting** | None | Automatic pause markers |
| **Prompt Quality** | Good | Highly specific with forbidden phrases |
| **Fallback** | Generic meditation | Context-aware with species/lunar |

---

## File Structure

```
iphone2-Momentus/
├── backend/
│   ├── services/
│   │   ├── LunarService.js           ✨ NEW
│   │   ├── BehaviorDatabase.js       ✨ NEW
│   │   ├── GBIFService.js            ✨ NEW
│   │   ├── eBirdService.js           ✨ NEW
│   │   ├── SpeciesService.js         🔄 ENHANCED
│   │   ├── SessionManager.js         🔄 ENHANCED
│   │   ├── ContentGenerationService.js 🔄 REWRITTEN
│   │   ├── INaturalistService.js     ✅ EXISTING
│   │   ├── WeatherService.js         ✅ EXISTING
│   │   └── APIService.js             ✅ EXISTING
│   ├── .env.example                  🔄 UPDATED
│   └── ...
└── IMPLEMENTATION_GUIDE.md           ✨ NEW (this file)
```

---

## Troubleshooting

### No species found from APIs
**Cause**: `USE_REALTIME_SPECIES=false` or APIs failing
**Solution**:
- Set `USE_REALTIME_SPECIES=true` in `.env`
- Check internet connection
- Verify eBird API key if using bird data
- System will fallback to hardcoded database automatically

### Lunar calculations seem wrong
**Cause**: Timezone differences or reference date issue
**Solution**:
- Lunar calculations use UTC
- Verify system clock is correct
- Check `LunarService.js` reference new moon date (2000-01-06)

### Meditation doesn't include lunar context
**Expected**: Lunar only included when:
- Night/dusk time, OR
- Full moon, OR
- Significant lunar day (1, 7-8, 10, 14-16, 22-23, 25, 29-30)

**Solution**: Test during nighttime or full moon

### TTS pauses not working
**Cause**: Client needs to interpret `<pause>` markers
**Solution**:
- Frontend should split on `\n\n<pause>\n\n`
- Convert to SSML `<break time="2s"/>` for compatible TTS engines
- Or insert natural delays in audio player

---

## Next Steps (Optional Phase 4)

### Template-Based Generation (No LLM)
Create `MeditationTemplateEngine.js` for:
- Instant generation without API calls
- Offline support
- Cost-free operation
- Deterministic output

**Advantages**:
- No Google AI API dependency
- Faster generation
- Fully predictable content

**Trade-off**: Less variety in phrasing

---

## Credits

**Behavioral Data Sources**:
- Cornell Lab of Ornithology
- Owl behavior research
- Mammalian behavior studies
- Pollinator ecology
- Amphibian behavior studies

**APIs**:
- iNaturalist (https://www.inaturalist.org)
- GBIF (https://www.gbif.org)
- eBird (https://ebird.org)
- OpenWeatherMap (existing)

**Lunar Algorithm**: Synodic month calculation (astronomical standard)

---

## License

Same as original Momentus app.
