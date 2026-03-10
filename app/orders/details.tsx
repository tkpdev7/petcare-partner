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
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  order_number?: string;
  order_date?: string;
  placed_at?: string;
  created_at?: string;
  order_status: string;
  delivery_status?: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  pet_name?: string;
  total_amount: number;
  subtotal?: number;
  tax_amount?: number;
  shipping_fee?: number;
  platform_fee?: number;
  discount_amount?: number;
  payment_method?: string;
  order_items?: any[];
  delivery_address?: string;
  notes?: string;
  delivery_assignment?: DeliveryAssignment;
  order_type?: 'pharmacy' | 'product';
}

const statusOptions = [
  { value: 'placed', label: 'Placed', color: '#3F51B5' },
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
  const { orderId, orderType } = useLocalSearchParams();
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [partnerData, setPartnerData] = useState<any>(null);
  const [returnRequest, setReturnRequest] = useState<any>(null);
  const [returnLoading, setReturnLoading] = useState(false);

  useEffect(() => {
    console.log('🔍 OrderDetailsScreen mounted');
    console.log('📦 Received orderId from params:', orderId);
    console.log('📦 orderId type:', typeof orderId);
    console.log('📦 orderId value:', JSON.stringify(orderId));
    console.log('📦 Received orderType from params:', orderType);
    console.log('📦 orderType value:', JSON.stringify(orderType));
    loadPartnerData();
    loadOrderDetails();
    loadReturnRequest();
  }, [orderId, orderType]);

  const loadPartnerData = async () => {
    try {
      console.log('🔑 Loading partner data from AsyncStorage...');
      const data = await AsyncStorage.getItem('partnerData');
      if (data) {
        const parsedData = JSON.parse(data);
        console.log('✅ Partner data loaded from AsyncStorage:', {
          id: parsedData.id,
          businessName: parsedData.businessName || parsedData.name,
          latitude: parsedData.latitude,
          longitude: parsedData.longitude,
          hasCoordinates: !!(parsedData.latitude && parsedData.longitude)
        });

        // If coordinates are missing, fetch fresh data from API
        if (!parsedData.latitude || !parsedData.longitude) {
          console.log('📍 Coordinates missing, fetching from API...');
          try {
            const response = await apiService.get('/partner-auth/me');
            if (response.success && response.data) {
              const freshData = response.data;
              console.log('✅ Fresh partner data from API:', {
                latitude: freshData.latitude,
                longitude: freshData.longitude
              });

              // Update AsyncStorage with fresh data
              await AsyncStorage.setItem('partnerData', JSON.stringify(freshData));
              setPartnerData(freshData);
              return;
            }
          } catch (apiError) {
            console.error('❌ Error fetching partner data from API:', apiError);
          }
        }

        setPartnerData(parsedData);
      } else {
        console.warn('⚠️ No partner data found in AsyncStorage, fetching from API...');
        // Try to fetch from API
        try {
          const response = await apiService.get('/partner-auth/me');
          if (response.success && response.data) {
            const freshData = response.data;
            await AsyncStorage.setItem('partnerData', JSON.stringify(freshData));
            setPartnerData(freshData);
          }
        } catch (apiError) {
          console.error('❌ Error fetching partner data from API:', apiError);
        }
      }
    } catch (error) {
      console.error('❌ Error loading partner data:', error);
    }
  };

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      console.log('🌐 Starting to load order details...');
      console.log('🔑 Order ID to fetch:', orderId);
      console.log('🔑 Order Type to fetch:', orderType);

      // Determine order type (default to 'product' if not specified)
      const type = (orderType as string) || 'product';
      console.log('🔑 Using order type:', type);

      // Try to get order from partner-orders endpoint with order_type query param
      const endpoint = `/partner-orders/${orderId}?order_type=${type}`;
      console.log('📍 API Endpoint:', endpoint);
      console.log('📍 Full URL will be:', `https://petcare-api-0svs.onrender.com${endpoint}`);

      const response = await apiService.get(endpoint);

      console.log('📨 API Response received:', {
        success: response.success,
        hasData: !!response.data,
        dataType: typeof response.data,
        dataKeys: response.data ? Object.keys(response.data) : 'no data'
      });
      console.log('📨 Full Response:', JSON.stringify(response, null, 2));

      if (response.success && response.data) {
        // Backend returns nested structure: { success, data: { success, message, data: { actual order } } }
        // Extract the actual order data from the nested structure
        const orderData = response.data.data || response.data;
        console.log('✅ Setting order details');
        console.log('📋 Extracted order data:', JSON.stringify(orderData, null, 2));
        console.log('🔑 Order status:', orderData.order_status);
        console.log('🔑 Order ID:', orderData.id);
        setOrderDetails(orderData);
      } else {
        console.error('❌ Response not successful or no data');
        console.error('Response success:', response.success);
        console.error('Response data:', response.data);
        console.error('Response error:', response.error);
        throw new Error(response.error || 'Order not found');
      }
    } catch (error: any) {
      console.error('❌ ERROR in loadOrderDetails:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      modal.showError('Failed to load order details');
    } finally {
      setLoading(false);
      console.log('🏁 loadOrderDetails completed');
    }
  };

  const loadReturnRequest = async () => {
    try {
      console.log('🔄 Loading return request for order:', orderId);
      const response = await apiService.get(`/returns/partner/order/${orderId}`);
      console.log('📦 Return request response:', JSON.stringify(response, null, 2));
      if (response.success && response.data) {
        const returnData = response.data.data || response.data;
        console.log('✅ Return request loaded:', JSON.stringify(returnData, null, 2));
        console.log('📋 Return status:', returnData?.status, '| Type:', returnData?.type);
        console.log('🖼️ Return images:', returnData?.images);
        setReturnRequest(returnData);
      } else {
        console.log('ℹ️ No return request data in response');
      }
    } catch (error) {
      console.log('No return request found for this order');
    }
  };

  const handleReviewReturn = async (action: 'approve' | 'reject', reason?: string) => {
    if (!returnRequest) return;
    setReturnLoading(true);
    try {
      const response = await apiService.patch(`/returns/${returnRequest.id}/review`, {
        action,
        rejection_reason: reason
      });
      if (response.success) {
        modal.showSuccess(action === 'approve' ? 'Return request approved' : 'Return request rejected');
        loadReturnRequest();
      } else throw new Error(response.error || 'Failed');
    } catch (error: any) {
      modal.showError(error.message || 'Failed to review return request');
    } finally {
      setReturnLoading(false);
    }
  };

  const handleReadyForReversePickup = async () => {
    if (!returnRequest) return;
    setReturnLoading(true);
    try {
      const response = await apiService.post(`/returns/${returnRequest.id}/ready-for-pickup`);
      if (response.success) {
        modal.showSuccess('Reverse pickup initiated. Delivery partner will collect from customer.');
        loadReturnRequest();
      } else throw new Error(response.error || 'Failed');
    } catch (error: any) {
      modal.showError(error.message || 'Failed to initiate reverse pickup');
    } finally {
      setReturnLoading(false);
    }
  };

  const handleConfirmReturnReceived = async () => {
    if (!returnRequest) return;
    setReturnLoading(true);
    try {
      const response = await apiService.post(`/returns/${returnRequest.id}/confirm-received`);
      if (response.success) {
        modal.showSuccess('Return received confirmed');
        loadReturnRequest();
      } else throw new Error(response.error || 'Failed');
    } catch (error: any) {
      modal.showError(error.message || 'Failed to confirm return received');
    } finally {
      setReturnLoading(false);
    }
  };

  const handleDispatchReplacement = async () => {
    if (!returnRequest) return;
    setReturnLoading(true);
    try {
      const response = await apiService.post(`/returns/${returnRequest.id}/dispatch-replacement`);
      if (response.success) {
        modal.showSuccess('Replacement dispatched. Delivery partner assigned.');
        loadReturnRequest();
      } else throw new Error(response.error || 'Failed');
    } catch (error: any) {
      modal.showError(error.message || 'Failed to dispatch replacement');
    } finally {
      setReturnLoading(false);
    }
  };

  const handleProcessRefund = async () => {
    if (!returnRequest) return;
    setReturnLoading(true);
    try {
      const response = await apiService.post(`/returns/${returnRequest.id}/complete-refund`, {
        refund_amount: orderDetails?.total_amount
      });
      if (response.success) {
        modal.showSuccess('Refund processed successfully');
        loadReturnRequest();
      } else throw new Error(response.error || 'Failed');
    } catch (error: any) {
      modal.showError(error.message || 'Failed to process refund');
    } finally {
      setReturnLoading(false);
    }
  };

  const markReadyForPickup = () => {
    if (!orderDetails) return;

    // Check if partner has location coordinates
    if (!partnerData) {
      modal.showError('Unable to load partner information. Please try again.');
      return;
    }

    modal.showWarning(
      'Are you sure the order is ready for pickup? This will notify delivery partners.',
      {
        title: 'Mark Ready for Pickup',
        primaryButtonText: 'Mark Ready',
        secondaryButtonText: 'Cancel',
        onPrimaryPress: async () => {
          modal.hideModal();
          setUpdating(true);
          try {
            // Determine order type from orderDetails or URL param
            const type = orderDetails.order_type || (orderType as string) || 'product';
            console.log('🔄 Marking order ready with type:', type);
            console.log('🔄 Current order status:', orderDetails.order_status);
            console.log('📍 Partner location:', {
              latitude: partnerData.latitude,
              longitude: partnerData.longitude
            });

            // If order is in "placed" status, first confirm it
            if (orderDetails.order_status === 'placed') {
              console.log('⚠️ Order is in "placed" status, confirming first...');

              const confirmResponse = await apiService.patch(`/partner-orders/${orderDetails.id}/status`, {
                order_type: type,
                status: 'confirmed'
              });

              if (!confirmResponse.success) {
                throw new Error(confirmResponse.error || 'Failed to confirm order');
              }

              console.log('✅ Order confirmed successfully');
              // Update local state
              setOrderDetails(prev => prev ? { ...prev, order_status: 'confirmed' } : null);
            }

            // Now mark as ready for pickup
            console.log('🔄 Calling ready-for-pickup endpoint...');
            const response = await apiService.post(`/partner/orders/${orderDetails.id}/ready-for-pickup`, {
              order_type: type,
              ...(partnerData?.latitude && partnerData?.longitude ? {
                partner_latitude: partnerData.latitude,
                partner_longitude: partnerData.longitude,
              } : {}),
            });

            if (response.success) {
              // Immediately refresh the order details
              await loadOrderDetails();

              const noPartner = response.data?.data?.no_partner_available;
              if (noPartner) {
                modal.showSuccess(
                  'Order is ready for pickup. No delivery partners are available right now — one will be assigned when available.',
                  { title: 'Ready for Pickup' }
                );
              } else {
                modal.showSuccess('Order marked as ready for pickup! Delivery partner assigned.');
              }
            } else {
              throw new Error(response.error || response.message || 'Failed to update status');
            }
          } catch (error: any) {
            console.error('Error marking order ready:', error);
            const errorMessage = error.message || error.toString();

            // Check if error is about missing location
            if (errorMessage.includes('location') || errorMessage.includes('coordinates')) {
              modal.showError(
                'Your location is required to mark orders as ready. Please update your profile with your business address.',
                {
                  title: 'Location Required',
                  primaryButtonText: 'Update Profile',
                  onPrimaryPress: () => {
                    modal.hideModal();
                    router.push('/profile');
                  }
                }
              );
            } else {
              modal.showError(errorMessage || 'Failed to mark order as ready');
            }
          } finally {
            setUpdating(false);
          }
        },
        onSecondaryPress: modal.hideModal
      }
    );
  };

  const updateOrderStatus = async (newStatus: string) => {
    if (!orderDetails) return;

    setUpdating(true);
    try {
      // Determine order type from orderDetails or URL param
      const type = orderDetails.order_type || (orderType as string) || 'product';
      console.log('🔄 Updating order status with type:', type, 'to status:', newStatus);

      const response = await apiService.patch(`/partner-orders/${orderDetails.id}/status`, {
        order_type: type,
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
  // Can mark ready only if not already ready for pickup and no delivery assignment
  const canMarkReady = ['placed', 'confirmed', 'processing'].includes(orderDetails.order_status) &&
                       orderDetails.delivery_status !== 'ready_for_pickup' &&
                       !orderDetails.delivery_assignment_id;
  // Can cancel if order is placed, confirmed, or processing (before delivery partner pickup)
  const canCancelOrder = ['placed', 'confirmed', 'processing'].includes(orderDetails.order_status) &&
                         orderDetails.delivery_status !== 'ready_for_pickup' &&
                         !orderDetails.delivery_assignment_id;

  console.log('📊 Order Details State:');
  console.log('  Order ID:', orderDetails.id);
  console.log('  Current Status:', orderDetails.order_status);
  console.log('  Date Fields Available:');
  console.log('    - order_date:', orderDetails.order_date);
  console.log('    - placed_at:', orderDetails.placed_at);
  console.log('    - created_at:', orderDetails.created_at);
  console.log('  Using date:', orderDetails.order_date || orderDetails.placed_at || orderDetails.created_at);
  console.log('  Customer:', orderDetails.customer_name);
  console.log('  Total Amount:', orderDetails.total_amount);
  console.log('  Can Mark Ready:', canMarkReady);
  console.log('  Can Cancel:', canCancelOrder);

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
            <View style={styles.orderNumberBadge}>
              <Text style={styles.orderNumberLabel}>ORDER</Text>
              <Text style={styles.orderId}>
                {orderDetails.order_number || `#${orderDetails.id?.slice(-8).toUpperCase()}`}
              </Text>
            </View>
            <View style={[styles.currentStatus, { backgroundColor: currentStatus?.color || '#666' }]}>
              <Text style={styles.currentStatusText}>{currentStatus?.label || orderDetails.order_status}</Text>
            </View>
          </View>

          <View style={styles.orderDateRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            {(() => {
              // Use order_date if available, otherwise fall back to placed_at or created_at
              const dateStr = orderDetails.order_date || orderDetails.placed_at || orderDetails.created_at;
              if (!dateStr) return <Text style={styles.orderDate}>Date not available</Text>;

              try {
                const date = new Date(dateStr);
                console.log('📅 Date string:', dateStr);
                console.log('📅 Date object:', date);
                console.log('📅 Date ISO:', date.toISOString());

                const dateFormatted = date.toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                });
                console.log('📅 Date formatted:', dateFormatted);

                // Manual time formatting (more reliable in React Native)
                const rawHours = date.getHours();
                const minutes = date.getMinutes();
                const ampm = rawHours >= 12 ? 'PM' : 'AM';
                let hours = rawHours % 12;
                hours = hours ? hours : 12; // 0 should be 12
                const minutesStr = minutes < 10 ? '0' + minutes : minutes.toString();

                console.log('📅 Raw hours:', rawHours);
                console.log('📅 Converted hours:', hours);
                console.log('📅 Minutes:', minutes, 'Minutes string:', minutesStr);
                console.log('📅 AM/PM:', ampm);

                const timeStr = hours + ':' + minutesStr + ' ' + ampm;
                console.log('📅 Time string:', timeStr);
                console.log('📅 Final result:', dateFormatted + ' at ' + timeStr);

                // Use View wrapper with flex to ensure text doesn't get cut off
                return (
                  <View style={styles.dateTextWrapper}>
                    <Text style={styles.orderDate} numberOfLines={2}>
                      {dateFormatted} at {hours}:{minutesStr} {ampm}
                    </Text>
                  </View>
                );
              } catch (error) {
                console.error('Error formatting date:', error);
                return <Text style={styles.orderDate}>Invalid date</Text>;
              }
            })()}
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
                  <Text style={styles.readyButtonText}>Ready for Pickup</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Info Box for Ready for Pickup */}
          {orderDetails.delivery_status === 'ready_for_pickup' && !assignment && (
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
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.orderItemImage} />
                  ) : (
                    <View style={[styles.orderItemImage, styles.orderItemImagePlaceholder]}>
                      <Ionicons name="bag-outline" size={22} color="#ccc" />
                    </View>
                  )}
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

          {/* Price Breakup */}
          <View style={styles.priceBreakup}>
            <Text style={styles.priceBreakupTitle}>Price Breakup</Text>

            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Item Subtotal</Text>
              <Text style={styles.priceValue}>
                ₹{orderDetails.subtotal ?? orderItems.reduce((sum: number, item: any) => sum + (item.price || item.unit_price || 0) * (item.quantity || 1), 0)}
              </Text>
            </View>

            {!!orderDetails.shipping_fee && orderDetails.shipping_fee > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Delivery Charge</Text>
                <Text style={styles.priceValue}>₹{orderDetails.shipping_fee}</Text>
              </View>
            )}

            {!!orderDetails.tax_amount && orderDetails.tax_amount > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Tax</Text>
                <Text style={styles.priceValue}>₹{orderDetails.tax_amount}</Text>
              </View>
            )}

            {!!orderDetails.platform_fee && orderDetails.platform_fee > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Platform Fee</Text>
                <Text style={styles.priceValue}>₹{orderDetails.platform_fee}</Text>
              </View>
            )}

            {!!orderDetails.discount_amount && orderDetails.discount_amount > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Discount</Text>
                <Text style={[styles.priceValue, styles.discountValue]}>-₹{orderDetails.discount_amount}</Text>
              </View>
            )}

            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <Text style={styles.grandTotalAmount}>₹{orderDetails.total_amount}</Text>
            </View>

            {orderDetails.payment_method && (
              <View style={styles.paymentRow}>
                <Ionicons name="card-outline" size={16} color="#666" />
                <Text style={styles.paymentText}>
                  {orderDetails.payment_method === 'COD' || orderDetails.payment_method === 'cod'
                    ? 'Cash on Delivery'
                    : orderDetails.payment_method === 'ONLINE' || orderDetails.payment_method === 'online'
                    ? 'Paid Online'
                    : orderDetails.payment_method}
                </Text>
              </View>
            )}
          </View>
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

        {/* Return Request Section */}
        {returnRequest && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Return Request</Text>
            <View style={styles.returnRequestCard}>
              {/* Return Type Badge */}
              <View style={styles.returnTypeRow}>
                <View style={[styles.returnTypeBadge, {
                  backgroundColor: returnRequest.type === 'replace' ? '#E3F2FD' : '#FFF3E0'
                }]}>
                  <Ionicons
                    name={returnRequest.type === 'replace' ? 'swap-horizontal' : 'cash-outline'}
                    size={16}
                    color={returnRequest.type === 'replace' ? '#1565C0' : '#E65100'}
                  />
                  <Text style={[styles.returnTypeBadgeText, {
                    color: returnRequest.type === 'replace' ? '#1565C0' : '#E65100'
                  }]}>
                    {returnRequest.type === 'replace' ? 'Replacement' : 'Refund'}
                  </Text>
                </View>
                <View style={[styles.returnStatusBadge, {
                  backgroundColor:
                    returnRequest.status?.includes('pending') ? '#FFF3E0' :
                    returnRequest.status?.includes('approved') ? '#E8F5E9' :
                    returnRequest.status?.includes('rejected') ? '#FEECEB' :
                    returnRequest.status?.includes('delivered') || returnRequest.status?.includes('completed') ? '#E8F5E9' :
                    '#F3E5F5'
                }]}>
                  <Text style={[styles.returnStatusText, {
                    color:
                      returnRequest.status?.includes('pending') ? '#E65100' :
                      returnRequest.status?.includes('approved') ? '#2E7D32' :
                      returnRequest.status?.includes('rejected') ? '#C62828' :
                      returnRequest.status?.includes('delivered') || returnRequest.status?.includes('completed') ? '#2E7D32' :
                      '#6A1B9A'
                  }]}>
                    {returnRequest.status?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                  </Text>
                </View>
              </View>

              {/* Reason */}
              <View style={styles.returnDetailRow}>
                <Text style={styles.returnDetailLabel}>Reason:</Text>
                <Text style={styles.returnDetailValue}>{returnRequest.reason}</Text>
              </View>
              {returnRequest.sub_reason && (
                <View style={styles.returnDetailRow}>
                  <Text style={styles.returnDetailLabel}>Sub-reason:</Text>
                  <Text style={styles.returnDetailValue}>{returnRequest.sub_reason}</Text>
                </View>
              )}
              {returnRequest.comments && (
                <View style={styles.returnDetailRow}>
                  <Text style={styles.returnDetailLabel}>Comments:</Text>
                  <Text style={styles.returnDetailValue}>{returnRequest.comments}</Text>
                </View>
              )}

              {/* Customer Uploaded Images */}
              {returnRequest.images && (() => {
                let imgs = returnRequest.images;
                if (typeof imgs === 'string') {
                  try { imgs = JSON.parse(imgs); } catch { imgs = []; }
                }
                if (!Array.isArray(imgs)) imgs = [];
                return imgs.length > 0 ? (
                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.returnDetailLabel}>Supporting Images:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                      {imgs.map((uri: string, idx: number) => (
                        <Image
                          key={idx}
                          source={{ uri }}
                          style={{ width: 100, height: 100, borderRadius: 8, marginRight: 8, backgroundColor: '#f0f0f0' }}
                          resizeMode="cover"
                        />
                      ))}
                    </ScrollView>
                  </View>
                ) : null;
              })()}

              {/* Return Delivery OTP - shown when pickup is scheduled/in progress */}
              {returnRequest.return_delivery_otp && !['pending', 'approved', 'rejected', 'returned_to_vendor', 'return_received', 'replacement_delivered', 'refund_completed'].includes(returnRequest.status) && (
                <View style={{
                  marginTop: 14,
                  backgroundColor: '#FFF8E1',
                  borderRadius: 10,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: '#FFD54F',
                  alignItems: 'center',
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Ionicons name="key-outline" size={18} color="#F57F17" />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#F57F17', marginLeft: 6 }}>
                      Return Delivery OTP
                    </Text>
                  </View>
                  <Text style={{
                    fontSize: 28,
                    fontWeight: '800',
                    color: '#E65100',
                    letterSpacing: 6,
                  }}>
                    {returnRequest.return_delivery_otp}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#888', marginTop: 4, textAlign: 'center' }}>
                    Share this OTP with the delivery partner when they arrive with the returned product
                  </Text>
                </View>
              )}

              {/* Action Buttons based on status */}
              {(returnRequest.status === 'pending' || returnRequest.status === 'replacement_pending' || returnRequest.status === 'refund_pending') && (
                <View style={styles.returnActions}>
                  <TouchableOpacity
                    style={[styles.returnActionBtn, { backgroundColor: '#4CAF50' }]}
                    onPress={() => handleReviewReturn('approve')}
                    disabled={returnLoading}
                  >
                    {returnLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                      <>
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                        <Text style={styles.returnActionBtnText}>Approve</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.returnActionBtn, { backgroundColor: '#F44336' }]}
                    onPress={() => {
                      Alert.prompt ? Alert.prompt(
                        'Reject Return',
                        'Please provide a reason for rejection',
                        (text) => handleReviewReturn('reject', text),
                        'plain-text'
                      ) : handleReviewReturn('reject', 'Not eligible for return');
                    }}
                    disabled={returnLoading}
                  >
                    <Ionicons name="close-circle" size={18} color="#fff" />
                    <Text style={styles.returnActionBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}

              {(returnRequest.status === 'approved' || returnRequest.status === 'replacement_approved' || returnRequest.status === 'refund_approved') && (
                <TouchableOpacity
                  style={[styles.returnActionBtn, { backgroundColor: Colors.primary, width: '100%', marginTop: 12 }]}
                  onPress={handleReadyForReversePickup}
                  disabled={returnLoading}
                >
                  {returnLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                    <>
                      <Ionicons name="bicycle" size={18} color="#fff" />
                      <Text style={styles.returnActionBtnText}>Initiate Reverse Pickup</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {returnRequest.status === 'returned_to_vendor' && returnRequest.type === 'replace' && (
                <TouchableOpacity
                  style={[styles.returnActionBtn, { backgroundColor: '#2196F3', width: '100%', marginTop: 12 }]}
                  onPress={handleDispatchReplacement}
                  disabled={returnLoading}
                >
                  {returnLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                    <>
                      <Ionicons name="send" size={18} color="#fff" />
                      <Text style={styles.returnActionBtnText}>Dispatch Replacement</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {returnRequest.status === 'returned_to_vendor' && returnRequest.type === 'refund' && (
                <View style={styles.returnActions}>
                  <TouchableOpacity
                    style={[styles.returnActionBtn, { backgroundColor: Colors.primary, flex: 1 }]}
                    onPress={handleConfirmReturnReceived}
                    disabled={returnLoading}
                  >
                    {returnLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                      <>
                        <Ionicons name="checkmark" size={18} color="#fff" />
                        <Text style={styles.returnActionBtnText}>Confirm Received</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.returnActionBtn, { backgroundColor: '#4CAF50', flex: 1 }]}
                    onPress={handleProcessRefund}
                    disabled={returnLoading}
                  >
                    {returnLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                      <>
                        <Ionicons name="cash" size={18} color="#fff" />
                        <Text style={styles.returnActionBtnText}>Process Refund</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {(returnRequest.status === 'return_received' || returnRequest.status === 'refund_initiated') && returnRequest.type === 'refund' && (
                <TouchableOpacity
                  style={[styles.returnActionBtn, { backgroundColor: '#4CAF50', width: '100%', marginTop: 12 }]}
                  onPress={handleProcessRefund}
                  disabled={returnLoading}
                >
                  {returnLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                    <>
                      <Ionicons name="cash" size={18} color="#fff" />
                      <Text style={styles.returnActionBtnText}>Process Refund</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
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
  orderNumberBadge: {
    flex: 1,
    marginRight: 8,
  },
  orderNumberLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  orderId: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
    letterSpacing: 0.3,
  },
  orderDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  dateTextWrapper: {
    flex: 1,
    flexShrink: 1,
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
    flexWrap: 'wrap',
  },
  orderTime: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
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
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  orderItemImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  orderItemImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
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
  priceBreakup: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  priceBreakupTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  priceLabel: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    textAlign: 'right',
  },
  discountValue: {
    color: '#4CAF50',
    fontWeight: '600',
    textAlign: 'right',
  },
  grandTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
  },
  grandTotalLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  grandTotalAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
    textAlign: 'right',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  paymentText: {
    flex: 1,
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
  returnRequestCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  returnTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  returnTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  returnTypeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  returnStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  returnStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  returnDetailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  returnDetailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    width: 90,
  },
  returnDetailValue: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  returnActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  returnActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
  },
  returnActionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
