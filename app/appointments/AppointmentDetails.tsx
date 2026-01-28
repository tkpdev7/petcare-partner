import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Text,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import apiService from '../../services/apiService';
import { useLocalSearchParams, router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import CustomModal from '../../components/CustomModal';
import { useCustomModal } from '../../hooks/useCustomModal';

interface AppointmentDetailsScreenProps { }

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reply?: {
    id: string;
    comment: string;
    created_at: string;
  };
}

const AppointmentDetailsScreen: React.FC<AppointmentDetailsScreenProps> = () => {
  const { appointmentId, appointment: appointmentString } = useLocalSearchParams();
  const initialAppointment = typeof appointmentString === 'string' ? JSON.parse(appointmentString) : appointmentString;

  const modal = useCustomModal();
  const [loading, setLoading] = useState(false);
  const [appointment, setAppointment] = useState(initialAppointment);
  const [review, setReview] = useState<Review | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [canReview, setCanReview] = useState(false);
  const [otp, setOtp] = useState<string | null>(null);
  const [otpGenerated, setOtpGenerated] = useState(false);

  // Fetch fresh appointment data from API
  const fetchAppointmentDetails = async () => {
    if (!appointmentId) return;

    try {
      setLoading(true);
      console.log('📱 Fetching fresh appointment details for ID:', appointmentId);
      const response = await apiService.getAppointment(appointmentId);

      if (response.success && response.data) {
        const appt = response.data.data || response.data;
        console.log('✅ Fresh appointment data received');
        console.log('📦 Full appointment object keys:', Object.keys(appt));
        console.log('📄 case_sheet_pdf_base64 length:', appt.case_sheet_pdf_base64?.length || 0);
        console.log('📄 case_sheet_pdf_base64 exists:', !!appt.case_sheet_pdf_base64);
        console.log('📄 case_sheet_pdf_base64 first 50 chars:', appt.case_sheet_pdf_base64?.substring(0, 50));
        console.log('💊 Has prescription:', !!appt.prescription_pdf_base64);
        console.log('🔄 Setting appointment state...');
        setAppointment(appt);
        console.log('✅ Appointment state updated');

        // Update OTP if present
        if (appt.otp_code) {
          setOtp(appt.otp_code);
          setOtpGenerated(true);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching appointment details:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reload appointment data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 AppointmentDetails screen focused - reloading data');
      fetchAppointmentDetails();
    }, [appointmentId])
  );

  useEffect(() => {
    checkReviewable();
    loadExistingReview();
  }, [appointmentId, appointment]);

  const checkReviewable = async () => {
    // Partner app doesn't submit reviews - partners receive reviews from customers
    // This functionality is disabled for partner app
    setCanReview(false);
  };

  const loadExistingReview = async () => {
    // Partner app doesn't submit reviews - partners receive reviews from customers
    // This functionality is disabled for partner app
  };

  // Extract OTP from appointment data
  useEffect(() => {
    if (appointment?.otp_code) {
      setOtp(appointment.otp_code);
      setOtpGenerated(true);
    }
  }, [appointment]);

  const submitReview = async () => {
    // Partner app doesn't submit reviews - partners receive reviews from customers
    // This functionality is disabled for partner app
    modal.showError('Review submission is not available in Partner App');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    } catch (e) {
      return timeString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return '#4CAF50';
      case 'rescheduled':
        return '#9C27B0'; // Purple for rescheduled (separate status)
      case 'pending':
        return '#FF9800';
      case 'completed':
        return '#2196F3';
      case 'cancelled':
        return '#F44336';
      default:
        return '#757575';
    }
  };

  const getAppointmentTypeLabel = (providerType: string) => {
    switch (providerType?.toLowerCase()) {
      case 'specialist':
        return 'Vet Appointment';
      case 'partner':
        return 'Grooming Appointment';
      case 'dogwalker':
        return 'Dog Walking';
      case 'dogsitter':
        return 'Dog Sitting';
      default:
        return 'Appointment';
    }
  };

  const renderStars = (currentRating: number, onPress?: (rating: number) => void) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => onPress?.(i)}
          disabled={!onPress}
        >
          <Ionicons
            name={i <= currentRating ? 'star' : 'star-outline'}
            size={24}
            color="#FFD700"
          />
        </TouchableOpacity>
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  const handleDownloadDocument = async (base64Data: string, documentName: string) => {
    try {
      const fileName = `${documentName}_${Date.now()}.pdf`;
      const fileUri = FileSystem.documentDirectory + fileName;

      // Remove data URI prefix if present
      const base64Content = base64Data.replace(/^data:application\/pdf;base64,/, '');

      await FileSystem.writeAsStringAsync(fileUri, base64Content, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (Platform.OS === 'android') {
        const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permission.granted) {
          const base64 = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          await FileSystem.StorageAccessFramework.createFileAsync(
            permission.directoryUri,
            fileName,
            'application/pdf'
          ).then(async (uri) => {
            await FileSystem.writeAsStringAsync(uri, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            Alert.alert('Success', `${documentName} downloaded successfully`);
          });
        }
      } else {
        await Sharing.shareAsync(fileUri);
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      Alert.alert('Error', 'Failed to download document');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointment Details</Text>
        <View style={styles.placeholder}>
          {loading && <ActivityIndicator size="small" color="#ED6D4E" />}
        </View>
      </View>

      <ScrollView style={styles.container}>
        {/* OTP Display Section - Prominent */}
        {otpGenerated && otp && appointment?.status?.toLowerCase() !== 'completed' && appointment?.status?.toLowerCase() !== 'cancelled' && (
          <View style={styles.otpSection}>
            <View style={styles.otpHeader}>
              <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
              <Text style={styles.otpTitle}>Appointment OTP</Text>
            </View>
            <Text style={styles.otpDescription}>Share this OTP with your service provider to complete the appointment</Text>
            <View style={styles.otpCodeContainer}>
              <Text style={styles.otpCode}>{otp}</Text>
            </View>
            <Text style={styles.otpNote}>Keep this code secure and only share it when completing your appointment</Text>
          </View>
        )}

        <View style={styles.appointmentCard}>
          <View style={styles.appointmentHeader}>
            <Text style={styles.appointmentType}>
              {getAppointmentTypeLabel(appointment.provider_type)}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
              <Text style={styles.statusText}>
                {appointment.status?.toLowerCase() === 'scheduled' ? 'Upcoming' : appointment.status}
              </Text>
            </View>
          </View>

          <View style={styles.appointmentDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date:</Text>
              <Text style={styles.detailText}>{formatDate(appointment.appointment_date)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Time:</Text>
              <Text style={styles.detailText}>{appointment.appointment_time}</Text>
            </View>

            {appointment.provider_name && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Provider:</Text>
                <Text style={styles.detailText}>{appointment.provider_name}</Text>
              </View>
            )}

            {appointment.pet_name && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Pet:</Text>
                <Text style={styles.detailText}>{appointment.pet_name}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Reschedule Information - Only show if status is rescheduled */}
        {appointment.status?.toLowerCase() === 'rescheduled' && appointment.original_date && appointment.original_time && (
          <View style={styles.rescheduleCard}>
            <View style={styles.rescheduleHeader}>
              <Ionicons name="time-outline" size={20} color="#9C27B0" />
              <Text style={styles.rescheduleTitle}>Appointment Rescheduled</Text>
            </View>
            <Text style={styles.rescheduleText}>{`Appt rescheduled from time ${appointment.original_time}, date ${formatDate(appointment.original_date)} to time ${appointment.appointment_time}, date ${formatDate(appointment.appointment_date)}`}</Text>
          </View>
        )}

        {/* Medical Documents - Show case sheet when available, prescription only when completed */}
        {(appointment.case_sheet_pdf_base64 || appointment.prescription_pdf_base64) && (
          <View style={styles.documentsSection}>
            <Text style={styles.sectionTitle}>Medical Documents</Text>
            <View style={styles.documentsCard}>
              {/* Case Sheet - Show when available (even during in_progress status) */}
              {appointment.case_sheet_pdf_base64 && (
                <View style={styles.documentSection}>
                  <View style={styles.documentHeader}>
                    <Ionicons name="clipboard" size={24} color="#2196F3" />
                    <Text style={styles.documentHeaderTitle}>Case Sheet</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.documentButton, styles.caseSheetButton]}
                    onPress={() => router.push({
                      pathname: "/appointments/viewDocument",
                      params: {
                        url: `data:application/pdf;base64,${appointment.case_sheet_pdf_base64}`,
                        name: "Case Sheet"
                      }
                    })}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="eye-outline" size={20} color="#2196F3" />
                    <Text style={styles.caseSheetButtonText}>View Case Sheet</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.documentButton, styles.caseSheetButton, styles.downloadButton]}
                    onPress={() => handleDownloadDocument(appointment.case_sheet_pdf_base64, 'CaseSheet')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="download-outline" size={20} color="#2196F3" />
                    <Text style={styles.caseSheetButtonText}>Download Case Sheet</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Prescription - Only show when available */}
              {appointment.prescription_pdf_base64 && (
                <View style={[styles.documentSection, appointment.case_sheet_pdf_base64 && styles.documentSectionBordered]}>
                  <View style={styles.documentHeader}>
                    <Ionicons name="document-text" size={24} color="#4CAF50" />
                    <Text style={styles.documentHeaderTitle}>Prescription</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.documentButton}
                    onPress={() => router.push({
                      pathname: "/appointments/viewDocument",
                      params: {
                        url: `data:application/pdf;base64,${appointment.prescription_pdf_base64}`,
                        name: "Prescription"
                      }
                    })}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="eye-outline" size={20} color="#4CAF50" />
                    <Text style={styles.documentButtonText}>View Prescription</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.documentButton, styles.downloadButton]}
                    onPress={() => handleDownloadDocument(appointment.prescription_pdf_base64, 'Prescription')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="download-outline" size={20} color="#4CAF50" />
                    <Text style={styles.documentButtonText}>Download Prescription</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Review Section */}
        <View style={styles.reviewSection}>
          <Text style={styles.sectionTitle}>Review & Rating</Text>

          {review ? (
            <View style={styles.existingReview}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewTitle}>Your Review</Text>
                {renderStars(review.rating)}
              </View>
              <Text style={styles.reviewComment}>{review.comment}</Text>
              <Text style={styles.reviewDate}>
                Reviewed on {formatDate(review.created_at)}
              </Text>

              {review.reply && (
                <View style={styles.replySection}>
                  <Text style={styles.replyTitle}>Provider Response</Text>
                  <Text style={styles.replyComment}>{review.reply.comment}</Text>
                  <Text style={styles.replyDate}>{`Replied on ${formatDate(review.reply.created_at)}`}</Text>
                </View>
              )}
            </View>
          ) : canReview ? (
            <View style={styles.reviewPrompt}>
              <Text style={styles.promptText}>Share your experience with this appointment</Text>
              <TouchableOpacity
                style={styles.reviewButton}
                onPress={() => setShowReviewModal(true)}
              >
                <Text style={styles.reviewButtonText}>Write Review</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noReview}>
              <Text style={styles.noReviewText}>
                Reviews can only be written after appointment completion
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowReviewModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Write Review</Text>
            <TouchableOpacity onPress={submitReview} disabled={loading}>
              <Text style={[styles.modalSubmit, loading && styles.modalSubmitDisabled]}>
                Submit
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.ratingLabel}>Rate your experience:</Text>
            {renderStars(rating, setRating)}

            <Text style={styles.commentLabel}>Write your review:</Text>
            <TextInput
              style={styles.commentInput}
              multiline
              numberOfLines={4}
              placeholder="Share your experience with this appointment..."
              value={comment}
              onChangeText={setComment}
              textAlignVertical="top"
            />
          </View>
        </SafeAreaView>
      </Modal>
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
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  placeholder: {
    width: 40,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  appointmentType: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  appointmentDetails: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    minWidth: 80,
  },
  detailText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  rescheduleCard: {
    backgroundColor: '#F3E5F5',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#9C27B0',
  },
  rescheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rescheduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9C27B0',
    marginLeft: 8,
  },
  rescheduleText: {
    fontSize: 14,
    color: '#6A1B9A',
    lineHeight: 20,
  },
  reviewSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  existingReview: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  reviewComment: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
  },
  replySection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 6,
  },
  replyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF7A59',
    marginBottom: 8,
  },
  replyComment: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 6,
  },
  replyDate: {
    fontSize: 12,
    color: '#999',
  },
  reviewPrompt: {
    alignItems: 'center',
    padding: 20,
  },
  promptText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  reviewButton: {
    backgroundColor: '#FF7A59',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  reviewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noReview: {
    padding: 20,
    alignItems: 'center',
  },
  noReviewText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalCancel: {
    fontSize: 16,
    color: '#666',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalSubmit: {
    fontSize: 16,
    color: '#FF7A59',
    fontWeight: '600',
  },
  modalSubmitDisabled: {
    color: '#CCC',
  },
  modalContent: {
    padding: 20,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 24,
    marginBottom: 12,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#333',
    minHeight: 120,
    backgroundColor: '#F9F9F9',
  },
  otpSection: {
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  otpTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginLeft: 8,
  },
  otpDescription: {
    fontSize: 16,
    color: '#388E3C',
    marginBottom: 16,
    lineHeight: 22,
  },
  otpCodeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  otpCode: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2E7D32',
    letterSpacing: 4,
    fontFamily: 'monospace',
  },
  otpNote: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  documentsSection: {
    marginBottom: 20,
  },
  documentsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    padding: 16,
  },
  documentSection: {
    marginBottom: 16,
  },
  documentSectionBordered: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  documentHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  downloadButton: {
    marginBottom: 0,
  },
  documentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 8,
  },
  caseSheetButton: {
    borderColor: '#2196F3',
  },
  caseSheetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
    marginLeft: 8,
  },
});

export default AppointmentDetailsScreen;