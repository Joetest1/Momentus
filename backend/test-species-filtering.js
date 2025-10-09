// Test complete species cascade including local storage
const HybridSpeciesService = require('./services/HybridSpeciesService');

async function testSpeciesCascade() {
  console.log('� Testing Complete Species Selection Cascade...\n');
  
  const hybridService = new HybridSpeciesService();
  
  console.log('📋 CASCADE ORDER:');
  console.log('1. EcoregionSpeciesService (local storage with GBIF + ecoregion data)');
  console.log('2. Real-time APIs (iNaturalist, GBIF, eBird)');
  console.log('3. Fallback database (hardcoded species)\n');
  
  try {
    console.log('🐸 Testing amphibian request...');
    const amphibian = await hybridService.selectSpecies({
      latitude: 34.045225,  // Riverside, CA
      longitude: -117.267289,
      weather: { condition: 'clear', temperature: 20 },
      preferences: { speciesType: 'amphibian' }
    });
    
    console.log(`  ✅ Result: ${amphibian.name} (${amphibian.type})`);
    console.log(`  📍 Source: ${amphibian.source}`);
    console.log(`  🏠 Habitat: ${amphibian.habitat || 'N/A'}`);
    
    if (amphibian.source === 'ecoregion') {
      console.log('  🎯 SUCCESS: Used local storage (EcoregionSpeciesService)!');
    } else if (amphibian.source === 'realtime') {
      console.log('  ⚠️  Used real-time APIs (no local data available)');
    } else {
      console.log('  ⚠️  Used fallback database (no local or real-time data)');
    }
    
    // Test another animal type
    console.log('\n🐦 Testing bird request...');
    const bird = await hybridService.selectSpecies({
      latitude: 34.045225,  // Riverside, CA
      longitude: -117.267289,
      weather: { condition: 'clear', temperature: 20 },
      preferences: { speciesType: 'bird' }
    });
    
    console.log(`  ✅ Result: ${bird.name} (${bird.type})`);
    console.log(`  📍 Source: ${bird.source}`);
    
    // Show usage stats
    console.log('\n📊 USAGE STATS:');
    console.log(`  Ecoregion selections: ${hybridService.usageStats.ecoregionSelections}`);
    console.log(`  Real-time selections: ${hybridService.usageStats.realTimeSelections}`);
    console.log(`  Fallback selections: ${hybridService.usageStats.fallbackSelections}`);
    
    console.log('\n✅ Species cascade test complete!');
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    console.log(error.stack);
  }
}

testSpeciesCascade();