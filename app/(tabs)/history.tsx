import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import AppHeader from '../../components/AppHeader';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/Colors';
import apiService from '../../services/apiService';
import CustomModal from '../../components/CustomModal';
import { useCustomModal } from '../../hooks/useCustomModal';
import { viewPDF } from '../../utils/pdfViewer';

interface HistoryItem {
  id: string;
  customerName: string;
  petName: string;
  service: string;
  appointmentDate: string;
  appointmentTime: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  totalAmount: number;
  rating?: number;
  review?: string;
  notes?: string;
  petSpecies?: string;
  petBreed?: string;
  customerPhone?: string;
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  prescription_data?: Array<{
    drug_name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }> | null;
  clinical_notes?: string | null;
  prescription_pdf_base64?: string | null;
}

export default function HistoryScreen() {
  const modal = useCustomModal();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [partnerData, setPartnerData] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'>('pending');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<HistoryItem | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [appointmentToCancel, setAppointmentToCancel] = useState<HistoryItem | null>(null);

  // OTP and follow-up states
  const [otpCode, setOtpCode] = useState('');
  const [otpVerifiedInSession, setOtpVerifiedInSession] = useState(false);
  const [isFollowUpSelected, setIsFollowUpSelected] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [showSlotPicker, setShowSlotPicker] = useState(false);

  // Prescription and clinical notes states (for vet appointments)
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [prescriptions, setPrescriptions] = useState<Array<{
    drug_name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>>([{ drug_name: '', dosage: '', frequency: '', duration: '' }]);
  const [showFrequencyPicker, setShowFrequencyPicker] = useState<number | null>(null);
  const [showDurationPicker, setShowDurationPicker] = useState<number | null>(null);

  const frequencyOptions = ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'As needed', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours'];
  const durationOptions = ['1 day', '3 days', '5 days', '7 days', '10 days', '14 days', '21 days', '30 days', 'Until finished'];

  // Determine if this partner type should show orders (pharmacy & essentials) or appointments (vet & grooming)
  const showOrders = partnerData?.serviceType === 'pharmacy' || partnerData?.serviceType === 'essentials';

  // Check if this is a vet appointment (not grooming)
  const isVetAppointment = !showOrders && partnerData?.serviceType === 'vet';

  useEffect(() => {
    loadPartnerData();
  }, []);

  // Update filter default based on partner type
  useEffect(() => {
    if (partnerData) {
      // Set default to 'pending' for both orders and appointments
      setFilter('pending');
    }
  }, [partnerData]);

  useEffect(() => {
    if (partnerData) {
      loadHistory();
    }
  }, [partnerData, filter]);

  // Auto-refresh appointments when tab comes into focus
  useFocusEffect(
    useCallback(() => {
      if (partnerData) {
        console.log('History tab focused - refreshing appointments...');
        loadHistory();
      }
    }, [partnerData, filter])
  );

  const loadPartnerData = async () => {
    try {
      const data = await AsyncStorage.getItem('partnerData');
      if (data) {
        setPartnerData(JSON.parse(data));
      }
    } catch (error) {
      console.error('Error loading partner data:', error);
    }
  };

  const loadHistory = async () => {
    try {
      if (!partnerData) return;

      setLoading(true);
      // Check if partner type should show orders (pharmacy & essentials) or appointments (vet & grooming)
      const showOrders = partnerData?.serviceType === 'pharmacy' || partnerData?.serviceType === 'essentials';

      let response;
      if (showOrders) {
        // Load orders for pharmacy & essentials partners
        response = await apiService.getOrders({
          status: filter === 'all' ? undefined : filter,
          limit: 50
        });
      } else {
        // Load appointments for vet & grooming service providers
        response = await apiService.getAppointments({
          status: filter === 'all' ? undefined : filter,
          limit: 50
        });
      }

      if (response.success && response.data) {
        const items = showOrders
          ? response.data.data?.orders || response.data.orders || []
          : response.data.appointments || response.data.data?.appointments || [];

        // LOG: Debug API response
        console.log('=== PARTNER HISTORY SCREEN DEBUG ===');
        console.log('Show Orders:', showOrders);
        console.log('API Response:', JSON.stringify(response, null, 2));
        console.log('Items found:', items.length);
        if (items.length > 0) {
          console.log('Sample item:', JSON.stringify(items[0], null, 2));
        }

        // Transform API data to match our interface
        const transformedHistory = items.map((item: any) => {
          // Parse order_items if it's a string (for product orders)
          let orderItems = [];
          let productNames = '';
          if (item.order_items) {
            try {
              orderItems = typeof item.order_items === 'string'
                ? JSON.parse(item.order_items)
                : item.order_items;

              // Get product names from order items
              productNames = orderItems
                .map((orderItem: any) => orderItem.product_name || orderItem.name)
                .filter(Boolean)
                .join(', ');
            } catch (e) {
              console.error('Error parsing order_items:', e);
            }
          }

          return {
            id: String(item.id), // Ensure id is always a string
            customerName: item.customer_name || item.customerName || item.customer?.name || 'Unknown Customer',
            petName: item.petName || item.pet?.name || item.pet_name || 'N/A',
            service: productNames || item.service || item.productName || item.serviceName || `${partnerData?.serviceType || 'Service'}`,
            appointmentDate: (item.order_date || item.appointmentDate || item.orderDate || item.created_at || item.createdAt || new Date().toISOString()).split('T')[0],
            appointmentTime: item.appointmentTime || item.orderTime || new Date(item.order_date || item.created_at || new Date()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
            status: item.order_status || item.status || 'pending',
            totalAmount: parseFloat(item.total_amount || item.totalAmount || item.amount || item.price || 0),
            rating: item.rating,
            review: item.review,
            notes: item.notes || '',
            petSpecies: item.petSpecies || item.pet?.species,
            petBreed: item.petBreed || item.pet?.breed,
            customerPhone: item.customer_phone || item.customerPhone || item.customer?.phone,
            cancellationReason: item.cancellationReason || item.cancellation_reason,
            cancelledBy: item.cancelledBy || item.cancelled_by,
            cancelledAt: item.cancelledAt || item.cancelled_at,
            // Prescription and clinical data
            prescription_data: item.prescription_data || null,
            clinical_notes: item.clinical_notes || null,
            prescription_pdf_base64: item.prescription_pdf_base64 || null,
          };
        });

        console.log('Transformed history:', JSON.stringify(transformedHistory, null, 2));

        setHistory(transformedHistory);
      } else {
        // Show empty state if no data
        setHistory([]);
      }
    } catch (error) {
      console.error('Error loading history:', error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const filteredHistory = history.filter(item => {
    if (filter === 'all') return true;

    // Map filter to actual statuses
    if (filter === 'pending') {
      // "New/Upcoming" - For appointments: scheduled, confirmed, in_progress
      // For product orders: placed, confirmed, processing, packed, shipped, out_for_delivery
      return ['pending', 'scheduled', 'confirmed', 'placed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'in_progress'].includes(item.status);
    } else if (filter === 'completed') {
      // "Completed" - includes delivered and completed
      return ['completed', 'delivered'].includes(item.status);
    } else if (filter === 'cancelled') {
      // "Cancelled" - includes cancelled and returned
      return ['cancelled', 'returned', 'no_show'].includes(item.status);
    }

    // Exact match for other statuses
    return item.status === filter;
  });

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const openCompletionModal = (appointment: HistoryItem) => {
    setSelectedAppointment(appointment);
    setShowCompletionModal(true);
    setOtpCode('');
    setIsFollowUpSelected(false);
    setPrescriptions([{ drug_name: '', dosage: '', frequency: '', duration: '' }]);
    setClinicalNotes('');
    setFollowUpDate('');
    setFollowUpTime('');
    setAvailableSlots([]);
    setShowSlotPicker(false);
    // Check if appointment is already in_progress (OTP already verified)
    setOtpVerifiedInSession(appointment.status === 'in_progress');
  };

  // Check if a slot is in the past
  const isSlotInPast = (slotStartTime: string, selectedDate: string): boolean => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);

    // Only filter for today's date
    if (selected.getTime() !== today.getTime()) {
      return false;
    }

    // Parse the slot time (format: "HH:MM:SS" or "HH:MM")
    const [hours, minutes] = slotStartTime.split(':').map(Number);
    const slotTime = new Date();
    slotTime.setHours(hours, minutes, 0, 0);

    return slotTime <= now;
  };

  const verifyOtp = async () => {
    if (!selectedAppointment || !otpCode.trim()) {
      modal.showError('Please enter the 4-digit OTP code');
      return;
    }

    try {
      console.log('=== VERIFYING OTP ===');
      console.log('Appointment ID:', selectedAppointment.id);
      console.log('OTP Code:', otpCode.trim());

      const response = await apiService.verifyOTP(selectedAppointment.id, otpCode.trim());

      console.log('OTP Verification Response:', JSON.stringify(response, null, 2));

      if (response.success) {
        // Update local state to mark appointment as in_progress
        setHistory(prevHistory =>
          prevHistory.map(item =>
            item.id === selectedAppointment.id
              ? { ...item, status: 'in_progress' as const }
              : item
          )
        );

        // Mark OTP as verified in this session and show completion form
        setOtpVerifiedInSession(true);

        // Update selected appointment status
        setSelectedAppointment({...selectedAppointment, status: 'in_progress'});

        modal.showSuccess('OTP verified successfully! Appointment started. Please complete the appointment details below.');
      } else {
        const errorMessage = response.error || response.message || 'Failed to verify OTP';

        if (errorMessage.toLowerCase().includes('invalid otp')) {
          modal.showError('The OTP you entered does not match. Please verify the 4-digit code shown on the customer\'s app and try again.', {
            title: 'Invalid OTP',
            onClose: () => setOtpCode('')
          });
        } else if (errorMessage.toLowerCase().includes('otp expired')) {
          modal.showError('The OTP has expired. Please ask the customer to generate a new OTP.', {
            title: 'OTP Expired'
          });
        } else if (errorMessage.toLowerCase().includes('otp not generated')) {
          modal.showError('No OTP has been generated for this appointment. Please ask the customer to generate an OTP from their app.', {
            title: 'OTP Not Available'
          });
        } else {
          modal.showError(errorMessage);
        }
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      console.error('Error response:', JSON.stringify(error.response?.data, null, 2));

      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'An error occurred while verifying OTP';

      if (errorMessage.toLowerCase().includes('invalid otp')) {
        modal.showError('The OTP you entered does not match. Please verify the 4-digit code shown on the customer\'s app and try again.', {
          title: 'Invalid OTP',
          onClose: () => setOtpCode('')
        });
      } else if (errorMessage.toLowerCase().includes('otp expired')) {
        modal.showError('The OTP has expired. Please ask the customer to generate a new OTP.', {
          title: 'OTP Expired'
        });
      } else if (errorMessage.toLowerCase().includes('otp already verified')) {
        modal.showError('This appointment has already been verified. You can proceed to complete it.', {
          title: 'Already Verified'
        });
      } else if (errorMessage.toLowerCase().includes('otp not generated')) {
        modal.showError('No OTP has been generated for this appointment. Please ask the customer to generate an OTP from their app.', {
          title: 'OTP Not Available'
        });
      } else {
        modal.showError(errorMessage);
      }
    }
  };

  const loadAvailableSlots = async (date: string) => {
    if (!selectedAppointment || !partnerData) return;

    setLoadingSlots(true);
    try {
      console.log('=== LOADING FOLLOW-UP SLOTS ===');
      console.log('Partner ID:', partnerData.id);
      console.log('Date:', date);
      console.log('Provider Type: partner');

      const response = await apiService.getAvailableSlotsForFollowup({
        provider_type: 'partner',
        provider_id: partnerData.id.toString(),
        date: date
      });

      console.log('Slots API Response:', JSON.stringify(response, null, 2));

      if (response.success) {
        // Handle nested data structure (response.data.data)
        const slotsArray = response.data?.data || response.data || [];

        console.log(`Found ${slotsArray.length} available slots`);
        setAvailableSlots(slotsArray);

        if (slotsArray.length === 0) {
          modal.showWarning(response.message || 'No time slots are available for the selected date. Please choose a different date or check your slot settings.', {
            title: 'No Slots Available'
          });
        }
      } else {
        console.error('Slots API Error:', response);
        setAvailableSlots([]);
        modal.showError(response.message || 'Failed to load available time slots');
      }
    } catch (error) {
      console.error('Error loading slots:', error);
      setAvailableSlots([]);
      modal.showError('Failed to load available time slots. Please try again.');
    } finally {
      setLoadingSlots(false);
    }
  };


  const markAsCompleted = async () => {
    if (!selectedAppointment) return;

    try {
      let response;
      if (showOrders) {
        // Update order status (product or pharmacy)
        response = await apiService.updateOrderStatus(
          selectedAppointment.id,
          'product', // Assuming product order for essentials partners
          'delivered', // Mark as delivered for product orders
          ''
        );
      } else {
        // Complete appointment (OTP already verified in previous step)
        const completionData: any = {
          notes: 'Appointment completed'
        };

        // Add prescription data and clinical notes (for all service appointments)
        // Filter out empty prescriptions
        const validPrescriptions = prescriptions.filter(p =>
          p.drug_name.trim() || p.dosage.trim() || p.frequency || p.duration
        );

        if (validPrescriptions.length > 0) {
          completionData.prescription_data = validPrescriptions;
          console.log('📋 Including prescription data:', validPrescriptions);
        }

        if (clinicalNotes.trim()) {
          completionData.clinical_notes = clinicalNotes.trim();
        }

        if (isFollowUpSelected && followUpDate && followUpTime) {
          completionData.follow_up_date = followUpDate;
          completionData.follow_up_time = followUpTime;
        }

        console.log('=== COMPLETING APPOINTMENT ===');
        console.log('Appointment ID:', selectedAppointment.id);
        console.log('Completion Data:', JSON.stringify(completionData, null, 2));

        response = await apiService.completeAppointmentWithFollowup(
          selectedAppointment.id,
          completionData
        );

        console.log('Completion Response:', JSON.stringify(response, null, 2));
      }

      if (response.success) {
        // Update the local state
        setHistory(prevHistory =>
          prevHistory.map(item =>
            item.id === selectedAppointment.id
              ? { ...item, status: showOrders ? 'delivered' as const : 'completed' as const }
              : item
          )
        );

        setShowCompletionModal(false);
        setSelectedAppointment(null);
        setIsFollowUpSelected(false);
        setFollowUpDate('');
        setFollowUpTime('');
        setAvailableSlots([]);
        setShowSlotPicker(false);

        // Refresh the appointments list to show new follow-up appointment
        await loadHistory();

        modal.showSuccess(
          isFollowUpSelected
            ? `${showOrders ? 'Order' : 'Appointment'} completed and follow-up appointment scheduled successfully!`
            : `${showOrders ? 'Order' : 'Appointment'} marked as ${showOrders ? 'delivered' : 'completed'} successfully!`
        );
      } else {
        // Handle failed response (success: false)
        const errorMessage = response.error || response.message || response.data?.error || `Failed to update ${showOrders ? 'order' : 'appointment'} status`;

        if (errorMessage.toLowerCase().includes('slot') && errorMessage.toLowerCase().includes('not available')) {
          modal.showError('The selected follow-up time slot is no longer available. Please choose a different time.', {
            title: 'Time Slot Unavailable'
          });
        } else {
          modal.showError(errorMessage);
        }
      }
    } catch (error: any) {
      console.error(`Error updating ${showOrders ? 'order' : 'appointment'} status:`, error);
      console.error('Error response:', JSON.stringify(error.response?.data, null, 2));

      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || `An error occurred while updating ${showOrders ? 'order' : 'appointment'} status`;
      modal.showError(errorMessage);
    }
  };

  const cancelAppointment = async () => {
    if (!appointmentToCancel || !cancelReason.trim()) {
      modal.showError('Please provide a cancellation reason');
      return;
    }

    try {
      const response = await apiService.cancelAppointment(
        appointmentToCancel.id,
        cancelReason.trim()
      );

      if (response.success) {
        // Update the local state
        setHistory(prevHistory =>
          prevHistory.map(item =>
            item.id === appointmentToCancel.id
              ? { ...item, status: 'cancelled' as const, cancellationReason: cancelReason.trim(), cancelledBy: 'provider' }
              : item
          )
        );

        setShowCancelModal(false);
        setAppointmentToCancel(null);
        setCancelReason('');

        modal.showSuccess('Appointment cancelled successfully!');
      } else {
        modal.showError(response.message || 'Failed to cancel appointment');
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      modal.showError('An error occurred while cancelling the appointment');
    }
  };

  const openDetailsModal = (appointment: HistoryItem) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'placed': return Colors.warning;
      case 'confirmed': return Colors.info || '#2196F3';
      case 'in_progress':
      case 'processing':
      case 'packed': return Colors.secondary || '#FF9800';
      case 'shipped':
      case 'out_for_delivery': return '#2196F3';
      case 'completed':
      case 'delivered': return Colors.success;
      case 'cancelled':
      case 'returned': return Colors.error || '#F44336';
      case 'no_show': return Colors.textTertiary;
      default: return Colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    // For product orders, show simplified status for partners
    if (showOrders) {
      // Map all "new/in-progress" statuses to "Pending" for partners
      if (['pending', 'placed', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery'].includes(status)) {
        return 'Pending';
      }
      // Map delivered/completed to "Delivered" for partners
      if (['completed', 'delivered'].includes(status)) {
        return 'Delivered';
      }
      // Keep cancelled/returned as is
      if (['cancelled', 'returned'].includes(status)) {
        return 'Cancelled';
      }
    }

    // For appointments, show detailed status
    switch (status) {
      case 'pending': return 'Pending';
      case 'placed': return 'Order Placed';
      case 'confirmed': return 'Confirmed';
      case 'in_progress': return 'In Progress';
      case 'processing': return 'Processing';
      case 'packed': return 'Packed';
      case 'shipped': return 'Shipped';
      case 'out_for_delivery': return 'Out for Delivery';
      case 'completed': return 'Completed';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      case 'returned': return 'Returned';
      case 'no_show': return 'No Show';
      default: return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
    }
  };

  // Prescription management functions
  const addPrescription = () => {
    setPrescriptions([...prescriptions, { drug_name: '', dosage: '', frequency: '', duration: '' }]);
  };

  const removePrescription = (index: number) => {
    if (prescriptions.length > 1) {
      const updated = prescriptions.filter((_, i) => i !== index);
      setPrescriptions(updated);
    }
  };

  const updatePrescription = (index: number, field: keyof typeof prescriptions[0], value: string) => {
    const updated = [...prescriptions];
    updated[index][field] = value;
    setPrescriptions(updated);
  };

  // PDF viewing function
  const handleViewPDF = async () => {
    if (!selectedAppointment?.prescription_pdf_base64) {
      modal.showError('No prescription PDF available');
      return;
    }

    try {
      await viewPDF(
        selectedAppointment.prescription_pdf_base64,
        `prescription_${selectedAppointment.id}.pdf`
      );
    } catch (error) {
      console.error('Error viewing PDF:', error);
      modal.showError('Failed to open prescription PDF. Please try again.');
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Ionicons
        key={index}
        name={index < rating ? "star" : "star-outline"}
        size={16}
        color={index < rating ? "#FFD700" : "#DDD"}
      />
    ));
  };

  const renderHistoryCard = ({ item }: { item: HistoryItem }) => {
    const isExpanded = expandedItems.has(item.id);
    const isPending = !['completed', 'delivered', 'cancelled', 'returned', 'no_show'].includes(item.status);

    return (
      <TouchableOpacity
        style={styles.historyCard}
        onPress={() => {
          if (showOrders) {
            // For product orders, always open details modal
            openDetailsModal(item);
          } else if (isPending) {
            // For pending/in_progress appointments, open completion modal (handles OTP + completion)
            openCompletionModal(item);
          } else {
            // For completed/cancelled appointments, open details modal
            openDetailsModal(item);
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <Text style={styles.orderNumber}>Order#{String(item.id).padStart(3, '0')}</Text>
          <View style={styles.expandButton}>
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color={Colors.textSecondary}
            />
          </View>
        </View>
        
        <Text style={styles.productInfo}>{showOrders ? 'Product' : 'Service'} : {item.service}</Text>
        {showOrders ? (
          <>
            <Text style={styles.appointmentInfo}>Customer: {item.customerName}</Text>
            <Text style={styles.totalInfo}>Total ₹{item.totalAmount}</Text>
          </>
        ) : (
          <>
            <Text style={styles.appointmentInfo}>Customer: {item.customerName}</Text>
            {item.petName !== 'N/A' && (
              <Text style={styles.appointmentInfo}>Pet: {item.petName}</Text>
            )}
            <Text style={styles.appointmentInfo}>Date: {item.appointmentDate}</Text>
            <Text style={styles.appointmentInfo}>Time: {item.appointmentTime}</Text>
            <Text style={styles.totalInfo}>Amount: ₹{item.totalAmount}</Text>
          </>
        )}
        
        <View style={styles.orderFooter}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            Status: {getStatusText(item.status)}
          </Text>
          <View style={styles.actionButtons}>
            {/* Show only cancel button for pending appointments */}
            {isPending && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={(e) => {
                  e.stopPropagation(); // Prevent card click
                  setAppointmentToCancel(item);
                  setCancelReason('');
                  setShowCancelModal(true);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>Order Details</Text>
              <View style={styles.detailRow}>
                <Ionicons name="medical-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.detailText}>Service: {item.service}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.detailText}>Date: {item.appointmentDate} at {item.appointmentTime}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="cash-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.detailText}>Amount: ₹{item.totalAmount}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="person-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.detailText}>Customer: {item.customerName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="paw-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.detailText}>Pet: {item.petName}{item.petSpecies ? ` (${item.petSpecies})` : ''}</Text>
              </View>
              {item.petBreed && (
                <View style={styles.detailRow}>
                  <Ionicons name="information-circle-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.detailText}>Breed: {item.petBreed}</Text>
                </View>
              )}
              {item.customerPhone && (
                <View style={styles.detailRow}>
                  <Ionicons name="call-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.detailText}>Phone: {item.customerPhone}</Text>
                </View>
              )}
              {item.notes && (
                <View style={styles.detailRow}>
                  <Ionicons name="document-text-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.detailText}>Notes: {item.notes}</Text>
                </View>
              )}
            </View>

            {item.status === 'completed' && item.rating && (
              <View style={styles.reviewSection}>
                <Text style={styles.sectionTitle}>Customer Review</Text>
                <View style={styles.ratingRow}>
                  <View style={styles.starsContainer}>
                    {renderStars(item.rating)}
                  </View>
                  <Text style={styles.ratingText}>{item.rating}/5</Text>
                </View>
                {item.review && (
                  <Text style={styles.reviewText}>"{item.review}"</Text>
                )}
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };


  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title={showOrders ? 'My Orders' : 'My Appointments'} showBackButton={false} />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={showOrders ? 'Search for Products' : 'Search for Appointments'}
            placeholderTextColor={Colors.textSecondary}
            maxLength={50}
            onChangeText={(text) => {
              // Basic validation for search input
              if (text.length > 0 && text.length < 2) {
                return; // Don't search for single characters
              }
              // Add search logic here when needed
            }}
          />
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statsCard}>
          <Text style={styles.statsNumber}>{filteredHistory.length}</Text>
          <Text style={styles.statsLabel}>Total {showOrders ? 'Orders' : 'Appointments'}</Text>
        </View>
        <View style={styles.statsCard}>
          <Text style={styles.statsNumber}>{filteredHistory.filter(item => item.status === 'completed').length}</Text>
          <Text style={styles.statsLabel}>Completed</Text>
        </View>
      </View>

      {/* Status Filter Tabs */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, filter === 'pending' && styles.toggleButtonActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.toggleText, filter === 'pending' && styles.toggleTextActive]}>
            {showOrders ? 'New' : 'Upcoming'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, filter === 'completed' && styles.toggleButtonActive]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.toggleText, filter === 'completed' && styles.toggleTextActive]}>Completed</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, filter === 'cancelled' && styles.toggleButtonActive]}
          onPress={() => setFilter('cancelled')}
        >
          <Text style={[styles.toggleText, filter === 'cancelled' && styles.toggleTextActive]}>Cancelled</Text>
        </TouchableOpacity>
      </View>

      {/* Orders Count */}
      <View style={styles.ordersInfo}>
        <Text style={styles.ordersCount}>{filteredHistory.length} {showOrders ? 'Orders' : 'Appointments'} Found</Text>
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : filteredHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={64} color={Colors.textTertiary} />
            <Text style={styles.emptyStateText}>No {showOrders ? 'orders' : 'appointments'} found</Text>
            <Text style={styles.emptyStateSubtext}>
              {filter === 'pending' && `No upcoming ${showOrders ? 'orders' : 'appointments'} found`}
              {filter === 'completed' && `No completed ${showOrders ? 'orders' : 'appointments'} found`}
              {filter === 'cancelled' && `No cancelled ${showOrders ? 'orders' : 'appointments'} found`}
              {!['pending', 'completed', 'cancelled'].includes(filter) && `No ${filter} ${showOrders ? 'orders' : 'appointments'} found`}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredHistory}
            renderItem={renderHistoryCard}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.historyList}
          />
        )}
      </View>

      {/* Appointment Details Modal */}
      <Modal
        visible={showDetailsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{showOrders ? 'Order Details' : 'Appointment Details'}</Text>
              <TouchableOpacity
                onPress={() => setShowDetailsModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedAppointment && (
              <View style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{showOrders ? 'Order ID:' : 'Appointment ID:'}</Text>
                  <Text style={styles.detailValue}>#{String(selectedAppointment.id).padStart(3, '0')}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Customer:</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.customerName}</Text>
                </View>
                {!showOrders && selectedAppointment.petName !== 'N/A' && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Pet:</Text>
                    <Text style={styles.detailValue}>{selectedAppointment.petName}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{showOrders ? 'Product:' : 'Service:'}</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.service}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date & Time:</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.appointmentDate} at {selectedAppointment.appointmentTime}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <Text style={[styles.detailValue, { color: getStatusColor(selectedAppointment.status) }]}>
                    {getStatusText(selectedAppointment.status)}
                  </Text>
                </View>
                {selectedAppointment.status === 'cancelled' && selectedAppointment.cancellationReason && (
                  <View style={styles.detailColumn}>
                    <Text style={styles.detailLabel}>Cancellation Reason:</Text>
                    <Text style={styles.detailValue}>{selectedAppointment.cancellationReason}</Text>
                    <Text style={styles.detailSubtext}>
                      Cancelled by {selectedAppointment.cancelledBy === 'user' ? 'Customer' :
                                   selectedAppointment.cancelledBy === 'provider' ? 'You (Provider)' : 'System'}
                    </Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{showOrders ? 'Amount:' : 'Charge:'}</Text>
                  <Text style={styles.detailValue}>₹{selectedAppointment.totalAmount}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone:</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.customerPhone}</Text>
                </View>
                {selectedAppointment.notes && (
                  <View style={styles.detailColumn}>
                    <Text style={styles.detailLabel}>Notes:</Text>
                    <Text style={styles.detailValue}>{selectedAppointment.notes}</Text>
                  </View>
                )}

                {/* Prescription Data - Show for completed appointments */}
                {selectedAppointment.status === 'completed' && selectedAppointment.prescription_data && (
                  <View style={styles.detailColumn}>
                    <Text style={styles.detailLabel}>Prescription ({selectedAppointment.prescription_data.length} medicine{selectedAppointment.prescription_data.length !== 1 ? 's' : ''}):</Text>
                    {selectedAppointment.prescription_data.map((med: any, index: number) => (
                      <View key={index} style={styles.prescriptionDetailCard}>
                        <Text style={styles.prescriptionDetailNumber}>{index + 1}. {med.drug_name}</Text>
                        <Text style={styles.prescriptionDetailText}>Dosage: {med.dosage}</Text>
                        <Text style={styles.prescriptionDetailText}>Frequency: {med.frequency}</Text>
                        <Text style={styles.prescriptionDetailText}>Duration: {med.duration}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Clinical Notes - Show for completed appointments */}
                {selectedAppointment.status === 'completed' && selectedAppointment.clinical_notes && (
                  <View style={styles.detailColumn}>
                    <Text style={styles.detailLabel}>Clinical Notes:</Text>
                    <Text style={styles.detailValue}>{selectedAppointment.clinical_notes}</Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.modalFooter}>
              {/* View PDF button for completed appointments with prescription */}
              {selectedAppointment?.status === 'completed' &&
               selectedAppointment?.prescription_pdf_base64 && (
                <TouchableOpacity
                  style={styles.viewPdfButton}
                  onPress={handleViewPDF}
                >
                  <Ionicons name="document-text-outline" size={20} color={Colors.white} />
                  <Text style={styles.viewPdfButtonText}>View Prescription PDF</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowDetailsModal(false)}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Completion Modal (with OTP verification step) */}
      <Modal
        visible={showCompletionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCompletionModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {showOrders ? 'Complete Order' :
                   !otpVerifiedInSession ? 'Verify OTP to Start' : 'Complete Appointment'}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowCompletionModal(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollView}>
                <View style={styles.modalBody}>
              {/* Step 1: OTP Verification (only if not yet verified) */}
              {!showOrders && !otpVerifiedInSession && (
                <>
                  <Text style={styles.modalDescription}>
                    Please ask the customer to share the 4-digit OTP displayed on their app to verify and start the appointment:
                  </Text>
                  <TextInput
                    style={styles.otpInput}
                    placeholder="Enter 4-digit OTP"
                    value={otpCode}
                    onChangeText={(text) => setOtpCode(text.replace(/[^0-9]/g, '').substring(0, 4))}
                    keyboardType="numeric"
                    maxLength={4}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </>
              )}

              {/* Step 2: Completion Form (only if OTP verified) */}
              {!showOrders && otpVerifiedInSession && (
                <>
                  {/* Prescription Form and Clinical Notes (For All Service Appointments) */}
                  <Text style={styles.vetSectionTitle}>Medical Documentation</Text>

                  {/* Clinical Notes */}
                  <Text style={styles.modalDescription}>
                    Clinical Notes (Optional):
                  </Text>
                  <TextInput
                    style={styles.treatmentInput}
                    placeholder="Enter clinical observations, diagnosis, vital signs, etc."
                    value={clinicalNotes}
                    onChangeText={setClinicalNotes}
                    multiline
                    numberOfLines={4}
                    maxLength={500}
                    textAlignVertical="top"
                  />
                  <Text style={styles.characterCount}>{clinicalNotes.length}/500</Text>

                  {/* Prescription Form */}
                  <Text style={[styles.modalDescription, { marginTop: Spacing.lg }]}>
                    Prescription Details (Optional):
                  </Text>

                  {prescriptions.map((prescription, index) => (
                    <View key={index} style={styles.prescriptionItem}>
                      <View style={styles.prescriptionHeader}>
                        <Text style={styles.prescriptionNumber}>Medicine {index + 1}</Text>
                        {prescriptions.length > 1 && (
                          <TouchableOpacity onPress={() => removePrescription(index)}>
                            <Ionicons name="trash-outline" size={20} color={Colors.error} />
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Drug Name */}
                      <TextInput
                        style={styles.prescriptionInput}
                        placeholder="Drug name"
                        value={prescription.drug_name}
                        onChangeText={(text) => updatePrescription(index, 'drug_name', text)}
                      />

                      {/* Dosage */}
                      <TextInput
                        style={styles.prescriptionInput}
                        placeholder="Dosage"
                        value={prescription.dosage}
                        onChangeText={(text) => updatePrescription(index, 'dosage', text)}
                      />

                      {/* Frequency Dropdown */}
                      <TouchableOpacity
                        style={styles.dropdownButton}
                        onPress={() => setShowFrequencyPicker(showFrequencyPicker === index ? null : index)}
                      >
                        <Text style={prescription.frequency ? styles.dropdownButtonTextSelected : styles.dropdownButtonText}>
                          {prescription.frequency || 'Frequency'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
                      </TouchableOpacity>
                      {showFrequencyPicker === index && (
                        <View style={styles.dropdownList}>
                          {frequencyOptions.map((option) => (
                            <TouchableOpacity
                              key={option}
                              style={styles.dropdownOption}
                              onPress={() => {
                                updatePrescription(index, 'frequency', option);
                                setShowFrequencyPicker(null);
                              }}
                            >
                              <Text style={styles.dropdownOptionText}>{option}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {/* Duration Dropdown */}
                      <TouchableOpacity
                        style={styles.dropdownButton}
                        onPress={() => setShowDurationPicker(showDurationPicker === index ? null : index)}
                      >
                        <Text style={prescription.duration ? styles.dropdownButtonTextSelected : styles.dropdownButtonText}>
                          {prescription.duration || 'Duration'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
                      </TouchableOpacity>
                      {showDurationPicker === index && (
                        <View style={styles.dropdownList}>
                          {durationOptions.map((option) => (
                            <TouchableOpacity
                              key={option}
                              style={styles.dropdownOption}
                              onPress={() => {
                                updatePrescription(index, 'duration', option);
                                setShowDurationPicker(null);
                              }}
                            >
                              <Text style={styles.dropdownOptionText}>{option}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}

                  {/* Add More Button */}
                  <TouchableOpacity
                    style={styles.addMoreButton}
                    onPress={addPrescription}
                  >
                    <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
                    <Text style={styles.addMoreButtonText}>Add More Medicine</Text>
                  </TouchableOpacity>

                  {/* Follow-up Appointment */}
                  <View style={styles.checkboxContainer}>
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={() => {
                        setIsFollowUpSelected(!isFollowUpSelected);
                        if (isFollowUpSelected) {
                          // Reset when unchecking
                          setShowSlotPicker(false);
                          setFollowUpDate('');
                          setFollowUpTime('');
                          setAvailableSlots([]);
                        }
                      }}
                    >
                      <Ionicons
                        name={isFollowUpSelected ? "checkbox" : "square-outline"}
                        size={24}
                        color={isFollowUpSelected ? Colors.primary : Colors.textSecondary}
                      />
                    </TouchableOpacity>
                    <Text style={styles.checkboxLabel}>Schedule Follow-up Appointment</Text>
                  </View>

                  {isFollowUpSelected && (
                    <View style={styles.followUpContainer}>
                      <Text style={styles.followUpLabel}>Select Date:</Text>
                      <TouchableOpacity
                        style={styles.dateSelector}
                        onPress={() => {
                          // Generate next 30 days from tomorrow
                          const dates = [];
                          const maxDays = 30;

                          for (let i = 1; i <= maxDays; i++) {
                            const date = new Date();
                            date.setDate(date.getDate() + i);
                            dates.push(date.toISOString().split('T')[0]);
                          }

                          setAvailableDates(dates);
                          setShowDatePicker(true);
                        }}
                      >
                        <Text style={styles.dateSelectorText}>
                          {followUpDate ? new Date(followUpDate).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 'Select Date'}
                        </Text>
                        <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />
                      </TouchableOpacity>

                      {followUpDate && (
                        <>
                          <Text style={styles.followUpLabel}>Select Time Slot:</Text>
                          {loadingSlots ? (
                            <View style={styles.loadingSlots}>
                              <ActivityIndicator size="small" color={Colors.primary} />
                              <Text style={styles.loadingSlotsText}>Loading available slots...</Text>
                            </View>
                          ) : availableSlots.length > 0 ? (
                            <View>
                              {/* Dropdown-style slot selector */}
                              <TouchableOpacity
                                style={styles.slotSelector}
                                onPress={() => setShowSlotPicker(!showSlotPicker)}
                              >
                                <Text style={styles.slotSelectorText}>
                                  {followUpTime
                                    ? availableSlots.find(s => s.start_time === followUpTime)
                                      ? `${availableSlots.find(s => s.start_time === followUpTime).start_time} - ${availableSlots.find(s => s.start_time === followUpTime).end_time}`
                                      : 'Select Time Slot'
                                    : 'Select Time Slot'}
                                </Text>
                                <Ionicons
                                  name={showSlotPicker ? "chevron-up" : "chevron-down"}
                                  size={20}
                                  color={Colors.textSecondary}
                                />
                              </TouchableOpacity>

                              {/* Expandable slots list */}
                              {showSlotPicker && (
                                <ScrollView style={styles.slotsDropdown} nestedScrollEnabled={true}>
                                  {availableSlots.map((slot: any, index: number) => {
                                    const isPast = isSlotInPast(slot.start_time, followUpDate);
                                    return (
                                      <TouchableOpacity
                                        key={index}
                                        style={[
                                          styles.slotOption,
                                          followUpTime === slot.start_time && styles.selectedSlotOption,
                                          isPast && styles.disabledSlotOption
                                        ]}
                                        onPress={() => {
                                          if (!isPast) {
                                            setFollowUpTime(slot.start_time);
                                            setShowSlotPicker(false);
                                          }
                                        }}
                                        disabled={isPast}
                                      >
                                        <Text style={[
                                          styles.slotOptionText,
                                          followUpTime === slot.start_time && styles.selectedSlotOptionText,
                                          isPast && styles.disabledSlotOptionText
                                        ]}>
                                          {slot.start_time} - {slot.end_time}
                                        </Text>
                                        {followUpTime === slot.start_time && !isPast && (
                                          <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                                        )}
                                      </TouchableOpacity>
                                    );
                                  })}
                                </ScrollView>
                              )}
                            </View>
                          ) : (
                            <Text style={styles.noSlotsText}>No available slots for selected date</Text>
                          )}
                        </>
                      )}
                    </View>
                  )}
                </>
              )}
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowCompletionModal(false)}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                {!showOrders && !otpVerifiedInSession ? (
                  <TouchableOpacity
                    style={[
                      styles.modalCompleteButton,
                      !otpCode.trim() && styles.disabledButton
                    ]}
                    onPress={verifyOtp}
                    disabled={!otpCode.trim()}
                  >
                    <Text style={styles.modalCompleteButtonText}>Verify & Start</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.modalCompleteButton,
                      (!showOrders && isFollowUpSelected && (!followUpDate || !followUpTime)) && styles.disabledButton
                    ]}
                    onPress={markAsCompleted}
                    disabled={!showOrders && isFollowUpSelected && (!followUpDate || !followUpTime)}
                  >
                    <Text style={styles.modalCompleteButtonText}>Confirm Completion</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Cancel Modal */}
      <Modal
        visible={showCancelModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel Appointment</Text>
              <TouchableOpacity
                onPress={() => setShowCancelModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalDescription}>
                Please provide a reason for cancelling this appointment:
              </Text>
              <TextInput
                style={styles.treatmentInput}
                placeholder="Enter cancellation reason (required)"
                value={cancelReason}
                onChangeText={setCancelReason}
                multiline
                numberOfLines={3}
                maxLength={200}
                textAlignVertical="top"
              />
              <Text style={styles.characterCount}>{cancelReason.length}/200</Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowCancelModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalCompleteButton,
                  !cancelReason.trim() && styles.disabledButton
                ]}
                onPress={cancelAppointment}
                disabled={!cancelReason.trim()}
              >
                <Text style={styles.modalCompleteButtonText}>Cancel Appointment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.datePickerOverlay}>
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>Select Follow-up Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.datePickerScroll}>
              {availableDates.map((date, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dateOption,
                    followUpDate === date && styles.dateOptionSelected
                  ]}
                  onPress={() => {
                    setFollowUpDate(date);
                    loadAvailableSlots(date);
                    setShowDatePicker(false);
                  }}
                >
                  <View style={styles.dateOptionContent}>
                    <Text style={[
                      styles.dateOptionText,
                      followUpDate === date && styles.dateOptionTextSelected
                    ]}>
                      {new Date(date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </Text>
                    {followUpDate === date && (
                      <Ionicons name="checkmark-circle" size={24} color={Colors.white} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
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
        hidePrimaryButton={modal.config.hidePrimaryButton}
        hideSecondaryButton={modal.config.hideSecondaryButton}
        onClose={modal.hideModal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSizes.base,
    color: Colors.textPrimary,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.lg,
  },
  statsCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statsNumber: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  statsLabel: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: Typography.fontWeights.medium,
  },
  ordersInfo: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  ordersCount: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
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
  content: {
    flex: 1,
    paddingTop: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textSecondary,
  },
  historyList: {
    paddingBottom: 120, // Extra padding to clear tab navigation and mobile bottom buttons
  },
  historyCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    marginHorizontal: Spacing.lg,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  orderNumber: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  expandButton: {
    padding: Spacing.xs,
  },
  productInfo: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  totalInfo: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeights.bold,
    marginBottom: Spacing.sm,
  },
  appointmentInfo: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  completeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.sm,
  },
  completeButtonText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.white,
    fontWeight: Typography.fontWeights.medium,
  },
  cancelButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.sm,
  },
  cancelButtonText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeights.medium,
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  detailsSection: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  statusText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  detailText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
  },
  reviewSection: {
    gap: Spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  reviewText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: Typography.lineHeights.relaxed * Typography.fontSizes.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyStateText: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  emptyStateSubtext: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
  },
  modalScrollView: {
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  modalBody: {
    padding: Spacing.lg,
  },
  modalDescription: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: Typography.lineHeights.relaxed * Typography.fontSizes.base,
  },
  treatmentInput: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: Typography.fontSizes.base,
    color: Colors.textPrimary,
    minHeight: 100,
    marginBottom: Spacing.xs,
  },
  characterCount: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textTertiary,
    textAlign: 'right',
    marginBottom: Spacing.md,
  },
  vetSectionDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.lg,
  },
  vetSectionTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  prescriptionUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    borderStyle: 'dashed',
    marginBottom: Spacing.md,
    backgroundColor: Colors.primaryLight || '#FFE5E0',
  },
  prescriptionUploadText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.primary,
    fontWeight: Typography.fontWeights.medium,
    marginLeft: Spacing.sm,
  },
  selectedFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  selectedFileName: {
    flex: 1,
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  uploadingText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: Spacing.lg,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  modalCancelButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.textSecondary,
  },
  modalCancelButtonText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeights.medium,
  },
  modalCompleteButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.success,
  },
  modalCompleteButtonText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.white,
    fontWeight: Typography.fontWeights.medium,
  },
  modalCloseButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary,
  },
  modalCloseButtonText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.white,
    fontWeight: Typography.fontWeights.medium,
  },
  detailLabel: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeights.medium,
    minWidth: 80,
  },
  detailValue: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
    flex: 1,
  },
  detailSubtext: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  detailColumn: {
    marginTop: Spacing.sm,
  },
  disabledButton: {
    opacity: 0.5,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: Typography.fontSizes.lg,
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 4,
    fontWeight: Typography.fontWeights.bold,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.white,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  checkbox: {
    marginRight: Spacing.sm,
  },
  checkboxLabel: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textPrimary,
    flex: 1,
  },
  followUpContainer: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.sm,
  },
  followUpLabel: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.md,
  },
  dateSelectorText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textPrimary,
  },
  slotSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.sm,
  },
  slotSelectorText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textPrimary,
    flex: 1,
  },
  slotsDropdown: {
    maxHeight: 200,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.md,
  },
  slotOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  selectedSlotOption: {
    backgroundColor: Colors.primaryLight || '#FFE5E0',
  },
  disabledSlotOption: {
    backgroundColor: '#e0e0e0',
    opacity: 0.5,
  },
  slotOptionText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textPrimary,
    flex: 1,
  },
  selectedSlotOptionText: {
    color: Colors.primary,
    fontWeight: Typography.fontWeights.semibold,
  },
  disabledSlotOptionText: {
    color: '#999',
  },
  slotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  slotButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    minWidth: 100,
    alignItems: 'center',
  },
  selectedSlotButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  slotButtonText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
  },
  selectedSlotButtonText: {
    color: Colors.white,
  },
  noSlotsText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    padding: Spacing.md,
  },
  loadingSlots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  loadingSlotsText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: '70%',
    paddingBottom: Spacing.xl,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  datePickerTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  datePickerScroll: {
    maxHeight: 400,
  },
  dateOption: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  dateOptionSelected: {
    backgroundColor: Colors.primary,
  },
  dateOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateOptionText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textPrimary,
    flex: 1,
  },
  dateOptionTextSelected: {
    color: Colors.white,
    fontWeight: Typography.fontWeights.semibold,
  },
  // Prescription form styles
  prescriptionItem: {
    backgroundColor: Colors.backgroundSecondary || '#F8F7FB',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  prescriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  prescriptionNumber: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textPrimary,
  },
  prescriptionInput: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: Typography.fontSizes.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
    marginBottom: Spacing.sm,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    backgroundColor: Colors.white,
    marginBottom: Spacing.sm,
  },
  dropdownButtonText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textSecondary,
  },
  dropdownButtonTextSelected: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textPrimary,
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.white,
    marginBottom: Spacing.sm,
    maxHeight: 200,
  },
  dropdownOption: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  dropdownOptionText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textPrimary,
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    borderStyle: 'dashed',
    marginBottom: Spacing.md,
  },
  addMoreButtonText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.primary,
    marginLeft: Spacing.sm,
    fontWeight: Typography.fontWeights.medium,
  },
  viewPdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  viewPdfButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
  },
  otpHintText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    lineHeight: Typography.lineHeights.relaxed * Typography.fontSizes.sm,
    fontStyle: 'italic',
  },
  prescriptionDetailCard: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  prescriptionDetailNumber: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  prescriptionDetailText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
});