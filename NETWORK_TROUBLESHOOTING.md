# Network Troubleshooting Guide

## Current Network Error: AxiosError: Network Error

This error typically occurs when the React Native app cannot connect to the backend API server.

## Step-by-Step Debugging

### 1. Check Backend Server Status
```bash
# In your backend project directory
npm start
# or
node server.js
# or
npm run dev
```

Make sure you see something like:
```
Server running on port 3000
API available at http://localhost:3000
```

### 2. Verify API Endpoints
Test your backend API manually:

**Option A: Using browser**
- Go to: `http://192.168.31.192:3000`
- Go to: `http://192.168.31.192:3000/api`
- Go to: `http://192.168.31.192:3000/health`

**Option B: Using curl**
```bash
curl http://192.168.31.192:3000
curl http://192.168.31.192:3000/api
curl http://192.168.31.192:3000/api/health
```

### 3. Check Network Configuration

**Get your correct IP address:**
```bash
# On Windows
ipconfig
# Look for your local IP (usually 192.168.x.x)

# On macOS/Linux
ifconfig
# or
ip addr show
```

**Update the API configuration:**
In `/config/api.ts`, update the IP address to match your machine's IP.

### 4. Common API Endpoint Patterns

Your backend might use one of these patterns:

1. **No /api prefix:**
   - Base URL: `http://192.168.31.192:3000`
   - Login: `http://192.168.31.192:3000/auth/login`

2. **With /api prefix:**
   - Base URL: `http://192.168.31.192:3000/api`
   - Login: `http://192.168.31.192:3000/api/auth/login`

3. **Different route structure:**
   - Base URL: `http://192.168.31.192:3000`
   - Login: `http://192.168.31.192:3000/partner/auth/login`

### 5. Test Different Configurations

Run the network test:
```bash
cd petcare-partner
node network-test.js
```

### 6. Android Emulator Issues

If using Android emulator, try:
- `http://10.0.2.2:3000` instead of `http://192.168.31.192:3000`
- Make sure Android emulator can access your host machine

### 7. Firewall and Security

Check if:
- Windows Firewall is blocking port 3000
- Antivirus software is blocking the connection
- Your router/network is blocking the connection

### 8. Backend CORS Configuration

Make sure your backend accepts requests from your React Native app:

```javascript
// In your backend (Express.js example)
app.use(cors({
  origin: '*', // For development only
  credentials: true
}));
```

## Quick Fixes to Try

### Fix 1: Update Environment Variable
Create a `.env` file in your project root:
```
EXPO_PUBLIC_API_URL=http://192.168.31.192:3000/api
```

### Fix 2: Test with localhost first
If you're running the app on the same machine as the backend:
```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

### Fix 3: Check Backend Route Structure
Look at your backend code to see the actual routes. Common patterns:

```javascript
// Pattern 1: Direct routes
app.post('/auth/login', ...)

// Pattern 2: API prefix
app.use('/api', router)
router.post('/auth/login', ...)

// Pattern 3: Nested routes
app.use('/api/auth', authRouter)
authRouter.post('/login', ...)
```

## Environment Variables

Add one of these to your `.env` file:

```bash
# If your backend has no /api prefix
EXPO_PUBLIC_API_URL=http://192.168.31.192:3000

# If your backend uses /api prefix
EXPO_PUBLIC_API_URL=http://192.168.31.192:3000/api

# For localhost development
EXPO_PUBLIC_API_URL=http://localhost:3000/api

# For Android emulator
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api
```

## Next Steps

1. **Share your backend code structure** - I need to see how your routes are organized
2. **Test the backend manually** - Verify it responds to HTTP requests
3. **Check the network** - Make sure both devices are on the same network
4. **Try the test scripts** - Run the network diagnostics we created

## Need More Help?

If these steps don't work, please share:
1. Your backend server startup logs
2. Your backend route structure (main server file)
3. Results from testing the backend manually
4. Your network configuration (IP addresses)