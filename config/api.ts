// API Configuration
export const API_CONFIGS = {
  // Development configurations
  local: 'http://localhost:3000',
  localWithApi: 'http://localhost:3000/api',
  
  // Network configurations  
  network: 'http://192.168.31.192:3000',
  networkWithApi: 'http://192.168.31.192:3000/api',
  
  // Android emulator
  androidEmulator: 'http://10.0.2.2:3000',
  androidEmulatorWithApi: 'http://10.0.2.2:3000/api',
  
  // Production - Main backend
  production: 'https://petcare-api-0svs.onrender.com',
};

// Common API endpoints that we can test
export const TEST_ENDPOINTS = [
  '/',
  '/health',
  '/api/health', 
  '/ping',
  '/status',
];

// Current configuration
export const getCurrentApiConfig = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    console.log('📝 Using API URL from environment:', envUrl);
    return envUrl;
  }
  
  // Default fallback - use production for now  
  console.log('📝 Using default API URL:', API_CONFIGS.production);
  return API_CONFIGS.production;
};

// Network diagnostics
export const diagnoseNetworkIssue = (error: any) => {
  const suggestions: string[] = [];
  
  if (error.code === 'ECONNREFUSED') {
    suggestions.push('🔧 Server is not running or wrong port');
    suggestions.push('🔧 Check if backend server is started on port 3000');
    suggestions.push('🔧 Verify firewall settings');
  } else if (error.code === 'ENOTFOUND') {
    suggestions.push('🔧 Invalid IP address or hostname');
    suggestions.push('🔧 Check network connectivity');
    suggestions.push('🔧 Verify IP address: 192.168.31.192');
  } else if (error.code === 'ETIMEDOUT') {
    suggestions.push('🔧 Request timed out');
    suggestions.push('🔧 Check network speed and stability');
    suggestions.push('🔧 Server might be overloaded');
  } else if (error.message?.includes('Network Error')) {
    suggestions.push('🔧 General network error');
    suggestions.push('🔧 Check if you are on the same network as the server');
    suggestions.push('🔧 Try different API configurations');
  }
  
  return suggestions;
};