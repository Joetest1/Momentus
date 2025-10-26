# Testing Dashboard Guide

## Overview
The Momentus Testing Dashboard (`/test.html`) is a powerful tool for rapidly testing meditation variations and managing your favorite preset configurations. Perfect for experimenting with different meditation styles and parameters.

## Access
- **Local**: http://localhost:3000/test.html
- **Production**: https://momentus-production.up.railway.app/test.html

## Features

### 1. Preset Management (3 Slots)
**Purpose:** Save and quickly load your favorite meditation configurations.

**How to Use:**
1. Generate a meditation with your desired settings
2. Click "💾 Save to Preset"
3. Enter preset number (1, 2, or 3)
4. Give it a custom name (e.g., "Morning Calm")
5. Choose an emoji icon (e.g., 🌅, 🌙, 🧘)

**Loading Presets:**
- Click any preset slot to load those settings instantly
- Empty slots offer to save current settings when clicked
- Delete button appears on filled slots

**Stored Data:**
- All preferences (style, balance, depth, mood, duration)
- Custom name and emoji
- Saved timestamp
- Persists in browser localStorage (survives refresh)

### 2. Split-Screen Testing Layout

**Settings Panel (Left):**
- All meditation parameters
- Location auto-detection
- 📍 Use My Location button
- Duration, mood, style selectors
- Advanced customization sliders
- 🌱 Generate button
- 🔄 Regenerate button (appears after first generation)

**Preview Panel (Right):**
- Live meditation preview
- Weather/species/lunar/duration cards
- Full meditation text (scrollable)
- Empty state when no meditation generated

**Benefits:**
- See settings and preview simultaneously
- Quick tweaks without losing context
- Compare before/after when adjusting parameters

### 3. Meditation History (Last 10)

**Purpose:** Track your testing session and reload previous configurations.

**Display:**
- Most recent meditations at top
- Settings summary (style / focus / instruction)
- Timestamp (e.g., "10/26/2025, 3:15 PM")
- Load button for quick restore

**Interaction:**
- Click any history item to load those settings
- Preview shows that meditation immediately
- Regenerate with same settings or modify

**Storage:**
- Keeps last 10 meditations
- Automatically removes oldest when limit reached
- Survives browser refresh (localStorage)

### 4. Rapid Testing Workflow

**Fast Iteration:**
1. Generate → Review → Tweak → Regenerate
2. Settings panel stays visible during preview
3. Regenerate uses exact same settings (species may vary)
4. No need to navigate away

**A/B Testing:**
1. Generate meditation with Style A
2. Note the result
3. Change one parameter (e.g., Focus Balance)
4. Generate again
5. Compare in history

**Batch Testing:**
1. Set baseline settings
2. Generate + Save to Preset 1
3. Change style to Contemplative
4. Generate + Save to Preset 2
5. Change to Documentary
6. Generate + Save to Preset 3
7. Load each preset to compare

## Settings Explained

### Meditation Style
- **Naturalist**: Observational, scientific, biologically accurate
- **Guided**: Explicit breath cues, step-by-step grounding
- **Contemplative**: Awareness language, introspective depth
- **Documentary**: Educational, fascinating species facts

### Focus Balance (0-3)
- **0 - Nature-Focused**: 80% animal observation, minimal meditation
- **1 - Balanced**: 60% animal, 20% grounding, 20% breath
- **2 - Grounding-Focused**: 40% animal, 30% grounding, 30% breath
- **3 - Meditative**: 30% animal, 40% breath awareness

### Instruction Depth (0-2)
- **0 - Minimal**: Pure observation, no breath cues
- **1 - Moderate**: 2-3 gentle reminders
- **2 - Detailed**: 5-7 explicit instructions

### Philosophical Depth (0-2)
- **0 - Secular**: Strictly sensory, no contemplative terms
- **1 - Subtle**: Allows "awareness", "presence", "noticing"
- **2 - Contemplative**: Full vocabulary (consciousness, witness, being)

## Use Cases

### Finding Your Perfect Style
1. Start with default settings (Naturalist/Balanced/Moderate/Secular)
2. Generate and review
3. Adjust ONE parameter at a time
4. Save favorites to presets

### Creating Preset Library
- **Preset 1**: 🌅 Morning Energizer (Guided/Meditative/Detailed)
- **Preset 2**: 🌙 Evening Calm (Contemplative/Grounding/Moderate)
- **Preset 3**: 🌿 Nature Walk (Documentary/Nature/Minimal)

### A/B Testing Philosophical Depth
1. Generate with Secular (0)
2. Save to history
3. Change to Contemplative (2)
4. Generate again
5. Compare language and terminology

### Testing Time of Day Effects
1. Generate in morning
2. Note species and weather
3. Regenerate in evening
4. Compare lunar visibility and species behavior

## Tips & Tricks

### Efficient Testing
- Use keyboard Tab to navigate between fields quickly
- Location auto-detects on page load
- Regenerate button reuses ALL settings (faster than manual)
- History loads everything (settings + preview)

### Preset Strategy
- Save your 3 most different styles (not 3 variations of same)
- Use emoji to quickly identify presets
- Name presets by use case ("Quick Break", "Deep Session")

### Understanding Results
- Species changes on each generation (random selection)
- Weather updates in real-time
- Lunar phase affects meditation content if visible
- Duration directly impacts word count (150 words/minute)

### localStorage Limits
- ~5MB total storage per domain
- Presets are tiny (~1KB each)
- History limited to 10 items automatically
- Clear browser data to reset if needed

## Data Persistence

**What's Saved:**
- ✅ 3 preset configurations
- ✅ Last 10 meditation history items
- ✅ All settings for each

**What's NOT Saved:**
- ❌ Current form state (resets on refresh)
- ❌ Generated meditation audio files
- ❌ API responses (regenerated fresh each time)

**Cross-Device Sync:**
- Not currently supported (localStorage is browser-specific)
- Export/import feature coming in future update
- For now: Save presets separately on each device

## Troubleshooting

**"Please enter valid coordinates"**
- Click "📍 Use My Location" button
- Or manually enter latitude/longitude
- Check browser location permissions

**Preset won't save**
- Make sure you've generated a meditation first
- "Save to Preset" button disabled until generation complete
- Check browser console for localStorage errors

**History not appearing**
- Ensure JavaScript enabled
- Check browser localStorage available
- Try clearing site data and regenerating

**Regenerate button disabled**
- Only enabled after first successful generation
- Reload page if stuck
- Generate new meditation to reset

## Keyboard Shortcuts

- **Tab**: Navigate between fields
- **Enter**: Submit location detection (when focused on location field)
- **Spacebar**: Toggle dropdown menus (when focused)

## Best Practices

1. **Start Simple**: Use defaults, then adjust one thing at a time
2. **Document Results**: Take notes on what works for you
3. **Save Favorites**: Don't rely on history alone (only keeps 10)
4. **Test Systematically**: Change one variable per test
5. **Compare Objectively**: Use history to see actual differences

## Technical Details

**Storage:**
- Key: `momentus_presets` - Object with keys 1, 2, 3
- Key: `momentus_test_history` - Array of last 10 meditations
- Format: JSON strings in localStorage

**Browser Support:**
- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Responsive layout

**Performance:**
- Page load: < 100ms
- Preset load: Instant (localStorage read)
- History render: < 50ms for 10 items
- Meditation generation: 5-15 seconds (API call)

## Future Enhancements

Potential features in development:
- Export/import presets as JSON
- Comparison view (side-by-side meditations)
- Batch generation (3 at once)
- Rating system per test
- Preset sharing via URL
- Cloud sync for cross-device access

## Feedback

Found a bug or have a feature request? The dashboard helps us improve Momentus by making it easy to test variations. Your testing helps refine the meditation generation algorithms!
