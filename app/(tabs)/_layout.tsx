import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography } from '../../constants/Colors';

export default function TabLayout() {
  const [partnerType, setPartnerType] = useState<string>('veterinary');

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
      }
    };
    loadPartnerData();
  }, []);

  const isPharmacyPartner = partnerType === 'pharmacy';
  
  console.log('Partner type:', partnerType, 'Is pharmacy:', isPharmacyPartner);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopWidth: 1,
          borderTopColor: Colors.borderLight,
          height: 70,
          paddingBottom: 12,
          paddingTop: 8,
          shadowColor: Colors.black,
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 5,
        },
        tabBarLabelStyle: {
          fontSize: Typography.fontSizes.xs,
          fontWeight: Typography.fontWeights.semibold,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Inventory',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
          href: isPharmacyPartner ? '/(tabs)/products' : null,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: isPharmacyPartner ? 'Orders' : 'Appointments',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={isPharmacyPartner ? "receipt-outline" : "calendar-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}