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
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { RouteProp, useRoute } from "@react-navigation/native";
import AppointmentTreatmentPlan from '../../components/AppointmentTreatmentPlan';
import { isSampleAppointment, getSampleAppointment } from '../../services/sampleAppointment';
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
  updated_at?: string;
  updatedAt?: string;
  completed_at?: string;
  otp_verified_at?: string;
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
  pet_id?: number;
  petid?: number;
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
  const [petRecords, setPetRecords] = useState<any[]>([]);
  const [petRecordsExpanded, setPetRecordsExpanded] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [openingRecord, setOpeningRecord] = useState(false);



  console.log("Timeline : ", id, date, time);

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

