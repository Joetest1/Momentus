// Quick test to check GBIF API status
async function testGBIF() {
  console.log('🔍 Testing GBIF API accessibility...');
  
  try {
    // Test simple GBIF API call
    const testUrl = 'https://api.gbif.org/v1/occurrence/search?limit=1';
    const response = await fetch(testUrl);
    
    console.log('Response status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ GBIF API is working');
      console.log('Sample result count:', data.count || 0);
    } else {
      console.log('❌ GBIF API returned error:', response.statusText);
      const text = await response.text();
      console.log('Response preview:', text.substring(0, 200));
    }
    
  } catch (error) {
    console.log('❌ GBIF API test failed:', error.message);
  }
}

testGBIF().catch(console.error);