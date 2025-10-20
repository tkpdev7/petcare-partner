import React, { useState, useEffect } from 'react';
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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppHeader from '../../components/AppHeader';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/Colors';
import apiService from '../../services/apiService';

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
}

export default function HistoryScreen() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [partnerData, setPartnerData] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'>('pending');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<HistoryItem | null>(null);
  const [treatmentSummary, setTreatmentSummary] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Determine if this partner type should show orders (pharmacy & essentials) or appointments (vet & grooming)
  const showOrders = partnerData?.serviceType === 'pharmacy' || partnerData?.serviceType === 'essentials';

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
            customerPhone: item.customer_phone || item.customerPhone || item.customer?.phone
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

    // Map filter to actual statuses (same logic as backend)
    if (filter === 'pending') {
      // "New/Upcoming" - includes placed, confirmed, processing, packed, shipped, out_for_delivery
      return ['pending', 'placed', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'in_progress'].includes(item.status);
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
    setTreatmentSummary('');
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
          treatmentSummary
        );
      } else {
        // Update appointment status
        response = await apiService.updateAppointmentStatus(
          selectedAppointment.id,
          'completed',
          treatmentSummary
        );
      }

      if (response.success) {
        // Update the local state
        setHistory(prevHistory =>
          prevHistory.map(item =>
            item.id === selectedAppointment.id
              ? { ...item, status: showOrders ? 'delivered' as const : 'completed' as const, notes: treatmentSummary }
              : item
          )
        );

        setShowCompletionModal(false);
        setSelectedAppointment(null);
        setTreatmentSummary('');

        Alert.alert('Success', `${showOrders ? 'Order' : 'Appointment'} marked as ${showOrders ? 'delivered' : 'completed'} successfully!`);
      } else {
        Alert.alert('Error', `Failed to update ${showOrders ? 'order' : 'appointment'} status`);
      }
    } catch (error) {
      console.error(`Error updating ${showOrders ? 'order' : 'appointment'} status:`, error);
      Alert.alert('Error', `An error occurred while updating ${showOrders ? 'order' : 'appointment'} status`);
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
    return (
      <TouchableOpacity
        style={styles.historyCard}
        onPress={() => openDetailsModal(item)}
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
            {/* Hide action buttons for completed/cancelled orders */}
            {!['completed', 'delivered', 'cancelled', 'returned', 'no_show'].includes(item.status) && (
              <>
                <TouchableOpacity
                  style={styles.completeButton}
                  onPress={() => openCompletionModal(item)}
                >
                  <Text style={styles.completeButtonText}>Mark Complete</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
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
      <View style={styles.statusTabsContainer}>
        <TouchableOpacity
          style={[styles.statusTab, filter === 'pending' && styles.activeStatusTab]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.statusTabText, filter === 'pending' && styles.activeStatusTabText]}>
            {showOrders ? 'New' : 'Upcoming'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statusTab, filter === 'completed' && styles.activeStatusTab]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.statusTabText, filter === 'completed' && styles.activeStatusTabText]}>Completed</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statusTab, filter === 'cancelled' && styles.activeStatusTab]}
          onPress={() => setFilter('cancelled')}
        >
          <Text style={[styles.statusTabText, filter === 'cancelled' && styles.activeStatusTabText]}>Cancelled</Text>
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
              </View>
            )}

            <View style={styles.modalFooter}>
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

      {/* Completion Modal */}
      <Modal
        visible={showCompletionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCompletionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{showOrders ? 'Complete Order' : 'Complete Appointment'}</Text>
              <TouchableOpacity
                onPress={() => setShowCompletionModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalDescription}>
                {showOrders
                  ? 'Please provide any notes about order completion (optional):'
                  : 'Please provide a summary of the treatment or service provided:'}
              </Text>
              <TextInput
                style={styles.treatmentInput}
                placeholder="Enter treatment summary, diagnosis, recommendations, etc."
                value={treatmentSummary}
                onChangeText={setTreatmentSummary}
                multiline
                numberOfLines={4}
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={styles.characterCount}>{treatmentSummary.length}/500</Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowCompletionModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalCompleteButton,
                  !showOrders && !treatmentSummary.trim() && styles.disabledButton
                ]}
                onPress={markAsCompleted}
                disabled={!showOrders ? !treatmentSummary.trim() : false}
              >
                <Text style={styles.modalCompleteButtonText}>Mark Complete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  statusTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  statusTab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
  },
  activeStatusTab: {
    backgroundColor: Colors.primary,
  },
  statusTabText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textSecondary,
  },
  activeStatusTabText: {
    color: Colors.white,
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
    maxHeight: '80%',
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
  detailColumn: {
    marginTop: Spacing.sm,
  },
  disabledButton: {
    opacity: 0.5,
  },
});