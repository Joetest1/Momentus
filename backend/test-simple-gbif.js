// Test Tier 1 with simple GBIF approach (based on your working code)
// This mimics your working JavaScript approach

async function testSimpleGBIFApproach() {
  console.log('🔧 Testing Simple GBIF Approach (Your Working Method)');
  console.log('📍 Location: Los Angeles, CA (34.0522, -118.2437)\n');
  
  // Test with Los Angeles (more biodiversity expected)
  const lat = 34.0522;
  const lon = -118.2437;
  
  const classes = [
    { name: 'Birds', key: 212 }, // Aves
    { name: 'Mammals', key: 359 }, // Mammalia  
    { name: 'Insects', key: 216 }, // Insecta
    { name: 'Fish', key: 204 }, // Actinopterygii
    { name: 'Reptiles', key: 358 }, // Reptilia
    { name: 'Amphibians', key: 131 } // Amphibia
  ];
  
  console.log('🔄 Testing each taxonomic class...\n');
  
  for (const taxClass of classes) {
    console.log(`--- Testing ${taxClass.name} (Key: ${taxClass.key}) ---`);
    
    try {
      const startTime = Date.now();
      
      // Use same approach as your working code
      const url = `https://api.gbif.org/v1/occurrence/search?decimalLatitude=${lat}&decimalLongitude=${lon}&radius=5000&taxonKey=${taxClass.key}&limit=10`;
      
      console.log(`📡 Calling GBIF API...`);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const elapsed = Date.now() - startTime;
      
      console.log(`✅ Response in ${elapsed}ms`);
      console.log(`📊 Total occurrences: ${data.count || 0}`);
      console.log(`📋 Results returned: ${data.results?.length || 0}`);
      
      if (data.results && data.results.length > 0) {
        console.log(`🎯 Sample ${taxClass.name}:`);
        data.results.slice(0, 5).forEach((result, i) => {
          const name = result.species || result.scientificName || 'Unknown';
          console.log(`  ${i+1}. ${name}`);
        });
      } else {
        console.log(`❌ No ${taxClass.name.toLowerCase()} found`);
      }
      
    } catch (error) {
      console.log(`❌ Error with ${taxClass.name}: ${error.message}`);
    }
    
    console.log(''); // Empty line between classes
  }
  
  console.log('🏁 Simple GBIF test complete');
}

// Add timeout to prevent hanging
setTimeout(() => {
  console.log('\n⏰ Test timeout - likely GBIF API issue');
  process.exit(0);
}, 30000);

testSimpleGBIFApproach().catch(console.error);