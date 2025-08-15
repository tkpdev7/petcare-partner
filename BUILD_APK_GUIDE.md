# 🚀 APK Build Guide for PetCare Partner App

## 🔧 Prerequisites Setup

### 1. Google Maps API Key Configuration
**CRITICAL:** Update `app.json` with your Google Maps API key:
- Replace `YOUR_GOOGLE_MAPS_API_KEY` with your actual API key
- See `GOOGLE_MAPS_SETUP.md` for detailed instructions

### 2. Production API Configuration
✅ **Already configured:** Production API URL is set to:
`https://petcare-api-0svs.onrender.com`

## 🏗️ Build Methods

### Method 1: EAS Build (Recommended)

1. **Install EAS CLI:**
```bash
npm install -g eas-cli
```

2. **Login to Expo:**
```bash
eas login
```

3. **Initialize Project:**
```bash
eas init
```

4. **Build APK:**
```bash
eas build --platform android --profile production
```

### Method 2: Local Build (Alternative)

1. **Install Android Studio and SDK**
2. **Set up environment variables:**
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

3. **Build locally:**
```bash
npx expo run:android --variant release
```

### Method 3: Expo Build (Legacy)

1. **Build with Expo:**
```bash
expo build:android -t apk
```

## 📱 APK Configuration Summary

### ✅ What's Already Configured:
- **Package Name:** `com.petcare.partner`
- **Version:** `1.0.0`
- **API URL:** Production (`https://petcare-api-0svs.onrender.com`)
- **Permissions:** Camera, Storage, Location
- **Build Type:** APK (not AAB)

### ⚠️ What You Need to Do:
1. **Add Google Maps API Key** in `app.json`
2. **Replace** `YOUR_GOOGLE_MAPS_API_KEY` with actual key
3. **Run build command** of your choice

## 🎯 Build Profiles

### Production Profile:
- **Environment:** Production API
- **Build Type:** APK
- **Optimized:** Yes
- **Debug:** No

## 📋 Final Checklist

- [ ] Google Maps API key added
- [ ] Production API URL confirmed
- [ ] All dependencies installed
- [ ] EAS CLI installed and logged in
- [ ] Build command executed

## 🚨 Troubleshooting

### Common Issues:
1. **Google Maps not working:** Check API key configuration
2. **Build fails:** Ensure all dependencies are compatible
3. **API calls fail:** Verify production API URL is accessible

### Support:
- Check Expo documentation: https://docs.expo.dev/
- EAS Build docs: https://docs.expo.dev/build/introduction/