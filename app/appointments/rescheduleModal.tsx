import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCurrentApiConfig } from "../../config/api";
import CustomModal from "../../components/CustomModal";
import { useCustomModal } from "../../hooks/useCustomModal";

const API_BASE_URL = getCurrentApiConfig();

const RescheduleModal = ({
  visible,
  onClose,
  appointmentId,
  providerId,
  isVet,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  appointmentId: string;
  providerId: string;
  isVet: boolean;
  onSuccess?: () => void;
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const modal = useCustomModal();

  useEffect(() => {
    AsyncStorage.getItem("token").then(setToken);
  }, []);

  const formatDate = (date: Date): string => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots();
    } else {
      setAvailableSlots([]);
      setSelectedSlot(null);
    }
  }, [selectedDate, providerId]);

  const fetchAvailableSlots = async (): Promise<void> => {
    if (!providerId || !selectedDate) return;

    setLoadingSlots(true);
    try {
      const formattedDate = formatDate(selectedDate);

      // Define response outside so it’s accessible later
      let response: Response;

      if (isVet) {
        response = await fetch(
          `${API_BASE_URL}/appointment/getAvailableSlots?provider_type=specialist&provider_id=${providerId}&date=${formattedDate}`,
          { method: "GET" }
        );
      } else {
        response = await fetch(
          `${API_BASE_URL}/appointment/getAvailableSlots?provider_type=partner&provider_id=${providerId}&date=${formattedDate}`,
          { method: "GET" }
        );
      }

      if (!response.ok) throw new Error("Failed to fetch available slots");

      const data = await response.json();
      setAvailableSlots(data.data || []);
    } catch (err) {
      console.log("Error fetching available slots:", err);
      modal.showError("Failed to fetch available time slots");
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSlotSelect = async (slot: any) => {
    if (!selectedDate || !token) {
      modal.showWarning("Please choose a date before selecting a time slot.", {
        title: "Select Date First"
      });
      return;
    }

    setSelectedSlot(slot);
    setSubmitting(true);

    try {
      const newDate = selectedDate.toISOString().split("T")[0]; // yyyy-mm-dd
      const newTime = slot.start_time;

      const payload = {
        newDate,
        newTime,
        reason: " ", // reason field required in your API
      };

      console.log("Reschedule Request →", payload);

      const response = await fetch(
        `${API_BASE_URL}/appointment/appointments/${appointmentId}/reschedule`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const textResponse = await response.text(); // backend may not always send valid JSON
      console.log("Raw Response:", textResponse);

      // Try parsing JSON if possible
      let data;
      try {
        data = JSON.parse(textResponse);
      } catch {
        data = { message: textResponse };
      }

      if (!response.ok) {
        throw new Error(data?.message || "Failed to reschedule appointment");
      }

      console.log("✅ Reschedule success:", data);
      onSuccess?.();
      onClose?.();
    } catch (error: any) {
      console.log("❌ Reschedule error:", error);
      modal.showError(error.message || "Failed to reschedule");
    } finally {
      setSubmitting(false);
    }
  };

  // const handleSlotSelect = async (slot: any) => {
  //   if (!selectedDate || !token) {
  //     Alert.alert(
  //       "Select Date First",
  //       "Please choose a date before selecting a time slot."
  //     );
  //     return;
  //   }

  //   setSelectedSlot(slot);
  //   setSubmitting(true);

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
  //           newDate: selectedDate.toISOString().slice(0, 10),
  //           newTime: slot.start_time,
  //           reason: "Test",
  //         }),
  //       }
  //     );
  //     console.log(
  //       "Reschedule request:",
  //       `${API_BASE_URL}/appointment/appointments/${appointmentId}/reschedule`,
  //       {
  //         newDate: selectedDate?.toISOString().slice(0, 10),
  //         newTime: slot.start_time,
  //         reason: "test",
  //       }
  //     );

  //     console.log("Response status:", response.status);
  //     const text = await response.text();
  //     console.log("Response text:", text);

  //     console.log(
  //       appointmentId,
  //       selectedDate.toISOString().slice(0, 10),
  //       slot.start_time,
  //       token
  //     );
  //     if (!response.ok) {
  //       const err = await response.json();
  //       throw new Error(err.message || "Failed to reschedule appointment");
  //     }

  //     const data = await response.json();
  //     console.log("Reschedule success:", data);
  //     Alert.alert("Success", "Appointment rescheduled successfully!", [
  //       {
  //         text: "OK",
  //         onPress: () => {
  //           onSuccess && onSuccess();
  //           onClose();
  //         },
  //       },
  //     ]);
  //   } catch (err: any) {
  //     console.log("Reschedule error:", err);
  //     Alert.alert("Error", err.message || "Failed to reschedule");
  //   } finally {
  //     setSubmitting(false);
  //   }
  // };

  const getDates = (): Date[] => {
    const dates: Date[] = [];
    const currentDate = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(currentDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const formatTimeForDisplay = (time: string) =>
    time.length > 5 ? time.slice(0, 5) : time;

  // Check if a slot is in the past
  const isSlotInPast = (slotStartTime: string): boolean => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const selected = selectedDate ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()) : null;

    // Only filter for today's date
    if (!selected || selected.getTime() !== today.getTime()) {
      return false;
    }

    // Parse the slot time (format: "HH:MM:SS" or "HH:MM")
    const [hours, minutes] = slotStartTime.split(':').map(Number);
    const slotTime = new Date();
    slotTime.setHours(hours, minutes, 0, 0);

    return slotTime <= now;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <Text style={styles.sectionTitle}>Reschedule Appointment</Text>

          {/* Scrollable area that auto-expands */}
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Date Selector */}
            <View style={styles.datePickerContainer}>
              <Text style={styles.sectionTitle}>Select Date</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.dateList}
              >
                {getDates().map((date, idx) => {
                  const selected =
                    selectedDate &&
                    date.toDateString() === selectedDate.toDateString();
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.dateItem,
                        selected && styles.selectedDateItem,
                      ]}
                      onPress={() => setSelectedDate(date)}
                    >
                      <Text
                        style={[
                          styles.dayName,
                          selected && styles.selectedDateText,
                        ]}
                      >
                        {
                          ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
                            date.getDay()
                          ]
                        }
                      </Text>
                      <Text
                        style={[
                          styles.dateNumber,
                          selected && styles.selectedDateText,
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                      <Text
                        style={[
                          styles.monthName,
                          selected && styles.selectedDateText,
                        ]}
                      >
                        {date.toLocaleString("default", { month: "short" })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Time Slot Selector */}
            <View style={styles.timeSlotContainer}>
              <Text style={styles.sectionTitle}>Available Time Slots</Text>
              {loadingSlots ? (
                <ActivityIndicator size="small" color="#ED6D4E" />
              ) : availableSlots.length > 0 ? (
                <View style={styles.slotGrid}>
                  {availableSlots.map((slot, idx) => {
                    const selected =
                      selectedSlot?.start_time === slot.start_time;
                    const isPast = isSlotInPast(slot.start_time);
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.timeSlot,
                          selected && styles.selectedTimeSlot,
                          isPast && styles.disabledTimeSlot,
                        ]}
                        onPress={() => !isPast && handleSlotSelect(slot)}
                        disabled={submitting || isPast}
                      >
                        {submitting && selected ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text
                            style={[
                              styles.timeSlotText,
                              selected && styles.selectedTimeSlotText,
                              isPast && styles.disabledTimeSlotText,
                            ]}
                          >
                            {formatTimeForDisplay(slot.start_time)}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text style={{ color: "#999", marginTop: 10 }}>
                  No available slots.
                </Text>
              )}
            </View>
          </ScrollView>

          {/* Cancel button */}
          <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
            <Text style={[styles.actionBtnText, { color: "#ED6D4E" }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
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
        hidePrimaryButton={modal.config.hidePrimaryButton}
        hideSecondaryButton={modal.config.hideSecondaryButton}
        onClose={modal.hideModal}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 14,
    width: "93%",
    maxWidth: 420,
    minHeight: 400,
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 20,
    elevation: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  datePickerContainer: {
    marginBottom: 20,
  },
  dateList: {
    flexDirection: "row",
    marginTop: 10,
  },
  dateItem: {
    width: 70,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f5",
    borderRadius: 10,
    marginRight: 10,
    paddingVertical: 8,
  },
  selectedDateItem: {
    backgroundColor: "#ED6D4E",
  },
  dayName: {
    fontSize: 12,
    color: "#666",
  },
  dateNumber: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 4,
  },
  monthName: {
    fontSize: 12,
    color: "#666",
  },
  selectedDateText: {
    color: "#fff",
  },
  timeSlotContainer: {
    marginTop: 10,
  },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  timeSlot: {
    width: "30%",
    backgroundColor: "#f0f0f5",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    margin: "1.65%",
  },
  selectedTimeSlot: {
    backgroundColor: "#ED6D4E",
  },
  disabledTimeSlot: {
    backgroundColor: "#e0e0e0",
    opacity: 0.5,
  },
  timeSlotText: {
    fontWeight: "500",
  },
  selectedTimeSlotText: {
    color: "#fff",
  },
  disabledTimeSlotText: {
    color: "#999",
  },
  actionBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
    letterSpacing: 0.7,
  },
  modalCancelBtn: {
    alignItems: "center",
    paddingVertical: 10,
    marginTop: 10,
  },
});

export default RescheduleModal;
