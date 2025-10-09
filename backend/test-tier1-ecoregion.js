// Test Tier 1: EcoregionSpeciesService (Local Storage) for Riverside, CA
const EcoregionSpeciesService = require('./services/EcoregionSpeciesService');

async function testTier1EcoregionService() {
  console.log('🎯 Testing TIER 1: EcoregionSpeciesService (Local Storage)');
  console.log('📍 Location: Riverside, CA (34.045225, -117.267289)\n');
  
  const ecoService = new EcoregionSpeciesService();
  
  // Riverside, CA coordinates
  const latitude = 34.045225;
  const longitude = -117.267289;
  
  try {
    console.log('🔄 Fetching species data from GBIF + ArcGIS ecoregions...\n');
    
    const result = await ecoService.getSpeciesForLocation(latitude, longitude, {
      userConfirmed: true,
      forceRefresh: true // Get fresh data
    });
    
    if (!result.success) {
      console.log('❌ Failed to get species data:', result.error || result.message);
      return;
    }
    
    console.log('✅ Species data retrieved successfully!');
    console.log(`🌍 Ecoregion: ${result.ecoregion?.name || 'Unknown'}`);
    console.log(`📊 Total species found: ${result.summary?.total || 0}\n`);
    
    // Show breakdown by category
    console.log('📋 SPECIES COUNT BY CATEGORY:');
    const categories = ['birds', 'mammals', 'insects', 'fish', 'reptiles', 'amphibians'];
    
    categories.forEach(category => {
      const count = result.summary?.byClass?.[category] || 0;
      const icon = getIcon(category);
      console.log(`  ${icon} ${category}: ${count} species`);
    });
    
    console.log('\n🔬 SAMPLE SPECIES (5 per category):\n');
    
    // Show 5 species from each category
    categories.forEach(category => {
      const species = result.species?.[category] || [];
      const icon = getIcon(category);
      
      console.log(`${icon} ${category.toUpperCase()} (showing ${Math.min(5, species.length)} of ${species.length}):`);
      
      if (species.length === 0) {
        console.log('   No species found in this category');
      } else {
        species.slice(0, 5).forEach((sp, i) => {
          console.log(`   ${i+1}. ${sp.name} ${sp.scientificName ? '(' + sp.scientificName + ')' : ''}`);
          if (sp.habitat) console.log(`      Habitat: ${sp.habitat}`);
        });
      }
      console.log('');
    });
    
    // Show if this is cached data
    if (result.cached) {
      console.log('💾 This data was retrieved from local cache');
    } else {
      console.log('🌐 This data was freshly fetched and cached locally');
    }
    
    console.log('\n✅ Tier 1 EcoregionSpeciesService test complete!');
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    console.log(error.stack);
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

testTier1EcoregionService();