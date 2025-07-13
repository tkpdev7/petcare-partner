import axios from 'axios';

// Test different API configurations
const testConfigs = [
  { url: 'http://192.168.31.192:3000', desc: 'Base without /api' },
  { url: 'http://192.168.31.192:3000/api', desc: 'Base with /api' },
  { url: 'http://localhost:3000', desc: 'Localhost' },
  { url: 'http://10.0.2.2:3000', desc: 'Android emulator bridge' },
];

const testEndpoints = [
  '/auth/login',
  '/api/auth/login', 
  '/health',
  '/api/health',
  '/',
];

async function testNetworkConnectivity() {
  console.log('🔍 Starting network diagnostics...\n');
  
  for (const config of testConfigs) {
    console.log(`Testing ${config.desc}: ${config.url}`);
    
    for (const endpoint of testEndpoints) {
      try {
        const fullUrl = `${config.url}${endpoint}`;
        console.log(`  → GET ${fullUrl}`);
        
        const response = await axios.get(fullUrl, {
          timeout: 3000,
          validateStatus: () => true, // Accept any status code
        });
        
        console.log(`    ✅ ${response.status} ${response.statusText}`);
        if (response.data) {
          console.log(`    📄 Response:`, JSON.stringify(response.data).substring(0, 100));
        }
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log(`    ❌ Connection refused`);
        } else if (error.code === 'ENOTFOUND') {
          console.log(`    ❌ Host not found`);
        } else if (error.code === 'ETIMEDOUT') {
          console.log(`    ❌ Timeout`);
        } else {
          console.log(`    ❌ ${error.message}`);
        }
      }
    }
    console.log('');
  }
  
  // Test POST request
  console.log('🔐 Testing POST /auth/login...');
  
  const loginData = {
    email: 'test@example.com',
    password: 'testpassword'
  };
  
  for (const config of testConfigs) {
    for (const endpoint of ['/auth/login', '/api/auth/login']) {
      try {
        const fullUrl = `${config.url}${endpoint}`;
        console.log(`  → POST ${fullUrl}`);
        
        const response = await axios.post(fullUrl, loginData, {
          timeout: 3000,
          validateStatus: () => true,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log(`    ✅ ${response.status} ${response.statusText}`);
        if (response.data) {
          console.log(`    📄 Response:`, JSON.stringify(response.data).substring(0, 100));
        }
      } catch (error) {
        console.log(`    ❌ ${error.message}`);
      }
    }
  }
}

// Run the test
testNetworkConnectivity().catch(console.error);