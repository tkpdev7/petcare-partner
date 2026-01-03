import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function IndexScreen() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (!hasNavigated.current) {
      checkAuthStatus();
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check if user is already logged in
      const token = await AsyncStorage.getItem('partnerToken');
      const partnerData = await AsyncStorage.getItem('partnerData');

      if (token && partnerData) {
        console.log('User is logged in, redirecting to home...');
        hasNavigated.current = true;
        router.replace('/(tabs)');
      } else {
        console.log('No auth found, redirecting to login...');
        hasNavigated.current = true;
        router.replace('/auth/login');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      hasNavigated.current = true;
      router.replace('/auth/login');
    } finally {
      setIsChecking(false);
    }
  };

  // Return null if already navigated to prevent re-rendering
  if (hasNavigated.current) {
    return null;
  }

  return (
    <View style={styles.container}>
      {isChecking ? (
        <>
          <ActivityIndicator size="large" color="#FF7A59" />
          <Text style={styles.text}>Loading...</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    fontSize: 18,
    color: '#333333',
  },
});