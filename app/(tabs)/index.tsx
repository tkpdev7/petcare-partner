import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppHeader from '../../components/AppHeader';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/Colors';

interface ServiceItem {
  id: string;
  title: string;
  icon?: string;
  image?: any;
  color: string;
  route: string;
}

interface StatsItem {
  id: string;
  title: string;
  icon?: string;
  image?: any;
  color: string;
  route?: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [partnerData, setPartnerData] = useState<any>(null);
  const [greetingName, setGreetingName] = useState('Partner');

  useEffect(() => {
    loadPartnerData();
  }, []);

  // Prevent going back to auth screens - only on home tab
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        // Only prevent back on the home tab itself, not on other screens
        // Check if we're on the tabs route (home screen)
        const state = navigation.getState();
        const currentRoute = state?.routes[state.index];

        // If we're on the tabs home, prevent going back to auth
        if (currentRoute?.name === 'index' || currentRoute?.name === '(tabs)') {
          return true; // Prevent back
        }

        // Allow normal back navigation for other screens
        return false;
      }
    );

    return () => backHandler.remove();
  }, [navigation]);

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

  // Service items that vary based on partner type
  const getServiceItems = (): ServiceItem[] => {
    const partnerType = partnerData?.serviceType || 'veterinary';

    const commonServices = [
      {
        id: '1',
        title: 'Helpdesk',
        image: require('../../assets/helpdesk.png'),
        color: '#6366F1',
        route: '/helpdesk',
      },
    ];

    // Veterinary & Grooming partners
    if (partnerType === 'veterinary' || partnerType === 'grooming') {
      return [
        ...commonServices,
        {
          id: '2',
          title: 'My Services',
          image: require('../../assets/inventory.png'),
          color: '#EF4444',
          route: '/services', // Route to services management page
        },
        {
          id: '3',
          title: 'My Appointments',
          image: require('../../assets/myorders.png'),
          color: '#10B981',
          route: '/(tabs)/history',
        },
      ];
    }

    // Pharmacy partners
    if (partnerType === 'pharmacy') {
      return [
        ...commonServices,
        {
          id: '2',
          title: 'My Requests',
          image: require('../../assets/inventory.png'),
          color: '#EF4444',
          route: '/pharmacy-requests', // Incoming medicine requests from users
        },
        {
          id: '3',
          title: 'My Orders',
          image: require('../../assets/myorders.png'),
          color: '#10B981',
          route: '/(tabs)/history', // Accepted quotes/orders
        },
      ];
    }

    // Essentials partners
    if (partnerType === 'essentials') {
      return [
        ...commonServices,
        {
          id: '2',
          title: 'My Inventory',
          image: require('../../assets/inventory.png'),
          color: '#EF4444',
          route: '/(tabs)/products', // Product inventory management
        },
        {
          id: '3',
          title: 'My Orders',
          image: require('../../assets/myorders.png'),
          color: '#10B981',
          route: '/(tabs)/history', // Product orders
        },
      ];
    }

    // Default fallback (should not happen)
    return commonServices;
  };

  const serviceItems = getServiceItems();

  const getStatsItems = (): StatsItem[] => {
    const partnerType = partnerData?.serviceType || 'veterinary';

    const commonStats = [
      {
        id: '2',
        title: 'Revenue',
        image: require('../../assets/revenue.png'),
        color: '#10B981',
        route: '/revenue',
      },
      {
        id: '3',
        title: 'Review',
        image: require('../../assets/review.png'),
        color: '#F59E0B',
        route: '/reviews',
      },
    ];

    // Service Time only for Veterinary & Grooming partners
    if (partnerType === 'veterinary' || partnerType === 'grooming') {
      return [
        {
          id: '1',
          title: 'Service Time',
          image: require('../../assets/serviceTime.png'),
          color: '#3B82F6',
          route: '/service-time',
        },
        ...commonStats,
      ];
    }

    // All other partner types (pharmacy, essentials) - no Service Time
    return commonStats;
  };

  const statsItems = getStatsItems();


  const renderStatsCard = (item: StatsItem) => (
    <TouchableOpacity 
      key={item.id} 
      style={styles.individualCard}
      onPress={() => item.route && router.push(item.route as any)}
    >
      <View style={styles.cardIconContainer}>
        {item.image ? (
          <Image source={item.image} style={styles.cardImage} resizeMode="contain" />
        ) : (
          <Ionicons name={item.icon as any} size={24} color={item.color} />
        )}
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
    </TouchableOpacity>
  );

  const renderServiceCard = (item: ServiceItem) => (
    <TouchableOpacity 
      key={item.id} 
      style={styles.individualCard}
      onPress={() => router.push(item.route as any)}
    >
      <View style={styles.cardIconContainer}>
        {item.image ? (
          <Image source={item.image} style={styles.cardImage} resizeMode="contain" />
        ) : (
          <Ionicons name={item.icon as any} size={24} color={item.color} />
        )}
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
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

        {/* Cards Grid */}
        <View style={styles.cardsContainer}>
          <View style={styles.cardsGrid}>
            {statsItems.map(renderStatsCard)}
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
  cardsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 120, // Extra padding to clear tab navigation and mobile bottom buttons
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  individualCard: {
    backgroundColor: Colors.white,
    width: '30%',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  cardImage: {
    width: 32,
    height: 32,
  },
});