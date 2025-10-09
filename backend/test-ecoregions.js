// Test script for ecoregion detection
const RobustSpeciesService = require('./services/RobustSpeciesService');

const robustSpeciesService = new RobustSpeciesService();

// Test capital cities
const capitals = [
  { name: 'Austin, Texas', lat: 30.2672, lng: -97.7431 },
  { name: 'Richmond, Virginia', lat: 37.5407, lng: -77.4360 },
  { name: 'Augusta, Maine', lat: 44.3106, lng: -69.7795 },
  { name: 'Des Moines, Iowa', lat: 41.5868, lng: -93.6250 }
];

console.log('=== ECOREGION DETECTION TEST ===\n');

capitals.forEach(capital => {
  const ecoregion = robustSpeciesService.getEcoregionFromCoordinates(capital.lat, capital.lng);
  console.log(`${capital.name} (${capital.lat}, ${capital.lng}):`);
  console.log(`  Ecoregion: ${ecoregion.name}`);
  console.log(`  Code: ${ecoregion.code}`);
  console.log(`  State: ${ecoregion.state}`);
  console.log('');
});

console.log('=== TEST COMPLETE ===');