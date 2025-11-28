import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function IndexScreen() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check if user is already logged in
      const token = await AsyncStorage.getItem('partnerToken');
      const partnerData = await AsyncStorage.getItem('partnerData');

      if (token && partnerData) {
        console.log('User is logged in, redirecting to home...');
        router.replace('/(tabs)');
      } else {
        console.log('No auth found, redirecting to login...');
        router.replace('/auth/login');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      router.replace('/auth/login');
    } finally {
      setIsChecking(false);
    }
  };

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