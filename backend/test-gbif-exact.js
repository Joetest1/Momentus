// Test the exact GBIF URLs used by RobustSpeciesService
async function testRobustSpeciesGBIF() {
  console.log('🔍 Testing RobustSpeciesService GBIF URLs...');
  
  // Test coordinates (Riverside, CA area)
  const latitude = 33.930058;
  const longitude = -117.4143;
  
  // Test taxonomic class keys used in RobustSpeciesService
  const taxonomicClasses = [
    { name: 'birds', key: 212, displayName: 'Birds' },
    { name: 'mammals', key: 359, displayName: 'Mammals' }
  ];
  
  for (const taxonomicClass of taxonomicClasses) {
    console.log(`\n📡 Testing ${taxonomicClass.displayName} (key: ${taxonomicClass.key})`);
    
    // Create the exact URL used in RobustSpeciesService
    const gbifUrl = `https://api.gbif.org/v1/occurrence/search?decimalLatitude=${latitude}&decimalLongitude=${longitude}&radius=50&taxonKey=${taxonomicClass.key}&limit=200&fields=vernacularName,scientificName&language=en&hasCoordinate=true`;
    
    console.log('   URL:', gbifUrl);
    
    try {
      const response = await fetch(gbifUrl);
      
      console.log(`   Status: ${response.status} (${response.ok ? 'OK' : 'ERROR'})`);
      console.log('   Content-Type:', response.headers.get('content-type'));
      
      const responseText = await response.text();
      
      // Check if it's HTML (error page)
      if (responseText.startsWith('<!doctype') || responseText.startsWith('<!DOCTYPE')) {
        console.log('   ❌ GBIF returned HTML error page');
        console.log('   Preview:', responseText.substring(0, 100) + '...');
      } else {
        try {
          const data = JSON.parse(responseText);
          console.log('   ✅ Valid JSON received');
          console.log('   Count:', data.count || 0);
          console.log('   Results:', data.results ? data.results.length : 0);
          
          // Show first result if available
          if (data.results && data.results[0]) {
            const first = data.results[0];
            console.log('   Sample:', {
              scientific: first.scientificName,
              vernacular: first.vernacularName ? first.vernacularName[0]?.vernacularName : 'none'
            });
          }
          
        } catch (parseError) {
          console.log('   ❌ JSON parse failed:', parseError.message);
          console.log('   Preview:', responseText.substring(0, 100) + '...');
        }
      }
      
    } catch (networkError) {
      console.log('   ❌ Network error:', networkError.message);
    }
    
    // Small delay to be nice to GBIF
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

testRobustSpeciesGBIF();