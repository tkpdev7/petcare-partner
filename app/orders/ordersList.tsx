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
  TextInput,
  Modal,
  Pressable,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  order_type?: 'pharmacy' | 'product';
  return_request?: {
    id: string;
    type: 'replace' | 'refund';
    status: string;
  } | null;
}

export default function OrdersListScreen() {
  const modal = useCustomModal();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'incoming' | 'ready' | 'out_delivered'>('incoming');
  const [partnerData, setPartnerData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeReturnCount, setActiveReturnCount] = useState(0);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showDateFilterModal, setShowDateFilterModal] = useState(false);
  const [activeDateFilter, setActiveDateFilter] = useState<{ label: string; key: string; days: number }>(
    { label: 'All Time', key: 'all', days: 0 }
  );
  // Custom date range
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const DATE_PRESETS = [
    { label: 'All Time', key: 'all', days: 0 },
    { label: 'Last 7 Days', key: '7d', days: 7 },
    { label: 'Last 15 Days', key: '15d', days: 15 },
    { label: 'Last 30 Days', key: '30d', days: 30 },
    { label: 'Last 3 Months', key: '3m', days: 90 },
    { label: 'Custom Range', key: 'custom', days: -1 },
  ];

  useEffect(() => {
    loadPartnerData();
  }, []);

  useEffect(() => {
    if (partnerData) {
      loadOrders();
      // Always fetch delivered orders count for return badge
      fetchReturnRequestCount();
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
      console.log('🔑 Loading partner data from AsyncStorage...');
      const data = await AsyncStorage.getItem('partnerData');
      if (data) {
        const parsedData = JSON.parse(data);
        console.log('✅ Partner data loaded:', {
          id: parsedData.id,
          businessName: parsedData.businessName,
          partnerType: parsedData.partnerType
        });
        setPartnerData(parsedData);
      } else {
        console.warn('⚠️ No partner data found in AsyncStorage');
      }
    } catch (error) {
      console.error('❌ Error loading partner data:', error);
    }
  };

  const fetchReturnRequestCount = async () => {
    try {
      const deliveredResp = await apiService.getOrders({ status: 'delivered', limit: 50 });
      if (deliveredResp.success && deliveredResp.data) {
        const deliveredOrders = deliveredResp.data.data?.orders || deliveredResp.data.orders || deliveredResp.data || [];
        const count = deliveredOrders.filter((o: any) =>
          o.return_request && !['rejected', 'replacement_delivered', 'refund_completed'].includes(o.return_request.status)
        ).length;
        setActiveReturnCount(count);
      }
    } catch (e) {
      // Silently fail - badge just won't show
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      console.log(`📋 Loading orders for tab: ${selectedTab}`);

      let response;
      if (selectedTab === 'incoming') {
        console.log('🔵 Fetching incoming orders (placed + confirmed + processing)...');

        // Fetch placed, confirmed, and processing orders
        const placedResponse = await apiService.getOrders({
          status: 'placed',
          limit: 50
        });
        console.log('✅ Placed orders response:', JSON.stringify(placedResponse, null, 2));

        const confirmedResponse = await apiService.getOrders({
          status: 'confirmed',
          limit: 50
        });
        console.log('✅ Confirmed orders response:', JSON.stringify(confirmedResponse, null, 2));

        const processingResponse = await apiService.getOrders({
          status: 'processing',
          limit: 50
        });
        console.log('✅ Processing orders response:', JSON.stringify(processingResponse, null, 2));

        // Enhanced parsing with detailed logging
        let placedOrders: any[] = [];
        let confirmedOrders = [];
        let processingOrders = [];

        if (placedResponse.success && placedResponse.data) {
          placedOrders = placedResponse.data.data?.orders
            || placedResponse.data.orders
            || placedResponse.data
            || [];
          console.log(`📊 Parsed ${placedOrders.length} placed orders`);
        }

        if (confirmedResponse.success && confirmedResponse.data) {
          console.log('🔍 Confirmed response structure:', {
            hasData: !!confirmedResponse.data,
            hasNestedData: !!confirmedResponse.data.data,
            hasOrders: !!confirmedResponse.data.orders,
            hasNestedOrders: !!confirmedResponse.data.data?.orders
          });

          confirmedOrders = confirmedResponse.data.data?.orders
            || confirmedResponse.data.orders
            || confirmedResponse.data
            || [];
          console.log(`📊 Parsed ${confirmedOrders.length} confirmed orders`);
        } else {
          console.warn('⚠️ Confirmed response not successful or no data:', confirmedResponse);
        }

        if (processingResponse.success && processingResponse.data) {
          console.log('🔍 Processing response structure:', {
            hasData: !!processingResponse.data,
            hasNestedData: !!processingResponse.data.data,
            hasOrders: !!processingResponse.data.orders,
            hasNestedOrders: !!processingResponse.data.data?.orders
          });

          processingOrders = processingResponse.data.data?.orders
            || processingResponse.data.orders
            || processingResponse.data
            || [];
          console.log(`📊 Parsed ${processingOrders.length} processing orders`);
        } else {
          console.warn('⚠️ Processing response not successful or no data:', processingResponse);
        }

        // Deduplicate by ID (confirmed filter includes placed, causing duplicates)
        const seenIds = new Set();
        const combinedOrders = [...placedOrders, ...confirmedOrders, ...processingOrders]
          .filter(order => {
            const key = `${order.order_type || 'product'}_${order.id}`;
            if (seenIds.has(key)) return false;
            seenIds.add(key);
            return true;
          })
          .sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());
        console.log(`🎯 Total incoming orders (deduplicated): ${combinedOrders.length}`);

        // Debug: Log first order structure to see what fields are available
        if (combinedOrders.length > 0) {
          console.log('🔍 Sample order structure (first order):', JSON.stringify(combinedOrders[0], null, 2));
          console.log('🔑 Available keys in order:', Object.keys(combinedOrders[0]));
        }

        setOrders(combinedOrders);
      } else if (selectedTab === 'out_delivered') {
        console.log('🚚 Fetching out & delivered orders...');

        // Fetch both out_for_delivery and delivered orders
        const outResponse = await apiService.getOrders({
          status: 'out_for_delivery',
          limit: 50
        });
        console.log('✅ Out for delivery response:', JSON.stringify(outResponse, null, 2));

        const deliveredResponse = await apiService.getOrders({
          status: 'delivered',
          limit: 50
        });
        console.log('✅ Delivered response:', JSON.stringify(deliveredResponse, null, 2));

        const outOrders = outResponse.success && outResponse.data
          ? (outResponse.data.data?.orders || outResponse.data.orders || outResponse.data || [])
          : [];
        const deliveredOrders = deliveredResponse.success && deliveredResponse.data
          ? (deliveredResponse.data.data?.orders || deliveredResponse.data.orders || deliveredResponse.data || [])
          : [];

        console.log(`📊 Out for delivery: ${outOrders.length}, Delivered: ${deliveredOrders.length}`);

        const combinedOrders = [...outOrders, ...deliveredOrders].sort((a, b) =>
          new Date(b.order_date).getTime() - new Date(a.order_date).getTime()
        );
        setOrders(combinedOrders);
        // Track active return requests count
        const activeReturns = combinedOrders.filter((o: any) =>
          o.return_request && !['rejected', 'replacement_delivered', 'refund_completed'].includes(o.return_request.status)
        ).length;
        setActiveReturnCount(activeReturns);
      } else {
        console.log('📦 Fetching ready for pickup orders...');

        // For 'ready' tab
        response = await apiService.getOrders({
          status: 'ready_for_pickup',
          limit: 50
        });
        console.log('✅ Ready orders response:', JSON.stringify(response, null, 2));

        if (response.success && response.data) {
          const ordersData = response.data.data?.orders
            || response.data.orders
            || response.data
            || [];
          console.log(`📊 Ready orders count: ${ordersData.length}`);
          setOrders(ordersData);
        } else {
          console.warn('⚠️ Ready orders response not successful or no data');
          setOrders([]);
        }
      }
    } catch (error: any) {
      console.error('❌ Error loading orders:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response
      });
      modal.showError('Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log('🏁 Load orders completed');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const handleOrderPress = (order: Order) => {
    console.log('🎯 Order clicked!');
    console.log('📦 Order object:', JSON.stringify(order, null, 2));
    console.log('🔑 Order ID:', order.id);
    console.log('🔑 Order ID type:', typeof order.id);
    console.log('🔑 Order Type:', order.order_type);

    // Default to 'product' if order_type is not specified
    const orderType = order.order_type || 'product';
    console.log('📍 Using order type:', orderType);
    console.log('📍 Navigation URL:', `/orders/details?orderId=${order.id}&orderType=${orderType}`);

    router.push(`/orders/details?orderId=${order.id}&orderType=${orderType}`);
  };

  // Derive display info considering return requests
  const getReturnDisplayInfo = (returnReq: Order['return_request']): { color: string; label: string } | null => {
    if (!returnReq) return null;
    const map: Record<string, { color: string; label: string }> = {
      'pending': { color: '#F59E0B', label: returnReq.type === 'replace' ? 'Replacement Pending' : 'Refund Pending' },
      'approved': { color: '#E65100', label: returnReq.type === 'replace' ? 'Replacement Approved' : 'Refund Approved' },
      'replacement_pending': { color: '#F55536', label: 'Replacement Pending' },
      'replacement_approved': { color: '#E65100', label: 'Replacement Approved' },
      'refund_pending': { color: '#F59E0B', label: 'Refund Pending' },
      'refund_approved': { color: '#E65100', label: 'Refund Approved' },
      'pickup_scheduled': { color: '#7C3AED', label: 'Pickup Scheduled' },
      'picked_up_from_customer': { color: '#9C27B0', label: 'Return Pickup Done' },
      'returned_to_vendor': { color: '#7B1FA2', label: 'Returned to You' },
      'return_received': { color: '#4527A0', label: 'Return Received' },
      'refund_initiated': { color: '#2196F3', label: 'Refund In Progress' },
      'replacement_delivered': { color: '#4CAF50', label: 'Replacement Delivered' },
      'refund_completed': { color: '#4CAF50', label: 'Refund Completed' },
      'rejected': { color: '#EF4444', label: 'Return Rejected' },
    };
    return map[returnReq.status] || {
      color: '#9C27B0',
      label: returnReq.status?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Return',
    };
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'placed':
        return '#8B5CF6';
      case 'confirmed':
        return '#2196F3';
      case 'processing':
        return '#FF9800';
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
      case 'placed':
        return 'Placed (Order Placed)';
      case 'confirmed':
        return 'Confirmed';
      case 'processing':
        return 'Processing';
      case 'ready_for_pickup':
        return 'Ready for Pickup';
      case 'out_for_delivery':
        return 'Out for Delivery';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status?.charAt(0).toUpperCase() + status?.slice(1).toLowerCase();
    }
  };

  const renderOrderCard = ({ item }: { item: Order }) => {
    let orderItems = [];
    let productNames = '';
    let firstItemImage: string | null = null;

    if (item.order_items) {
      try {
        orderItems = typeof item.order_items === 'string'
          ? JSON.parse(item.order_items)
          : item.order_items;

        console.log(`🛒 [Order ${item.id}] order_items count: ${orderItems.length}`);
        if (orderItems.length > 0) {
          const firstItem = orderItems[0];
          console.log(`🛒 [Order ${item.id}] first item keys:`, Object.keys(firstItem));
          console.log(`🛒 [Order ${item.id}] first item image fields:`, {
            image_url: firstItem.image_url,
            imageUrl: firstItem.imageUrl,
            image: firstItem.image,
            photo: firstItem.photo,
            thumbnail: firstItem.thumbnail,
            thumbnail_url: firstItem.thumbnail_url,
          });
        }

        productNames = orderItems
          .map((orderItem: any) => orderItem.product_name || orderItem.name)
          .filter(Boolean)
          .join(', ');
        firstItemImage = orderItems[0]?.image_url
          || orderItems[0]?.imageUrl
          || orderItems[0]?.image
          || orderItems[0]?.thumbnail_url
          || orderItems[0]?.thumbnail
          || (item as any).order_image
          || null;

        console.log(`🛒 [Order ${item.id}] resolved image: ${firstItemImage}`);
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
          {firstItemImage ? (
            <Image source={{ uri: firstItemImage }} style={styles.productThumb} />
          ) : (
            <View style={[styles.productThumb, styles.productThumbPlaceholder]}>
              <Ionicons name="bag-outline" size={20} color="#ccc" />
            </View>
          )}
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

        {/* Return Request Badge */}
        {item.return_request && (
          <View style={[styles.returnBadgeRow, {
            backgroundColor: (getReturnDisplayInfo(item.return_request)?.color || '#9C27B0') + '12',
            borderColor: (getReturnDisplayInfo(item.return_request)?.color || '#9C27B0') + '40',
          }]}>
            <Ionicons
              name={item.return_request.type === 'replace' ? 'swap-horizontal' : 'cash-outline'}
              size={15}
              color={getReturnDisplayInfo(item.return_request)?.color || '#9C27B0'}
            />
            <Text style={[styles.returnBadgeText, {
              color: getReturnDisplayInfo(item.return_request)?.color || '#9C27B0',
            }]}>
              {getReturnDisplayInfo(item.return_request)?.label}
            </Text>
          </View>
        )}

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

  const filteredOrders = orders.filter(order => {
    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      if (!order.id.toString().toLowerCase().includes(query)) {
        return false;
      }
    }

    // Status filter
    if (statusFilter !== 'all' && order.order_status !== statusFilter) {
      return false;
    }

    // Date filter
    const orderDate = new Date(order.order_date);
    if (activeDateFilter.key === 'custom') {
      if (fromDate) {
        const from = new Date(fromDate); from.setHours(0, 0, 0, 0);
        if (orderDate < from) return false;
      }
      if (toDate) {
        const to = new Date(toDate); to.setHours(23, 59, 59, 999);
        if (orderDate > to) return false;
      }
    } else if (activeDateFilter.days > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - activeDateFilter.days);
      cutoff.setHours(0, 0, 0, 0);
      if (orderDate < cutoff) return false;
    }

    return true;
  });

  const handleBackPress = () => {
    // Navigate back or to home
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const applyFilters = () => {
    setShowFilters(false);
  };

  const resetFilters = () => {
    setStatusFilter('all');
    setActiveDateFilter({ label: 'All Time', key: 'all', days: 0 });
    setFromDate(null);
    setToDate(null);
  };

  const formatDateDisplay = (date: Date) =>
    date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Title and Search */}
      <View style={styles.headerContainer}>
        {/* Title Bar with Back Button */}
        <View style={styles.titleBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={26} color="#222" />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Orders</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={22} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by Order ID..."
              placeholderTextColor="#aaa"
              value={searchQuery}
              onChangeText={setSearchQuery}
              keyboardType="default"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={22} color="#666" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
            activeOpacity={0.7}
          >
            <Ionicons name="filter" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Filters Section */}
        {showFilters && (
          <View style={styles.filtersContainer}>
            {/* Status Filter */}
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Status:</Text>
              <TouchableOpacity
                style={styles.filterPickerButton}
                onPress={() => setShowStatusPicker(!showStatusPicker)}
              >
                <Text style={styles.filterPickerText}>
                  {statusFilter === 'all' ? 'All Status' : getStatusLabel(statusFilter)}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Status Picker Modal */}
            {showStatusPicker && (
              <View style={styles.pickerContainer}>
                <TouchableOpacity
                  style={styles.pickerOption}
                  onPress={() => {
                    setStatusFilter('all');
                    setShowStatusPicker(false);
                  }}
                >
                  <Text style={[styles.pickerOptionText, statusFilter === 'all' && styles.pickerOptionSelected]}>
                    All Status
                  </Text>
                </TouchableOpacity>
                {['placed', 'confirmed', 'processing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={styles.pickerOption}
                    onPress={() => {
                      setStatusFilter(status);
                      setShowStatusPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerOptionText, statusFilter === status && styles.pickerOptionSelected]}>
                      {getStatusLabel(status)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Date Range Filter */}
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Date Range:</Text>
              <TouchableOpacity
                style={styles.filterPickerButton}
                onPress={() => setShowDateFilterModal(true)}
              >
                <Text style={styles.filterPickerText} numberOfLines={1}>{activeDateFilter.label}</Text>
                <Ionicons name="chevron-down" size={18} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Custom date pickers — shown only when Custom Range is selected */}
            {activeDateFilter.key === 'custom' && (
              <View style={styles.customDateRow}>
                <View style={styles.customDateItem}>
                  <Text style={styles.filterLabel}>From:</Text>
                  <TouchableOpacity style={styles.dateButton} onPress={() => setShowFromPicker(true)}>
                    <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
                    <Text style={styles.dateText}>
                      {fromDate ? formatDateDisplay(fromDate) : 'Select'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.customDateItem}>
                  <Text style={styles.filterLabel}>To:</Text>
                  <TouchableOpacity style={styles.dateButton} onPress={() => setShowToPicker(true)}>
                    <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
                    <Text style={styles.dateText}>
                      {toDate ? formatDateDisplay(toDate) : 'Select'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Filter Actions */}
            <View style={styles.filterActions}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetFilters}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={applyFilters}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Date Pickers */}
      {showFromPicker && (
        <DateTimePicker
          value={fromDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={toDate || new Date()}
          onChange={(_, date) => {
            setShowFromPicker(Platform.OS === 'ios');
            if (date) setFromDate(date);
          }}
        />
      )}
      {showToPicker && (
        <DateTimePicker
          value={toDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={fromDate || undefined}
          maximumDate={new Date()}
          onChange={(_, date) => {
            setShowToPicker(Platform.OS === 'ios');
            if (date) setToDate(date);
          }}
        />
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'incoming' && styles.activeTab]}
          onPress={() => setSelectedTab('incoming')}
        >
          <Text style={[styles.tabText, selectedTab === 'incoming' && styles.activeTabText]}>
            Incoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'ready' && styles.activeTab]}
          onPress={() => setSelectedTab('ready')}
        >
          <Text style={[styles.tabText, selectedTab === 'ready' && styles.activeTabText]}>
            Ready
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'out_delivered' && styles.activeTab]}
          onPress={() => setSelectedTab('out_delivered')}
        >
          <View style={styles.tabInner}>
            <Text style={[styles.tabText, selectedTab === 'out_delivered' && styles.activeTabText]}>
              Out & Delivered
            </Text>
            {activeReturnCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{activeReturnCount}</Text>
              </View>
            )}
          </View>
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
              <Ionicons name={searchQuery ? "search-outline" : "receipt-outline"} size={64} color="#ccc" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No matching orders found' : 'No orders found'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery
                  ? `No orders found matching "${searchQuery}"`
                  : selectedTab === 'incoming'
                    ? 'New incoming orders will appear here'
                    : selectedTab === 'ready'
                      ? 'Orders ready for pickup will appear here'
                      : 'Orders out for delivery and delivered will appear here'
                }
              </Text>
            </View>
          }
        />
      )}

      {/* Date Filter Modal */}
      <Modal visible={showDateFilterModal} transparent animationType="slide" onRequestClose={() => setShowDateFilterModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowDateFilterModal(false)}>
          <View style={styles.dateFilterSheet}>
            <View style={styles.dateFilterSheetHeader}>
              <Text style={styles.dateFilterSheetTitle}>Filter by Date</Text>
              <TouchableOpacity onPress={() => setShowDateFilterModal(false)}>
                <Ionicons name="close" size={22} color="#333" />
              </TouchableOpacity>
            </View>
            {DATE_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.key}
                style={[styles.datePresetOption, activeDateFilter.key === preset.key && styles.datePresetOptionActive]}
                onPress={() => {
                  setActiveDateFilter(preset);
                  setShowDateFilterModal(false);
                }}
              >
                <Text style={[styles.datePresetText, activeDateFilter.key === preset.key && styles.datePresetTextActive]}>
                  {preset.label}
                </Text>
                {activeDateFilter.key === preset.key && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
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
  },
  headerContainer: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222',
    letterSpacing: -0.5,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 2,
    borderColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#222',
    paddingVertical: 10,
    fontWeight: '500',
  },
  clearButton: {
    padding: 6,
    marginLeft: 6,
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
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  productThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  productThumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
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
    flexShrink: 1,
    maxWidth: 130,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  returnBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  returnBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabBadge: {
    backgroundColor: '#F55536',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterButton: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  filtersContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    gap: 12,
  },
  filterRow: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  filterPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  filterPickerText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  customDateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  customDateItem: {
    flex: 1,
    gap: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  pickerContainer: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    overflow: 'hidden',
  },
  pickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#333',
  },
  pickerOptionSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  dateFilterSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  dateFilterSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dateFilterSheetTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
  },
  datePresetOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f7f7f7',
  },
  datePresetOptionActive: {
    backgroundColor: Colors.primary + '10',
  },
  datePresetText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  datePresetTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
