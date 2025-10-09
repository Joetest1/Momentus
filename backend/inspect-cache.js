// Check EcoregionSpeciesService cache for existing species data
const EcoregionSpeciesService = require('./services/EcoregionSpeciesService');

function inspectCache() {
  console.log('🔍 Inspecting EcoregionSpeciesService Cache');
  console.log('📍 Looking for cached species data...\n');
  
  try {
    const ecoService = new EcoregionSpeciesService();
    
    // Check if cache has any data
    console.log(`📊 Cache size: ${ecoService.speciesCache.size} entries`);
    
    if (ecoService.speciesCache.size === 0) {
      console.log('❌ No cached data found');
      console.log('💡 This means GBIF API calls haven\'t completed successfully yet');
      return;
    }
    
    // Show all cached locations
    console.log('🗺️  CACHED LOCATIONS:');
    for (const [locationKey, cacheEntry] of ecoService.speciesCache.entries()) {
      const timestamp = new Date(cacheEntry.timestamp).toLocaleString();
      const lat = cacheEntry.location.latitude;
      const lng = cacheEntry.location.longitude;
      
      console.log(`\n📍 Location: ${locationKey} (${lat}, ${lng})`);
      console.log(`⏰ Cached: ${timestamp}`);
      console.log(`🌍 Ecoregion: ${cacheEntry.data.ecoregion?.name || 'Unknown'}`);
      console.log(`📊 Total species: ${cacheEntry.data.summary.total}`);
      
      // Show species count by class
      console.log('📋 Species by class:');
      const classes = ['birds', 'mammals', 'insects', 'fish', 'reptiles', 'amphibians'];
      classes.forEach(className => {
        const count = cacheEntry.data.summary.byClass[className] || 0;
        const icon = getIcon(className);
        console.log(`  ${icon} ${className}: ${count}`);
      });
      
      // Show 5 species from each class that has data
      console.log('\n🔬 SAMPLE SPECIES (5 per class):');
      classes.forEach(className => {
        const species = cacheEntry.data.species[className] || [];
        const icon = getIcon(className);
        
        if (species.length > 0) {
          console.log(`\n${icon} ${className.toUpperCase()} (${species.length} total):`);
          species.slice(0, 5).forEach((sp, i) => {
            const name = sp.name || sp.scientificName || 'Unknown';
            const scientific = sp.scientificName && sp.name !== sp.scientificName ? ` (${sp.scientificName})` : '';
            console.log(`  ${i+1}. ${name}${scientific}`);
            if (sp.habitat) console.log(`     Habitat: ${sp.habitat}`);
          });
        } else {
          console.log(`\n${icon} ${className.toUpperCase()}: No species cached`);
        }
      });
    }
    
  } catch (error) {
    console.log(`❌ Error inspecting cache: ${error.message}`);
  }
}

function getIcon(category) {
  const icons = {
    birds: '🐦',
    mammals: '🐾', 
    insects: '🦋',
    fish: '🐟',
    reptiles: '🦎',
    amphibians: '🐸'
  };
  return icons[category] || '🔬';
}

inspectCache();