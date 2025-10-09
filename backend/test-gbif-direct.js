// Simple fetch test for GBIF without server logging
// Using built-in fetch (Node.js 18+)

async function testGBIFSimple() {
  console.log('🔍 Testing GBIF API directly...');
  
  try {
    // Test the same URL structure we use in RobustSpeciesService
    const testUrl = 'https://api.gbif.org/v1/occurrence/search?limit=1&hasCoordinate=true&hasGeospatialIssue=false';
    
    console.log('Request URL:', testUrl);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Momentus Meditation App 1.0'
      }
    });
    
    console.log('✅ Response received');
    console.log('   Status:', response.status);
    console.log('   Status Text:', response.statusText);
    console.log('   Content-Type:', response.headers.get('content-type'));
    console.log('   OK:', response.ok);
    
    const responseText = await response.text();
    console.log('📄 Response preview (first 200 chars):');
    console.log(responseText.substring(0, 200) + '...');
    
    // Try to parse as JSON
    try {
      const data = JSON.parse(responseText);
      console.log('✅ Valid JSON received');
      console.log('   Count property:', data.count);
      console.log('   Results length:', data.results ? data.results.length : 'N/A');
    } catch (parseError) {
      console.log('❌ JSON parse failed:', parseError.message);
      console.log('   This explains the "Unexpected token" error in logs');
    }
    
  } catch (networkError) {
    console.log('❌ Network error:', networkError.message);
  }
}

testGBIFSimple();