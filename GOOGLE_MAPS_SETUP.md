# Google Maps API Key Setup

## Step 1: Get your Google Maps API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Maps SDK for Android
   - Maps SDK for iOS
   - Places API (if using places)

## Step 2: Create API Key
1. Go to "Credentials" section
2. Click "Create Credentials" > "API Key"
3. Copy the API key

## Step 3: Update app.json
Replace `YOUR_GOOGLE_MAPS_API_KEY` in app.json with your actual API key:

```json
"android": {
  "config": {
    "googleMaps": {
      "apiKey": "YOUR_ACTUAL_API_KEY_HERE"
    }
  }
},
"ios": {
  "config": {
    "googleMapsApiKey": "YOUR_ACTUAL_API_KEY_HERE"
  }
}
```

## Step 4: Add Restrictions (Recommended)
1. In Google Cloud Console, click on your API key
2. Add restrictions:
   - For Android: Add your app's package name and SHA-1 fingerprint
   - For iOS: Add your app's bundle identifier

Package name: `com.petcare.partner`