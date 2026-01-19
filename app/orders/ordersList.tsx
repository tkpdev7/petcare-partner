import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../../services/apiService';
import { Colors } from '../../constants/Colors';
import CustomModal from '../../components/CustomModal';
import { useCustomModal } from '../../hooks/useCustomModal';
import SpinningLoader from '../../components/SpinningLoader';

interface Order {
  id: string;
  order_date: string;
  order_status: string;
  customer_name: string;
  customer_phone?: string;
  total_amount: number;
  order_items?: any[];
  payment_method?: string;
}

export default function OrdersListScreen() {
  const modal = useCustomModal();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'ready' | 'out_for_delivery' | 'delivered' | 'cancelled'>('ready');
  const [partnerData, setPartnerData] = useState<any>(null);

  useEffect(() => {
    loadPartnerData();
  }, []);

  useEffect(() => {
    if (partnerData) {
      loadOrders();
    }
  }, [partnerData, selectedTab]);

  useFocusEffect(
    useCallback(() => {
      if (partnerData) {
        console.log('Orders screen focused - reloading orders');
        loadOrders();
      }
    }, [partnerData, selectedTab])
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

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await apiService.getOrders({
        status: selectedTab === 'ready' ? 'ready_for_pickup' : selectedTab,
        limit: 50
      });

      if (response.success && response.data) {
        const ordersData = response.data.data?.orders || response.data.orders || [];
        setOrders(ordersData);
      } else {
        setOrders([]);
      }
    } catch (error: any) {
      console.error('Error loading orders:', error);
      modal.showError('Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const handleOrderPress = (order: Order) => {
    router.push(`/orders/details?orderId=${order.id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'ready_for_pickup':
        return '#00BCD4';
      case 'out_for_delivery':
        return '#9C27B0';
      case 'delivered':
        return '#4CAF50';
      case 'cancelled':
        return '#F44336';
      default:
        return '#666';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'ready_for_pickup':
        return 'Ready for Pickup';
      case 'out_for_delivery':
        return 'Out for Delivery';
      default:
        return status?.charAt(0).toUpperCase() + status?.slice(1).toLowerCase();
    }
  };

  const renderOrderCard = ({ item }: { item: Order }) => {
    let orderItems = [];
    let productNames = '';

    if (item.order_items) {
      try {
        orderItems = typeof item.order_items === 'string'
          ? JSON.parse(item.order_items)
          : item.order_items;
        productNames = orderItems
          .map((orderItem: any) => orderItem.product_name || orderItem.name)
          .filter(Boolean)
          .join(', ');
      } catch (e) {
        console.error('Error parsing order_items:', e);
      }
    }

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => handleOrderPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderIdContainer}>
            <Ionicons name="receipt-outline" size={20} color={Colors.primary} />
            <Text style={styles.orderId}>Order #{item.id}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.order_status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.order_status) }]}>
              {getStatusLabel(item.order_status)}
            </Text>
          </View>
        </View>

        <View style={styles.orderBody}>
          <View style={styles.orderRow}>
            <Ionicons name="person-outline" size={18} color="#666" />
            <Text style={styles.orderText}>{item.customer_name}</Text>
          </View>

          {item.customer_phone && (
            <View style={styles.orderRow}>
              <Ionicons name="call-outline" size={18} color="#666" />
              <Text style={styles.orderText}>{item.customer_phone}</Text>
            </View>
          )}

          {productNames && (
            <View style={styles.orderRow}>
              <Ionicons name="cube-outline" size={18} color="#666" />
              <Text style={styles.orderText} numberOfLines={2}>
                {productNames}
              </Text>
            </View>
          )}

          <View style={styles.orderRow}>
            <Ionicons name="calendar-outline" size={18} color="#666" />
            <Text style={styles.orderText}>
              {new Date(item.order_date).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </Text>
          </View>

          {item.payment_method && (
            <View style={styles.orderRow}>
              <Ionicons name="card-outline" size={18} color="#666" />
              <Text style={styles.orderText}>{item.payment_method}</Text>
            </View>
          )}
        </View>

        <View style={styles.orderFooter}>
          <Text style={styles.totalAmount}>₹{item.total_amount}</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </View>
      </TouchableOpacity>
    );
  };

  const filteredOrders = orders;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'ready' && styles.activeTab]}
          onPress={() => setSelectedTab('ready')}
        >
          <Text style={[styles.tabText, selectedTab === 'ready' && styles.activeTabText]}>
            Ready
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'out_for_delivery' && styles.activeTab]}
          onPress={() => setSelectedTab('out_for_delivery')}
        >
          <Text style={[styles.tabText, selectedTab === 'out_for_delivery' && styles.activeTabText]}>
            Out
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'delivered' && styles.activeTab]}
          onPress={() => setSelectedTab('delivered')}
        >
          <Text style={[styles.tabText, selectedTab === 'delivered' && styles.activeTabText]}>
            Delivered
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'cancelled' && styles.activeTab]}
          onPress={() => setSelectedTab('cancelled')}
        >
          <Text style={[styles.tabText, selectedTab === 'cancelled' && styles.activeTabText]}>
            Cancelled
          </Text>
        </TouchableOpacity>
      </View>

      {/* Orders List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <SpinningLoader message="Loading orders..." />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderOrderCard}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No orders found</Text>
              <Text style={styles.emptySubtext}>
                {selectedTab === 'ready' && 'Orders ready for pickup will appear here'}
                {selectedTab === 'out_for_delivery' && 'Orders out for delivery will appear here'}
                {selectedTab === 'delivered' && 'Delivered orders will appear here'}
                {selectedTab === 'cancelled' && 'Cancelled orders will appear here'}
              </Text>
            </View>
          }
        />
      )}

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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FB',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: Colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  orderCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderBody: {
    gap: 8,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
});
