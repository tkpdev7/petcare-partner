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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNPickerSelect from 'react-native-picker-select';
import AppHeader from '../components/AppHeader';
import SuccessModal from '../components/SuccessModal';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/Colors';
import apiService from '../services/apiService';

export default function ServiceTimeScreen() {
  const router = useRouter();
  const { prefillDate, prefillStartTime, prefillEndTime, prefillDuration } = useLocalSearchParams();

  // Debug logging for prefill params
  console.log('Prefill params received:', {
    prefillDate,
    prefillStartTime,
    prefillEndTime,
    prefillDuration
  });

  const [isActiveOnline, setIsActiveOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Date Range - use prefilled value if available
  const [startDate, setStartDate] = useState(() => {
    if (prefillDate && typeof prefillDate === 'string') {
      return new Date(prefillDate);
    }
    return new Date();
  });
  const [endDate, setEndDate] = useState(() => {
    if (prefillDate && typeof prefillDate === 'string') {
      return new Date(prefillDate);
    }
    const date = new Date();
    date.setDate(date.getDate() + 7); // Default to 7 days from today
    return date;
  });
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Time Range - use prefilled values if available
  const [startTime, setStartTime] = useState(() => {
    if (prefillStartTime && typeof prefillStartTime === 'string') {
      const [hours, minutes] = prefillStartTime.split(':');
      const time = new Date();
      time.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      return time;
    }
    const time = new Date();
    time.setHours(9, 0, 0, 0); // 9:00 AM
    return time;
  });
  const [endTime, setEndTime] = useState(() => {
    if (prefillEndTime && typeof prefillEndTime === 'string') {
      const [hours, minutes] = prefillEndTime.split(':');
      const time = new Date();
      time.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      return time;
    }
    const time = new Date();
    time.setHours(18, 0, 0, 0); // 6:00 PM
    return time;
  });
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Slot Duration - use prefilled value if available
  const [slotDuration, setSlotDuration] = useState(() => {
    if (prefillDuration) {
      const duration = typeof prefillDuration === 'string' ? parseInt(prefillDuration) : prefillDuration;
      return isNaN(duration) ? 30 : duration;
    }
    return 30;
  });

  const slotDurationOptions = [
    { label: '15 minutes', value: 15 },
    { label: '20 minutes', value: 20 },
    { label: '30 minutes', value: 30 },
    { label: '45 minutes', value: 45 },
    { label: '60 minutes', value: 60 },
    { label: '90 minutes', value: 90 },
    { label: '120 minutes', value: 120 },
  ];

  useEffect(() => {
    loadServiceTime();
  }, []);

  const loadServiceTime = async () => {
    try {
      const response = await apiService.getServiceTime();

      if (response.success && response.data) {
        setIsActiveOnline(response.data.isActiveOnline || false);
      }

      // Check if partner has any slots - if yes, auto-enable Active Online
      const slotsResponse = await apiService.getPartnerSlots({ limit: 1 });
      if (slotsResponse.success) {
        const slotsData = Array.isArray(slotsResponse.data)
          ? slotsResponse.data
          : (slotsResponse.data?.data || []);

        // If partner has slots but Active Online is off, turn it on automatically
        if (slotsData.length > 0 && !response.data?.isActiveOnline) {
          console.log('Partner has slots but Active Online is off. Enabling it automatically...');
          const toggleResponse = await apiService.toggleActiveOnline(true);
          if (toggleResponse.success) {
            setIsActiveOnline(true);
            console.log('Active Online enabled automatically');
          }
        }
      }
    } catch (error) {
      console.error('Load service time error:', error);
    } finally {
      setLoadingStatus(false);
    }
  };

  const toggleActiveOnline = async (value: boolean) => {
    try {
      const response = await apiService.toggleActiveOnline(value);

      if (response.success) {
        setIsActiveOnline(value);
        setSuccessMessage(
          value
            ? 'You are now online. Customers can see and book your slots.'
            : 'You are now offline. Customers cannot see your slots.'
        );
        setShowSuccessModal(true);
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

  const onStartDateChange = (event: any, selected?: Date) => {
    setShowStartDatePicker(false);
    if (selected) {
      setStartDate(selected);
      // If end date is before start date, update end date
      if (selected > endDate) {
        const newEndDate = new Date(selected);
        newEndDate.setDate(newEndDate.getDate() + 7);
        setEndDate(newEndDate);
      }
    }
  };

  const onEndDateChange = (event: any, selected?: Date) => {
    setShowEndDatePicker(false);
    if (selected) {
      setEndDate(selected);
    }
  };

  const onStartTimeChange = (event: any, selected?: Date) => {
    setShowStartTimePicker(false);
    if (selected) {
      setStartTime(selected);
    }
  };

  const onEndTimeChange = (event: any, selected?: Date) => {
    setShowEndTimePicker(false);
    if (selected) {
      setEndTime(selected);
    }
  };

  const calculateTotalSlots = () => {
    // Calculate days between start and end date
    const timeDiff = endDate.getTime() - startDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end dates

    // Calculate slots per day
    const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
    const totalMinutes = endMinutes - startMinutes;
    const slotsPerDay = Math.floor(totalMinutes / slotDuration);

    return {
      days: daysDiff,
      slotsPerDay: slotsPerDay > 0 ? slotsPerDay : 0,
      totalSlots: daysDiff * (slotsPerDay > 0 ? slotsPerDay : 0),
    };
  };

  const validateInputs = () => {
    // Check if partner is active online
    if (!isActiveOnline) {
      Alert.alert('Offline', 'Please set yourself as "Active Online" to generate slots');
      return false;
    }

    // Check if start date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedStart = new Date(startDate);
    selectedStart.setHours(0, 0, 0, 0);

    if (selectedStart < today) {
      Alert.alert('Invalid Date', 'Start date cannot be in the past');
      return false;
    }

    // Check if end date is not before start date (allow same day for single-day slots)
    if (endDate < startDate) {
      Alert.alert('Invalid Date Range', 'End date cannot be before start date');
      return false;
    }

    // Check if end time is after start time
    const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();

    if (endMinutes <= startMinutes) {
      Alert.alert('Invalid Time Range', 'End time must be after start time');
      return false;
    }

    // Check if time range is sufficient for at least one slot
    const totalMinutes = endMinutes - startMinutes;
    if (totalMinutes < slotDuration) {
      Alert.alert(
        'Invalid Time Range',
        `Time range must be at least ${slotDuration} minutes to create a slot`
      );
      return false;
    }

    return true;
  };

  const handleGenerateSlots = async () => {
    if (!validateInputs()) {
      return;
    }

    const { days, slotsPerDay, totalSlots } = calculateTotalSlots();

    // Confirm before generating
    Alert.alert(
      'Generate Slots',
      `This will create ${totalSlots} slots:\n\n` +
      `• ${days} days (${formatDate(startDate)} to ${formatDate(endDate)})\n` +
      `• ${slotsPerDay} slots per day\n` +
      `• Time: ${formatTime(startTime)} to ${formatTime(endTime)}\n` +
      `• Duration: ${slotDuration} minutes each\n\n` +
      'Do you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            setLoading(true);
            try {
              const payload = {
                start_date: formatDateForAPI(startDate),
                end_date: formatDateForAPI(endDate),
                start_time: formatTimeForAPI(startTime),
                end_time: formatTimeForAPI(endTime),
                slot_duration: slotDuration,
              };

              const response = await apiService.generateBulkSlots(payload);

              console.log('Generate slots response:', JSON.stringify(response, null, 2));

              if (response.success) {
                // Backend returns: { success, message, data: { totalSlots, skippedSlots, ... } }
                // ApiService wraps it as: { success, data: <backend response>, message }
                const backendData = response.data;
                console.log('Backend data:', backendData);

                const actualCreated = backendData?.data?.totalSlots || backendData?.totalSlots || 0;
                const skipped = backendData?.data?.skippedSlots || backendData?.skippedSlots || 0;
                const backendMessage = backendData?.message || response.message;

                console.log('actualCreated:', actualCreated, 'skipped:', skipped);
                console.log('Backend message:', backendMessage);

                // Auto-enable Active Online if slots were created and it's currently off
                if ((actualCreated > 0 || skipped > 0) && !isActiveOnline) {
                  console.log('Auto-enabling Active Online after slot generation');
                  const toggleResponse = await apiService.toggleActiveOnline(true);
                  if (toggleResponse.success) {
                    setIsActiveOnline(true);
                  }
                }

                // Use backend message if available, otherwise construct our own
                let message = backendMessage || `You have successfully updated your service time.`;

                if (!backendMessage) {
                  if (actualCreated === 0 && skipped === 0) {
                    message += `\n\nNo slots were created. Please check your settings.`;
                  } else if (skipped > 0) {
                    message += `\n\n${actualCreated} new slot(s) created. ${skipped} duplicate slot(s) were skipped.`;
                  } else {
                    message += `\n\n${actualCreated} slot(s) created successfully.`;
                  }
                }

                setSuccessMessage(message);
                setShowSuccessModal(true);
              } else {
                Alert.alert('Error', response.error || 'Failed to generate slots');
              }
            } catch (error: any) {
              console.error('Generate slots error:', error);
              Alert.alert('Error', error.message || 'Failed to generate slots');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const navigateToMySlots = () => {
    router.push('/slots/mySlots');
  };

  if (loadingStatus) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="Service Time & Slots" showBackButton={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const slotStats = calculateTotalSlots();

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Service Time & Slots" showBackButton={true} />

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

        {/* Date Range Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date Range</Text>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Start Date</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} />
                <Text style={styles.dropdownTextSmall}>{formatDate(startDate)}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.halfWidth}>
              <Text style={styles.label}>End Date</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} />
                <Text style={styles.dropdownTextSmall}>{formatDate(endDate)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Time Range Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time Range (Daily)</Text>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Start Time</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowStartTimePicker(true)}
              >
                <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
                <Text style={styles.dropdownTextSmall}>{formatTime(startTime)}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.halfWidth}>
              <Text style={styles.label}>End Time</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowEndTimePicker(true)}
              >
                <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
                <Text style={styles.dropdownTextSmall}>{formatTime(endTime)}</Text>
              </TouchableOpacity>
            </View>
          </View>
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
            />
          </View>
        </View>

        {/* Generate Slots Button */}
        <TouchableOpacity
          style={[styles.createButton, (!isActiveOnline || slotStats.totalSlots === 0) && styles.disabledButton]}
          onPress={handleGenerateSlots}
          disabled={loading || !isActiveOnline || slotStats.totalSlots === 0}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <>
              <Ionicons name="flashlight-outline" size={20} color={Colors.white} />
              <Text style={styles.buttonText}>Generate {slotStats.totalSlots} Slots</Text>
            </>
          )}
        </TouchableOpacity>

        {/* My Slots Button */}
        <TouchableOpacity
          style={styles.mySlotsButton}
          onPress={navigateToMySlots}
        >
          <Ionicons name="list-outline" size={20} color={Colors.primary} />
          <Text style={styles.mySlotsButtonText}>View My Slots</Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </ScrollView>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onStartDateChange}
          minimumDate={new Date()}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onEndDateChange}
          minimumDate={startDate}
        />
      )}

      {/* Time Pickers */}
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

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message={successMessage}
      />
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
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  label: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  dropdownTextSmall: {
    flex: 1,
    fontSize: Typography.fontSizes.sm,
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
