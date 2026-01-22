import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import CustomModal from '../../components/CustomModal';
import { useCustomModal } from '../../hooks/useCustomModal';
import apiService from '../../services/apiService';
import { Colors } from '../../constants/Colors';

interface DeliveryPartner {
  id: number;
  name: string;
  mobile: string;
  vehicle_type?: string;
  vehicle_number?: string;
}

interface DeliveryAssignment {
  id: number;
  partner_id: number;
  assignment_status: string;
  pickup_otp: string;
  delivery_otp: string;
  assigned_at: string;
  delivery_partner?: DeliveryPartner;
}

interface OrderDetails {
  id: string;
  order_date: string;
  order_status: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  pet_name?: string;
  total_amount: number;
  payment_method?: string;
  order_items?: any[];
  delivery_address?: string;
  notes?: string;
  delivery_assignment?: DeliveryAssignment;
}

const statusOptions = [
  { value: 'confirmed', label: 'Confirmed', color: '#2196F3' },
  { value: 'processing', label: 'Processing', color: '#FF9800' },
  { value: 'ready_for_pickup', label: 'Ready for Pickup', color: '#00BCD4' },
  { value: 'out_for_delivery', label: 'Out for Delivery', color: '#9C27B0' },
  { value: 'delivered', label: 'Delivered', color: '#4CAF50' },
  { value: 'cancelled', label: 'Cancelled', color: '#F44336' },
];

export default function OrderDetailsScreen() {
  const router = useRouter();
  const modal = useCustomModal();
  const { orderId } = useLocalSearchParams();
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      // Try to get order from partner-orders endpoint
      const response = await apiService.get(`/partner-orders/${orderId}`);

      if (response.success && response.data) {
        setOrderDetails(response.data);
      } else {
        throw new Error('Order not found');
      }
    } catch (error: any) {
      console.error('Error loading order details:', error);
      modal.showError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const markReadyForPickup = async () => {
    if (!orderDetails) return;

    Alert.alert(
      'Mark Ready for Pickup',
      'Are you sure the order is ready for pickup? This will notify delivery partners.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Ready',
          onPress: async () => {
            setUpdating(true);
            try {
              const response = await apiService.patch(`/partner-orders/${orderDetails.id}/ready-for-pickup`, {});

              if (response.success) {
                modal.showSuccess('Order marked as ready for pickup!', {
                  onClose: () => loadOrderDetails(),
                });
              } else {
                throw new Error(response.error || 'Failed to update status');
              }
            } catch (error: any) {
              console.error('Error marking order ready:', error);
              modal.showError(error.message || 'Failed to mark order as ready');
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  const updateOrderStatus = async (newStatus: string) => {
    if (!orderDetails) return;

    setUpdating(true);
    try {
      const response = await apiService.patch(`/partner-orders/${orderDetails.id}/status`, {
        status: newStatus
      });

      if (response.success) {
        setOrderDetails(prev => prev ? { ...prev, order_status: newStatus } : null);
        modal.showSuccess('Order status updated successfully', {
          onClose: () => router.back(),
        });
      } else {
        throw new Error(response.error || 'Failed to update status');
      }
    } catch (error: any) {
      console.error('Error updating order status:', error);
      modal.showError(error.message || 'Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusUpdate = (newStatus: string) => {
    const statusLabel = statusOptions.find(s => s.value === newStatus)?.label;

    modal.showWarning(
      `Are you sure you want to update the order status to "${statusLabel}"?`,
      {
        title: 'Update Order Status',
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

  const handleCallDeliveryPartner = (mobile: string, name: string) => {
    Alert.alert(
      `Call ${name}`,
      `Would you like to call ${mobile}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => Linking.openURL(`tel:${mobile}`)
        }
      ]
    );
  };


  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!orderDetails) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#F44336" />
          <Text style={styles.errorText}>Order not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentStatus = statusOptions.find(s => s.value === orderDetails.order_status);
  const canMarkReady = ['confirmed', 'processing'].includes(orderDetails.order_status);
  const canCancelOrder = orderDetails.order_status === 'ready_for_pickup';

  let orderItems = [];
  let productNames = '';
  if (orderDetails.order_items) {
    try {
      orderItems = typeof orderDetails.order_items === 'string'
        ? JSON.parse(orderDetails.order_items)
        : orderDetails.order_items;
      productNames = orderItems
        .map((item: any) => `${item.product_name || item.name} (x${item.quantity || 1})`)
        .filter(Boolean)
        .join(', ');
    } catch (e) {
      console.error('Error parsing order_items:', e);
    }
  }

  const assignment = orderDetails.delivery_assignment;
  const deliveryPartner = assignment?.delivery_partner;

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
        {/* Order ID & Status Section */}
        <View style={styles.statusSection}>
          <View style={styles.orderIdRow}>
            <Text style={styles.orderId}>Order #{orderDetails.id}</Text>
            <View style={[styles.currentStatus, { backgroundColor: currentStatus?.color || '#666' }]}>
              <Text style={styles.currentStatusText}>{currentStatus?.label || orderDetails.order_status}</Text>
            </View>
          </View>

          <View style={styles.orderDateRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.orderDate}>
              {new Date(orderDetails.order_date).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </Text>
          </View>

          {/* Mark Ready for Pickup Button */}
          {canMarkReady && (
            <TouchableOpacity
              style={[styles.readyButton, updating && styles.readyButtonDisabled]}
              onPress={markReadyForPickup}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.readyButtonText}>Mark Ready for Pickup</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Info Box for Ready for Pickup */}
          {orderDetails.order_status === 'ready_for_pickup' && !assignment && (
            <View style={styles.infoBox}>
              <Ionicons name="checkmark-circle" size={20} color="#00BCD4" />
              <Text style={styles.infoText}>
                Order is ready for pickup. Waiting for delivery partner assignment.
              </Text>
            </View>
          )}

          {/* Info Box for Out for Delivery */}
          {orderDetails.order_status === 'out_for_delivery' && (
            <View style={[styles.infoBox, { backgroundColor: '#F3E5F5' }]}>
              <Ionicons name="bicycle" size={20} color="#9C27B0" />
              <Text style={[styles.infoText, { color: '#6A1B9A' }]}>
                Order is out for delivery. Delivery partner is on the way.
              </Text>
            </View>
          )}

          {/* Info Box for Delivered */}
          {orderDetails.order_status === 'delivered' && (
            <View style={[styles.infoBox, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="checkmark-done" size={20} color="#4CAF50" />
              <Text style={[styles.infoText, { color: '#2E7D32' }]}>
                Order has been delivered successfully.
              </Text>
            </View>
          )}

          {/* Cancel Button */}
          {canCancelOrder && (
            <TouchableOpacity
              style={[styles.cancelButton, updating && styles.readyButtonDisabled]}
              onPress={() => handleStatusUpdate('cancelled')}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="close-circle" size={20} color="#fff" />
                  <Text style={styles.cancelButtonText}>Cancel Order</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Delivery Partner Information */}
        {assignment && deliveryPartner && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Partner</Text>
            <View style={styles.deliveryPartnerCard}>
              <View style={styles.partnerHeader}>
                <View style={styles.partnerAvatar}>
                  <Ionicons name="person" size={24} color={Colors.primary} />
                </View>
                <View style={styles.partnerInfo}>
                  <Text style={styles.partnerName}>{deliveryPartner.name}</Text>
                  <Text style={styles.partnerMobile}>{deliveryPartner.mobile}</Text>
                  {deliveryPartner.vehicle_type && (
                    <View style={styles.vehicleInfo}>
                      <Ionicons name="bicycle" size={14} color="#666" />
                      <Text style={styles.vehicleText}>
                        {deliveryPartner.vehicle_type}
                        {deliveryPartner.vehicle_number && ` • ${deliveryPartner.vehicle_number}`}
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={() => handleCallDeliveryPartner(deliveryPartner.mobile, deliveryPartner.name)}
                >
                  <Ionicons name="call" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Assignment Status */}
              <View style={styles.assignmentStatus}>
                <Ionicons
                  name={
                    assignment.assignment_status === 'delivered' ? 'checkmark-circle' :
                    assignment.assignment_status === 'out_for_delivery' ? 'bicycle' :
                    assignment.assignment_status === 'picked_up' ? 'cube' :
                    'time'
                  }
                  size={16}
                  color={
                    assignment.assignment_status === 'delivered' ? '#4CAF50' :
                    assignment.assignment_status === 'out_for_delivery' ? '#9C27B0' :
                    assignment.assignment_status === 'picked_up' ? '#2196F3' :
                    '#FF9800'
                  }
                />
                <Text style={styles.assignmentStatusText}>
                  {assignment.assignment_status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </Text>
              </View>

              {/* Pickup OTP */}
              {assignment.pickup_otp && assignment.assignment_status !== 'picked_up' && assignment.assignment_status !== 'out_for_delivery' && assignment.assignment_status !== 'delivered' && (
                <View style={styles.otpSection}>
                  <View style={styles.otpHeader}>
                    <Ionicons name="lock-closed" size={18} color={Colors.primary} />
                    <Text style={styles.otpLabel}>Pickup OTP</Text>
                  </View>
                  <View style={styles.otpBox}>
                    <Text style={styles.otpCode}>{assignment.pickup_otp}</Text>
                  </View>
                  <Text style={styles.otpHint}>Share this OTP with the delivery partner during pickup</Text>
                </View>
              )}

              {/* Assignment Date */}
              <View style={styles.assignmentDate}>
                <Ionicons name="time-outline" size={14} color="#999" />
                <Text style={styles.assignmentDateText}>
                  Assigned {new Date(assignment.assigned_at).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color="#666" />
              <Text style={styles.infoText2}>{orderDetails.customer_name}</Text>
            </View>
            {orderDetails.customer_phone && (
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={20} color="#666" />
                <Text style={styles.infoText2}>{orderDetails.customer_phone}</Text>
              </View>
            )}
            {orderDetails.customer_email && (
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={20} color="#666" />
                <Text style={styles.infoText2}>{orderDetails.customer_email}</Text>
              </View>
            )}
            {orderDetails.delivery_address && (
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={20} color="#666" />
                <Text style={styles.infoText2}>{orderDetails.delivery_address}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          <View style={styles.infoCard}>
            {orderItems.length > 0 ? (
              orderItems.map((item: any, index: number) => (
                <View key={index} style={styles.orderItemRow}>
                  <View style={styles.orderItemInfo}>
                    <Text style={styles.orderItemName}>
                      {item.product_name || item.name}
                    </Text>
                    <Text style={styles.orderItemQty}>Qty: {item.quantity || 1}</Text>
                  </View>
                  <Text style={styles.orderItemPrice}>
                    ₹{(item.price || item.unit_price) * (item.quantity || 1)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.noItemsText}>No items found</Text>
            )}
          </View>

          {/* Total */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalAmount}>₹{orderDetails.total_amount}</Text>
          </View>

          {orderDetails.payment_method && (
            <View style={styles.paymentRow}>
              <Ionicons name="card-outline" size={18} color="#666" />
              <Text style={styles.paymentText}>Payment: {orderDetails.payment_method}</Text>
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

        <View style={{ height: 40 }} />
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
    backgroundColor: '#F8F7FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
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
    paddingHorizontal: 16,
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
    backgroundColor: Colors.primary,
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
  orderIdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  orderDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  currentStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  currentStatusText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  readyButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  readyButtonDisabled: {
    opacity: 0.6,
  },
  readyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: '#F44336',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  infoBox: {
    backgroundColor: '#E0F7FA',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#00838F',
    lineHeight: 18,
  },
  deliveryPartnerCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  partnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  partnerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  partnerMobile: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vehicleText: {
    fontSize: 12,
    color: '#888',
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignmentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
  },
  assignmentStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  otpSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  otpLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  otpBox: {
    backgroundColor: Colors.primary + '10',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  otpCode: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
    letterSpacing: 8,
  },
  otpHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  assignmentDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  assignmentDateText: {
    fontSize: 12,
    color: '#999',
  },
  infoCard: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText2: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  orderItemQty: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  orderItemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  noItemsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  paymentText: {
    fontSize: 14,
    color: '#666',
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
