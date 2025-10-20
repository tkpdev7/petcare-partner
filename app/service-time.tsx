import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNPickerSelect from 'react-native-picker-select';
import AppHeader from '../components/AppHeader';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/Colors';
import apiService from '../services/apiService';

export default function ServiceTimeScreen() {
  const router = useRouter();
  const [isActiveOnline, setIsActiveOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Date, Time and Slot Duration
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [slotDuration, setSlotDuration] = useState(30);

  const slotDurationOptions = [
    { label: '10 minutes', value: 10 },
    { label: '20 minutes', value: 20 },
    { label: '30 minutes', value: 30 },
    { label: '40 minutes', value: 40 },
    { label: '50 minutes', value: 50 },
    { label: '60 minutes', value: 60 },
    { label: '90 minutes', value: 90 },
    { label: '120 minutes', value: 120 },
  ];

  useEffect(() => {
    loadServiceTime();
    // Initialize time to 9 AM by default
    const defaultTime = new Date();
    defaultTime.setHours(9, 0, 0, 0);
    setSelectedTime(defaultTime);
  }, []);

  const loadServiceTime = async () => {
    try {
      const response = await apiService.getServiceTime();

      if (response.success && response.data) {
        setIsActiveOnline(response.data.isActiveOnline || false);
      }
    } catch (error) {
      console.error('Load service time error:', error);
    } finally {
      setLoadingStatus(false);
    }
  };

  const toggleActiveOnline = async (value: boolean) => {
    try {
      const response = await apiService.updateServiceTime({
        isActiveOnline: value
      });

      if (response.success) {
        setIsActiveOnline(value);
        Alert.alert(
          'Status Updated',
          value
            ? 'You are now online. Customers can see and book your slots.'
            : 'You are now offline. Customers cannot see your slots.'
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Toggle active online error:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatTimeForAPI = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDateForAPI = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const onDateChange = (event: any, selected?: Date) => {
    setShowDatePicker(false);
    if (selected) {
      setSelectedDate(selected);
    }
  };

  const onTimeChange = (event: any, selected?: Date) => {
    setShowTimePicker(false);
    if (selected) {
      setSelectedTime(selected);
    }
  };

  const validateInputs = () => {
    // Check if partner is active online
    if (!isActiveOnline) {
      Alert.alert('Offline', 'Please set yourself as "Active Online" to create slots');
      return false;
    }

    // Check if selected date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);

    if (selected < today) {
      Alert.alert('Invalid Date', 'Cannot create slots for past dates');
      return false;
    }

    return true;
  };

  const handleCreateSlot = async () => {
    if (!validateInputs()) {
      return;
    }

    setLoading(true);
    try {
      // Calculate end time based on slot duration
      const startTime = new Date(selectedTime);
      const endTime = new Date(startTime.getTime() + slotDuration * 60000);

      const payload = {
        slot_date: formatDateForAPI(selectedDate),
        start_time: formatTimeForAPI(startTime),
        end_time: formatTimeForAPI(endTime),
        slot_duration: slotDuration,
      };

      const response = await apiService.createPartnerSlots(payload);

      if (response.success) {
        Alert.alert(
          'Success',
          'Slot created successfully',
          [
            {
              text: 'Create Another',
              onPress: () => {
                // Keep the form, just reset to next time slot
                const nextTime = new Date(endTime.getTime());
                setSelectedTime(nextTime);
              },
            },
            {
              text: 'View My Slots',
              onPress: () => router.push('/slots/mySlots'),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to create slot');
      }
    } catch (error: any) {
      console.error('Create slot error:', error);
      Alert.alert('Error', error.message || 'Failed to create slot');
    } finally {
      setLoading(false);
    }
  };

  const navigateToMySlots = () => {
    router.push('/slots/mySlots');
  };

  if (loadingStatus) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="Service Time" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Service Time" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Active Online Toggle */}
        <View style={styles.section}>
          <View style={styles.toggleContainer}>
            <View style={styles.toggleLabelContainer}>
              <Text style={styles.toggleLabel}>Active Online</Text>
              <Text style={styles.toggleSubLabel}>
                {isActiveOnline ? 'Customers can see and book your slots' : 'Offline - Customers cannot see you'}
              </Text>
            </View>
            <Switch
              value={isActiveOnline}
              onValueChange={toggleActiveOnline}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.white}
              ios_backgroundColor={Colors.border}
            />
          </View>
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />
            <Text style={styles.dropdownText}>{formatDate(selectedDate)}</Text>
            <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Time Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Time</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowTimePicker(true)}
          >
            <Ionicons name="time-outline" size={20} color={Colors.textSecondary} />
            <Text style={styles.dropdownText}>{formatTime(selectedTime)}</Text>
            <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Slot Duration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Slot Duration</Text>
          <View style={styles.pickerContainer}>
            <RNPickerSelect
              value={slotDuration}
              onValueChange={(value) => setSlotDuration(value)}
              items={slotDurationOptions}
              style={pickerSelectStyles}
              placeholder={{}}
              Icon={() => <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />}
            />
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Ionicons name="information-circle-outline" size={24} color={Colors.primary} />
          <Text style={styles.infoText}>
            A slot will be created on {formatDate(selectedDate)} at {formatTime(selectedTime)} for {slotDuration} minutes duration.
          </Text>
        </View>

        {/* Create Slot Button */}
        <TouchableOpacity
          style={[styles.createButton, !isActiveOnline && styles.disabledButton]}
          onPress={handleCreateSlot}
          disabled={loading || !isActiveOnline}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
              <Text style={styles.buttonText}>Create Slot</Text>
            </>
          )}
        </TouchableOpacity>

        {/* My Slots Button */}
        <TouchableOpacity
          style={styles.mySlotsButton}
          onPress={navigateToMySlots}
        >
          <Ionicons name="list-outline" size={20} color={Colors.primary} />
          <Text style={styles.mySlotsButtonText}>My Slots</Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </ScrollView>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onTimeChange}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabelContainer: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  toggleSubLabel: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  dropdownText: {
    flex: 1,
    fontSize: Typography.fontSizes.base,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeights.medium,
  },
  pickerContainer: {
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: Colors.gray300,
  },
  buttonText: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.white,
  },
  mySlotsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
    borderWidth: 2,
    borderColor: Colors.primary,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  mySlotsButtonText: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: Typography.fontSizes.base,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    color: Colors.textPrimary,
    paddingRight: 30,
  },
  inputAndroid: {
    fontSize: Typography.fontSizes.base,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    color: Colors.textPrimary,
    paddingRight: 30,
  },
  iconContainer: {
    top: Platform.OS === 'ios' ? 10 : 15,
    right: 12,
  },
});