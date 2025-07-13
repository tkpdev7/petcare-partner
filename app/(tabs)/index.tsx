import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppHeader from '../../components/AppHeader';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/Colors';

interface ServiceItem {
  id: string;
  title: string;
  icon: string;
  color: string;
  route: string;
}

interface StatsItem {
  id: string;
  title: string;
  icon: string;
  color: string;
  route?: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const [partnerData, setPartnerData] = useState<any>(null);
  const [greetingName, setGreetingName] = useState('Partner');

  useEffect(() => {
    loadPartnerData();
  }, []);

  const loadPartnerData = async () => {
    try {
      const data = await AsyncStorage.getItem('partnerData');
      if (data) {
        const parsed = JSON.parse(data);
        setPartnerData(parsed);
        setGreetingName(parsed.name || 'Partner');
      }
    } catch (error) {
      console.error('Error loading partner data:', error);
    }
  };

  // Stats items that match your design
  // Service items that vary based on partner type
  const getServiceItems = (): ServiceItem[] => {
    const partnerType = partnerData?.serviceType || 'veterinary';
    
    const commonServices = [
      {
        id: '1',
        title: 'Helpdesk',
        icon: 'headset-outline',
        color: '#6366F1',
        route: '/helpdesk',
      },
    ];

    if (partnerType === 'pharmacy') {
      return [
        ...commonServices,
        {
          id: '2',
          title: 'My Inventory',
          icon: 'cube-outline',
          color: '#EF4444',
          route: '/(tabs)/products',
        },
        {
          id: '3',
          title: 'My Orders',
          icon: 'receipt-outline',
          color: '#10B981',
          route: '/(tabs)/history',
        },
      ];
    } else {
      return [
        ...commonServices,
        {
          id: '2',
          title: 'Services',
          icon: 'medical-outline',
          color: '#EF4444',
          route: '/(tabs)/products',
        },
        {
          id: '3',
          title: 'My Appointments',
          icon: 'calendar-outline',
          color: '#10B981',
          route: '/(tabs)/history',
        },
      ];
    }
  };

  const serviceItems = getServiceItems();

  const statsItems: StatsItem[] = [
    {
      id: '1',
      title: 'Service Time',
      icon: 'time-outline',
      color: '#3B82F6',
      route: '/service-time',
    },
    {
      id: '2', 
      title: 'Revenue',
      icon: 'trending-up-outline',
      color: '#10B981',
      route: '/revenue',
    },
    {
      id: '3',
      title: 'Review',
      icon: 'star-outline', 
      color: '#F59E0B',
      route: '/reviews',
    },
  ];


  const renderStatsCard = (item: StatsItem) => (
    <TouchableOpacity 
      key={item.id} 
      style={styles.statsCard}
      onPress={() => item.route && router.push(item.route as any)}
    >
      <View style={[styles.statsIcon, { backgroundColor: item.color }]}>
        <Ionicons name={item.icon as any} size={24} color={Colors.white} />
      </View>
      <Text style={styles.statsTitle}>{item.title}</Text>
    </TouchableOpacity>
  );

  const renderServiceCard = (item: ServiceItem) => (
    <TouchableOpacity 
      key={item.id} 
      style={styles.serviceCard}
      onPress={() => router.push(item.route as any)}
    >
      <View style={[styles.serviceIcon, { backgroundColor: item.color }]}>
        <Ionicons name={item.icon as any} size={24} color={Colors.white} />
      </View>
      <Text style={styles.serviceTitle}>{item.title}</Text>
    </TouchableOpacity>
  );


  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Home" showBackButton={false} />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Greeting Section */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingText}>Greetings, {greetingName}</Text>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            {statsItems.map(renderStatsCard)}
          </View>
        </View>

        {/* Services Section */}
        <View style={styles.servicesSection}>
          <View style={styles.servicesGrid}>
            {serviceItems.map(renderServiceCard)}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  content: {
    flex: 1,
  },
  greetingSection: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
  },
  greetingText: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textPrimary,
  },
  statsSection: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  statsCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  statsIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  statsTitle: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  servicesSection: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  servicesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  serviceCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  serviceIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  serviceTitle: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
});