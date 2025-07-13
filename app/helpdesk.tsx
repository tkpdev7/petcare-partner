import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/Colors';

interface HelpItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  action: () => void;
}

export default function HelpdeskScreen() {
  const router = useRouter();

  const helpItems: HelpItem[] = [
    {
      id: '1',
      title: 'Call Support',
      description: 'Speak directly with our support team',
      icon: 'call-outline',
      color: '#10B981',
      action: () => Linking.openURL('tel:+1234567890'),
    },
    {
      id: '2',
      title: 'Email Support',
      description: 'Send us an email with your query',
      icon: 'mail-outline',
      color: '#3B82F6',
      action: () => Linking.openURL('mailto:support@petcare.com'),
    },
    {
      id: '3',
      title: 'Live Chat',
      description: 'Chat with our support representatives',
      icon: 'chatbubble-outline',
      color: Colors.primary,
      action: () => {
        // TODO: Open chat interface
        console.log('Open chat');
      },
    },
    {
      id: '4',
      title: 'FAQ',
      description: 'Browse frequently asked questions',
      icon: 'help-circle-outline',
      color: '#8B5CF6',
      action: () => {
        // TODO: Navigate to FAQ screen
        console.log('Open FAQ');
      },
    },
    {
      id: '5',
      title: 'Report Issue',
      description: 'Report technical issues or bugs',
      icon: 'bug-outline',
      color: '#EF4444',
      action: () => {
        // TODO: Navigate to bug report form
        console.log('Report issue');
      },
    },
    {
      id: '6',
      title: 'Feature Request',
      description: 'Suggest new features or improvements',
      icon: 'bulb-outline',
      color: '#F59E0B',
      action: () => {
        // TODO: Navigate to feature request form
        console.log('Feature request');
      },
    },
  ];

  const renderHelpCard = (item: HelpItem) => (
    <TouchableOpacity 
      key={item.id} 
      style={styles.helpCard}
      onPress={item.action}
    >
      <View style={[styles.helpIcon, { backgroundColor: item.color }]}>
        <Ionicons name={item.icon as any} size={24} color={Colors.white} />
      </View>
      <View style={styles.helpContent}>
        <Text style={styles.helpTitle}>{item.title}</Text>
        <Text style={styles.helpDescription}>{item.description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Help & Support" showBackButton={true} />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How can we help you?</Text>
          <Text style={styles.sectionSubtitle}>
            Choose from the options below to get the assistance you need
          </Text>
        </View>

        <View style={styles.helpContainer}>
          {helpItems.map(renderHelpCard)}
        </View>

        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Emergency Contact</Text>
          <Text style={styles.contactSubtitle}>
            For urgent matters, call our 24/7 support line
          </Text>
          <TouchableOpacity 
            style={styles.emergencyButton}
            onPress={() => Linking.openURL('tel:+1234567890')}
          >
            <Ionicons name="call" size={20} color={Colors.white} />
            <Text style={styles.emergencyButtonText}>+1 (234) 567-890</Text>
          </TouchableOpacity>
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
  helpContainer: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.md,
  },
  helpIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  helpDescription: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
  },
  contactSection: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  contactSubtitle: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  emergencyButtonText: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.white,
  },
});