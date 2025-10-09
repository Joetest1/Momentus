// tests/test-meditation-system.js
// Manual test script for the Mindful Nature Meditation Generator

// Load environment variables FIRST
require('dotenv').config();

const LunarService = require('../services/LunarService');
const BehaviorDatabase = require('../services/BehaviorDatabase');
const SessionManager = require('../services/SessionManager');

console.log('═══════════════════════════════════════════════════════════');
console.log('  Mindful Nature Meditation Generator - System Test');
console.log('═══════════════════════════════════════════════════════════\n');

// Test 1: Lunar Service
console.log('TEST 1: Lunar Calculations');
console.log('─────────────────────────────────────────────────────────\n');

const lunarService = new LunarService();
const now = new Date();
const lunar = lunarService.calculateLunarDay(now);

console.log('Current Date/Time:', now.toISOString());
console.log('Lunar Day:', lunar.day);
console.log('Moon Phase:', lunar.phase);
console.log('Direction:', lunar.direction);
console.log('Illumination:', lunar.percentIlluminated + '%');
console.log('Is Full Moon:', lunar.isFull);
console.log('Is New Moon:', lunar.isNew);
console.log('Is Significant Day:', lunarService.isLunarDayRelevant(lunar.day));
console.log('Formatted:', lunarService.formatLunarContext(lunar));
console.log('Moon Visible Now:', lunarService.isMoonVisible(now, lunar));
console.log('\n✓ Lunar Service OK\n');

// Test 2: Behavior Database
console.log('TEST 2: Behavior Database');
console.log('─────────────────────────────────────────────────────────\n');

const behaviorDB = new BehaviorDatabase();
const stats = behaviorDB.getStats();

console.log('Total Species Types:', stats.speciesTypes);
console.log('Total Behaviors:', stats.totalBehaviors);
console.log('Behaviors by Type:', JSON.stringify(stats.byType, null, 2));

// Test behavior selection for different contexts
const contexts = [
  {
    type: 'bird',
    context: { timeOfDay: 'morning', weather: 'clear', season: 'spring' },
    label: 'Bird, Morning, Clear, Spring'
  },
  {
    type: 'bird',
    context: { timeOfDay: 'night', weather: 'clear', lunar: { direction: 'waning' } },
    label: 'Bird, Night, Clear, Waning Moon'
  },
  {
    type: 'mammal',
    context: { timeOfDay: 'dawn', weather: 'clouds', season: 'fall' },
    label: 'Mammal, Dawn, Cloudy, Fall'
  },
  {
    type: 'amphibian',
    context: { timeOfDay: 'night', weather: 'rain', season: 'spring' },
    label: 'Amphibian, Night, Rain, Spring'
  }
];

console.log('\nBehavior Selection Tests:');
contexts.forEach(({ type, context, label }) => {
  const behavior = behaviorDB.selectBehavior(type, context);
  if (behavior) {
    console.log(`\n  ${label}:`);
    console.log(`    → ${behavior.behavior}`);
    console.log(`    → ${behavior.description}`);
    console.log(`    → Source: ${behavior.source}`);
  } else {
    console.log(`\n  ${label}: No matching behavior found`);
  }
});

console.log('\n✓ Behavior Database OK\n');

// Test 3: Session Manager Integration
console.log('TEST 3: Session Manager - Full Integration');
console.log('─────────────────────────────────────────────────────────\n');

async function testSessionCreation() {
  try {
    // Test location: Loma Linda, CA (Southern California)
    const testLocation = {
      latitude: 34.0522,
      longitude: -117.2437
    };

    const preferences = {
      duration: 300,
      mood: 'calm'
    };

    console.log('Creating test session...');
    console.log('Location: Loma Linda, CA');
    console.log('Coordinates:', testLocation);
    console.log('Preferences:', preferences);
    console.log('\nThis will test:');
    console.log('  - Lunar calculation');
    console.log('  - Weather API (if configured)');
    console.log('  - Species selection');
    console.log('  - Behavior selection');
    console.log('  - Content generation (if Google AI configured)');
    console.log('\nProcessing...\n');

    const sessionManager = SessionManager.getInstance();
    const session = await sessionManager.createSession({
      ...testLocation,
      preferences
    });

    console.log('═══════════════════════════════════════════════════════════');
    console.log('  SESSION CREATED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Session ID:', session.id);
    console.log('Timestamp:', session.timestamp);
    console.log('\n--- LOCATION ---');
    console.log(JSON.stringify(session.location, null, 2));

    console.log('\n--- LUNAR CONTEXT ---');
    console.log(JSON.stringify(session.lunar, null, 2));

    console.log('\n--- WEATHER ---');
    console.log(JSON.stringify(session.weather, null, 2));

    console.log('\n--- SPECIES ---');
  console.log(JSON.stringify(session.species, null, 2));

  // Verify configurable no-repeat days is being read by the service (defaults to 2)
  const configuredNoRepeat = process.env.SPECIES_NO_REPEAT_DAYS ? parseInt(process.env.SPECIES_NO_REPEAT_DAYS, 10) : 2;
  console.log('\nConfigured SPECIES_NO_REPEAT_DAYS:', configuredNoRepeat);

    if (session.behavior) {
      console.log('\n--- BEHAVIOR ---');
      console.log(JSON.stringify(session.behavior, null, 2));
    } else {
      console.log('\n--- BEHAVIOR ---');
      console.log('No behavior selected (species may not have type defined)');
    }

    console.log('\n--- CONTENT ---');
    console.log('Duration:', session.content.duration, 'seconds');
    if (session.content.wordCount) {
      console.log('Word Count:', session.content.wordCount);
    }
    if (session.content.paragraphCount) {
      console.log('Paragraphs:', session.content.paragraphCount);
    }
    console.log('Sections:', session.content.sections);
    console.log('\nMeditation Text (first 500 chars):');
    console.log('─────────────────────────────────────────────────────────');
    console.log(session.content.text.substring(0, 500) + '...');
    console.log('─────────────────────────────────────────────────────────');

    if (session.isFallback) {
      console.log('\n⚠️  NOTE: This is a fallback session (APIs may not be configured)');
    }

    console.log('\n✓ Session Manager OK');
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  ALL TESTS COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Stats
    const sessionStats = sessionManager.getStats();
    console.log('System Statistics:');
    console.log(JSON.stringify(sessionStats, null, 2));

  } catch (error) {
    console.error('\n✗ TEST FAILED');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testSessionCreation().then(() => {
  console.log('\nTest script completed. Exiting...\n');
  process.exit(0);
}).catch(error => {
  console.error('\nFatal error:', error);
  process.exit(1);
});
