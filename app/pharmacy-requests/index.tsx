import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../../services/apiService';

interface MedicineRequest {
  id: string;
  request_number: string;
  request_title: string;
  request_description: string;
  required_medicines: Array<{
    name: string;
    dosage?: string;
    quantity?: number;
  }>;
  urgency_level: 'low' | 'normal' | 'high' | 'urgent';
  delivery_address: string;
  status: 'active' | 'closed' | 'expired';
  created_at: string;
  user_name?: string;
  pet_name?: string;
  pet_type?: string;
  quote_count?: number;
}

const urgencyColors = {
  low: '#10B981',
  normal: '#3B82F6',
  high: '#F59E0B',
  urgent: '#EF4444',
};

const urgencyLabels = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

export default function MyRequestsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<MedicineRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'quoted'>('active');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await apiService.makeRequest('GET', '/medicine-request/active', undefined, {
        params: { limit: 100 }
      });

      if (response.success && response.data) {
        const requestsData = response.data.requests || [];
        setRequests(requestsData);
      } else {
        Alert.alert('Error', response.error || 'Failed to load requests');
      }
    } catch (error) {
      console.error('Error loading requests:', error);
      Alert.alert('Error', 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  }, []);

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.request_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.required_medicines?.some(med => med.name?.toLowerCase().includes(searchQuery.toLowerCase()));

    if (filter === 'all') return matchesSearch;
    if (filter === 'active') return matchesSearch && request.status === 'active';
    if (filter === 'quoted') return matchesSearch && (request.quote_count || 0) > 0;

    return matchesSearch;
  });

  const renderRequestCard = ({ item }: { item: MedicineRequest }) => (
    <TouchableOpacity
      style={styles.requestCard}
      onPress={() => router.push({
        pathname: '/pharmacy-requests/view-request',
        params: { id: item.id }
      })}
    >
      <View style={styles.requestHeader}>
        <View style={styles.requestTitleRow}>
          <Text style={styles.requestTitle}>{item.request_title}</Text>
          <View style={[styles.urgencyBadge, { backgroundColor: urgencyColors[item.urgency_level] }]}>
            <Text style={styles.urgencyText}>{urgencyLabels[item.urgency_level]}</Text>
          </View>
        </View>
        <Text style={styles.requestNumber}>{item.request_number}</Text>
      </View>

      <View style={styles.medicinesList}>
        <View style={styles.medicineHeader}>
          <Ionicons name="medical" size={16} color="#666" />
          <Text style={styles.medicineLabel}>Required Medicines:</Text>
        </View>
        {item.required_medicines?.slice(0, 3).map((medicine, index) => (
          <View key={index} style={styles.medicineItem}>
            <Text style={styles.medicineName}>• {medicine.name}</Text>
            {medicine.quantity && (
              <Text style={styles.medicineQuantity}>Qty: {medicine.quantity}</Text>
            )}
          </View>
        ))}
        {item.required_medicines?.length > 3 && (
          <Text style={styles.moreText}>+{item.required_medicines.length - 3} more</Text>
        )}
      </View>

      {item.pet_name && (
        <View style={styles.petInfo}>
          <Ionicons name="paw" size={14} color="#666" />
          <Text style={styles.petText}>{item.pet_name} ({item.pet_type})</Text>
        </View>
      )}

      <View style={styles.requestFooter}>
        <View style={styles.dateContainer}>
          <Ionicons name="time-outline" size={14} color="#666" />
          <Text style={styles.dateText}>
            {new Date(item.created_at).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })}
          </Text>
        </View>

        {item.quote_count !== undefined && item.quote_count > 0 && (
          <View style={styles.quoteBadge}>
            <Ionicons name="document-text" size={14} color="#10B981" />
            <Text style={styles.quoteText}>{item.quote_count} Quote{item.quote_count > 1 ? 's' : ''}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => router.push({
            pathname: '/pharmacy-requests/view-request',
            params: { id: item.id }
          })}
        >
          <Text style={styles.viewButtonText}>View & Quote</Text>
          <Ionicons name="arrow-forward" size={16} color="#FF7A59" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="medical-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Medicine Requests</Text>
      <Text style={styles.emptyText}>
        {filter === 'all'
          ? 'There are no medicine requests at the moment'
          : filter === 'active'
          ? 'No active requests available'
          : 'You haven\'t quoted on any requests yet'}
      </Text>
      <TouchableOpacity style={styles.refreshButton} onPress={loadRequests}>
        <Ionicons name="refresh" size={20} color="#fff" />
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Requests</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF7A59" />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Requests</Text>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by medicine name or request title..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'active' && styles.filterButtonActive]}
          onPress={() => setFilter('active')}
        >
          <Text style={[styles.filterButtonText, filter === 'active' && styles.filterButtonTextActive]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'quoted' && styles.filterButtonActive]}
          onPress={() => setFilter('quoted')}
        >
          <Text style={[styles.filterButtonText, filter === 'quoted' && styles.filterButtonTextActive]}>
            Quoted
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          {filteredRequests.length} Request{filteredRequests.length !== 1 ? 's' : ''} Found
        </Text>
      </View>

      <FlatList
        data={filteredRequests}
        keyExtractor={(item) => item.id}
        renderItem={renderRequestCard}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF7A59"
          />
        }
        ListEmptyComponent={renderEmptyState}
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  notificationButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterButtonActive: {
    backgroundColor: '#FF7A59',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  statsText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  listContainer: {
    padding: 20,
    paddingTop: 8,
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
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  requestHeader: {
    marginBottom: 12,
  },
  requestTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  requestNumber: {
    fontSize: 12,
    color: '#999',
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgencyText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: 'bold',
  },
  medicinesList: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  medicineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  medicineLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginLeft: 6,
  },
  medicineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  medicineName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  medicineQuantity: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  moreText: {
    fontSize: 12,
    color: '#FF7A59',
    fontWeight: '600',
    marginTop: 4,
  },
  petInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  petText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  quoteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  quoteText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 4,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: 14,
    color: '#FF7A59',
    fontWeight: '600',
    marginRight: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF7A59',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
