import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking, Platform } from 'react-native';

export interface PermissionStatus {
  location: boolean;
  media: boolean;
  camera: boolean;
}

/**
 * Request location permission
 */
export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Location Permission',
        'PetCare Partner needs access to your location to find nearby services.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            },
          },
        ]
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
};

/**
 * Request camera permission
 */
export const requestCameraPermission = async (): Promise<boolean> => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Camera Permission',
        'PetCare Partner needs access to your camera to take photos for products and services.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            },
          },
        ]
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error requesting camera permission:', error);
    return false;
  }
};

/**
 * Request media library permission
 */
export const requestMediaPermission = async (): Promise<boolean> => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Photo Library Permission',
        'PetCare Partner needs access to your photos to upload product images and profile photos.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            },
          },
        ]
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error requesting media permission:', error);
    return false;
  }
};

/**
 * Show soft permission prompt modal before requesting OS permission
 */
const showSoftPermissionPrompt = (type: 'camera' | 'media', onConfirm: () => void): Promise<boolean> => {
  return new Promise((resolve) => {
    const contextMessage = type === 'camera'
      ? 'We need access to your camera to take photos for products and services.'
      : 'We need access to your gallery to select photos for products and services.';

    Alert.alert(
      'Permission Required',
      contextMessage,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(false)
        },
        {
          text: 'Continue',
          onPress: () => {
            onConfirm();
            resolve(true);
          }
        },
      ]
    );
  });
};

/**
 * Request camera permission with soft prompt
 */
export const requestCameraPermissionLazy = async (): Promise<boolean> => {
  // Check if already granted
  const { status } = await ImagePicker.getCameraPermissionsAsync();
  if (status === 'granted') return true;

  // Show soft prompt first
  const userConfirmed = await showSoftPermissionPrompt('camera', async () => {
    // This will be called when user taps "Continue"
  });

  if (!userConfirmed) return false;

  // Now request OS permission
  return await requestCameraPermission();
};

/**
 * Request media permission with soft prompt
 */
export const requestMediaPermissionLazy = async (): Promise<boolean> => {
  // Check if already granted
  const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (status === 'granted') return true;

  // Show soft prompt first
  const userConfirmed = await showSoftPermissionPrompt('media', async () => {
    // This will be called when user taps "Continue"
  });

  if (!userConfirmed) return false;

  // Now request OS permission
  return await requestMediaPermission();
};

/**
 * Request all app permissions on startup
 * ⚠️ DEPRECATED: Do not use for camera/media permissions - request them lazily when needed
 */
export const requestAllPermissions = async (): Promise<PermissionStatus> => {
  const locationGranted = await requestLocationPermission();
  const mediaGranted = await requestMediaPermission();
  const cameraGranted = await requestCameraPermission();

  return {
    location: locationGranted,
    media: mediaGranted,
    camera: cameraGranted,
  };
};

/**
 * Check if permissions are granted without requesting
 */
export const checkPermissions = async (): Promise<PermissionStatus> => {
  try {
    const locationStatus = await Location.getForegroundPermissionsAsync();
    const mediaStatus = await ImagePicker.getMediaLibraryPermissionsAsync();
    const cameraStatus = await ImagePicker.getCameraPermissionsAsync();

    return {
      location: locationStatus.status === 'granted',
      media: mediaStatus.status === 'granted',
      camera: cameraStatus.status === 'granted',
    };
  } catch (error) {
    console.error('Error checking permissions:', error);
    return {
      location: false,
      media: false,
      camera: false,
    };
  }
};