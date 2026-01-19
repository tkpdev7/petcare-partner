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
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/Colors';
import apiService from '../../services/apiService';
import { useCustomModal } from '../../hooks/useCustomModal';
import CustomModal from '../../components/CustomModal';

interface AppointmentDetails {
  id: number;
  user_id: string;
  pet_id: string;
  pet_name?: string;
  user_name?: string;
  service_name?: string;
}

export default function CreateCaseSheetScreen() {
  const modal = useCustomModal();
  const params = useLocalSearchParams();
  const appointmentId = params.appointmentId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [partnerId, setPartnerId] = useState<string>('');

  // Case Sheet Form Fields
  const [petOwnerName, setPetOwnerName] = useState('');
  const [petName, setPetName] = useState('');
  const [petType, setPetType] = useState('');
  const [petBreed, setPetBreed] = useState('');
  const [petSize, setPetSize] = useState('');
  const [petGender, setPetGender] = useState('');
  const [petAge, setPetAge] = useState('');
  const [petWeight, setPetWeight] = useState('');
  const [knownAllergies, setKnownAllergies] = useState('');
  const [knownAilments, setKnownAilments] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get partner ID
      const storedPartnerData = await AsyncStorage.getItem('partnerData');
      if (storedPartnerData) {
        const partnerData = JSON.parse(storedPartnerData);
        setPartnerId(partnerData.id);
      }

      // Fetch appointment details
      console.log('🔍 Fetching appointment details for ID:', appointmentId);
      const appointmentResponse = await apiService.getAppointment(appointmentId);
      console.log('📦 Full appointment response:', JSON.stringify(appointmentResponse, null, 2));

      if (appointmentResponse.success && appointmentResponse.data) {
        // Handle double-nested response structure
        const appt = appointmentResponse.data.data || appointmentResponse.data;
        console.log('✅ Appointment data received:', appt);
        console.log('👤 Customer data:', appt.customer);
        console.log('🐾 Pet data:', appt.pet);
        console.log('🆔 User ID:', appt.user_id);
        console.log('🐕 Pet ID:', appt.pet_id);

        setAppointment(appt);

        // Auto-fill data from appointment
        const ownerName = appt.customer?.name || '';
        const petName = appt.pet?.name || '';
        const petType = appt.pet?.species || '';
        const petBreed = appt.pet?.breed || '';
        const petSize = appt.pet?.size || '';
        const petGender = appt.pet?.gender || '';
        const petWeight = appt.pet?.weight ? appt.pet.weight.toString() : '';
        const allergies = appt.pet?.known_allergies || '';
        const ailments = appt.pet?.known_ailments || '';

        console.log('📝 Setting form values:');
        console.log('  Owner:', ownerName);
        console.log('  Pet Name:', petName);
        console.log('  Type:', petType);
        console.log('  Breed:', petBreed);
        console.log('  Size:', petSize);
        console.log('  Gender:', petGender);
        console.log('  Weight:', petWeight);
        console.log('  Allergies:', allergies);
        console.log('  Ailments:', ailments);

        setPetOwnerName(ownerName);
        setPetName(petName);
        setPetType(petType);
        setPetBreed(petBreed);
        setPetSize(petSize);
        setPetGender(petGender);
        setPetWeight(petWeight);
        setKnownAllergies(allergies);
        setKnownAilments(ailments);

        // Calculate age from DOB if available
        if (appt.pet?.dob) {
          const birthDate = new Date(appt.pet.dob);
          const now = new Date();
          const ageInMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth());
          const calculatedAge = ageInMonths > 0 ? ageInMonths.toString() : '';
          console.log('  Age (from DOB):', calculatedAge, 'months');
          setPetAge(calculatedAge);
        } else if (appt.pet?.age) {
          // Use age in years if provided, convert to months
          const ageInMonths = (appt.pet.age * 12).toString();
          console.log('  Age (from years):', ageInMonths, 'months');
          setPetAge(ageInMonths);
        }
      } else {
        console.error('❌ Failed to fetch appointment:', appointmentResponse);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      modal.showError('Failed to load appointment details');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!petName.trim()) {
      modal.showError('Pet name is required');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      const caseSheetData = {
        appointment_id: appointmentId,
        pet_id: appointment?.pet_id,
        pet_owner_id: appointment?.user_id,
        pet_owner_name: petOwnerName,
        pet_name: petName,
        pet_type: petType,
        pet_breed: petBreed,
        pet_size: petSize,
        pet_gender: petGender,
        pet_age: petAge ? parseInt(petAge) : null,
        pet_weight: petWeight ? parseFloat(petWeight) : null,
        known_allergies: knownAllergies,
        known_ailments: knownAilments,
        clinical_notes: clinicalNotes,
      };

      const response = await apiService.createCaseSheet(caseSheetData);

      if (response.success) {
        modal.showSuccess('Case sheet created successfully', {
          onPrimaryPress: () => {
            modal.hideModal();
            router.back();
          }
        });
      } else {
        throw new Error(response.error || response.message || 'Failed to create case sheet');
      }
    } catch (error: any) {
      console.error('Error saving case sheet:', error);
      modal.showError(error.message || 'Failed to save case sheet');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading appointment details...</Text>
        </View>
      </SafeAreaView>
    );
  }

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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollViewContent}
        >
          {/* Pet Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pet Information</Text>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Owner Name</Text>
                <TextInput
                  style={styles.input}
                  value={petOwnerName}
                  onChangeText={setPetOwnerName}
                  placeholder="Owner name"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Pet Name *</Text>
                <TextInput
                  style={styles.input}
                  value={petName}
                  onChangeText={setPetName}
                  placeholder="Pet name"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Pet Type</Text>
                <TextInput
                  style={styles.input}
                  value={petType}
                  onChangeText={setPetType}
                  placeholder="e.g., Dog, Cat"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Breed</Text>
                <TextInput
                  style={styles.input}
                  value={petBreed}
                  onChangeText={setPetBreed}
                  placeholder="Breed"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.thirdInput}>
                <Text style={styles.label}>Size</Text>
                <TextInput
                  style={styles.input}
                  value={petSize}
                  onChangeText={setPetSize}
                  placeholder="Small/Medium/Large"
                />
              </View>
              <View style={styles.thirdInput}>
                <Text style={styles.label}>Gender</Text>
                <TextInput
                  style={styles.input}
                  value={petGender}
                  onChangeText={setPetGender}
                  placeholder="Male/Female"
                />
              </View>
              <View style={styles.thirdInput}>
                <Text style={styles.label}>Age (months)</Text>
                <TextInput
                  style={styles.input}
                  value={petAge}
                  onChangeText={setPetAge}
                  placeholder="Age"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={styles.label}>Weight (kg)</Text>
            <TextInput
              style={styles.input}
              value={petWeight}
              onChangeText={setPetWeight}
              placeholder="Pet weight in kg"
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Known Allergies</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={knownAllergies}
              onChangeText={setKnownAllergies}
              placeholder="List any known allergies"
              multiline
              numberOfLines={2}
            />

            <Text style={styles.label}>Known Ailments</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={knownAilments}
              onChangeText={setKnownAilments}
              placeholder="List any existing medical conditions"
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Clinical Notes Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Clinical Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea, styles.largeTextArea]}
              value={clinicalNotes}
              onChangeText={setClinicalNotes}
              placeholder="Enter clinical observations, examination findings, diagnosis, treatment recommendations, and any other relevant medical notes"
              multiline
              numberOfLines={8}
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                <Text style={styles.saveButtonText}>Save Case Sheet</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 200 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: Colors.mediumGray,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 100,
  },
  section: {
    backgroundColor: '#FFF',
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    ...Typography.small,
    color: Colors.mediumGray,
    marginBottom: Spacing.md,
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  largeTextArea: {
    minHeight: 200,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  thirdInput: {
    flex: 1,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    margin: Spacing.lg,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...Typography.body,
    fontWeight: '700',
    color: '#FFF',
  },
});
