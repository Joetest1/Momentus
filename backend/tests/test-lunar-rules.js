// Test lunar rules logic - reproduce the issue
const ContentGenerationService = require('../services/ContentGenerationService');
const LunarService = require('../services/LunarService');

// Test that lunar day references are removed
function testLunarFormatting() {
  const lunarService = new LunarService();
  
  console.log('\n=== TESTING LUNAR FORMATTING (NO DAY REFERENCES) ===');
  
  // Test Day 14 waxing gibbous - should not include "Day 14"
  const testDate = new Date('2025-10-06T14:00:00Z');
  const lunar = lunarService.calculateLunarDay(testDate);
  const formatted = lunarService.formatLunarContext(lunar);
  
  console.log('Lunar day:', lunar.day);
  console.log('Phase:', lunar.phase);
  console.log('Formatted context:', formatted);
  console.log('Contains day reference:', formatted.includes('Day') ? 'YES - BUG!' : 'NO - CORRECT');
  
  return !formatted.includes('Day');
}

// Test the logic that determines when to include lunar information
function testLunarLogic() {
  const lunarService = new LunarService();
  
  console.log('=== TESTING LUNAR RULES LOGIC ===\n');
  
  // Helper function to test different scenarios
  function testScenario(testDate, timeOfDay, description) {
    console.log(`\n--- ${description} ---`);
    const lunar = lunarService.calculateLunarDay(testDate);
    
    console.log('Date:', testDate.toISOString());
    console.log('Lunar day:', lunar.day);
    console.log('Phase:', lunar.phase);
    console.log('Direction:', lunar.direction);
    console.log('Time of day:', timeOfDay);
    
    // Test time of day logic
    const isNight = timeOfDay === 'night' || timeOfDay === 'dusk';
    const isDaytime = timeOfDay === 'morning' || timeOfDay === 'afternoon';
    
    // Test moonrise logic (assume not near moonrise for most tests)
    const moonriseInfo = { near: false };
    const nearMoonrise = moonriseInfo && moonriseInfo.near;
    
    // Current problematic logic
    const currentLogic = lunar && (nearMoonrise || (isNight && !isDaytime));
    
    // Fixed logic (should be simpler)
    const fixedLogic = lunar && (nearMoonrise || isNight);
    
    console.log('Should include moon:', fixedLogic);
    console.log('Current logic would include:', currentLogic);
    
    // Determine if this is correct
    const shouldIncludeMoon = isNight || nearMoonrise;
    const isCorrect = currentLogic === shouldIncludeMoon;
    console.log('Expected result:', shouldIncludeMoon);
    console.log('Current logic is', isCorrect ? 'CORRECT' : 'WRONG');
    
    return { currentLogic, fixedLogic, shouldIncludeMoon, isCorrect };
  }
  
  // Test various scenarios
  const results = [];
  
  // Scenario 1: Afternoon (should NOT mention moon)
  results.push(testScenario(
    new Date('2025-10-06T14:00:00Z'), 
    'afternoon', 
    'Day 15 full moon during afternoon'
  ));
  
  // Scenario 2: Dusk (should mention moon)
  results.push(testScenario(
    new Date('2025-10-06T19:30:00Z'), 
    'dusk', 
    'Day 15 full moon during dusk'
  ));
  
  // Scenario 3: Night (should mention moon)
  results.push(testScenario(
    new Date('2025-10-06T22:00:00Z'), 
    'night', 
    'Day 15 full moon during night'
  ));
  
  // Scenario 4: Morning (should NOT mention moon)
  results.push(testScenario(
    new Date('2025-10-06T08:00:00Z'), 
    'morning', 
    'Day 15 full moon during morning'
  ));
  
  // Scenario 5: Evening (not classified as night or dusk - edge case)
  // Evening is 5-7 PM when moon might be visible, but current logic excludes it
  results.push(testScenario(
    new Date('2025-10-06T18:00:00Z'), 
    'evening', 
    'Day 15 full moon during evening (POTENTIAL BUG: should moon be visible?)'
  ));
  
  // Test lunar formatting
  const formattingOk = testLunarFormatting();
  
  // Summary
  console.log('\n=== SUMMARY ===');
  const wrongResults = results.filter(r => !r.isCorrect);
  if (wrongResults.length > 0) {
    console.log(`Found ${wrongResults.length} incorrect visibility results - logic needs fixing!`);
  } else {
    console.log('All visibility scenarios work correctly with current logic');
  }
  
  if (!formattingOk) {
    console.log('ERROR: Lunar formatting still contains day references!');
  } else {
    console.log('SUCCESS: Lunar formatting no longer contains day references');
  }
}

if (require.main === module) {
  testLunarLogic();
}

module.exports = { testLunarLogic };