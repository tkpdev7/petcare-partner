import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import CustomModal from '../../components/CustomModal';
import { useCustomModal } from '../../hooks/useCustomModal';

interface OrderDetails {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  petName: string;
  petType: string;
  petAge: string;
  service: string;
  appointmentDate: string;
  appointmentTime: string;
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  totalAmount: number;
  notes?: string;
  serviceDetails?: string;
}

const statusOptions = [
  { value: 'pending', label: 'Pending', color: '#F59E0B' },
  { value: 'confirmed', label: 'Confirmed', color: '#10B981' },
  { value: 'in-progress', label: 'In Progress', color: '#3B82F6' },
  { value: 'completed', label: 'Completed', color: '#6B7280' },
  { value: 'cancelled', label: 'Cancelled', color: '#EF4444' },
];

export default function OrderDetailsScreen() {
  const router = useRouter();
  const modal = useCustomModal();
  const { id } = useLocalSearchParams();
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadOrderDetails();
  }, [id]);

  const loadOrderDetails = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`API_ENDPOINT/partner/orders/${id}`);
      
      // Mock data
      const mockOrder: OrderDetails = {
        id: id as string,
        customerName: 'John Doe',
        customerPhone: '+91 9876543210',
        customerEmail: 'john.doe@email.com',
        petName: 'Buddy',
        petType: 'Golden Retriever',
        petAge: '3 years',
        service: 'Health Checkup',
        appointmentDate: '2024-01-15',
        appointmentTime: '10:00 AM',
        status: 'confirmed',
        totalAmount: 1500,
        notes: 'Pet seems to have low energy lately. Please check for any health issues.',
        serviceDetails: 'Complete health examination including blood tests and vaccination check',
      };
      
      setOrderDetails(mockOrder);
    } catch (error) {
      console.error('Error loading order details:', error);
      modal.showError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus: OrderDetails['status']) => {
    if (!orderDetails) return;

    setUpdating(true);
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`API_ENDPOINT/partner/orders/${id}/status`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ status: newStatus }),
      // });
      
      // Mock update
      await new Promise(resolve => setTimeout(resolve, 1000));

      setOrderDetails(prev => prev ? { ...prev, status: newStatus } : null);
      modal.showSuccess('Order status updated successfully');
    } catch (error) {
      modal.showError('Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusUpdate = (newStatus: OrderDetails['status']) => {
    const statusLabel = statusOptions.find(s => s.value === newStatus)?.label;

    modal.showWarning(
      `Are you sure you want to update the status to "${statusLabel}"?`,
      {
        title: 'Update Status',
        primaryButtonText: 'Update',
        secondaryButtonText: 'Cancel',
        onPrimaryPress: () => {
          modal.hideModal();
          updateOrderStatus(newStatus);
        },
        onSecondaryPress: modal.hideModal
      }
    );
  };

  const handleCall = () => {
    // TODO: Implement call functionality
    modal.showInfo('Calling feature will be implemented here', { title: 'Call Customer' });
  };

  const handleMessage = () => {
    // TODO: Implement message functionality
    modal.showInfo('Messaging feature will be implemented here', { title: 'Message Customer' });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF7A59" />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!orderDetails) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorText}>Order not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentStatus = statusOptions.find(s => s.value === orderDetails.status);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Section */}
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>Order Status</Text>
          <View style={[styles.currentStatus, { backgroundColor: currentStatus?.color }]}>
            <Text style={styles.currentStatusText}>{currentStatus?.label}</Text>
          </View>
          
          <Text style={styles.statusUpdateTitle}>Update Status:</Text>
          <View style={styles.statusButtons}>
            {statusOptions
              .filter(status => status.value !== orderDetails.status)
              .map((status) => (
                <TouchableOpacity
                  key={status.value}
                  style={[styles.statusButton, { borderColor: status.color }]}
                  onPress={() => handleStatusUpdate(status.value as OrderDetails['status'])}
                  disabled={updating}
                >
                  <Text style={[styles.statusButtonText, { color: status.color }]}>
                    {status.label}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color="#666" />
              <Text style={styles.infoText}>{orderDetails.customerName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color="#666" />
              <Text style={styles.infoText}>{orderDetails.customerPhone}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color="#666" />
              <Text style={styles.infoText}>{orderDetails.customerEmail}</Text>
            </View>
          </View>
          
          <View style={styles.contactButtons}>
            <TouchableOpacity style={styles.contactButton} onPress={handleCall}>
              <Ionicons name="call" size={20} color="#fff" />
              <Text style={styles.contactButtonText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactButton} onPress={handleMessage}>
              <Ionicons name="chatbubble" size={20} color="#fff" />
              <Text style={styles.contactButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pet Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pet Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="paw-outline" size={20} color="#666" />
              <Text style={styles.infoText}>{orderDetails.petName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="medical-outline" size={20} color="#666" />
              <Text style={styles.infoText}>{orderDetails.petType}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color="#666" />
              <Text style={styles.infoText}>{orderDetails.petAge}</Text>
            </View>
          </View>
        </View>

        {/* Service Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Details</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="medical-outline" size={20} color="#666" />
              <Text style={styles.infoText}>{orderDetails.service}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <Text style={styles.infoText}>{orderDetails.appointmentDate}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color="#666" />
              <Text style={styles.infoText}>{orderDetails.appointmentTime}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="cash-outline" size={20} color="#666" />
              <Text style={styles.infoText}>₹{orderDetails.totalAmount}</Text>
            </View>
          </View>
          
          {orderDetails.serviceDetails && (
            <View style={styles.detailsBox}>
              <Text style={styles.detailsTitle}>Service Description:</Text>
              <Text style={styles.detailsText}>{orderDetails.serviceDetails}</Text>
            </View>
          )}
        </View>

        {/* Special Notes */}
        {orderDetails.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Notes</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{orderDetails.notes}</Text>
            </View>
          </View>
        )}
      </ScrollView>

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
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerBackButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  backButton: {
    marginTop: 20,
    backgroundColor: '#FF7A59',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statusSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  currentStatus: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  currentStatusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusUpdateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoCard: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF7A59',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailsBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  detailsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  notesBox: {
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  notesText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
});