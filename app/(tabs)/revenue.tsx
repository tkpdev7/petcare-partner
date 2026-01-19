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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/Colors';
import apiService from '../../services/apiService';

interface RevenueSummary {
  total_transactions: number;
  total_gross: number;
  total_commission: number;
  total_tds: number;
  total_net_payable: number;
  settled_count: number;
  pending_count: number;
}

interface RevenueItem {
  id: number;
  source_type: 'APPOINTMENT' | 'ORDER';
  source_id: number;
  source_type_display: string;
  appointment_id?: number;
  order_id?: number;
  product_name?: string;
  service_name?: string;
  service_id?: number;
  product_id?: number;
  item_name: string;
  quantity: number;
  gross_amount: number;
  platform_commission: number;
  vendor_payable: number;
  tds_deduction: number;
  tds_amount: number;
  net_payable: number;
  status: 'PENDING' | 'SETTLED';
  created_at: string;
}

export default function RevenueScreen() {
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [revenues, setRevenues] = useState<RevenueItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [partnerData, setPartnerData] = useState<any>(null);
  const [timeFilter, setTimeFilter] = useState<'today' | 'month' | 'all'>('month');

  useEffect(() => {
    loadPartnerData();
  }, []);

  useEffect(() => {
    if (partnerData) {
      loadRevenueData();
    }
  }, [partnerData, timeFilter]);

  // Auto-refresh when tab comes into focus
  useFocusEffect(
    useCallback(() => {
      if (partnerData) {
        loadRevenueData();
      }
    }, [partnerData, timeFilter])
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

  const loadRevenueData = async () => {
    try {
      setLoading(true);

      // Load summary and revenue list in parallel
      const [summaryResponse, revenuesResponse] = await Promise.all([
        apiService.getRevenueSummary(getDateFilters()),
        apiService.getRevenues({ ...getDateFilters(), limit: 50 })
      ]);

      // Extract data from nested response structure
      if (summaryResponse.success) {
        const summaryData = summaryResponse.data.data || summaryResponse.data;
        setSummary(summaryData);
      }

      if (revenuesResponse.success) {
        const revenuesData = revenuesResponse.data.data || revenuesResponse.data;
        setRevenues(Array.isArray(revenuesData) ? revenuesData : []);
      }

    } catch (error) {
      console.error('Error loading revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateFilters = () => {
    const now = new Date();
    const filters: any = {};

    if (timeFilter === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filters.from = today.toISOString().split('T')[0];
      filters.to = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString().split('T')[0];
    } else if (timeFilter === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      filters.from = startOfMonth.toISOString().split('T')[0];
      filters.to = endOfMonth.toISOString().split('T')[0];
    }
    // For 'all', no date filters

    return filters;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRevenueData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number | undefined | null) => {
    const value = amount ?? 0;
    return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SETTLED': return Colors.success;
      case 'PENDING': return Colors.warning;
      default: return Colors.textSecondary;
    }
  };

  const renderSummaryCard = ({ title, value, subtitle, color = Colors.primary }: {
    title: string;
    value: string;
    subtitle?: string;
    color?: string;
  }) => (
    <View style={[styles.summaryCard, { borderLeftColor: color }]}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryTitle}>{title}</Text>
      {subtitle && <Text style={styles.summarySubtitle}>{subtitle}</Text>}
    </View>
  );

  const renderRevenueItem = ({ item }: { item: RevenueItem }) => {
    // Get the specific ID based on source type
    const specificId = item.source_type === 'APPOINTMENT' ? item.appointment_id : item.order_id;
    const specificName = item.source_type === 'APPOINTMENT' ? item.service_name : item.product_name;

    return (
      <View style={styles.revenueCard}>
        <View style={styles.revenueHeader}>
          <View>
            <Text style={styles.revenueTitle}>
              {item.source_type_display} #{specificId || item.source_id}
            </Text>
            <Text style={styles.revenueSubtitle}>
              {specificName || item.item_name}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <Text style={styles.quantityText}>Quantity: {item.quantity}</Text>

        <View style={styles.amountsContainer}>
          <View style={styles.amountsRow}>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Gross Amount</Text>
              <Text style={styles.amountValue}>{formatCurrency(item.gross_amount)}</Text>
            </View>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Commission</Text>
              <Text style={styles.amountValueRed}>-{formatCurrency(item.platform_commission)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.amountsRow}>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabelBold}>Vendor Payable</Text>
              <Text style={styles.amountValueBlue}>{formatCurrency(item.vendor_payable)}</Text>
            </View>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>TDS Deduction</Text>
              <Text style={styles.amountValueRed}>-{formatCurrency(item.tds_deduction || item.tds_amount)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.netPayableRow}>
            <Text style={styles.netPayableLabel}>Net Payable</Text>
            <Text style={styles.netPayableValue}>{formatCurrency(item.net_payable)}</Text>
          </View>
        </View>

        <Text style={styles.dateText}>
          {new Date(item.created_at).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })}
        </Text>
      </View>
    );
  };

  if (loading && !summary) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="Revenue" showBackButton={false} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading revenue data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Revenue" showBackButton={false} />

      {/* Time Filter */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, timeFilter === 'today' && styles.filterButtonActive]}
          onPress={() => setTimeFilter('today')}
        >
          <Text style={[styles.filterText, timeFilter === 'today' && styles.filterTextActive]}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, timeFilter === 'month' && styles.filterButtonActive]}
          onPress={() => setTimeFilter('month')}
        >
          <Text style={[styles.filterText, timeFilter === 'month' && styles.filterTextActive]}>This Month</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, timeFilter === 'all' && styles.filterButtonActive]}
          onPress={() => setTimeFilter('all')}
        >
          <Text style={[styles.filterText, timeFilter === 'all' && styles.filterTextActive]}>All Time</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      {summary && (
        <View style={styles.summaryContainer}>
          {renderSummaryCard({
            title: 'Total Gross',
            value: formatCurrency(summary.total_gross),
            color: Colors.primary
          })}
          {renderSummaryCard({
            title: 'Total Commission',
            value: formatCurrency(summary.total_commission),
            subtitle: '(Platform fee)',
            color: Colors.error
          })}
          {renderSummaryCard({
            title: 'Total TDS',
            value: formatCurrency(summary.total_tds),
            subtitle: '(Tax deducted)',
            color: Colors.warning
          })}
          {renderSummaryCard({
            title: 'Net Payable',
            value: formatCurrency(summary.total_net_payable),
            subtitle: `${summary.pending_count || 0} pending, ${summary.settled_count || 0} settled`,
            color: Colors.success
          })}
        </View>
      )}

      {/* Transactions Count */}
      <View style={styles.transactionsHeader}>
        <Text style={styles.transactionsCount}>
          {revenues.length} Transaction{revenues.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Revenue List */}
      <View style={styles.content}>
        {revenues.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cash-outline" size={64} color={Colors.textTertiary} />
            <Text style={styles.emptyStateText}>No revenue transactions found</Text>
            <Text style={styles.emptyStateSubtext}>
              Revenue will appear here when appointments or orders are completed
            </Text>
          </View>
        ) : (
          <FlatList
            data={revenues}
            renderItem={renderRevenueItem}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.revenueList}
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  filterButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeights.medium,
  },
  filterTextActive: {
    color: Colors.white,
    fontWeight: Typography.fontWeights.bold,
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    borderLeftWidth: 4,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryValue: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  summaryTitle: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeights.medium,
  },
  summarySubtitle: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  transactionsHeader: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  transactionsCount: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  content: {
    flex: 1,
    paddingTop: Spacing.sm,
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
  revenueList: {
    paddingBottom: 120,
  },
  revenueCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    marginHorizontal: Spacing.lg,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  revenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  revenueTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  revenueSubtitle: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
  },
  itemName: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  quantityText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  amountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  amountItem: {
    alignItems: 'center',
    flex: 1,
  },
  amountLabel: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textTertiary,
    marginBottom: Spacing.xs,
  },
  amountValue: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  amountValueRed: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.error,
  },
  amountValueGreen: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.success,
  },
  amountValueBlue: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
  },
  amountLabelBold: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    fontWeight: Typography.fontWeights.bold,
  },
  amountsContainer: {
    marginVertical: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  netPayableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
  },
  netPayableLabel: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  netPayableValue: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.success,
  },
  dateText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textTertiary,
    textAlign: 'right',
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
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});