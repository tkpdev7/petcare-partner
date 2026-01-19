import React, { useState } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

interface VetCardProps {
  item: { [key: string]: any };
  style?: any;
  onReschedule?: () => void;
  onCancel?: () => void;
  onPress?: () => void;
  onReview?: () => void;
  onViewPDF?: () => void;
  status?: string;
  showActions?: boolean;
  otp_code?: string;
  prescription_pdf_base64?: string;
}

const AppointmentCard: React.FC<VetCardProps> = ({ item, style, onReschedule, onCancel, onPress, onReview, onViewPDF, status, showActions = true, otp_code, prescription_pdf_base64 }) => {
  const [showDetails, setShowDetails] = useState(false);

  // Determine if actions should be shown based on status
  const canShowActions = showActions && status && ['scheduled', 'confirmed', 'pending', 'rescheduled'].includes(status.toLowerCase());

  // Only allow reschedule if reschedule_count is less than 1 (meaning not rescheduled yet)
  const canReschedule = canShowActions && (!item.reschedule_count || item.reschedule_count < 1);

  // Show review button for completed appointments
  const canShowReview = showActions && status && status.toLowerCase() === 'completed';

  // Show View PDF button for completed appointments with prescription
  const canShowViewPDF = showActions && status && status.toLowerCase() === 'completed' && prescription_pdf_base64;

  // Show OTP for today's active appointments
  const showOTP = otp_code && status && !['completed', 'cancelled', 'no_show'].includes(status.toLowerCase());

  // Check if this is a rescheduled appointment
  const isRescheduled = status?.toLowerCase() === 'rescheduled' || (item.reschedule_count && item.reschedule_count > 0);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Ionicons
        key={i}
        name={i < (item.rating || 0) ? "star" : "star-outline"}
        size={16}
        color={i < (item.rating || 0) ? "#FFD700" : "#ccc"}
      />
    ));
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // console.log("card",item)

  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity
        style={[styles.card, style]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.topSection}>
          {/* Left Image */}
          {item.image && <Image source={getAppointmentTypeIcon(item.image)} style={styles.image} />}

           {/* Right Content */}
           <View style={styles.cardContent}>
             {item.name && <Text style={styles.title}>{item.name}</Text>}
             {item.description && <Text style={styles.description}>Pet : {item.description}</Text>}
             {item.specialization && <Text style={styles.description}>{item.specialization}</Text>}
             {/* Service Name for vet/grooming appointments */}
             {(item.provider_type === 'specialist' || item.provider_type === 'grooming') && item.service_name && (
               <Text style={styles.serviceName}>Service: {item.service_name}</Text>
             )}
             {/* Payment Mode for vet/grooming appointments */}
             {(item.provider_type === 'specialist' || item.provider_type === 'grooming') && item.payment_method && (
               <Text style={styles.paymentMode}>Payment: {item.payment_method}</Text>
             )}
             {/* Star Rating */}
             <View style={styles.ratingContainer}>{renderStars(item.rating)}</View>
           </View>
        </View>

        {/* Full-Width Info Box */}
        <View style={styles.infoContainer}>
          {item.experience !== undefined && <Text style={styles.infoText}>{item.experience} years</Text>}
          {item.distance !== undefined && (
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={16} color="gray" />
              <Text style={styles.infoText}>{item.distance} km</Text>
            </View>
          )}
          {item.fee !== undefined && (
            <View style={styles.infoItem}>
              <Ionicons name="cash-outline" size={16} color="gray" />
              <Text style={styles.infoText}>{item.fee} INR</Text>
            </View>
          )}
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
      
      {showDetails && (

         <View style={styles.viewContent}>
          {/* Reschedule Details */}
          {isRescheduled && item.reschedule_from_date && item.reschedule_from_time && (
            <View style={styles.rescheduleInfoBox}>
              <View style={styles.rescheduleHeader}>
                <Ionicons name="time-outline" size={20} color="#9C27B0" />
                <Text style={styles.rescheduleTitle}>Appointment Rescheduled</Text>
              </View>
              <Text style={styles.rescheduleText}>
                From: {formatDate(item.reschedule_from_date)} at {item.reschedule_from_time}
              </Text>
              <Text style={styles.rescheduleText}>
                To: {formatDate(item.appointment_date)} at {item.appointment_time || item.start_time}
              </Text>
            </View>
          )}

          {/* OTP Display */}
          {showOTP && (
            <View style={styles.otpBox}>
              <View style={styles.otpHeader}>
                <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
                <Text style={styles.otpTitle}>Appointment OTP</Text>
              </View>
              <View style={styles.otpCodeContainer}>
                <Text style={styles.otpCode}>{otp_code}</Text>
              </View>
              <Text style={styles.otpNote}>Share with provider at appointment</Text>
            </View>
          )}

          <TouchableOpacity onPress={()=>router.push(`/appointments/appointmentTimeline?id=${item.id}&date=${item.appointment_date}&time=${item.appointment_time}`)}>
          <View style={styles.appointmentDetailsBox}>
            {/* first row */}
            <View style={styles.appointmentDetailsInfoContainer}>
              <View style={styles.iconWrapper}>
                <Ionicons
                  style={styles.appointmentDetailsBoxIcon}
                  size={24}
                  name="location-outline"
                  color="#ED6D4E"
                />
              </View>
              <View style={styles.detailsTextWrapper}>
                <Text style={styles.detailsTitle}>{item.name}</Text>
                <Text style={styles.detailsSubtitle}>{item.address}</Text>
              </View>
            </View>
            {/* second row */}
            <View style={styles.appointmentDetailsInfoContainer}>
              <View style={styles.iconWrapper}>
                <Ionicons
                  style={styles.appointmentDetailsBoxIcon}
                  size={24}
                  name="time-outline"
                  color="#ED6D4E"
                />
              </View>
              <View style={styles.detailsTextWrapper}>
                <Text style={styles.detailsSubtitle}>
                  {formatDate(item.appointment_date)}, {item.appointment_time || item.start_time}
                </Text>
              </View>
            </View>
          </View>
           </TouchableOpacity>
          {canShowActions && (
            <View style={styles.btnContainer}>
              {canReschedule ? (
                <TouchableOpacity onPress={onReschedule} style={styles.rescheduleBtn}>
                  <Text style={styles.rescheduleBtnText}>Reschedule</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.rescheduleDisabledBtn}>
                  <Text style={styles.rescheduleDisabledText}>Already Rescheduled</Text>
                </View>
              )}
              <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
          {canShowReview && (
            <View style={styles.btnContainer}>
              {canShowViewPDF && (
                <TouchableOpacity onPress={onViewPDF} style={styles.viewPdfBtn}>
                  <Ionicons name="document-text-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.viewPdfBtnText}>View Prescription</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onReview} style={styles.reviewBtn}>
                <Ionicons name="star-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.reviewBtnText}>Write Review</Text>
              </TouchableOpacity>
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
    color: "#000",
  },
  topSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: 18,
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
  ratingContainer: {
    flexDirection: "row",
    marginTop: 4,
  },
  infoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoText: {
    fontSize: 12,
    color: "#444",
    marginLeft: 4,
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
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 10,
  },
  appointmentDetailsInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  iconWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F0F8",
    borderRadius: 20,
    width: 36,
    height: 36,
    marginRight: 8,
  },
  appointmentDetailsBoxIcon: {},
  detailsTextWrapper: {
    flex: 5,
    justifyContent: "center",
    maxWidth: "95%",
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    flexWrap: "wrap",
  },
  detailsSubtitle: {
    fontSize: 12,
    color: "#666",
    flexWrap: "wrap",
  },
  btnContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginTop: 10,
  },
  rescheduleBtn: {
    backgroundColor: "#ED6D4E",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  rescheduleBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },
  reviewBtn: {
    backgroundColor: "#ED6D4E",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginLeft: 8,
  },
  reviewBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },
  viewPdfBtn: {
    backgroundColor: "#4CAF50",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  viewPdfBtnText: {
    color: "#fff",
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
  serviceName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ED6D4E",
    marginTop: 2,
  },
  paymentMode: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
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
  rescheduleDisabledBtn: {
    backgroundColor: "#E0E0E0",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  rescheduleDisabledText: {
    color: "#9E9E9E",
    fontWeight: "bold",
    fontSize: 12,
  },
});

export default AppointmentCard;
