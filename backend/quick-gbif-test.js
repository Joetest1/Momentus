// Quick GBIF diagnostic - should complete in under 30 seconds
const fetch = require('node-fetch');

async function quickGBIFTest() {
  console.log('🔍 Quick GBIF API Test (should complete in <30 seconds)');
  console.log('📍 Testing Riverside, CA for mammals only...\n');
  
  const latitude = 34.045225;
  const longitude = -117.267289;
  
  // Test just mammals (most common category)
  const testUrl = `https://api.gbif.org/v1/occurrence/search?decimalLatitude=${latitude}&decimalLongitude=${longitude}&radius=5000&taxonKey=359&limit=5`;
  
  console.log('📡 Making GBIF API call...');
  console.log(`URL: ${testUrl}`);
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(testUrl);
    const data = await response.json();
    const elapsed = Date.now() - startTime;
    
    console.log(`\n✅ API Response received in ${elapsed}ms`);
    console.log(`📊 Total occurrences: ${data.count || 0}`);
    console.log(`📋 Results returned: ${data.results?.length || 0}`);
    
    if (data.results && data.results.length > 0) {
      console.log('\n🐾 Sample mammals found:');
      data.results.slice(0, 3).forEach((result, i) => {
        console.log(`  ${i+1}. ${result.species || result.scientificName || 'Unknown'}`);
      });
      console.log('\n🎯 GBIF API is working! The issue is in our processing code.');
    } else {
      console.log('\n⚠️  GBIF API returned no results for this location/radius.');
      console.log('This could be normal for desert areas like Riverside.');
    }
    
  } catch (error) {
    console.log(`❌ Error after ${Date.now() - startTime}ms: ${error.message}`);
  }
}

// Auto-timeout after 25 seconds to prevent hanging
setTimeout(() => {
  console.log('\n⏰ Test timeout after 25 seconds - likely API issue');
  process.exit(0);
}, 25000);

quickGBIFTest();