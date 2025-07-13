// Simple test to verify API connectivity
import axios from 'axios';

const API_BASE_URL = 'http://192.168.31.192:3000/api';

async function testAPI() {
  try {
    console.log('Testing API connectivity...');
    console.log('Base URL:', API_BASE_URL);
    
    // Test basic connectivity
    const response = await axios.get(`${API_BASE_URL}/health`, {
      timeout: 5000,
    });
    
    console.log('API Response:', response.data);
    console.log('✅ API is accessible');
  } catch (error) {
    console.log('❌ API Test Failed:');
    if (error.code === 'ECONNREFUSED') {
      console.log('- Connection refused. Is the server running?');
    } else if (error.code === 'ENOTFOUND') {
      console.log('- Host not found. Check the IP address.');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('- Request timed out. Check network connectivity.');
    } else {
      console.log('- Error:', error.message);
    }
    
    console.log('\nTroubleshooting tips:');
    console.log('1. Make sure your backend server is running');
    console.log('2. Check if the IP address 192.168.31.192 is correct');
    console.log('3. Ensure port 3000 is open and accessible');
    console.log('4. Try accessing http://192.168.31.192:3000/api/health in browser');
  }
}

testAPI();