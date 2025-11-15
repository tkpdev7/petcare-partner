import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/Colors';
import apiService from '../../services/apiService';

interface Service {
  id: string;
  name: string;
  description: string;
  short_description?: string;
  category: string;
  sub_category?: string;
  duration: number;
  price: number;
  is_active: boolean;
  created_at: string;
}

export default function ServicesManagementScreen() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [partnerId, setPartnerId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [activeTab, setActiveTab] = useState('All');

  const categories = [
    'All',
    'General Consultation',
    'Vaccination',
    'Surgery',
    'Dental Care',
    'Emergency Care',
    'Grooming',
    'Laboratory Tests',
    'Health Checkup',
  ];

  useEffect(() => {
    loadPartnerData();
  }, []);

  // Reload services when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchServices();
      return () => {
        // Cleanup function (optional)
      };
    }, [])
  );

  useEffect(() => {
    filterServices();
  }, [searchQuery, selectedCategoryFilter, activeTab, services]);

  const loadPartnerData = async () => {
    try {
      const data = await AsyncStorage.getItem('partnerData');
      if (data) {
        const parsed = JSON.parse(data);
        setPartnerId(parsed.id);
      }
      // Fetch services regardless (uses auth token)
      fetchServices();
    } catch (error) {
      console.error('Error loading partner data:', error);
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await apiService.getServices();
      console.log('📦 Services API Response:', JSON.stringify(response, null, 2));

      if (response.success && response.data) {
        // Handle double-nested response from apiService
        let servicesList = [];

        if (Array.isArray(response.data)) {
          // Direct array
          servicesList = response.data;
        } else if (response.data.data && response.data.data.services) {
          // Double-nested with services property
          servicesList = response.data.data.services;
        } else if (response.data.services) {
          // Nested in services property
          servicesList = response.data.services;
        }

        console.log('✅ Services loaded:', servicesList.length, 'items');
        setServices(servicesList);
      } else {
        console.log('❌ No services in response');
        setServices([]);
      }
    } catch (error) {
      console.error('❌ Error fetching services:', error);
      Alert.alert('Error', 'Failed to load services');
      setServices([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterServices = () => {
    let filtered = [...services];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(service =>
        service.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategoryFilter !== 'All') {
      filtered = filtered.filter(service => service.category === selectedCategoryFilter);
    }

    // Filter by active tab
    if (activeTab !== 'All') {
      filtered = filtered.filter(service =>
        activeTab === 'Active' ? service.is_active : !service.is_active
      );
    }

    setFilteredServices(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchServices();
  };

  const handleAddService = () => {
    router.push('/services/add');
  };

  const handleEditService = (service: Service) => {
    router.push(`/services/add?id=${service.id}&mode=edit`);
  };

  const handleDeleteService = (service: Service) => {
    Alert.alert(
      'Delete Service',
      `Are you sure you want to delete "${service.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.deleteService(service.id);
              if (response.success) {
                Alert.alert('Success', 'Service deleted successfully');
                fetchServices();
              } else {
                Alert.alert('Error', response.message || 'Failed to delete service');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete service');
            }
          },
        },
      ]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategoryFilter('All');
    setActiveTab('All');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="menu" size={24} color="#fff" />
          <Text style={styles.headerTitle}>Services</Text>
          <Ionicons name="notifications-outline" size={24} color="#fff" />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading services...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Count categories
  const totalServices = services.length;
  const totalCategories = new Set(services.map(s => s.category)).size;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="menu" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Services</Text>
        <Ionicons name="notifications-outline" size={24} color="#fff" />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for Services"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalServices}</Text>
            <Text style={styles.statLabel}>Total Services</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalCategories}</Text>
            <Text style={styles.statLabel}>Total Categories</Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabsContainer}>
          <View style={styles.filterTabs}>
            {['All', 'Active', 'Inactive'].map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.filterTab, activeTab === tab && styles.activeFilterTab]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.filterTabText, activeTab === tab && styles.activeFilterTabText]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Category Filter Dropdown */}
          <View style={styles.categoryFilterContainer}>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedCategoryFilter}
                onValueChange={setSelectedCategoryFilter}
                style={styles.categoryPicker}
              >
                {categories.map((cat) => (
                  <Picker.Item key={cat} label={cat} value={cat} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        {/* Filter Count and Clear */}
        <View style={styles.filterResultsContainer}>
          <Text style={styles.filterResultsText}>{filteredServices.length} Service{filteredServices.length !== 1 ? 's' : ''} Found</Text>
          {(searchQuery || selectedCategoryFilter !== 'All' || activeTab !== 'All') && (
            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.clearFiltersText}>Clear all</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Selected Filters Tags */}
        {(searchQuery || selectedCategoryFilter !== 'All') && (
          <View style={styles.selectedFiltersContainer}>
            {searchQuery && (
              <View style={styles.filterTag}>
                <Text style={styles.filterTagText}>Search: {searchQuery}</Text>
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            )}
            {selectedCategoryFilter !== 'All' && (
              <View style={styles.filterTag}>
                <Text style={styles.filterTagText}>{selectedCategoryFilter}</Text>
                <TouchableOpacity onPress={() => setSelectedCategoryFilter('All')}>
                  <Ionicons name="close-circle" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Services List */}
        {filteredServices.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="medical" size={80} color={Colors.lightGray} />
            <Text style={styles.emptyTitle}>No Services Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery || selectedCategoryFilter !== 'All'
                ? 'Try adjusting your filters'
                : 'Add your first service to get started'}
            </Text>
          </View>
        ) : (
          <View style={styles.servicesContainer}>
            {filteredServices.map((service) => (
              <View key={service.id} style={styles.serviceCard}>
                <View style={styles.serviceHeader}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <TouchableOpacity onPress={() => handleEditService(service)}>
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.serviceStock}>
                  {service.duration} mins • {service.category}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.floatingAddButton}
        onPress={handleAddService}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.primary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#333',
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
  },
  filterTabsContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 4,
    marginBottom: 12,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeFilterTab: {
    backgroundColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeFilterTabText: {
    color: '#FFFFFF',
  },
  categoryFilterContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  pickerWrapper: {
    overflow: 'hidden',
  },
  categoryPicker: {
    height: 50,
    color: '#333',
  },
  filterResultsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterResultsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  clearFiltersText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  selectedFiltersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  filterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  filterTagText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '500',
  },
  servicesContainer: {
    paddingHorizontal: 16,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  editText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  serviceStock: {
    fontSize: 13,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
