import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "../../constants/Colors";
import apiService from "../../services/apiService";

interface PartnerAppointmentCardProps {
  item: { [key: string]: any };
  style?: any;
  onCancel?: () => void;
  onPress?: () => void;
  status?: string;
  showActions?: boolean;
  otp_code?: string;
  hasCaseSheet?: boolean;
  hasPrescription?: boolean;
  onOTPVerified?: () => void;
}

const PartnerAppointmentCard: React.FC<PartnerAppointmentCardProps> = ({
  item,
  style,
  onCancel,
  onPress,
  status,
  showActions = true,
  otp_code,
  hasCaseSheet = false,
  hasPrescription = false,
  onOTPVerified,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Determine if actions should be shown based on status
  const canShowActions = showActions && status && ['scheduled', 'confirmed', 'pending', 'rescheduled', 'in_progress'].includes(status.toLowerCase());

  // Check if OTP is already verified based on status (in_progress or completed means OTP was verified)
  const otpVerified = status?.toLowerCase() === 'in_progress' || status?.toLowerCase() === 'completed';

  // Show OTP for active appointments (not completed or cancelled)
  const showOTP = otp_code && status && !['completed', 'cancelled', 'no_show'].includes(status.toLowerCase());

  // Check if this is a rescheduled appointment
  const isRescheduled = status?.toLowerCase() === 'rescheduled' || (item.reschedule_count && item.reschedule_count > 0);

  const getAppointmentTypeIcon = (providerType: string) => {
    switch (providerType?.toLowerCase()) {
      case "specialist":
      case "vet":
        return "medical";
      case "partner":
      case "grooming":
        return "cut";
      default:
        return "medical";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleVerifyOTP = async () => {
    if (!otpInput.trim()) {
      setErrorMessage('Please enter OTP');
      return;
    }

    try {
      setVerifying(true);
      setErrorMessage('');

      const response = await apiService.verifyOTP(item.id, otpInput);

      if (response.success) {
        setShowOTPVerification(false);
        setOtpInput('');
        // Call the success callback which will reload appointments and update status
        if (onOTPVerified) {
          onOTPVerified();
        }
      } else {
        setErrorMessage(response.error || 'Invalid OTP');
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to verify OTP');
    } finally {
      setVerifying(false);
    }
  };

  const handleFillCaseSheet = () => {
    router.push(`/case-sheets/create?appointmentId=${item.id}`);
  };

  const handleAddPrescription = () => {
    router.push(`/appointments/add-prescription?appointmentId=${item.id}`);
  };

  // Debug logging for appointment flow
  if (otpVerified && status?.toLowerCase() !== 'completed') {
    console.log('=== APPOINTMENT FLOW DEBUG ===');
    console.log('Provider Type:', item.provider_type);
    console.log('OTP Verified:', otpVerified);
    console.log('Has Case Sheet:', hasCaseSheet);
    console.log('Has Prescription:', hasPrescription);
    console.log('Status:', status);
    console.log('Next Step:', !hasCaseSheet ? 'Fill Case Sheet' : !hasPrescription ? 'Add Prescription' : 'Complete Appointment');
    console.log('=============================');
  }

  const handleCompleteAppointment = async () => {
    try {
      setVerifying(true);
      await apiService.updateAppointmentStatus(item.id, 'completed');
      if (onOTPVerified) {
        onOTPVerified();
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to complete appointment');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity
        style={[styles.card, style]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.topSection}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={getAppointmentTypeIcon(item.provider_type) as any}
              size={32}
              color={Colors.primary}
            />
          </View>

           <View style={styles.cardContent}>
             {!!(item.name || item.customerName) && (
               <Text style={styles.title}>{item.customerName || item.name}</Text>
             )}
             {!!item.petName && (
               <Text style={styles.description}>{`Pet: ${item.petName}`}</Text>
             )}
             {!!item.service && (
               <Text style={styles.serviceName}>{`Service: ${item.service}`}</Text>
             )}
           </View>
        </View>

        <View style={styles.infoContainer}>
           <View style={styles.infoItem}>
             <Ionicons name="calendar-outline" size={16} color="gray" />
             <Text style={styles.infoText}>
               {formatDate(item.appointmentDate || item.appointment_date)}
             </Text>
           </View>
           <View style={styles.infoItem}>
             <Ionicons name="time-outline" size={16} color="gray" />
             <Text style={styles.infoText}>
               {item.appointmentTime || item.appointment_time || 'N/A'}
             </Text>
           </View>
         </View>
      </TouchableOpacity>

       <View style={styles.viewBtnContainer}>
         <TouchableOpacity
           onPress={() => setShowDetails((prev) => !prev)}
           style={styles.viewBtn}
         >
           <Text style={styles.viewText}>{showDetails ? "Close" : "View"}</Text>
         </TouchableOpacity>
       </View>

      {!!showDetails && (
         <View style={styles.viewContent}>
           {!!(isRescheduled && item.reschedule_from_date && item.reschedule_from_time) && (
             <View style={styles.rescheduleInfoBox}>
               <View style={styles.rescheduleHeader}>
                 <Ionicons name="time-outline" size={20} color="#9C27B0" />
                 <Text style={styles.rescheduleTitle}>Appointment Rescheduled</Text>
               </View>
               <Text style={styles.rescheduleText}>
                 {`From: ${formatDate(item.reschedule_from_date)} at ${item.reschedule_from_time || 'N/A'}`}
               </Text>
               <Text style={styles.rescheduleText}>
                 {`To: ${formatDate(item.appointment_date)} at ${item.appointment_time || item.start_time || 'N/A'}`}
               </Text>
             </View>
           )}

          <TouchableOpacity onPress={onPress}>
            <View style={styles.appointmentDetailsBox}>
              <View style={styles.appointmentDetailsInfoContainer}>
                <View style={styles.iconWrapper}>
                  <Ionicons
                    size={24}
                    name="person-outline"
                    color="#ED6D4E"
                  />
                </View>
                 <View style={styles.detailsTextWrapper}>
                   <Text style={styles.detailsTitle}>{item.customerName || item.name || 'N/A'}</Text>
                   <Text style={styles.detailsSubtitle}>Customer</Text>
                 </View>
               </View>
               <View style={styles.appointmentDetailsInfoContainer}>
                 <View style={styles.iconWrapper}>
                   <Ionicons
                     size={24}
                     name="paw-outline"
                     color="#ED6D4E"
                   />
                 </View>
                 <View style={styles.detailsTextWrapper}>
                   <Text style={styles.detailsTitle}>{item.petName || 'N/A'}</Text>
                   <Text style={styles.detailsSubtitle}>Pet Name</Text>
                 </View>
               </View>
               <View style={styles.appointmentDetailsInfoContainer}>
                 <View style={styles.iconWrapper}>
                   <Ionicons
                     size={24}
                     name="time-outline"
                     color="#ED6D4E"
                   />
                 </View>
                 <View style={styles.detailsTextWrapper}>
                   <Text style={styles.detailsSubtitle}>
                     {`${formatDate(item.appointment_date || item.appointmentDate)}, ${item.appointment_time || item.appointmentTime || 'N/A'}`}
                   </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {!!canShowActions && (
            <View style={styles.btnContainer}>
              {!!(showOTP && !otpVerified) && (
                <TouchableOpacity
                  onPress={() => setShowOTPVerification(true)}
                  style={styles.verifyOTPBtn}
                >
                  <Text style={styles.btnText}>Verify OTP</Text>
                </TouchableOpacity>
              )}

              {/* Step 1: Fill Case Sheet (after OTP verification) */}
              {!!(otpVerified && status?.toLowerCase() !== 'completed' && !hasCaseSheet) && (
                <TouchableOpacity
                  onPress={handleFillCaseSheet}
                  style={styles.caseSheetBtn}
                >
                  <Ionicons name="document-text-outline" size={18} color="#fff" />
                  <Text style={styles.caseSheetBtnText}>Fill Case Sheet</Text>
                </TouchableOpacity>
              )}

              {/* Step 2: Add Prescription (after case sheet is filled) */}
              {!!(otpVerified && status?.toLowerCase() !== 'completed' && hasCaseSheet && !hasPrescription) && (
                <TouchableOpacity
                  onPress={handleAddPrescription}
                  style={styles.prescriptionBtn}
                >
                  <Ionicons name="medical-outline" size={18} color="#fff" />
                  <Text style={styles.prescriptionBtnText}>Add Prescription</Text>
                </TouchableOpacity>
              )}

              {/* Step 3: Complete Appointment (after both case sheet and prescription) */}
              {!!(otpVerified && status?.toLowerCase() !== 'completed' && hasCaseSheet && hasPrescription) && (
                <TouchableOpacity
                  onPress={handleCompleteAppointment}
                  style={styles.completeBtn}
                  disabled={verifying}
                >
                  {verifying ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                      <Text style={styles.completeBtnText}>Complete Appointment</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {!!showOTPVerification && (
            <View style={styles.otpVerificationBox}>
              <Text style={styles.otpVerificationTitle}>Verify Customer OTP</Text>
              <Text style={styles.otpVerificationSubtitle}>Ask the customer for their OTP code</Text>
              <TextInput
                style={styles.otpInputField}
                value={otpInput}
                onChangeText={setOtpInput}
                placeholder="Enter OTP"
                keyboardType="number-pad"
                maxLength={6}
              />
               {!!errorMessage && (
                 <Text style={styles.errorText}>{errorMessage}</Text>
               )}
              <View style={styles.otpVerificationButtons}>
                <TouchableOpacity
                  style={styles.otpCancelBtn}
                  onPress={() => {
                    setShowOTPVerification(false);
                    setOtpInput('');
                    setErrorMessage('');
                  }}
                >
                  <Text style={styles.otpCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.otpVerifyBtn, verifying && styles.otpVerifyBtnDisabled]}
                  onPress={handleVerifyOTP}
                  disabled={verifying}
                >
                  {verifying ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.otpVerifyBtnText}>Verify</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    padding: 1,
    paddingBottom: 10,
    backgroundColor: "#F0F0F8",
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
  description: {
    fontSize: 14,
    color: "#666",
  },
  serviceName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ED6D4E",
    marginTop: 2,
  },
  infoContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    marginTop: 8,
    gap: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    color: "#444",
  },
  viewBtnContainer: {
    alignItems: "center",
    marginVertical: 5,
  },
  viewBtn: {
    borderWidth: 1,
    borderColor: "#ED6D4E",
    paddingVertical: 6,
    paddingHorizontal: 25,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  viewText: {
    color: "#ED6D4E",
    fontWeight: "bold",
    fontSize: 16,
  },
  viewContent: {
    width: "95%",
    alignSelf: "center",
    padding: 10,
  },
  appointmentDetailsBox: {
    backgroundColor: "#F8F7FB",
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  appointmentDetailsInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F0F8",
    borderRadius: 20,
    marginRight: 8,
  },
  detailsTextWrapper: {
    flex: 1,
    justifyContent: "center",
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  detailsSubtitle: {
    fontSize: 12,
    color: "#666",
  },
  btnContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-evenly",
    marginTop: 10,
    gap: 8,
  },
  verifyOTPBtn: {
    backgroundColor: "#4CAF50",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  caseSheetBtn: {
    backgroundColor: "#2196F3",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  caseSheetBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },
  prescriptionBtn: {
    backgroundColor: "#FF9800",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  prescriptionBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },
  completeBtn: {
    backgroundColor: "#4CAF50",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  completeBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },
  cancelBtn: {
    backgroundColor: "#F0F0F8",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  btnText: {
    color: "#000",
    fontWeight: "bold",
  },
  otpBox: {
    backgroundColor: "#E8F5E8",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#4CAF50",
  },
  otpHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  otpTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2E7D32",
    marginLeft: 6,
  },
  otpCodeContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  otpCode: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2E7D32",
    letterSpacing: 4,
    fontFamily: "monospace",
  },
  otpNote: {
    fontSize: 11,
    color: "#388E3C",
    textAlign: "center",
    fontStyle: "italic",
  },
  rescheduleInfoBox: {
    backgroundColor: "#F3E5F5",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#9C27B0",
  },
  rescheduleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  rescheduleTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#6A1B9A",
    marginLeft: 6,
  },
  rescheduleText: {
    fontSize: 13,
    color: "#6A1B9A",
    marginTop: 4,
    fontWeight: "500",
  },
  otpVerificationBox: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  otpVerificationTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  otpVerificationSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  otpInputField: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    textAlign: "center",
    letterSpacing: 4,
    marginBottom: 12,
  },
  errorText: {
    color: "#F44336",
    fontSize: 13,
    marginBottom: 12,
  },
  otpVerificationButtons: {
    flexDirection: "row",
    gap: 12,
  },
  otpCancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
  },
  otpCancelBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  otpVerifyBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  otpVerifyBtnDisabled: {
    opacity: 0.6,
  },
  otpVerifyBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
});

export default PartnerAppointmentCard;
