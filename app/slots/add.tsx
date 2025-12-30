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
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AppHeader from '../../components/AppHeader';
import CustomModal from '../../components/CustomModal';
import { useCustomModal } from '../../hooks/useCustomModal';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/Colors';
import apiService from '../../services/apiService';

export default function AddSlotScreen() {
  const router = useRouter();
  const modal = useCustomModal();
  const [isActiveOnline, setIsActiveOnline] = useState(true);

  // Date range
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 7 days from now
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);

  // Time range
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingServiceTime, setLoadingServiceTime] = useState(true);

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
    } finally {
      setLoadingServiceTime(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB');
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

  const onFromDateChange = (event: any, selectedDate?: Date) => {
    setShowFromDatePicker(false);
    if (selectedDate) {
      setFromDate(selectedDate);
      // Ensure toDate is after fromDate
      if (selectedDate > toDate) {
        setToDate(new Date(selectedDate.getTime() + 7 * 24 * 60 * 60 * 1000));
      }
    }
  };

  const onToDateChange = (event: any, selectedDate?: Date) => {
    setShowToDatePicker(false);
    if (selectedDate) {
      if (selectedDate < fromDate) {
        modal.showError('End date must be after start date', { title: 'Invalid Date' });
        return;
      }
      setToDate(selectedDate);
    }
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

  const validateInputs = () => {
    // Check if end time is after start time
    if (endTime <= startTime) {
      modal.showError('End time must be after start time', { title: 'Invalid Time' });
      return false;
    }

    // Check if date range is valid
    if (toDate < fromDate) {
      modal.showError('End date must be after start date', { title: 'Invalid Date Range' });
      return false;
    }

    // Check if opening hours are reasonable (at least 1 hour)
    const timeDiff = endTime.getTime() - startTime.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (hoursDiff < 1) {
      modal.showError('Service hours must be at least 1 hour', { title: 'Invalid Duration' });
      return false;
    }

    if (hoursDiff > 24) {
      modal.showError('Service hours cannot exceed 24 hours', { title: 'Invalid Duration' });
      return false;
    }

    return true;
  };

  const handleAddSlot = async () => {
    if (!validateInputs()) {
      return;
    }

    setLoading(true);
    try {
      // Update service time settings
      const response = await apiService.updateServiceTime({
        isActiveOnline,
        openingTime: formatTimeForAPI(startTime),
        closingTime: formatTimeForAPI(endTime)
      });

      if (!response.success) {
        modal.showError(response.error || 'Failed to update service time');
        return;
      }

      modal.showSuccess('Slot configuration saved successfully', {
        onPrimaryPress: () => {
          modal.hideModal();
          router.back();
        }
      });
    } catch (error) {
      console.error('Add slot error:', error);
      modal.showError('Failed to save slot configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = () => {
    if (!validateInputs()) {
      return;
    }

    modal.showWarning(
      `Service will be available from ${formatDate(fromDate)} to ${formatDate(toDate)}, between ${formatTime(startTime)} and ${formatTime(endTime)} daily.\n\nDo you want to proceed?`,
      {
        title: 'Confirm Slot Configuration',
        primaryButtonText: 'Proceed',
        secondaryButtonText: 'Cancel',
        onPrimaryPress: () => {
          modal.hideModal();
          handleAddSlot();
        },
        onSecondaryPress: modal.hideModal
      }
    );
  };

  if (loadingServiceTime) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="Add Slots" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Add Slots" />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Active Online Toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Time</Text>
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
        </View>

        {/* Date Range Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date Range</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.fieldLabel}>From Date</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowFromDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />
                <Text style={styles.dropdownText}>{formatDate(fromDate)}</Text>
                <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.dateField}>
              <Text style={styles.fieldLabel}>To Date</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowToDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />
                <Text style={styles.dropdownText}>{formatDate(toDate)}</Text>
                <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Time Range Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time Range</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.fieldLabel}>Starting Time</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowStartTimePicker(true)}
              >
                <Ionicons name="time-outline" size={20} color={Colors.textSecondary} />
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
                <Ionicons name="time-outline" size={20} color={Colors.textSecondary} />
                <Text style={styles.dropdownText}>{formatTime(endTime)}</Text>
                <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Ionicons name="information-circle-outline" size={24} color={Colors.primary} />
          <Text style={styles.infoText}>
            Slots will be automatically generated based on your service duration settings.
            Customers will be able to book appointments within the specified date and time range.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.addButton]}
            onPress={handleAddSlot}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
                <Text style={styles.buttonText}>Add Slot</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.proceedButton]}
            onPress={handleProceed}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <>
                <Text style={styles.buttonText}>Proceed</Text>
                <Ionicons name="arrow-forward" size={20} color={Colors.white} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Date Pickers */}
      {showFromDatePicker && (
        <DateTimePicker
          value={fromDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onFromDateChange}
          minimumDate={new Date()}
        />
      )}

      {showToDatePicker && (
        <DateTimePicker
          value={toDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onToDateChange}
          minimumDate={fromDate}
        />
      )}

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

      <CustomModal
        visible={modal.visible}
        type={modal.config.type}
        title={modal.config.title}
        message={modal.config.message}
        primaryButtonText={modal.config.primaryButtonText}
        secondaryButtonText={modal.config.secondaryButtonText}
        onPrimaryPress={modal.config.onPrimaryPress}
        onSecondaryPress={modal.config.onSecondaryPress}
        hidePrimaryButton={modal.config.hidePrimaryButton}
        hideSecondaryButton={modal.config.hideSecondaryButton}
        onClose={modal.hideModal}
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
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textSecondary,
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
    shadowOffset: {
      width: 0,
      height: 1,
    },
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
    paddingVertical: Spacing.sm,
  },
  toggleLabel: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textPrimary,
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
    shadowOffset: {
      width: 0,
      height: 1,
    },
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
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButton: {
    backgroundColor: Colors.secondary || '#FF9800',
  },
  proceedButton: {
    backgroundColor: Colors.primary,
  },
  buttonText: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.white,
  },
});
