import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/Colors';

interface Transaction {
  id: string;
  customerName: string;
  status: 'Received' | 'Pending';
  amount: number;
  date: string;
  orderDetails: string;
  quantity?: number;
  cost?: number;
  tax?: number;
  total?: number;
}

interface RevenueStats {
  totalReceived: number;
  totalPending: number;
  monthlyRevenue: number;
  selectedPeriod: string;
}

export default function RevenueScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('Month');
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);
  const [revenueStats, setRevenueStats] = useState<RevenueStats>({
    totalReceived: 1500,
    totalPending: 387,
    monthlyRevenue: 1887,
    selectedPeriod: 'Month',
  });

  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: '1',
      customerName: 'Arjun Kumar',
      status: 'Pending',
      amount: 223,
      date: '04/02/2025',
      orderDetails: 'Pet Drug',
      quantity: 1,
      cost: 223,
      tax: 223,
      total: 223,
    },
    {
      id: '2',
      customerName: 'Arjun Kumar',
      status: 'Received',
      amount: 350,
      date: '04/02/2025',
      orderDetails: 'Pet Food',
      quantity: 2,
      cost: 350,
      tax: 35,
      total: 385,
    },
    {
      id: '3',
      customerName: 'Arjun Kumar',
      status: 'Pending',
      amount: 164,
      date: '04/02/2025',
      orderDetails: 'Pet Accessories',
      quantity: 1,
      cost: 164,
      tax: 16,
      total: 180,
    },
  ]);

  useEffect(() => {
    loadRevenueData();
  }, []);

  const loadRevenueData = async () => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In real implementation, fetch data from API
      // const response = await apiService.getRevenueStats();
      
    } catch (error) {
      console.error('Error loading revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTransactionDetails = (transactionId: string) => {
    setExpandedTransaction(
      expandedTransaction === transactionId ? null : transactionId
    );
  };

  const getStatusColor = (status: string) => {
    return status === 'Received' ? '#10B981' : '#EF4444';
  };

  const getStatusBgColor = (status: string) => {
    return status === 'Received' ? '#D1FAE5' : '#FEE2E2';
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Revenue</Text>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading revenue data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Revenue</Text>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedPeriod}
              style={styles.picker}
              onValueChange={(value) => setSelectedPeriod(value)}
            >
              <Picker.Item label="This Week" value="Week" />
              <Picker.Item label="This Month" value="Month" />
              <Picker.Item label="This Year" value="Year" />
            </Picker>
          </View>
        </View>

        {/* Revenue Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: '#10B981' }]}>
            <Text style={styles.statAmount}>{formatCurrency(revenueStats.totalReceived)}</Text>
            <Text style={styles.statLabel}>Received</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#EF4444' }]}>
            <Text style={styles.statAmount}>{formatCurrency(revenueStats.totalPending)}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {/* Transactions List */}
        <View style={styles.transactionsContainer}>
          {transactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionCard}>
              <TouchableOpacity
                style={styles.transactionHeader}
                onPress={() => toggleTransactionDetails(transaction.id)}
              >
                <View style={styles.transactionInfo}>
                  <View style={styles.customerInfo}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {transaction.customerName.split(' ').map(n => n[0]).join('')}
                      </Text>
                    </View>
                    <View style={styles.customerDetails}>
                      <Text style={styles.customerName}>{transaction.customerName}</Text>
                      <View style={styles.statusContainer}>
                        <View style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusBgColor(transaction.status) }
                        ]}>
                          <Text style={[
                            styles.statusText,
                            { color: getStatusColor(transaction.status) }
                          ]}>
                            {transaction.status}
                          </Text>
                        </View>
                        <Text style={styles.transactionDate}>{transaction.date}</Text>
                      </View>
                    </View>
                  </View>
                </View>
                <Ionicons 
                  name={expandedTransaction === transaction.id ? "chevron-up" : "chevron-down"}
                  size={20} 
                  color={Colors.textSecondary} 
                />
              </TouchableOpacity>

              {expandedTransaction === transaction.id && (
                <View style={styles.transactionDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Order details:</Text>
                    <Text style={styles.detailValue}>{transaction.orderDetails}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Quantity:</Text>
                    <Text style={styles.detailValue}>{transaction.quantity}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Cost:</Text>
                    <Text style={styles.detailValue}>{formatCurrency(transaction.cost || 0)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Tax (18%):</Text>
                    <Text style={styles.detailValue}>{formatCurrency(transaction.tax || 0)}</Text>
                  </View>
                  <View style={[styles.detailRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total:</Text>
                    <Text style={styles.totalValue}>{formatCurrency(transaction.total || 0)}</Text>
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSizes.base,
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.white,
    flex: 1,
    textAlign: 'center',
  },
  notificationButton: {
    padding: Spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  periodSelector: {
    marginBottom: Spacing.lg,
  },
  pickerContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: Colors.textPrimary,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  statAmount: {
    fontSize: Typography.fontSizes.xxl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: Typography.fontSizes.base,
    color: Colors.white,
    fontWeight: Typography.fontWeights.medium,
  },
  transactionsContainer: {
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  transactionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  transactionInfo: {
    flex: 1,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.white,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.medium,
  },
  transactionDate: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
  },
  transactionDetails: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  detailLabel: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeights.medium,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  totalValue: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
  },
});