import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../constants/Colors';

interface AppHeaderProps {
  title: string;
  showBackButton?: boolean;
  showNotification?: boolean;
  onBackPress?: () => void;
  rightComponent?: React.ReactNode;
}

export default function AppHeader({ 
  title, 
  showBackButton = false, 
  showNotification = true,
  onBackPress,
  rightComponent
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <>
      <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />
      <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
        <View style={styles.content}>
          {showBackButton ? (
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={handleBackPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.white} />
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
          
          <Text style={styles.title}>{title}</Text>
          
          {rightComponent ? rightComponent : showNotification ? (
            <TouchableOpacity 
              style={styles.notificationButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="notifications-outline" size={24} color={Colors.white} />
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary,
    paddingBottom: Spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    minHeight: 44, // Minimum touch target
  },
  backButton: {
    padding: Spacing.sm,
    marginLeft: -Spacing.sm, // Compensate for padding
  },
  notificationButton: {
    padding: Spacing.sm,
    marginRight: -Spacing.sm, // Compensate for padding
  },
  placeholder: {
    width: 24 + (Spacing.sm * 2), // Same width as buttons
  },
  title: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.white,
    textAlign: 'center',
    flex: 1,
  },
});