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
  status: 'completed' | 'cancelled';
  totalAmount: number;
  rating?: number;
  review?: string;
}

export default function HistoryScreen() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [partnerData, setPartnerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPartnerData();
  }, []);

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
      const isPharmacyPartner = partnerData?.serviceType === 'pharmacy';
      
      let response;
      if (isPharmacyPartner) {
        // Load orders for pharmacy partners
        response = await apiService.getOrders({
          status: filter === 'all' ? undefined : filter,
          limit: 50
        });
      } else {
        // Load appointments for service providers
        response = await apiService.getAppointments({
          status: filter === 'all' ? undefined : filter,
          limit: 50
        });
      }
      
      if (response.success && response.data) {
        const items = isPharmacyPartner ? response.data.orders || [] : response.data.appointments || [];
        
        // Transform API data to match our interface
        const transformedHistory = items.map((item: any) => ({
          id: item.id,
          customerName: item.customerName || item.customer?.name || 'Unknown Customer',
          petName: item.petName || item.pet?.name || 'Pet',
          service: item.service || item.productName || item.serviceName || 'Service',
          appointmentDate: item.appointmentDate || item.orderDate || item.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
          appointmentTime: item.appointmentTime || item.orderTime || '10:00 AM',
          status: item.status === 'completed' ? 'completed' : 'cancelled',
          totalAmount: item.totalAmount || item.amount || item.price || 0,
          rating: item.rating,
          review: item.review
        }));
        
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
        onPress={() => toggleExpanded(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <Text style={styles.orderNumber}>Order#{item.id.padStart(3, '0')}</Text>
          <View style={styles.expandButton}>
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color={Colors.textSecondary}
            />
          </View>
        </View>
        
        <Text style={styles.productInfo}>{partnerData?.serviceType === 'pharmacy' ? 'Product' : 'Service'} : {item.service}</Text>
        {partnerData?.serviceType === 'pharmacy' ? (
          <>
            <Text style={styles.totalInfo}>Total ₹{item.totalAmount}</Text>
          </>
        ) : (
          <>
            <Text style={styles.appointmentInfo}>Customer: {item.customerName}</Text>
            <Text style={styles.appointmentInfo}>Pet: {item.petName}</Text>
            <Text style={styles.appointmentInfo}>Date: {item.appointmentDate}</Text>
            <Text style={styles.appointmentInfo}>Time: {item.appointmentTime}</Text>
            <Text style={styles.totalInfo}>Amount: ₹{item.totalAmount}</Text>
          </>
        )}
        
        <View style={styles.orderFooter}>
          <Text style={[styles.statusText, { color: item.status === 'completed' ? Colors.success : Colors.warning }]}>
            Status: {item.status === 'completed' ? 'Completed' : 'Pending'}
          </Text>
          {item.status !== 'completed' && (
            <TouchableOpacity style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
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
                <Text style={styles.detailText}>Pet: {item.petName}</Text>
              </View>
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
      <AppHeader title={partnerData?.serviceType === 'pharmacy' ? 'My Orders' : 'My Appointments'} showBackButton={false} />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={partnerData?.serviceType === 'pharmacy' ? 'Search for Products' : 'Search for Appointments'}
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
          <Text style={styles.statsLabel}>Total {partnerData?.serviceType === 'pharmacy' ? 'Orders' : 'Appointments'}</Text>
        </View>
        <View style={styles.statsCard}>
          <Text style={styles.statsNumber}>{filteredHistory.filter(item => item.status === 'completed').length}</Text>
          <Text style={styles.statsLabel}>Completed</Text>
        </View>
      </View>

      {/* Status Filter Tabs */}
      <View style={styles.statusTabsContainer}>
        <TouchableOpacity
          style={[styles.statusTab, filter === 'all' && styles.activeStatusTab]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.statusTabText, filter === 'all' && styles.activeStatusTabText]}>All</Text>
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
        <Text style={styles.ordersCount}>{filteredHistory.length} {partnerData?.serviceType === 'pharmacy' ? 'Orders' : 'Appointments'} Found</Text>
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
            <Text style={styles.emptyStateText}>No {partnerData?.serviceType === 'pharmacy' ? 'orders' : 'appointments'} found</Text>
            <Text style={styles.emptyStateSubtext}>
              {filter === 'all' 
                ? `No ${partnerData?.serviceType === 'pharmacy' ? 'orders' : 'appointments'} in history` 
                : `No ${filter} ${partnerData?.serviceType === 'pharmacy' ? 'orders' : 'appointments'} found`}
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
    paddingBottom: Spacing.xl,
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
});