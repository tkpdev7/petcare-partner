import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/Colors';
import apiService from '../services/apiService';

export default function ServiceTimeScreen() {
  const router = useRouter();
  const [isActiveOnline, setIsActiveOnline] = useState(true);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadServiceTime();
  }, []);

  const loadServiceTime = async () => {
    try {
      const response = await apiService.getServiceTime();
      
      if (response.success && response.data) {
        const { isActiveOnline: active, openingTime, closingTime } = response.data;
        setIsActiveOnline(active);
        
        if (openingTime) {
          const [hour, minute] = openingTime.split(':');
          const startDate = new Date();
          startDate.setHours(parseInt(hour), parseInt(minute));
          setStartTime(startDate);
        }
        
        if (closingTime) {
          const [hour, minute] = closingTime.split(':');
          const endDate = new Date();
          endDate.setHours(parseInt(hour), parseInt(minute));
          setEndTime(endDate);
        }
      }
    } catch (error) {
      console.error('Load service time error:', error);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const onStartTimeChange = (event: any, selectedTime?: Date) => {
    setShowStartTimePicker(false);
    if (selectedTime) {
      setStartTime(selectedTime);
    }
  };

  const onEndTimeChange = (event: any, selectedTime?: Date) => {
    setShowEndTimePicker(false);
    if (selectedTime) {
      setEndTime(selectedTime);
    }
  };

  const validateTimes = () => {
    // Check if closing time is after opening time
    if (endTime <= startTime) {
      Alert.alert('Invalid Time', 'Closing time must be after opening time');
      return false;
    }
    
    // Check if opening hours are reasonable (at least 1 hour)
    const timeDiff = endTime.getTime() - startTime.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    if (hoursDiff < 1) {
      Alert.alert('Invalid Duration', 'Opening hours must be at least 1 hour');
      return false;
    }
    
    if (hoursDiff > 24) {
      Alert.alert('Invalid Duration', 'Opening hours cannot exceed 24 hours');
      return false;
    }
    
    return true;
  };

  const handleProceed = async () => {
    if (!validateTimes()) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await apiService.updateServiceTime({
        isActiveOnline,
        openingTime: formatTime(startTime),
        closingTime: formatTime(endTime)
      });
      
      if (!response.success) {
        Alert.alert('Error', response.error || 'Failed to update service time');
        return;
      }
      
      Alert.alert('Success', 'Service time updated successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Update service time error:', error);
      Alert.alert('Error', 'Failed to update service time');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Active Online Toggle */}
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>Active Online</Text>
          <Switch
            value={isActiveOnline}
            onValueChange={setIsActiveOnline}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={Colors.white}
            ios_backgroundColor={Colors.border}
          />
        </View>


        {/* Time Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.fieldLabel}>Starting Time</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowStartTimePicker(true)}
              >
                <Text style={styles.dropdownText}>{formatTime(startTime)}</Text>
                <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.dateField}>
              <Text style={styles.fieldLabel}>End Time</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowEndTimePicker(true)}
              >
                <Text style={styles.dropdownText}>{formatTime(endTime)}</Text>
                <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Proceed Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.proceedButton, loading && styles.disabledButton]} 
            onPress={handleProceed}
            disabled={loading}
          >
            <Text style={styles.proceedButtonText}>
              {loading ? 'Saving...' : 'Proceed'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>


      {showStartTimePicker && (
        <DateTimePicker
          value={startTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onStartTimeChange}
        />
      )}

      {showEndTimePicker && (
        <DateTimePicker
          value={endTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onEndTimeChange}
        />
      )}
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  toggleLabel: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textPrimary,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  dateField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  dropdownText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeights.medium,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.lg,
    right: Spacing.lg,
  },
  proceedButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  proceedButtonText: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.white,
  },
  disabledButton: {
    backgroundColor: Colors.textSecondary,
  },
});