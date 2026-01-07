import { useState, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { Alert, Platform } from 'react-native';

interface BiometricAuthResult {
  success: boolean;
  error?: string;
}

export const useBiometricAuth = () => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const checkBiometricAvailability = useCallback(async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return compatible && enrolled;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  }, []);

  const authenticateBiometric = useCallback(async (): Promise<BiometricAuthResult> => {
    try {
      setIsAuthenticating(true);

      // Check if device supports biometric authentication
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware) {
        return {
          success: false,
          error: 'Device does not support biometric authentication'
        };
      }

      if (!isEnrolled) {
        return {
          success: false,
          error: 'No biometric data enrolled on device'
        };
      }

      // Attempt authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to view sensitive information',
        fallbackLabel: 'Use device passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || 'Authentication failed'
        };
      }

    } catch (error: any) {
      console.error('Authentication error:', error);
      return {
        success: false,
        error: error.message || 'Authentication failed'
      };
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  return {
    authenticateBiometric,
    checkBiometricAvailability,
    isAuthenticating,
  };
};