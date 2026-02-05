import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Linking,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { RouteProp, useRoute } from "@react-navigation/native";
import apiService from "../../services/apiService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomModal from "../../components/CustomModal";
import { useCustomModal } from "../../hooks/useCustomModal";

// // Example state - these would be dynamic in real usage
// const statusStates = [
//   { completed: true, date: "8 Sep 2022", time: "5:30 PM" },
//   { completed: true, date: "9 Sep 2022", time: "10:30 AM" },
//   { completed: false, date: "--", time: "--" },
// ];

type AppointmentMilestone = {
  status: string;
  title: string;
  completed: boolean;
  timestamp?: string | null;
  icon?: string;
};

type Appointment = {
  id: number;
  status: string;
  appointment_date?: string;
  appointmentDate?: string;
  appointment_time?: string;
  appointmentTime?: string;
  created_at?: string;
  createdAt?: string;
  cancellation_reason?: string;
  cancelled_by?: string;
  cancelled_at?: string;
  cancelledAt?: string;
  rescheduled_at?: string;
  rescheduledAt?: string;
  prescription_file_url?: string;
  prescription_pdf_base64?: string;
  prescription_data?: any;
  case_sheet_pdf_base64?: string;
  case_sheet_url?: string;
  clinical_notes?: string;
  otp_code?: string;
  provider_name?: string;
  provider_type?: string;
  service_name?: string;
  service_type?: string;
  pet_name?: string;
  price?: number | string;
  total_price?: number | string;
  payment_method?: string;
};

type AppointmentTimelineRouteProp = RouteProp<{ AppointmentTimeline: { id?: string,date?:string,time?:string } }, 'AppointmentTimeline'>;

export default function AppointmentTimelinePage({ navigation }: { navigation?: any }) {
  const router = useRouter();
const route = useRoute<AppointmentTimelineRouteProp>();
 const { id,date,time } = route.params;
  const modal = useCustomModal();
  const [milestones, setMilestones] = useState<AppointmentMilestone[]>([]);

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [otp, setOtp] = useState<string | null>(null);
  const [otpGenerated, setOtpGenerated] = useState(false);
  const [loading, setLoading] = useState(true);



  console.log("Timeline : ", id, date, time);

  // Generate timeline milestones based on appointment status
  const generateMilestones = (apt: Appointment): AppointmentMilestone[] => {
    const milestones: AppointmentMilestone[] = [
      {
        status: 'accepted',
        title: 'Appointment Request Accepted',
        completed: true,
        timestamp: apt.createdAt || apt.created_at,
        icon: '📅',
      },
    ];

    const status = apt.status?.toLowerCase();

    // If rescheduled, add reschedule milestone
    if (status === 'rescheduled') {
      milestones.push({
        status: 'rescheduled',
        title: 'Appointment Rescheduled',
        completed: true,
        timestamp: apt.rescheduled_at || apt.rescheduledAt || new Date().toISOString(),
        icon: '🔄',
      });
    }

    // Add in_progress if status is in_progress or completed
    if (status === 'in_progress' || status === 'completed') {
      milestones.push({
        status: 'in_progress',
        title: 'Appointment On-going',
        completed: true,
        timestamp: apt.appointmentDate || apt.appointment_date,
        icon: '🏥',
      });
    } else {
      milestones.push({
        status: 'in_progress',
        title: 'Appointment On-going',
        completed: false,
        timestamp: null,
        icon: '🏥',
      });
    }

    // Add completed milestone
    if (status === 'completed') {
      milestones.push({
        status: 'completed',
        title: 'Appointment Completed',
        completed: true,
        timestamp: apt.appointmentDate || apt.appointment_date,
        icon: '🎉',
      });
    } else if (status === 'cancelled' || status === 'no_show') {
      milestones.push({
        status: status,
        title: status === 'cancelled' ? 'Appointment Cancelled' : 'No Show',
        completed: true,
        timestamp: apt.cancelled_at || apt.cancelledAt || new Date().toISOString(),
        icon: '❌',
      });
    } else {
      milestones.push({
        status: 'completed',
        title: 'Appointment Completed',
        completed: false,
        timestamp: null,
        icon: '🎉',
      });
    }

    return milestones;
  };

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const t = await AsyncStorage.getItem("partnerToken");
        setToken(t);
      } catch (error) {
        console.log("Error getting token:", error);
      }
    };

    fetchToken();
  }, []);


  useEffect(() => {
    if (!id) return;

    const fetchAppointmentData = async () => {
      try {
        setLoading(true);
        // Fetch appointment details using apiService
        const response = await apiService.getAppointment(id);

        console.log('=== APPOINTMENT API RESPONSE ===');
        console.log('Full Response:', JSON.stringify(response, null, 2));
        console.log('============================');

        if (response.success && response.data) {
          // Handle double-nested data structure: response.data.data
          const appointmentData = response.data.data || response.data;

          console.log('Key Fields Check:');
          console.log('- provider_name:', appointmentData?.provider_name);
          console.log('- service_name:', appointmentData?.service_name);
          console.log('- service_type:', appointmentData?.service_type);
          console.log('- pet_name:', appointmentData?.pet_name);
          console.log('- price:', appointmentData?.price);
          console.log('- totalAmount:', appointmentData?.totalAmount);
          console.log('- payment_method:', appointmentData?.payment_method);
          console.log('- otp_code:', appointmentData?.otp_code);
          console.log('- prescription_pdf_base64:', appointmentData?.prescription_pdf_base64 ? 'present' : 'not present');
          console.log('- case_sheet_pdf_base64:', appointmentData?.case_sheet_pdf_base64 ? 'present' : 'not present');
          console.log('============================');

          setAppointment(appointmentData);

          // Generate timeline milestones from appointment status
          const generatedMilestones = generateMilestones(appointmentData);
          console.log('Generated milestones:', generatedMilestones.length, 'items');
          console.log('Milestones with timestamps:', generatedMilestones);
          setMilestones(generatedMilestones);
        } else {
          // Set default milestones even if no data
          setMilestones([
            { status: 'accepted', title: 'Appointment Request Accepted', completed: false, timestamp: null, icon: '📅' },
            { status: 'in_progress', title: 'Appointment On-going', completed: false, timestamp: null, icon: '🏥' },
            { status: 'completed', title: 'Appointment Completed', completed: false, timestamp: null, icon: '🎉' }
          ]);
        }
      } catch (error) {
        console.error('Error fetching appointment:', error);
        // Set default milestones on error
        setMilestones([
          { status: 'accepted', title: 'Appointment Request Accepted', completed: false, timestamp: null, icon: '📅' },
          { status: 'in_progress', title: 'Appointment On-going', completed: false, timestamp: null, icon: '🏥' },
          { status: 'completed', title: 'Appointment Completed', completed: false, timestamp: null, icon: '🎉' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointmentData();
  }, [id]);

  // Extract OTP from appointment data when loaded
  useEffect(() => {
    if (!appointment) return;

    console.log('OTP Debug - Appointment OTP:', appointment.otp_code);
    if (appointment.otp_code) {
      setOtp(appointment.otp_code);
      setOtpGenerated(true);
    }
  }, [appointment]);


   const statusStates = milestones.map(ms => ({
    completed: ms.completed,
    date: ms.timestamp ? new Date(ms.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "--",
    time: ms.timestamp ? new Date(ms.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "--",
    label: ms.title,
    icon: ms.icon,
  }));

  console.log(milestones);

  // Replace TIMELINE in render with dynamic if milestones are present
  const TIMELINE = milestones.length
    ? milestones.map(ms => ({
        key: ms.status,
        label: ms.title,
        icon: ms.icon === "📅" ? "calendar" :
              ms.icon === "✅" ? "checkmark-circle" :
              ms.icon === "🏥" ? "medkit" :
              ms.icon === "🎉" ? "checkmark-done-circle" :
              ms.icon === "🔄" ? "refresh" :
              ms.icon === "⚠️" || ms.icon === "❌" ? "close-circle" : "ellipse",
        details: ms.details // Include reschedule details if available
      }))
    : [
        { key: "accepted", label: "Appointment Request Accepted", icon: "checkmark-circle" },
        { key: "ongoing", label: "Appointment On-going", icon: "hourglass" },
        { key: "completed", label: "Appointment Completed", icon: "checkmark-done-circle" },
      ];

  const lastCompleted = statusStates.findLastIndex(s => s.completed);

  // If appointment is completed, mark all milestones as completed
  const isAppointmentCompleted = appointment?.status?.toLowerCase() === 'completed';
  const enhancedStatusStates = statusStates.map((state, idx) => ({
    ...state,
    completed: isAppointmentCompleted ? true : state.completed
  }));

const formatDateTime = (dateString?: string, timeString?: string) => {
  if (!dateString || !timeString) return ""; // handle undefined safely

  const date = new Date(dateString);
  const [hours, minutes] = timeString.split(':').map(Number);
  date.setHours(hours, minutes);

  const formattedDate = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).replace(':', '.'); // optional: change 10:30 AM → 10.30 AM

  return `${formattedDate} , ${formattedTime}`;
};

const getStatusStyle = (status?: string) => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return { color: '#4CAF50' };
    case 'confirmed':
    case 'scheduled':
      return { color: '#ED6D4E' };
    case 'cancelled':
    case 'no_show':
      return { color: '#F44336' };
    case 'in_progress':
      return { color: '#FF9800' };
    default:
      return { color: '#666' };
  }
};


// console.log("id",id)
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#ED6D4E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointment information</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Text style={{ color: '#777' }}>Loading appointment details...</Text>
        </View>
       ) : (
         <ScrollView contentContainerStyle={styles.scroll}>
          {/* Appointment Details Section */}
          {appointment && (
            <View style={styles.appointmentDetailsSection}>
              <Text style={styles.sectionTitle}>Appointment Details</Text>

              {/* Status */}
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons name="information-circle" size={24} color="#ED6D4E" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={[styles.detailValue, styles.statusText, getStatusStyle(appointment.status)]}>
                    {appointment.status?.toUpperCase() || 'UNKNOWN'}
                  </Text>
                </View>
              </View>

              {/* Partner Info */}
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons name="business" size={24} color="#ED6D4E" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Partner</Text>
                  <Text style={styles.detailValue}>{appointment.provider_name || 'Not available'}</Text>
                </View>
              </View>

              {/* Service Info */}
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons name="medical" size={24} color="#ED6D4E" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Service Type</Text>
                  <Text style={styles.detailValue}>
                    {appointment.service_name || appointment.service_type || 'Service'}
                  </Text>
                </View>
              </View>

              {/* Pet Name */}
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons name="paw" size={24} color="#ED6D4E" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Pet Name</Text>
                  <Text style={styles.detailValue}>{appointment.pet_name || 'Not available'}</Text>
                </View>
              </View>

              {/* Price */}
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons name="cash" size={24} color="#ED6D4E" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Price</Text>
                  <Text style={styles.detailValue}>
                    {appointment.price || appointment.total_price ?
                      `₹${appointment.price || appointment.total_price}` :
                      'Not available'}
                  </Text>
                </View>
              </View>

              {/* Payment Mode - Hidden for now, only show if available */}
              {appointment.payment_method && (
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Ionicons name="card" size={24} color="#ED6D4E" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Payment Method</Text>
                    <Text style={styles.detailValue}>{appointment.payment_method}</Text>
                  </View>
                </View>
              )}

            </View>
          )}

         {/* Estimated Time Block */}
         <View style={styles.estimatedTimeBox}>
          <Text style={styles.estimatedHeading}>Appointment Time</Text>
          <Text style={styles.estimatedTime}>{formatDateTime(date,time)}</Text>
        </View>

        {/* Medical Records (Prescription & Clinical Notes) */}
        {(appointment?.prescription_pdf_base64 || appointment?.case_sheet_pdf_base64 || appointment?.clinical_notes) && (
          <View style={styles.medicalRecordsBox}>
            <View style={styles.medicalRecordsHeader}>
              <Ionicons name="medical" size={22} color="#ED6D4E" />
              <Text style={styles.medicalRecordsTitle}>Medical Records</Text>
            </View>

            {/* Prescription Section */}
            {appointment?.prescription_pdf_base64 && (
              <View style={styles.prescriptionSection}>
                <View style={styles.prescriptionHeaderRow}>
                  <View style={styles.prescriptionHeader}>
                    <Ionicons name="document-text" size={20} color="#4CAF50" />
                    <Text style={styles.prescriptionLabel}>Prescription</Text>
                  </View>
                  <View style={styles.documentActions}>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={async () => {
                        try {
                          const { viewPDF } = await import('../../utils/documentViewer');
                          await viewPDF(
                            appointment.prescription_pdf_base64!,
                            `prescription_${appointment.id}.pdf`
                          );
                        } catch (error) {
                          console.error('Error viewing prescription:', error);
                          modal.showError('Failed to open prescription. Please try again.');
                        }
                      }}
                    >
                      <Ionicons name="eye-outline" size={24} color="#4CAF50" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={async () => {
                        try {
                          const { downloadPDF } = await import('../../utils/documentViewer');
                          await downloadPDF(
                            appointment.prescription_pdf_base64!,
                            `prescription_${appointment.id}.pdf`
                          );
                          modal.showSuccess('Document downloaded successfully');
                        } catch (error) {
                          console.error('Error downloading prescription:', error);
                          modal.showError('Failed to download prescription. Please try again.');
                        }
                      }}
                    >
                      <Ionicons name="download-outline" size={24} color="#4CAF50" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Case Sheet Section */}
            {appointment?.case_sheet_pdf_base64 && (
              <View style={styles.prescriptionSection}>
                <View style={styles.prescriptionHeaderRow}>
                  <View style={styles.prescriptionHeader}>
                    <Ionicons name="clipboard" size={20} color="#2196F3" />
                    <Text style={styles.prescriptionLabel}>Case Sheet</Text>
                  </View>
                  <View style={styles.documentActions}>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={async () => {
                        try {
                          const { viewPDF } = await import('../../utils/documentViewer');
                          await viewPDF(
                            appointment.case_sheet_pdf_base64!,
                            `case_sheet_${appointment.id}.pdf`
                          );
                        } catch (error) {
                          console.error('Error viewing case sheet:', error);
                          modal.showError('Failed to open case sheet. Please try again.');
                        }
                      }}
                    >
                      <Ionicons name="eye-outline" size={24} color="#2196F3" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={async () => {
                        try {
                          const { downloadPDF } = await import('../../utils/documentViewer');
                          await downloadPDF(
                            appointment.case_sheet_pdf_base64!,
                            `case_sheet_${appointment.id}.pdf`
                          );
                          modal.showSuccess('Document downloaded successfully');
                        } catch (error) {
                          console.error('Error downloading case sheet:', error);
                          modal.showError('Failed to download case sheet. Please try again.');
                        }
                      }}
                    >
                      <Ionicons name="download-outline" size={24} color="#2196F3" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Clinical Notes Section */}
            {appointment?.clinical_notes && (
              <View style={styles.clinicalNotesSection}>
                <View style={styles.clinicalNotesHeader}>
                  <Ionicons name="clipboard" size={20} color="#2196F3" />
                  <Text style={styles.clinicalNotesLabel}>Clinical Notes</Text>
                </View>
                <View style={styles.clinicalNotesContent}>
                  <Text style={styles.clinicalNotesText}>
                    {appointment.clinical_notes}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Status Timeline */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusHeader}>Appointment Status</Text>
          <View style={styles.horizontalLine} />

          <View style={styles.timelineContainer}>
            {TIMELINE.map((node, idx) => {
              const isDone = enhancedStatusStates[idx]?.completed;
              const color = isDone ? "#ED6D4E" : "#bbb";
              const lineColor = isDone ? "#ED6D4E" : "#eee";
              return (
                <View key={node.key} style={styles.timelineRow}>
                  <View style={styles.timelineIconCol}>
                    {/* Icon with color */}
                    <Ionicons
                      name={node.icon as any}
                      size={26}
                      color={color}
                      style={[
                        styles.timelineIcon,
                        isDone && styles.iconBold,
                      ]}
                    />
                    {/* Vertical line except after last node */}
                    {idx < TIMELINE.length - 1 && (
                      <View style={[
                        styles.timelineLine,
                        { backgroundColor: lineColor }
                      ]} />
                    )}
                  </View>
                  <View style={styles.timelineTextCol}>
                    <Text style={[
                      styles.timelineLabel,
                      isDone && styles.timelineLabelActive
                    ]}>
                      {node.label}
                    </Text>
                    <Text style={styles.timelineSubLabel}>
                      {`${enhancedStatusStates[idx]?.time || '--'}, ${enhancedStatusStates[idx]?.date || '--'}`}
                    </Text>
                    {/* Show reschedule details without reason */}
                    {node.details && node.details.from_date && node.details.from_time && (
                      <View style={styles.rescheduleDetails}>
                        <Text style={styles.rescheduleText}>
                          {`From: ${node.details.from_date} at ${node.details.from_time}`}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Cancellation Information */}
        {appointment?.status === 'cancelled' && appointment?.cancellation_reason && (
          <View style={styles.cancellationBox}>
            <Text style={styles.cancellationTitle}>Cancellation Details</Text>
            <Text style={styles.cancellationReason}>{`Reason: ${appointment.cancellation_reason}`}</Text>
            <Text style={styles.cancellationBy}>{`Cancelled by ${appointment.cancelled_by === 'user' ? 'You' : appointment.cancelled_by === 'provider' ? 'Service Provider' : 'System'}`}</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
 )}
     

      {/* Sticky Action Buttons */}
      <View style={styles.stickyActions}>
        <TouchableOpacity style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>Chat with us</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => {
            const phoneNumber = '1234567890';
            Linking.openURL(`tel:${phoneNumber}`).catch((err) => {
              console.error('Error making phone call:', err);
              modal.showError('Unable to make phone call. Please try again.');
            });
          }}
        >
          <Text style={styles.actionBtnText}>Talk with us</Text>
        </TouchableOpacity>
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
      {/* <TabNavigator /> */}
    </SafeAreaView>
  );
}

const { width } = Dimensions.get("window");
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8F7FB" },
  scroll: { padding: 24, paddingBottom: 120 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1.2,
    borderBottomColor: "#eee",
    paddingTop: 50,
  },
  backBtn: { padding: 5 },
  headerTitle: {
    fontSize: 18, fontWeight: "bold", color: "#222",
    textAlign: "center", flex: 1,
  },
  estimatedTimeBox: {
    alignItems: "center",
    marginBottom: 24,
  },
  estimatedHeading: {
    color: "#ED6D4E",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "center",
  },
  estimatedTime: {
    color: "#181818",
    fontSize: 22,
    fontWeight: "bold",
    letterSpacing: 1,
    textAlign: "center",
  },
  // Status Timeline Box
  statusContainer: {
    marginBottom: 16,
  },
  statusHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  horizontalLine: {
    borderBottomColor: "#eee",
    borderBottomWidth: 0,
    marginBottom: 0,
  },
  timelineContainer: { 
    marginVertical: 7, 
    marginBottom: 4 },
  timelineRow: {
    flexDirection: "row",
    minHeight: 60,
    marginBottom: 12,
  },
  timelineIconCol: {
    alignItems: "center",
    width: 36,
  },
  timelineIcon: {
    marginTop: 0,
    opacity: 1,
  },
  iconBold: {
    fontWeight: "bold",
  },
  timelineLine: {
    width: 4,
    height: 38,
    backgroundColor: "#eee",
    borderRadius: 2,
    marginTop: 2,
    marginBottom: 2,
    alignSelf: "center",
  },
  timelineTextCol: {
    flex: 1,
    justifyContent: "center",
    paddingLeft: 12,
    marginTop:-33
  },
  timelineLabel: {
    color: "#999",
    fontSize: 15,
    fontWeight: "600",
  },
  timelineLabelActive: {
    color: "#ED6D4E",
    fontWeight: "bold",
  },
  timelineSubLabel: {
    color: "#888",
    fontSize: 12,
    marginTop: 2,
    fontWeight: "400",
  },
  stickyActions: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
    flexDirection: "row",
    // backgroundColor: "#fff",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 18,
    // borderTopWidth: 1.2,
    borderTopColor: "#eee",
    gap: 20,
    // paddingBottom:80
  },
  actionBtn: {
    flex: 1,
    backgroundColor: "#ED6D4E",
    paddingVertical: 14,
    marginHorizontal: 1,
    borderRadius: 5,
    alignItems: "center",
  },
  actionBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16, letterSpacing: 0.5 },
  cancellationBox: {
    backgroundColor: "#fff",
    borderRadius: 18,
    marginBottom: 16,
    padding: 20,
    elevation: 3,
    shadowColor: "#c9c9c9",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  cancellationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
    marginBottom: 12,
  },
  cancellationReason: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    lineHeight: 20,
  },
  cancellationBy: {
    fontSize: 12,
    color: "#888",
    fontStyle: "italic",
  },
  rescheduleDetails: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#f8f9fa",
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#ED6D4E",
  },
  rescheduleText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  rescheduleReason: {
    fontSize: 11,
    color: "#888",
    marginTop: 4,
    fontStyle: "italic",
  },
  otpSection: {
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
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
  generateOtpButton: {
    backgroundColor: '#FF7A59',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 16,
  },
  generateOtpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  medicalRecordsBox: {
    backgroundColor: "#fff",
    borderRadius: 18,
    marginBottom: 16,
    padding: 20,
    elevation: 3,
    shadowColor: "#c9c9c9",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  medicalRecordsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  medicalRecordsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
    marginLeft: 8,
  },
  prescriptionSection: {
    marginBottom: 16,
  },
  prescriptionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prescriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prescriptionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginLeft: 6,
  },
  documentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    padding: 8,
  },
  viewPrescriptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
  },
  viewPrescriptionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  clinicalNotesSection: {
    marginTop: 8,
  },
  clinicalNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  clinicalNotesLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2196F3",
    marginLeft: 6,
  },
  clinicalNotesContent: {
    backgroundColor: '#F5F9FF',
    padding: 14,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  clinicalNotesText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 22,
  },

  // Appointment Details Section
  appointmentDetailsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailIcon: {
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#222',
    fontWeight: '600',
  },
  statusText: {
    textTransform: 'capitalize',
  },
  prescriptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ED6D4E',
    marginTop: 8,
    gap: 8,
  },
  prescriptionButtonText: {
    fontSize: 15,
    color: '#ED6D4E',
    fontWeight: '600',
    flex: 1,
  },
});

