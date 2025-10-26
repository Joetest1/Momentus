# Advanced Meditation Customization - Implementation Guide

## Overview
This feature gives users granular control over meditation characteristics through 4 new preference controls. The system maps these preferences to specific AI prompt modifications, allowing personalized meditation generation.

## Frontend Controls (index.html)

### 1. Meditation Style (Dropdown)
**Options:**
- **Naturalist** (default): Pure observational approach with scientific accuracy
- **Guided**: Explicit breath cues and step-by-step grounding instructions
- **Contemplative**: Deeper introspection with awareness language
- **Documentary**: Educational focus with species facts and ecology

**Integration:** Combined with mood setting (calm/energized/reflective/peaceful/focused) to create compound tone instructions.

### 2. Focus Balance (Slider 0-3)
**Options:**
- **0 - Nature-Focused**: 80% animal observation, 10% grounding, 10% breath
- **1 - Balanced** (default): 60% animal, 20% grounding, 20% breath
- **2 - Grounding-Focused**: 40% animal, 30% grounding, 30% breath
- **3 - Meditative**: 30% animal, 30% grounding, 40% breath

**Integration:** Directly controls content distribution percentages in AI prompt.

### 3. Instruction Depth (Slider 0-2)
**Options:**
- **0 - Minimal**: No explicit breath cues, pure observation
- **1 - Moderate** (default): 2-3 breath cues, occasional reminders
- **2 - Detailed**: 5-7 breath cues, explicit body awareness prompts

**Integration:** Specifies frequency and explicitness of guidance language.

### 4. Philosophical Depth (Slider 0-2)
**Options:**
- **0 - Secular** (default): Strictly sensory observation, no contemplative terms
- **1 - Subtle**: Allows "awareness", "presence", "noticing"
- **2 - Contemplative**: Allows full contemplative vocabulary including "non-conceptual mind", "consciousness", "witness"

**Integration:** Controls forbidden phrase lists in AI prompt.

## Backend Integration (ContentGenerationService.js)

### New Helper Methods

#### `getStyleGuidance(style, mood)`
Maps meditation style + mood to tone instructions:
```javascript
// Example output:
"Adopt an observational, naturalist perspective with gentle and soothing tone. 
Focus on precise biological details and behaviors. Use scientific accuracy 
while maintaining meditative quality."
```

#### `getBalanceGuidance(balance)`
Maps slider value to content distribution:
```javascript
// Example output:
"Content distribution (Balanced nature and mindfulness): 60% animal/nature 
observation, 20% grounding/sensory awareness, 20% breath/body awareness. 
Maintain these ratios throughout the meditation."
```

#### `getInstructionGuidance(depth)`
Maps slider value to instruction frequency:
```javascript
// Example output:
"MODERATE guidance: Include occasional breath cues (2-3 times). Balance 
observation with gentle reminders to return to breath."
```

#### `getPhilosophicalGuidance(depth)`
Maps slider value to allowed/forbidden language:
```javascript
// Example output:
"STRICTLY SECULAR: Forbidden phrases: 'awareness', 'presence', 'consciousness', 
'non-dual', 'non-conceptual mind', 'witness', 'being'. Focus ONLY on sensory 
observation and breath."
```

### Prompt Modifications

**Before (Generic):**
```
MEDITATION REQUIREMENTS:
1. **Perspective**: Second-person
2. **Sensory Details**: Sight, sound, temperature, touch, breath
3. **Tone**: Minimal, contemplative
...
```

**After (Customized):**
```
MEDITATION REQUIREMENTS:
1. **Style**: [Dynamic style guidance based on meditationStyle + mood]
2. **Content Balance**: [Dynamic distribution based on focusBalance]
3. **Instruction Level**: [Dynamic frequency based on instructionDepth]
4. **Philosophical Approach**: [Dynamic language rules based on philosophicalDepth]
5. **Perspective**: Second-person
6. **Sensory Details**: Sight, sound, temperature, touch, breath
...
```

## Usage Examples

### Example 1: Pure Nature Documentary
- Style: Documentary
- Focus: Nature-Focused (0)
- Instructions: Minimal (0)
- Philosophical: Secular (0)
- Mood: Focused

**Result:** Educational nature observation with species facts, no meditation language, 80% wildlife content.

### Example 2: Traditional Guided Meditation
- Style: Guided
- Focus: Meditative (3)
- Instructions: Detailed (2)
- Philosophical: Subtle (1)
- Mood: Calm

**Result:** Explicit breath cues every minute, 40% meditation focus, "awareness" language allowed.

### Example 3: Contemplative Nature Practice
- Style: Contemplative
- Focus: Balanced (1)
- Instructions: Moderate (1)
- Philosophical: Contemplative (2)
- Mood: Reflective

**Result:** Balanced nature and mindfulness, occasional cues, full contemplative vocabulary.

## Default Values
If user doesn't expand Advanced Controls, defaults are:
- meditationStyle: `'naturalist'`
- focusBalance: `1` (Balanced)
- instructionDepth: `1` (Moderate)
- philosophicalDepth: `0` (Secular)

These provide a safe, accessible default experience similar to the original system behavior.

## API Request Format

Frontend sends preferences object:
```javascript
{
  latitude: 37.7749,
  longitude: -122.4194,
  preferences: {
    duration: 300,
    mood: 'calm',
    meditationStyle: 'naturalist',     // NEW
    focusBalance: 1,                   // NEW
    instructionDepth: 1,               // NEW
    philosophicalDepth: 0              // NEW
  }
}
```

Backend extracts and applies in `buildPrompt()`:
```javascript
const meditationStyle = preferences.meditationStyle || 'naturalist';
const focusBalance = preferences.focusBalance !== undefined ? preferences.focusBalance : 1;
const instructionDepth = preferences.instructionDepth !== undefined ? preferences.instructionDepth : 1;
const philosophicalDepth = preferences.philosophicalDepth !== undefined ? preferences.philosophicalDepth : 0;
```

## Testing Checklist

- [ ] Test each meditation style with different moods
- [ ] Test extreme focus balance settings (0 and 3)
- [ ] Test minimal vs detailed instruction depth
- [ ] Test secular vs contemplative philosophical depth
- [ ] Test combinations (e.g., documentary + nature-focused + minimal)
- [ ] Verify word counts still meet targets (150 words/min)
- [ ] Verify forbidden phrases are respected at philosophical depth 0
- [ ] Test with species that have real observations vs database species
- [ ] Test with different times of day (moon visibility affects prompts)
- [ ] Test feedback system still works with new preferences

## Deployment Status

✅ **Frontend**: Advanced controls UI implemented in `index.html`
✅ **Backend**: Preference integration complete in `ContentGenerationService.js`
✅ **Committed**: Git commit `84ad8b6`
✅ **Pushed**: GitHub repository updated (Joetest1/Momentus)
⏳ **Railway**: Auto-deployment triggered, will be live at https://momentus-production.up.railway.app in ~2 minutes

## Next Steps

1. Test the feature live once Railway deployment completes
2. Generate meditations with various preference combinations
3. Collect user feedback on customization options
4. Consider adding preset combinations (e.g., "Quick Nature Break", "Deep Practice")
5. Optionally add tooltips explaining each option in more detail

## Technical Notes

- All helper methods have JSDoc documentation
- Default values prevent errors if preferences not provided
- Mood parameter now integrated (was captured but unused before)
- STRUCTURE section simplified to reference content distribution dynamically
- Maintains backward compatibility (existing API calls work without new preferences)
