import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router, Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HistoryRedirect() {
  const [partnerType, setPartnerType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPartnerData = async () => {
      try {
        const data = await AsyncStorage.getItem('partnerData');
        if (data) {
          const parsed = JSON.parse(data);
          setPartnerType(parsed.serviceType || 'veterinary');
        }
      } catch (error) {
        console.error('Error loading partner data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPartnerData();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  // For vet & grooming partners, redirect to new appointments flow
  const isVetOrGrooming = partnerType === 'veterinary' || partnerType === 'grooming';

  if (isVetOrGrooming) {
    return <Redirect href="/appointments/appointmentList" />;
  }

  // For pharmacy & essentials partners, show original orders history
  // (We'll keep this redirect to the old history implementation)
  return <Redirect href="/orders/ordersList" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F7FB',
  },
});
