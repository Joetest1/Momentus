// Test with broader search to see if GBIF is working at all for this location
async function testBroaderGBIF() {
  console.log('🔍 Testing broader GBIF search...');
  
  const latitude = 33.930058;
  const longitude = -117.4143;
  
  console.log('\n1️⃣ Testing basic occurrence search (no taxon filter)...');
  try {
    const basicUrl = `https://api.gbif.org/v1/occurrence/search?decimalLatitude=${latitude}&decimalLongitude=${longitude}&radius=50&limit=10&hasCoordinate=true`;
    console.log('URL:', basicUrl);
    
    const response = await fetch(basicUrl);
    const data = await response.json();
    
    console.log('✅ Basic search results:');
    console.log('   Count:', data.count);
    console.log('   Results:', data.results ? data.results.length : 0);
    
    if (data.results && data.results[0]) {
      console.log('   Sample species:', data.results[0].scientificName);
      console.log('   Sample taxon key:', data.results[0].taxonKey);
    }
  } catch (error) {
    console.log('❌ Basic search failed:', error.message);
  }
  
  console.log('\n2️⃣ Testing with larger radius (200km)...');
  try {
    const wideUrl = `https://api.gbif.org/v1/occurrence/search?decimalLatitude=${latitude}&decimalLongitude=${longitude}&radius=200&taxonKey=212&limit=10&hasCoordinate=true`;
    console.log('URL:', wideUrl);
    
    const response = await fetch(wideUrl);
    const data = await response.json();
    
    console.log('✅ Wide search results:');
    console.log('   Count:', data.count);
    console.log('   Results:', data.results ? data.results.length : 0);
  } catch (error) {
    console.log('❌ Wide search failed:', error.message);
  }
  
  console.log('\n3️⃣ Testing known populated area (NYC)...');
  try {
    const nycUrl = `https://api.gbif.org/v1/occurrence/search?decimalLatitude=40.7128&decimalLongitude=-74.0060&radius=50&taxonKey=212&limit=10&hasCoordinate=true`;
    console.log('URL:', nycUrl);
    
    const response = await fetch(nycUrl);
    const data = await response.json();
    
    console.log('✅ NYC search results:');
    console.log('   Count:', data.count);
    console.log('   Results:', data.results ? data.results.length : 0);
    
    if (data.results && data.results[0]) {
      console.log('   Sample NYC bird:', data.results[0].scientificName);
    }
  } catch (error) {
    console.log('❌ NYC search failed:', error.message);
  }
}

testBroaderGBIF();