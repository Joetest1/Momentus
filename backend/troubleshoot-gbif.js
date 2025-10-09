// Troubleshoot EcoregionSpeciesService GBIF integration
const EcoregionSpeciesService = require('./services/EcoregionSpeciesService');

async function troubleshootGBIFIntegration() {
  console.log('🔧 Troubleshooting EcoregionSpeciesService GBIF Integration');
  console.log('📍 Location: Riverside, CA (34.045225, -117.267289)\n');
  
  const ecoService = new EcoregionSpeciesService();
  const latitude = 34.045225;
  const longitude = -117.267289;
  
  try {
    // Step 1: Check ecoregion lookup
    console.log('STEP 1: Testing ecoregion lookup...');
    const ecoregion = await ecoService.getEcoregion(latitude, longitude);
    console.log('Ecoregion result:', ecoregion);
    console.log('');
    
    // Step 2: Test individual GBIF fetches
    console.log('STEP 2: Testing individual GBIF taxonomy classes...');
    
    const taxonomyClasses = [
      { name: 'birds', key: 212, pluralName: 'Birds' }, // Aves
      { name: 'mammals', key: 359, pluralName: 'Mammals' }, // Mammalia
      { name: 'insects', key: 216, pluralName: 'Insects' }, // Insecta
      { name: 'fish', key: 204, pluralName: 'Fish' }, // Actinopterygii
      { name: 'reptiles', key: 358, pluralName: 'Reptiles' }, // Reptilia
      { name: 'amphibians', key: 131, pluralName: 'Amphibians' } // Amphibia
    ];
    
    for (const taxClass of taxonomyClasses) {
      console.log(`\n--- Testing ${taxClass.name} (key: ${taxClass.key}) ---`);
      
      try {
        const species = await ecoService.fetchGBIFSpecies(latitude, longitude, taxClass);
        console.log(`✅ ${taxClass.name}: Found ${species.length} species`);
        
        if (species.length > 0) {
          console.log('Sample results:');
          species.slice(0, 3).forEach((sp, i) => {
            console.log(`  ${i+1}. ${sp.name} ${sp.scientificName ? '(' + sp.scientificName + ')' : ''}`);
          });
        } else {
          console.log('❌ No species returned - checking GBIF API response...');
          
          // Test direct GBIF API call
          const testUrl = `https://api.gbif.org/v1/occurrence/search?decimalLatitude=${latitude}&decimalLongitude=${longitude}&radius=5000&taxonKey=${taxClass.key}&limit=5`;
          console.log(`Test URL: ${testUrl}`);
          
          const testResponse = await fetch(testUrl);
          const testData = await testResponse.json();
          console.log(`Direct GBIF API response: ${testData.count} occurrences, ${testData.results?.length || 0} returned`);
          
          if (testData.results && testData.results.length > 0) {
            console.log('Sample raw GBIF data:');
            console.log(JSON.stringify(testData.results[0], null, 2));
          }
        }
        
      } catch (error) {
        console.log(`❌ Error fetching ${taxClass.name}: ${error.message}`);
      }
    }
    
    // Step 3: Test full species data generation
    console.log('\n\nSTEP 3: Testing full fetchLocationSpecies method...');
    const fullResult = await ecoService.fetchLocationSpecies(latitude, longitude);
    
    console.log('Full result summary:');
    console.log(`- Total species: ${fullResult.summary.total}`);
    console.log('- By class:');
    Object.entries(fullResult.summary.byClass).forEach(([className, count]) => {
      console.log(`  ${className}: ${count}`);
    });
    
  } catch (error) {
    console.log(`❌ Critical error: ${error.message}`);
    console.log(error.stack);
  }
}

troubleshootGBIFIntegration();