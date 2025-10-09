const RobustSpeciesService = require('./services/RobustSpeciesService');

async function testRobustSpeciesSystem() {
  console.log('🧬 Testing Robust Species System\n');
  
  const service = new RobustSpeciesService();
  
  // Test locations: Riverside CA, NYC, London, Sydney, middle of ocean
  const testLocations = [
    { name: 'Riverside, CA', lat: 33.9425, lng: -117.3917 },
    { name: 'New York City', lat: 40.7128, lng: -74.0060 },
    { name: 'London, UK', lat: 51.5074, lng: -0.1278 },
    { name: 'Sydney, Australia', lat: -33.8688, lng: 151.2093 },
    { name: 'Middle of Pacific Ocean', lat: 0.0, lng: -160.0 }
  ];
  
  for (const location of testLocations) {
    console.log(`\n📍 Testing: ${location.name} (${location.lat}, ${location.lng})`);
    console.log('='.repeat(60));
    
    try {
      // Test all taxonomic classes
      for (const taxonomicClass of service.taxonomicClasses) {
        const species = await service.getSpeciesForClass(
          location.lat, 
          location.lng, 
          taxonomicClass, 
          5
        );
        
        const status = species.length > 0 ? '✅' : '❌';
        const source = species[0]?.source || 'NONE';
        
        console.log(`${status} ${taxonomicClass.displayName.padEnd(12)} | Count: ${species.length.toString().padStart(3)} | Source: ${source}`);
        
        if (species.length === 0) {
          console.log(`   🚨 CRITICAL ERROR: ${taxonomicClass.displayName} returned ZERO results!`);
        } else if (species.length < 5) {
          console.log(`   ⚠️  Warning: Only ${species.length} species found for ${taxonomicClass.displayName}`);
        }
        
        // Show first 2 species as sample
        if (species.length > 0) {
          console.log(`   Sample: ${species.slice(0, 2).map(s => s.name).join(', ')}`);
        }
      }
      
    } catch (error) {
      console.log(`❌ Location test failed: ${error.message}`);
    }
  }
  
  console.log('\n🎯 System Stats:');
  console.log(JSON.stringify(service.getSystemStats(), null, 2));
  
  console.log('\n✨ Robust Species System Test Complete!');
}

testRobustSpeciesSystem().catch(console.error);