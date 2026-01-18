import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Text,
  Image,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { DrawerActions, useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import PartnerAppointmentCard from "./PartnerAppointmentCard";
import RescheduleModal from "./rescheduleModal";
import CustomModal from '../../components/CustomModal';
import { useCustomModal } from '../../hooks/useCustomModal';
import { viewPDF } from '../../utils/documentViewer';
import apiService from '../../services/apiService';
import SpinningLoader from '../../components/SpinningLoader';

interface AppointmentsScreenProps {
  navigation?: any;
}

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  provider_type: string;
  provider_name?: string;
  service_name?: string;
  pet_name?: string;
  created_at: string;
  start_time: string;
  provider_address: string;
  provider_id: string;
  otp_code?: string;
  service_type?: string;
  prescription_pdf_base64?: string;
  reschedule_count?: number;
  original_date?: string;
  original_time?: string;
  reschedule_from_date?: string;
  reschedule_from_time?: string;
}

const AppointmentsScreen: React.FC<AppointmentsScreenProps> = ({
  navigation: propNavigation,
}) => {
  const navigation = useNavigation();
  const modal = useCustomModal();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<
    "scheduled" | "completed" | "cancelled"
  >("scheduled");
  const [showCancelModal, setShowCancelModal] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");
  const [appointmentToCancel, setAppointmentToCancel] = React.useState<
    string | null
  >(null);
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [rescheduleApptId, setRescheduleApptId] = useState<string | null>(null);
  const [rescheduleProviderId, setRescheduleProviderId] = useState<
    string | null
  >(null);
  const [isVet, setIsVet] = useState<boolean | null>(null);

  const loadAppointments = async () => {
    try {
      const response = await apiService.getAppointments();
      console.log("Full appointments response:", response);

      // API response structure: response.data.data.appointments
      if (response.data && response.data.data && response.data.data.appointments) {
        console.log("Found appointments array:", response.data.data.appointments);
        setAppointments(response.data.data.appointments);
      } else if (response.data && response.data.appointments) {
        console.log("Found appointments at data.appointments:", response.data.appointments);
        setAppointments(response.data.appointments);
      } else if (response.data && Array.isArray(response.data)) {
        console.log("Response data is direct array:", response.data);
        setAppointments(response.data);
      } else {
        console.log("No appointments found in response");
        setAppointments([]);
      }
    } catch (error: any) {
      console.error("Error loading appointments:", error);
      console.error("Error response:", error.response);

      if (
        error.message?.includes("Token expired") ||
        error.response?.status === 403
      ) {
        modal.showError(
          "Your session has expired. Please login again to view your appointments.",
          {
            onPrimaryPress: () => {
              modal.hideModal();
              router.replace("/auth/login");
            }
          }
        );
      } else {
        modal.showError("Failed to load appointments");
      }
      setAppointments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  // Auto-reload appointments when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('📱 Appointments screen focused - reloading appointments');
      loadAppointments();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadAppointments();
  };

  const getAppointmentTypeIcon = (providerType: string) => {
    switch (providerType?.toLowerCase()) {
      case "specialist":
      case "vet":
        return require("../../assets/images/services/vet.png");
      case "partner":
      case "grooming":
        return require("../../assets/images/services/grooming.png");
      case "dogwalker":
        return require("../../assets/images/services/dogwalking.png");
      case "dogsitter":
        return require("../../assets/images/services/DogSitting.png");
      default:
        return require("../../assets/images/services/vet.png");
    }
  };

  const getAppointmentTypeLabel = (providerType: string) => {
    switch (providerType?.toLowerCase()) {
      case "specialist":
        return "Vet";
      case "partner":
        return "Grooming";
      case "dogwalker":
        return "Dog Walking";
      case "dogsitter":
        return "Dog Sitting";
      default:
        return providerType || "Appointment";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
        return "#4CAF50";
      case "rescheduled":
        return "#9C27B0"; // Purple for rescheduled
      case "pending":
        return "#FF9800";
      case "completed":
        return "#2196F3";
      case "cancelled":
        return "#F44336";
      case "missed":
        return "#FF5722";
      default:
        return "#757575";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleAppointmentPress = (appointment: Appointment) => {
    // router.push(`/appointments/appointmentTimeline?id=${item.id}&date=${item.appointment_date}&time=${item.appointment_time}`
    router.push({
      pathname: "/appointments/appointmentTimeline",
      params: {
        id: appointment.id,
        date: appointment.appointment_date,
        time: appointment.appointment_time,
      },
    });
  };

  const handleViewPDF = async (appointment: Appointment) => {
    if (!appointment.prescription_pdf_base64) {
      modal.showError('No prescription PDF available');
      return;
    }

    try {
      await viewPDF(
        appointment.prescription_pdf_base64,
        `prescription_${appointment.id}.pdf`
      );
    } catch (error) {
      console.error('Error viewing PDF:', error);
      modal.showError('Failed to open prescription PDF. Please try again.');
    }
  };

  const handleRescheduleRequest = (
    appointmentId: string,
    providerId: string,
    providerType: string
  ) => {
    setRescheduleApptId(appointmentId);
    setRescheduleProviderId(providerId);
    setIsVet(providerType === "specialist");
    setRescheduleModalVisible(true);
  };

  // const rescheduleAppointment = async (
  //   appointmentId: string,
  //   newDate: string,
  //   newTime: string,
  //   reason: string,
  //   token: string
  // ) => {
  //   try {
  //     const response = await fetch(
  //       `${API_BASE_URL}/appointment/appointments/${appointmentId}/reschedule`,
  //       {
  //         method: "PUT",
  //         headers: {
  //           "Content-Type": "application/json",
  //           Authorization: `Bearer ${token}`,
  //         },
  //         body: JSON.stringify({
  //           newDate: newDate,
  //           newTime: newTime,
  //           reason,
  //         }),
  //       }
  //     );
  //     console.log(response);
  //     if (!response.ok) {
  //       const err = await response.json();
  //       throw new Error(err.message || "Failed to reschedule appointment");
  //     }
  //     const data = await response.json();
  //     console.log("Reschedule success:", data);
  //     // Optionally refresh UI or show success message
  //   } catch (error) {
  //     console.error("Reschedule error:", error);
  //     alert(`Reschedule failed: ${error.message}`);
  //   }
  // };

  const cancelAppointment = async (
    appointmentId: string,
    reason: string,
    token: string
  ) => {
    try {
      const response = await apiService.cancelAppointment(appointmentId, reason);

      if (response.success) {
        console.log("Cancel success:", response.data);
        await loadAppointments();
      } else {
        throw new Error(response.error || 'Failed to cancel appointment');
      }
    } catch (error: any) {
      console.error("Cancel error:", error);
      modal.showError(`Cancellation failed: ${error.message}`);
    }
  };

  // const cancelAppointment = async (
  //   appointmentId: string,
  //   reason: string,
  //   token: string
  // ) => {
  //   try {
  //     console.log(appointmentId,reason,token)
  //     const response = await fetch(
  //       `${API_BASE_URL}/appointments/${appointmentId}/cancel`,
  //       {
  //         method: "PATCH",
  //         headers: {
  //           "Content-Type": "application/json",
  //           Authorization: `Bearer ${token}`,
  //         },
  //         body: JSON.stringify({ reason }),
  //       }
  //     );
  //     console.log("Cancel resp : ",response);
  //     if (!response.ok) {
  //       const err = await response.json();
  //       throw new Error(err.message || "Failed to cancel appointment");
  //     }
  //     const data = await response.json();
  //     console.log("Cancel success:", data);
  //     Alert.alert("Success", "Appointment cancelled successfully.");
  //     // Refresh appointments after successful cancel
  //     await loadAppointments();
  //   } catch (error) {
  //     console.error("Cancel error:", error);
  //     Alert.alert("Error", `Cancellation failed: ${error.message}`);
  //   }
  // };

  const renderAppointmentCard = (appointment: Appointment) => (
    <View key={appointment.id} style={styles.appointmentCard}>
      <PartnerAppointmentCard
        item={{
          id: appointment.id,
          provider_type: appointment.provider_type,
          customerName: appointment.provider_name,
          petName: appointment.pet_name,
          service: appointment.service_name,
          appointment_date: appointment.appointment_date,
          appointment_time: appointment.appointment_time,
          appointmentDate: appointment.appointment_date,
          appointmentTime: appointment.appointment_time,
          start_time: appointment.start_time,
          address: appointment.provider_address,
          service_type: appointment.service_type,
          reschedule_count: appointment.reschedule_count,
          reschedule_from_date: appointment.reschedule_from_date,
          reschedule_from_time: appointment.reschedule_from_time,
        }}
        status={appointment.status}
        showActions={selectedTab === "scheduled" || selectedTab === "completed"}
        otp_code={appointment.otp_code}
        onPress={() => handleAppointmentPress(appointment)}
        onCancel={() => {
          setAppointmentToCancel(appointment.id);
          setShowCancelModal(true);
        }}
      />
    </View>
    // <TouchableOpacity
    //   key={appointment.id}
    //   style={styles.appointmentCard}
    //   onPress={() => handleAppointmentPress(appointment)}
    // >

    //   <View style={styles.cardHeader}>

    //     <Image
    //       source={getAppointmentTypeIcon(appointment.provider_type)}
    //       style={styles.serviceIcon}
    //     />
    //     <View style={styles.appointmentInfo}>
    //       <View style={styles.headerRow}>
    //         <Text style={styles.appointmentType}>
    //           {getAppointmentTypeLabel(appointment.provider_type)}
    //         </Text>
    //         <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
    //           <Text style={styles.statusText}>{appointment.status}</Text>
    //         </View>
    //       </View>
    //       {appointment.provider_name && (
    //         <Text style={styles.providerName}>{appointment.provider_name}</Text>
    //       )}
    //       {appointment.pet_name && (
    //         <Text style={styles.petName}>Pet: {appointment.pet_name}</Text>
    //       )}
    //     </View>
    //   </View>

    //   <View style={styles.appointmentDetails}>
    //     <View style={styles.detailRow}>
    //       <Ionicons name="calendar-outline" size={16} color="#666" />
    //       <Text style={styles.detailText}>{formatDate(appointment.appointment_date)}</Text>
    //     </View>
    //     <View style={styles.detailRow}>
    //       <Ionicons name="time-outline" size={16} color="#666" />
    //       <Text style={styles.detailText}>{appointment.appointment_time || appointment.start_time}</Text>
    //     </View>
    //   </View>

    //   <View style={styles.cardFooter}>
    //     <Ionicons name="chevron-forward-outline" size={20} color="#FF7A59" />
    //   </View>
    // </TouchableOpacity>
  );

  const filteredAppointments = appointments.filter((appointment) => {
    if (!appointment.status) {
      console.log(`Apt ${appointment.id}: FILTERED OUT - no status`);
      return false;
    }

    const status = appointment.status.toLowerCase();

    // Get today's date in YYYY-MM-DD format for comparison
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    // Get appointment date in YYYY-MM-DD format
    const appointmentDateStr = appointment.appointment_date.split("T")[0];

    console.log(
      `Apt ${appointment.id}: status="${status}", date="${appointmentDateStr}", today="${todayStr}"`
    );

    // For scheduled tab, show only future or today's scheduled appointments
    if (selectedTab === "scheduled") {
      const isValidStatus =
        status === "scheduled" ||
        status === "confirmed" ||
        status === "rescheduled" ||
        status === "pending";
      const isFutureOrToday = appointmentDateStr >= todayStr;
      console.log(
        `  -> Scheduled tab: isValidStatus=${isValidStatus}, isFutureOrToday=${isFutureOrToday}, result=${isValidStatus && isFutureOrToday}`
      );
      return isValidStatus && isFutureOrToday;
    }

    // For cancelled tab, show cancelled and no_show appointments
    if (selectedTab === "cancelled") {
      const matches = status === "cancelled" || status === "no_show";
      console.log(`  -> Cancelled tab: matches=${matches}`);
      return matches;
    }

    // For completed tab, show exact status matches
    const matches = status === selectedTab;
    console.log(`  -> Completed tab: status="${status}", selectedTab="${selectedTab}", matches=${matches}`);
    return matches;
  });
  console.log(
    `Selected tab: ${selectedTab}, Total appointments: ${appointments.length}, Filtered: ${filteredAppointments.length}`
  );
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.container}>
        {/* <View style={styles.header}>
          
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="menu" size={24} color="#FF7A00" />
          </TouchableOpacity>
        </View> */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => router.replace('/(tabs)')}
              style={styles.iconButton}
            >
              <Ionicons name="arrow-back" size={24} color="#ED6D4E" />
            </TouchableOpacity>

            <Text style={styles.headerText}>My Appointments</Text>

            <View style={{ width: 30 }} />
          </View>
          {/* Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                selectedTab === "scheduled" && styles.toggleButtonActive,
              ]}
              onPress={() => setSelectedTab("scheduled")}
            >
              <Text
                style={[
                  styles.toggleText,
                  selectedTab === "scheduled" && styles.toggleTextActive,
                ]}
                numberOfLines={1}
                ellipsizeMode="clip"
              >
                Upcoming
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleButton,
                selectedTab === "completed" && styles.toggleButtonActive,
              ]}
              onPress={() => setSelectedTab("completed")}
            >
              <Text
                style={[
                  styles.toggleText,
                  selectedTab === "completed" && styles.toggleTextActive,
                ]}
                numberOfLines={1}
                ellipsizeMode="clip"
              >
                Completed
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleButton,
                selectedTab === "cancelled" && styles.toggleButtonActive,
              ]}
              onPress={() => setSelectedTab("cancelled")}
            >
              <Text
                style={[
                  styles.toggleText,
                  selectedTab === "cancelled" && styles.toggleTextActive,
                ]}
                numberOfLines={1}
                ellipsizeMode="clip"
              >
                Cancelled
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#FF7A59"]}
            />
          }
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <SpinningLoader message="Loading appointments..." />
            </View>
          ) : filteredAppointments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={64} color="#CCCCCC" />
              <Text style={styles.emptyTitle}>No Appointments</Text>
              <Text style={styles.emptyText}>
                You don't have any appointments yet. Appointments from customers will appear here.
              </Text>
            </View>
          ) : (
            // appointments.map(renderAppointmentCard)

            filteredAppointments.map(renderAppointmentCard)
          )}
        </ScrollView>
      </View>
      <Modal
        transparent
        animationType="fade"
        visible={showCancelModal}
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Cancel Appointment</Text>
            <Text>Please provide a reason for cancellation:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter reason"
              multiline
              value={cancelReason}
              onChangeText={setCancelReason}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#ccc" }]}
                onPress={() => {
                  setCancelReason("");
                  setShowCancelModal(false);
                }}
              >
                <Text>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#ED4F32" }]}
                onPress={async () => {
                  if (!cancelReason.trim()) {
                    modal.showError("Please enter a reason to cancel.");
                    return;
                  }
                  const token = await AsyncStorage.getItem("token"); // Adjust async logic accordingly
                  if (appointmentToCancel && token) {
                    await cancelAppointment(
                      appointmentToCancel,
                      cancelReason.trim(),
                      token
                    );
                  }
                  setCancelReason("");
                  setAppointmentToCancel(null);
                  setShowCancelModal(false);
                  modal.showSuccess("Appointment cancelled successfully");
                }}
              >
                <Text style={{ color: "#fff" }}>Confirm Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <RescheduleModal
        visible={rescheduleModalVisible}
        appointmentId={rescheduleApptId ?? ""}
        providerId={rescheduleProviderId ?? ""}
        isVet={isVet ?? false}
        onClose={() => {
          setRescheduleModalVisible(false);
          setIsVet(null);
        }}
        onSuccess={() => {
          /* Optionally refresh appointments, close, update */
          modal.showSuccess("Appointment rescheduled successfully");
          loadAppointments();
        }}
      />
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
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    // paddingHorizontal: 25,
    // paddingTop: 50,
  },
  header: {
    // flexDirection: 'row',
    // justifyContent: 'space-between',
    // alignItems: 'center',
    // marginTop: 10,
    marginBottom: 20,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    paddingTop: 50,
    paddingBottom: 24,
    borderBottomEndRadius: 20,
    borderBottomStartRadius: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // padding: 16,
    // paddingTop: 50,
    paddingBottom: 10,
  },
  iconButton: {
    padding: 8,
  },
  headerText: {
    color: "#070821",
    fontWeight: "700",
    fontSize: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333333",
    textAlign: "center",
    paddingBottom: 30,
  },
  menuButton: {
    padding: 5,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },
  appointmentCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    // shadowColor: '#000',
    // shadowOffset: {
    //   width: 0,
    //   height: 2,
    // },
    // shadowOpacity: 0.1,
    // shadowRadius: 3.84,
    // elevation: 5,
    // borderLeftWidth: 4,
    // borderLeftColor: '#FF7A59',
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  serviceIcon: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentType: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  providerName: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  petName: {
    fontSize: 14,
    color: "#FF7A59",
    fontWeight: "500",
  },
  appointmentDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 6,
  },
  cardFooter: {
    alignItems: "flex-end",
  },
  toggleContainer: {
    flexDirection: "row",
    height: 44,
    borderRadius: 26,
    backgroundColor: "#F5F5F5",
    marginTop: 12,
    marginHorizontal: 8,
    padding: 3,
  },
  toggleButton: {
    flex: 1,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 22,
    paddingHorizontal: 0,
  },
  toggleButtonActive: {
    backgroundColor: "#ED6D4E",
    shadowColor: "rgba(237, 109, 78, 0.3)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleText: {
    color: "#666666",
    fontWeight: "600",
    fontSize: 14,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  toggleTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // Cancel Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  modalInput: {
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 80,
    marginTop: 8,
    marginBottom: 16,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 5,
  },
});

export default AppointmentsScreen;
