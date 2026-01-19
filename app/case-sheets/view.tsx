import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/Colors';
import apiService from '../../services/apiService';
import { useCustomModal } from '../../hooks/useCustomModal';
import CustomModal from '../../components/CustomModal';

interface CaseSheetData {
  id: string;
  appointment_id: string;
  pet_owner_name: string;
  pet_name: string;
  pet_type?: string;
  pet_breed?: string;
  pet_size?: string;
  pet_gender?: string;
  pet_age?: number;
  pet_weight?: number;
  known_allergies?: string;
  known_ailments?: string;
  clinical_notes?: string;
  created_at: string;
}

export default function ViewCaseSheetScreen() {
  const modal = useCustomModal();
  const params = useLocalSearchParams();
  const appointmentId = params.appointmentId as string;
  const caseSheetId = params.caseSheetId as string;

  const [loading, setLoading] = useState(true);
  const [caseSheet, setCaseSheet] = useState<CaseSheetData | null>(null);

  useEffect(() => {
    loadCaseSheet();
  }, []);

  const loadCaseSheet = async () => {
    try {
      setLoading(true);

      let response;
      if (caseSheetId) {
        response = await apiService.getCaseSheetById(caseSheetId);
      } else if (appointmentId) {
        response = await apiService.getCaseSheet(appointmentId);
      } else {
        throw new Error('No case sheet or appointment ID provided');
      }

      if (response.success && response.data) {
        setCaseSheet(response.data);
      } else {
        throw new Error(response.error || 'Case sheet not found');
      }
    } catch (error: any) {
      console.error('Error loading case sheet:', error);
      modal.showError(error.message || 'Failed to load case sheet');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading case sheet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!caseSheet) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="document-text-outline" size={64} color="#ccc" />
          <Text style={styles.errorText}>Case sheet not found</Text>
        </View>
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

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Pet Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="paw" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Pet Information</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Owner:</Text>
            <Text style={styles.value}>{caseSheet.pet_owner_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Pet Name:</Text>
            <Text style={styles.value}>{caseSheet.pet_name}</Text>
          </View>

          {caseSheet.pet_type && (
            <View style={styles.row}>
              <View style={styles.halfRow}>
                <Text style={styles.label}>Type:</Text>
                <Text style={styles.value}>{caseSheet.pet_type}</Text>
              </View>
              {caseSheet.pet_breed && (
                <View style={styles.halfRow}>
                  <Text style={styles.label}>Breed:</Text>
                  <Text style={styles.value}>{caseSheet.pet_breed}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.row}>
            {caseSheet.pet_gender && (
              <View style={styles.thirdRow}>
                <Text style={styles.label}>Gender:</Text>
                <Text style={styles.value}>{caseSheet.pet_gender}</Text>
              </View>
            )}
            {caseSheet.pet_age && (
              <View style={styles.thirdRow}>
                <Text style={styles.label}>Age:</Text>
                <Text style={styles.value}>{caseSheet.pet_age} months</Text>
              </View>
            )}
            {caseSheet.pet_weight && (
              <View style={styles.thirdRow}>
                <Text style={styles.label}>Weight:</Text>
                <Text style={styles.value}>{caseSheet.pet_weight} kg</Text>
              </View>
            )}
          </View>

          {caseSheet.known_allergies && (
            <View style={styles.textBlock}>
              <Text style={styles.label}>Known Allergies:</Text>
              <Text style={styles.value}>{caseSheet.known_allergies}</Text>
            </View>
          )}

          {caseSheet.known_ailments && (
            <View style={styles.textBlock}>
              <Text style={styles.label}>Known Ailments:</Text>
              <Text style={styles.value}>{caseSheet.known_ailments}</Text>
            </View>
          )}
        </View>

        {/* Clinical Notes Section */}
        {caseSheet.clinical_notes && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Clinical Notes</Text>
            </View>
            <View style={styles.textBlock}>
              <Text style={styles.value}>{caseSheet.clinical_notes}</Text>
            </View>
          </View>
        )}

        {/* Created Date */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Created on {formatDate(caseSheet.created_at)}
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.dark,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFF',
    padding: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.dark,
  },
  subsectionTitle: {
    ...Typography.subtitle,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  halfRow: {
    flex: 1,
  },
  thirdRow: {
    flex: 1,
  },
  textBlock: {
    marginBottom: Spacing.sm,
  },
  label: {
    ...Typography.small,
    fontWeight: '600',
    color: Colors.mediumGray,
    marginBottom: 2,
  },
  value: {
    ...Typography.body,
    color: Colors.dark,
    lineHeight: 20,
  },
  medicationsContainer: {
    marginTop: Spacing.md,
  },
  medicationCard: {
    backgroundColor: Colors.lightGray,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  medicationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  medicationName: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.dark,
  },
  medicationDetails: {
    gap: 4,
  },
  medicationDetail: {
    flexDirection: 'row',
  },
  medicationDetailLabel: {
    ...Typography.small,
    fontWeight: '600',
    color: Colors.mediumGray,
    width: 90,
  },
  medicationDetailValue: {
    ...Typography.small,
    color: Colors.dark,
    flex: 1,
  },
  testCard: {
    backgroundColor: Colors.lightGray,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  testName: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 4,
  },
  testNotes: {
    ...Typography.small,
    color: Colors.mediumGray,
  },
  privateNote: {
    ...Typography.small,
    color: Colors.mediumGray,
    fontStyle: 'italic',
    marginBottom: Spacing.sm,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  footerText: {
    ...Typography.small,
    color: Colors.mediumGray,
  },
});
