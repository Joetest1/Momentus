// Test GBIF API directly to check if it returns results
const GBIFService = require('./services/GBIFService');

async function testGBIF() {
  console.log('🔬 Testing GBIF API (Tier 2)...\n');
  
  const gbifService = new GBIFService();
  
  // Test coordinates (Riverside, CA - should have lots of data)
  const latitude = 34.045225;
  const longitude = -117.267289;
  const radius = 5; // 5km radius
  
  console.log(`📍 Testing location: ${latitude}, ${longitude} (${radius}km radius)`);
  console.log('🎯 Looking for amphibians specifically...\n');
  
  try {
    // Test amphibian search specifically
    const amphibians = await gbifService.getOccurrences(latitude, longitude, {
      taxonKey: 131, // Amphibia class
      radius: radius,
      limit: 10
    });
    
    console.log('GBIF AMPHIBIAN RESULTS:');
    console.log(`  Total found: ${amphibians.length}`);
    
    if (amphibians.length > 0) {
      console.log('  ✅ SUCCESS: GBIF returned amphibians!');
      amphibians.slice(0, 3).forEach((occurrence, i) => {
        console.log(`    ${i+1}. ${occurrence.species || occurrence.scientificName} (${occurrence.taxonKey || 'N/A'})`);
      });
    } else {
      console.log('  ❌ NO AMPHIBIANS: GBIF returned no amphibian results');
    }
    
    // Test general species search
    console.log('\n🔍 Testing general species search...');
    const allOccurrences = await gbifService.getOccurrences(latitude, longitude, {
      radius: radius,
      limit: 10
    });
    
    console.log(`  Total occurrences found: ${allOccurrences.length}`);
    if (allOccurrences.length > 0) {
      console.log('  ✅ GBIF API is working and returning data');
      console.log('  Sample results:');
      allOccurrences.slice(0, 3).forEach((occurrence, i) => {
        console.log(`    ${i+1}. ${occurrence.species || occurrence.scientificName} - Key: ${occurrence.taxonKey || 'N/A'}`);
      });
    } else {
      console.log('  ❌ GBIF API returned no results at all');
    }
    
  } catch (error) {
    console.log(`❌ GBIF Error: ${error.message}`);
    console.log(error.stack);
  }
  
  console.log('\n🏁 GBIF test complete');
}

testGBIF();