import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/Colors';
import apiService from '../../services/apiService';
import { useCustomModal } from '../../hooks/useCustomModal';
import CustomModal from '../../components/CustomModal';

const DOSE_OPTIONS = ['0', '0.5', '1'];
const INTAKE_OPTIONS = [
  { value: 'BF', label: 'Before Food' },
  { value: 'AF', label: 'After Food' },
];

const DURATION_OPTIONS = [
  '3 days',
  '5 days',
  '7 days',
  '10 days',
  '14 days',
  '21 days',
  '30 days',
  'Until finished',
  'Ongoing',
];

interface Medicine {
  drug_name: string;
  dosage: string;
  morning: string;
  afternoon: string;
  evening: string;
  night: string;
  intake: string;
  duration: string;
}

interface Slot {
  id: number;
  partner_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  slot_duration: number;
  is_available: boolean;
  is_booked: boolean;
}

export default function AddPrescriptionScreen() {
  const modal = useCustomModal();
  const params = useLocalSearchParams();
  const appointmentId = params.appointmentId as string;

  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Prescription fields
  const [medicines, setMedicines] = useState<Medicine[]>([
    { drug_name: '', dosage: '', morning: '0', afternoon: '0', evening: '0', night: '0', intake: 'BF', duration: '' }
  ]);

  // Dropdown states
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  const [selectedMedicineIndex, setSelectedMedicineIndex] = useState<number>(0);

  // Follow-up appointment fields
  const [enableFollowUp, setEnableFollowUp] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  useEffect(() => {
    if (enableFollowUp) {
      loadAvailableSlots();
    }
  }, [selectedDate, enableFollowUp]);

  const loadAvailableSlots = async () => {
    try {
      setLoadingSlots(true);
      setSelectedSlot(null);
      const formattedDate = formatDateForAPI(selectedDate);
      const response = await apiService.getSlotsByDate(formattedDate);

      if (response.success) {
        const slotsData = Array.isArray(response.data)
          ? response.data
          : (response.data?.data || []);

        // Filter available slots only
        const available = slotsData.filter((slot: Slot) => slot.is_available && !slot.is_booked);
        setAvailableSlots(available);

        if (available.length === 0) {
          modal.showWarning('No available slots for this date. Please select another date or create slots first.');
        }
      } else {
        setAvailableSlots([]);
      }
    } catch (error) {
      console.error('Error loading slots:', error);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const addMedicineRow = () => {
    setMedicines([...medicines, { drug_name: '', dosage: '', morning: '0', afternoon: '0', evening: '0', night: '0', intake: 'BF', duration: '' }]);
  };

  const removeMedicineRow = (index: number) => {
    if (medicines.length > 1) {
      const newMedicines = medicines.filter((_, i) => i !== index);
      setMedicines(newMedicines);
    }
  };

  const updateMedicine = (index: number, field: keyof Medicine, value: string) => {
    const newMedicines = [...medicines];
    newMedicines[index][field] = value;
    setMedicines(newMedicines);
  };

  const handleDurationSelect = (value: string) => {
    updateMedicine(selectedMedicineIndex, 'duration', value);
    setShowDurationDropdown(false);
  };

  const validateForm = () => {
    // Check if at least one medicine has been filled
    const hasValidMedicine = medicines.some(
      med => med.drug_name.trim() !== ''
    );

    if (!hasValidMedicine) {
      modal.showError('Please add at least one medicine');
      return false;
    }

    // If follow-up is enabled, validate slot selection
    if (enableFollowUp) {
      if (!selectedSlot) {
        modal.showError('Please select a follow-up time slot');
        return false;
      }
    }

    return true;
  };

  const formatDateForAPI = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      // Filter out empty medicines
      const validMedicines = medicines.filter(
        med => med.drug_name.trim() !== ''
      );

      const data: any = {
        prescription_data: validMedicines,
      };

      // Add follow-up details if enabled
      if (enableFollowUp && selectedSlot) {
        data.follow_up_date = selectedSlot.slot_date;
        data.follow_up_time = selectedSlot.start_time;
      }

      const response = await apiService.completeAppointmentWithFollowup(appointmentId, data);

      if (response.success) {
        modal.showSuccess(
          enableFollowUp
            ? 'Prescription added and follow-up appointment scheduled successfully!'
            : 'Prescription added and appointment completed successfully!',
          {
            onPrimaryPress: () => {
              modal.hideModal();
              router.back();
            }
          }
        );
      } else {
        throw new Error(response.error || response.message || 'Failed to add prescription');
      }
    } catch (error: any) {
      console.error('Error submitting prescription:', error);
      modal.showError(error.message || 'Failed to add prescription');
    } finally {
      setLoading(false);
    }
  };

  // Date Picker Component
  const DateSelector = () => {
    const getDates = (): Date[] => {
      const dates: Date[] = [];
      const currentDate = new Date();

      // Generate dates for next 14 days
      for (let i = 0; i < 14; i++) {
        const date = new Date();
        date.setDate(currentDate.getDate() + i);
        dates.push(date);
      }
      return dates;
    };

    const dates = getDates();

    const isDateSelected = (date: Date): boolean => {
      return date.toDateString() === selectedDate.toDateString();
    };

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
      <View style={styles.datePickerContainer}>
        <Text style={styles.sectionTitle}>Select Date</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dateList}
          nestedScrollEnabled={true}
          bounces={false}
        >
          {dates.map((date, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dateItem,
                isDateSelected(date) && styles.selectedDateItem,
              ]}
              onPress={() => {
                setSelectedDate(date);
                setSelectedSlot(null);
              }}
            >
              <Text
                style={[
                  styles.dayName,
                  isDateSelected(date) && styles.selectedDateText,
                ]}
              >
                {dayNames[date.getDay()]}
              </Text>
              <Text
                style={[
                  styles.dateNumber,
                  isDateSelected(date) && styles.selectedDateText,
                ]}
              >
                {date.getDate()}
              </Text>
              <Text
                style={[
                  styles.monthName,
                  isDateSelected(date) && styles.selectedDateText,
                ]}
              >
                {date.toLocaleString("default", { month: "short" })}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Time Slot Selector Component
  const TimeSlotSelector = () => {
    if (loadingSlots) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading available slots...</Text>
        </View>
      );
    }

    if (availableSlots.length === 0) {
      return (
        <View style={styles.noSlotsContainer}>
          <Ionicons name="calendar-outline" size={48} color="#CCC" />
          <Text style={styles.noSlotsText}>No slots available for this date</Text>
          <Text style={styles.noSlotsSubtext}>
            Please select another date or create slots in Manage Slots section
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.timeSlotContainer}>
        <Text style={styles.sectionTitle}>Available Time Slots</Text>
        <View style={styles.slotGrid}>
          {availableSlots.map((slot, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.timeSlot,
                selectedSlot?.id === slot.id && styles.selectedTimeSlot,
              ]}
              onPress={() => setSelectedSlot(slot)}
            >
              <Text
                style={[
                  styles.timeSlotText,
                  selectedSlot?.id === slot.id && styles.selectedTimeSlotText,
                ]}
              >
                {formatTime(slot.start_time)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // Dropdown Modal Component
  const DropdownModal = ({ visible, onClose, options, onSelect, title }: {
    visible: boolean;
    onClose: () => void;
    options: string[];
    onSelect: (value: string) => void;
    title: string;
  }) => {
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.dropdownOverlay}>
          <View style={styles.dropdownContent}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.dropdownList}>
              {options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.dropdownItem}
                  onPress={() => onSelect(option)}
                >
                  <Text style={styles.dropdownItemText}>{option}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <CustomModal
        visible={modal.visible}
        type={modal.config.type}
        title={modal.config.title}
        message={modal.config.message}
        primaryButtonText={modal.config.primaryButtonText}
        secondaryButtonText={modal.config.secondaryButtonText}
        onPrimaryPress={modal.config.onPrimaryPress}
        onSecondaryPress={modal.config.onSecondaryPress}
        onClose={modal.hideModal}
        hidePrimaryButton={modal.config.hidePrimaryButton}
        hideSecondaryButton={modal.config.hideSecondaryButton}
      />

      {/* Dropdown Modals */}
      <DropdownModal
        visible={showDurationDropdown}
        onClose={() => setShowDurationDropdown(false)}
        options={DURATION_OPTIONS}
        onSelect={handleDurationSelect}
        title="Select Duration"
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Prescription</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollViewContent}
        bounces={false}
        removeClippedSubviews={Platform.OS === 'android'}
        scrollEventThrottle={16}
      >
          {/* Medicines Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prescription Medicines</Text>
            <Text style={styles.sectionSubtitle}>Add medicines prescribed to the pet</Text>

            {medicines.map((medicine, index) => (
              <View key={index} style={styles.medicineCard}>
                <View style={styles.medicineHeader}>
                  <Text style={styles.medicineNumber}>Medicine {index + 1}</Text>
                  {medicines.length > 1 && (
                    <TouchableOpacity onPress={() => removeMedicineRow(index)}>
                      <Ionicons name="trash-outline" size={20} color="#F44336" />
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.label}>Drug Name *</Text>
                <TextInput
                  style={styles.input}
                  value={medicine.drug_name}
                  onChangeText={(value) => updateMedicine(index, 'drug_name', value)}
                  placeholder="e.g., Amoxicillin"
                />

                <Text style={styles.label}>Dosage *</Text>
                <TextInput
                  style={styles.input}
                  value={medicine.dosage}
                  onChangeText={(value) => updateMedicine(index, 'dosage', value)}
                  placeholder="e.g., 250mg"
                />

                <Text style={styles.label}>Frequency (doses per time of day)</Text>
                <View style={styles.frequencyGrid}>
                  {(['morning', 'afternoon', 'evening', 'night'] as const).map((slot) => (
                    <View key={slot} style={styles.frequencySlot}>
                      <Text style={styles.frequencySlotLabel}>
                        {slot.charAt(0).toUpperCase() + slot.slice(1)}
                      </Text>
                      <View style={styles.doseOptions}>
                        {DOSE_OPTIONS.map((dose) => (
                          <TouchableOpacity
                            key={dose}
                            style={[styles.doseOption, medicine[slot] === dose && styles.doseOptionSelected]}
                            onPress={() => updateMedicine(index, slot, dose)}
                          >
                            <Text style={[styles.doseOptionText, medicine[slot] === dose && styles.doseOptionTextSelected]}>
                              {dose}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>

                <Text style={styles.label}>Intake</Text>
                <View style={styles.intakeOptions}>
                  {INTAKE_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.intakeOption, medicine.intake === opt.value && styles.intakeOptionSelected]}
                      onPress={() => updateMedicine(index, 'intake', opt.value)}
                    >
                      <Text style={[styles.intakeOptionText, medicine.intake === opt.value && styles.intakeOptionTextSelected]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Duration *</Text>
                <TouchableOpacity
                  style={styles.dropdownInput}
                  onPress={() => {
                    setSelectedMedicineIndex(index);
                    setShowDurationDropdown(true);
                  }}
                >
                  <Text style={[styles.dropdownInputText, !medicine.duration && styles.placeholderText]}>
                    {medicine.duration || 'Select duration'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#999" />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.addMedicineButton} onPress={addMedicineRow}>
              <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
              <Text style={styles.addMedicineText}>Add Another Medicine</Text>
            </TouchableOpacity>
          </View>

          {/* Follow-up Appointment Section */}
          <View style={styles.section}>
            <View style={styles.followUpHeader}>
              <Text style={styles.sectionTitle}>Book Follow-up Appointment</Text>
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setEnableFollowUp(!enableFollowUp)}
              >
                <Ionicons
                  name={enableFollowUp ? "checkbox" : "square-outline"}
                  size={24}
                  color={enableFollowUp ? Colors.primary : "#999"}
                />
              </TouchableOpacity>
            </View>

            {enableFollowUp && (
              <>
                <DateSelector />
                <TimeSlotSelector />
              </>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                <Text style={styles.submitButtonText}>
                  {enableFollowUp ? 'Submit & Schedule Follow-up' : 'Complete Appointment'}
                </Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginTop: 50,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: '#FFF',
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  sectionSubtitle: {
    ...Typography.small,
    color: Colors.mediumGray,
    marginBottom: Spacing.md,
  },
  medicineCard: {
    backgroundColor: '#F8F9FA',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  medicineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  medicineNumber: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.primary,
  },
  label: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Typography.body,
    color: Colors.dark,
    backgroundColor: '#FFF',
  },
  addMedicineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    borderStyle: 'dashed',
    marginTop: Spacing.sm,
  },
  addMedicineText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  followUpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  toggleButton: {
    padding: Spacing.xs,
  },
  // Date Picker Styles
  datePickerContainer: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  dateList: {
    flexDirection: 'row',
    marginTop: 10,
  },
  dateItem: {
    width: 70,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f5',
    borderRadius: 10,
    marginRight: 10,
    paddingVertical: 8,
  },
  selectedDateItem: {
    backgroundColor: Colors.primary,
  },
  dayName: {
    fontSize: 12,
    color: '#666',
  },
  dateNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  monthName: {
    fontSize: 12,
    color: '#666',
  },
  selectedDateText: {
    color: '#fff',
  },
  // Time Slot Styles
  timeSlotContainer: {
    marginTop: 10,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginTop: 10,
  },
  timeSlot: {
    width: '30%',
    backgroundColor: '#f0f0f5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    margin: '1.65%',
  },
  selectedTimeSlot: {
    backgroundColor: Colors.primary,
  },
  timeSlotText: {
    fontWeight: '500',
    color: '#333',
  },
  selectedTimeSlotText: {
    color: '#fff',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
  noSlotsContainer: {
    alignItems: 'center',
    padding: Spacing.xl,
    marginTop: Spacing.md,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  noSlotsText: {
    ...Typography.body,
    fontWeight: '600',
    color: '#999',
    marginTop: Spacing.md,
  },
  noSlotsSubtext: {
    ...Typography.small,
    color: '#BBB',
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    margin: Spacing.lg,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...Typography.body,
    fontWeight: '700',
    color: '#FFF',
  },
  // Dropdown Styles
  dropdownInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownInputText: {
    ...Typography.body,
    color: Colors.dark,
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  dropdownContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark,
  },
  dropdownList: {
    maxHeight: 400,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownItemText: {
    ...Typography.body,
    color: Colors.dark,
    flex: 1,
  },
  frequencyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 4,
  },
  frequencySlot: {
    flex: 1,
    alignItems: 'center',
  },
  frequencySlotLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  doseOptions: {
    flexDirection: 'row',
    gap: 4,
  },
  doseOption: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  doseOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  doseOptionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#555',
  },
  doseOptionTextSelected: {
    color: '#fff',
  },
  intakeOptions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  intakeOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  intakeOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  intakeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  intakeOptionTextSelected: {
    color: '#fff',
  },
});
