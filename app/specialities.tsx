import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/Colors';

interface Service {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

export default function SpecialitiesScreen() {
  const router = useRouter();

  const services: Service[] = [
    {
      id: '1',
      title: 'General Consultation',
      description: 'Regular health checkups and consultations',
      icon: 'medical-outline',
      color: Colors.primary,
    },
    {
      id: '2',
      title: 'Vaccination',
      description: 'Pet vaccination services',
      icon: 'shield-checkmark-outline',
      color: '#10B981',
    },
    {
      id: '3',
      title: 'Surgery',
      description: 'Surgical procedures and operations',
      icon: 'cut-outline',
      color: '#EF4444',
    },
    {
      id: '4',
      title: 'Dental Care',
      description: 'Dental cleaning and oral health',
      icon: 'happy-outline',
      color: '#8B5CF6',
    },
    {
      id: '5',
      title: 'Emergency Care',
      description: '24/7 emergency medical care',
      icon: 'warning-outline',
      color: '#F59E0B',
    },
    {
      id: '6',
      title: 'Grooming',
      description: 'Professional pet grooming services',
      icon: 'brush-outline',
      color: '#06B6D4',
    },
  ];

  const renderServiceCard = (service: Service) => (
    <TouchableOpacity key={service.id} style={styles.serviceCard}>
      <View style={[styles.serviceIcon, { backgroundColor: service.color }]}>
        <Ionicons name={service.icon as any} size={24} color={Colors.white} />
      </View>
      <View style={styles.serviceContent}>
        <Text style={styles.serviceTitle}>{service.title}</Text>
        <Text style={styles.serviceDescription}>{service.description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Services" showBackButton={true} />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Services</Text>
          <Text style={styles.sectionSubtitle}>
            Manage your service offerings and availability
          </Text>
        </View>

        <View style={styles.servicesContainer}>
          {services.map(renderServiceCard)}
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
  section: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
  },
  servicesContainer: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.md,
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceContent: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  serviceDescription: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
  },
});