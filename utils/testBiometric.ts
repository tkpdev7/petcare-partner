import * as LocalAuthentication from 'expo-local-authentication';

export const testBiometricAuth = async () => {
  try {
    console.log('Testing biometric authentication...');

    // Check hardware support
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    console.log('Has hardware:', hasHardware);

    // Check enrollment
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    console.log('Is enrolled:', isEnrolled);

    // Get supported types
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    console.log('Supported types:', supportedTypes);

    // Test authentication (commented out to avoid prompting during build)
    // const result = await LocalAuthentication.authenticateAsync({
    //   promptMessage: 'Test authentication',
    //   fallbackLabel: 'Use passcode',
    // });

    console.log('Biometric authentication setup complete');
    return { hasHardware, isEnrolled, supportedTypes };

  } catch (error) {
    console.error('Biometric test error:', error);
    return { error: error.message };
  }
};