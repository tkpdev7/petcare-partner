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

  // Partner type checks
  const isVetOrGrooming = partnerType === 'veterinary' || partnerType === 'grooming';
  const isPharmacy = partnerType === 'pharmacy';
  const isEssentials = partnerType === 'essentials';

  console.log('Partner type:', partnerType, { isVetOrGrooming, isPharmacy, isEssentials });

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          position: "absolute",
          bottom: 1,
          left: 30,
          right: 30,
          borderRadius: 15,
          height: 70,
          backgroundColor: "#fff",
          elevation: 5,
          shadowOpacity: 0.25,
          shadowOffset: { width: 0, height: -3 },
          overflow: "hidden",
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: -5,
          marginBottom: 5,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Inventory',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "cube" : "cube-outline"}
              size={24}
              color={color}
            />
          ),
          // Show Inventory tab only for Essentials partners
          href: isEssentials ? '/(tabs)/products' : null,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          // Tab title based on partner type
          title: isVetOrGrooming ? 'Appointments' : 'Orders',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? (isVetOrGrooming ? "calendar" : "receipt") : (isVetOrGrooming ? "calendar-outline" : "receipt-outline")}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="revenue"
        options={{
          title: 'Revenue',
          href: null, // Hide revenue tab from navigation
        }}
      />
    </Tabs>
  );
}