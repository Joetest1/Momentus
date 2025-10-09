// tests/test-inaturalist.js
require('dotenv').config();
const INaturalistService = require('../services/INaturalistService');

async function testINaturalistService() {
  console.log('🌿 Testing INaturalistService\n');
  
  const service = new INaturalistService();
  
  const testLocations = [
    { name: 'San Francisco', lat: 37.7749, lon: -122.4194 },
    { name: 'New York City', lat: 40.7128, lon: -74.0060 },
    { name: 'London', lat: 51.5074, lon: -0.1278 },
  ];

  for (const location of testLocations) {
    console.log(`\n📍 Testing: ${location.name}`);
    console.log(`   Coordinates: ${location.lat}, ${location.lon}`);
    console.log('   ----------------------------------------');
    
    try {
      const observations = await service.cascadingRadiusSearch(
        location.lat,
        location.lon
      );
      
      console.log(`   ✓ Found ${observations.length} observations\n`);
      
      observations.slice(0, 3).forEach((obs, index) => {
        console.log(`   ${index + 1}. ${obs.name} (${obs.scientificName})`);
        console.log(`      Iconic Taxon: ${obs.iconicTaxonName}`);
        console.log(`      Observed: ${obs.observedAt}`);
        console.log(`      Location: ${obs.location.place}`);
        console.log(`      Quality: ${obs.qualityGrade} (${obs.numIdentificationAgreements} agreements)`);
        if (obs.photoUrl) {
          console.log(`      Photo: ${obs.photoUrl}`);
        }
        console.log('');
      });
      
    } catch (error) {
      console.error(`   ✗ Error: ${error.message}`);
    }
  }
  
  console.log('\n📊 Service Statistics:');
  const stats = service.getStats();
  console.log(`   Cache size: ${stats.cacheSize} entries`);
  console.log(`   Radius config: ${stats.radiusConfig.start}km → ${stats.radiusConfig.mid}km → ${stats.radiusConfig.max}km`);
  
  console.log('\n✅ Test complete!\n');
}

testINaturalistService().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});