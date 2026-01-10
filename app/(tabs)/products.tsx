import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppHeader from '../../components/AppHeader';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/Colors';
import apiService from '../../services/apiService';
import CustomModal from '../../components/CustomModal';
import { useCustomModal } from '../../hooks/useCustomModal';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images?: string[];
  category: string;
  prescriptionRequired?: boolean;
  ageLimit?: string;
  stock: number;
  isActive: boolean;
}

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  duration?: string;
  isActive: boolean;
}

export default function ProductsScreen() {
  const modal = useCustomModal();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pharmacy' | 'essentials'>('all');
  const [partnerData, setPartnerData] = useState<any>(null);
  const [inventoryStats, setInventoryStats] = useState({
    totalProducts: 0,
    totalCategories: 0,
    lowStock: 0,
    outOfStock: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPartnerData();
  }, []);

  useEffect(() => {
    if (partnerData) {
      if (partnerData.serviceType === 'pharmacy' || partnerData.serviceType === 'essentials') {
        loadProducts();
      } else {
        loadServices();
      }
    }
  }, [partnerData]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (partnerData) {
        if (partnerData.serviceType === 'pharmacy' || partnerData.serviceType === 'essentials') {
          loadProducts();
        } else {
          loadServices();
        }
      }
    }, [partnerData])
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

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await apiService.getProducts();
      
      if (response.success && response.data && response.data.data && response.data.data.products) {
        setProducts(response.data.data.products);
        
        // Load product stats
        const statsResponse = await apiService.getProductStats();
        console.log('Stats response:', JSON.stringify(statsResponse, null, 2));
        if (statsResponse.success && statsResponse.data) {
          // Access nested data structure: response.data.data
          const statsData = statsResponse.data.data || statsResponse.data;
          console.log('Stats data:', JSON.stringify(statsData, null, 2));
          setInventoryStats({
            totalProducts: statsData.totalProducts || 0,
            totalCategories: statsData.totalCategories || 0,
            lowStock: statsData.lowStock || 0,
            outOfStock: statsData.outOfStock || 0,
          });
        }
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      setLoading(true);
      const response = await apiService.getServices();
      
      if (response.success && response.data && response.data.data && response.data.data.services) {
        setServices(response.data.data.services);
      }
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || product.category === filter;
    return matchesSearch && matchesFilter;
  });

  const toggleProductStatus = (productId: string) => {
    setProducts(prev =>
      prev.map(product =>
        product.id === productId
          ? { ...product, isActive: !product.isActive }
          : product
      )
    );
  };

  const deleteProduct = (productId: string) => {
    modal.showWarning('Are you sure you want to delete this product?', {
      title: 'Delete Product',
      primaryButtonText: 'Delete',
      secondaryButtonText: 'Cancel',
      hideSecondaryButton: false,
      onPrimaryPress: () => {
        setProducts(prev => prev.filter(product => product.id !== productId));
        modal.hideModal();
      },
      onSecondaryPress: () => modal.hideModal()
    });
  };

  const renderProductCard = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => router.push(`/products/add?id=${item.id}&mode=view`)}
      activeOpacity={0.7}
    >
      <View style={styles.productContent}>
        <View style={styles.productHeader}>
          <Text style={styles.productName}>{item.name}</Text>
          <View style={styles.productActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                router.push(`/products/add?id=${item.id}&mode=edit`);
              }}
            >
              <Ionicons name="create-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                deleteProduct(item.id);
              }}
            >
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.productStock}>Stock: {item.stock} units • {item.category}</Text>
        <Text style={styles.productPrice}>₹{item.price}</Text>
      </View>
    </TouchableOpacity>
  );

  // Check if partner is vet/grooming (services) or pharmacy/essentials (products)
  const isVetOrGrooming = partnerData?.serviceType === 'veterinary' || partnerData?.serviceType === 'grooming';

  if (isVetOrGrooming) {
    // Show services page for vet/grooming partners
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="Services" showBackButton={false} />
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Services</Text>
            <Text style={styles.sectionSubtitle}>
              Manage your service offerings and availability
            </Text>
          </View>

          {/* Add Service Button */}
          <View style={styles.addButtonContainer}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/services/add')}
            >
              <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
              <Text style={styles.addButtonText}>Add Service</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.servicesContainer}>
            {loading ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 20 }} />
            ) : services.length > 0 ? (
              services.map((service) => (
                 <TouchableOpacity
                   key={service.id}
                   style={styles.serviceCard}
                   onPress={() => router.push(`/services/add?id=${service.id}&mode=view`)}
                 >
                  <View style={[styles.serviceIcon, { backgroundColor: Colors.primary }]}>
                    <Ionicons name="medical-outline" size={24} color={Colors.white} />
                  </View>
                  <View style={styles.serviceContent}>
                    <Text style={styles.serviceTitle}>{service.name}</Text>
                    <Text style={styles.serviceDescription}>{service.description}</Text>
                    <Text style={styles.servicePrice}>₹{service.price}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="medical-outline" size={64} color={Colors.textTertiary} />
                <Text style={styles.emptyStateText}>No services added yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Add your first service to get started
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Inventory" showBackButton={false} />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for Products"
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statsCard}>
          <Text style={styles.statsNumber}>{inventoryStats.totalProducts}</Text>
          <Text style={styles.statsLabel}>Total Products</Text>
        </View>
        <View style={styles.statsCard}>
          <Text style={styles.statsNumber}>{inventoryStats.totalCategories}</Text>
          <Text style={styles.statsLabel}>Total Categories</Text>
        </View>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {[
          { key: 'all', label: 'All Products' },
          { key: 'pet-food', label: 'Pet Food' },
          { key: 'medicines', label: 'Medicines' },
          { key: 'accessories', label: 'Accessories' },
        ].map((filterOption) => (
          <TouchableOpacity
            key={filterOption.key}
            style={[
              styles.filterButton,
              filter === filterOption.key && styles.activeFilterButton,
            ]}
            onPress={() => setFilter(filterOption.key as typeof filter)}
          >
            <Text style={[
              styles.filterText,
              filter === filterOption.key && styles.activeFilterText,
            ]}>
              {filterOption.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Inventory Count */}
      <View style={styles.inventoryInfo}>
        <Text style={styles.inventoryCount}>{filteredProducts.length} Inventory Found</Text>
      </View>

      {filteredProducts.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color={Colors.textTertiary} />
            <Text style={styles.emptyStateText}>No products found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery
                ? 'Try adjusting your search'
                : 'Add your first product to get started'
              }
            </Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductCard}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.productsList}
          ListHeaderComponent={
            <View style={styles.addButtonContainer}>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push('/products/add')}
              >
                <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
                <Text style={styles.addButtonText}>Add Product</Text>
              </TouchableOpacity>
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
    backgroundColor: Colors.backgroundSecondary,
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  filterButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  activeFilterButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textSecondary,
  },
  activeFilterText: {
    color: Colors.white,
  },
  inventoryInfo: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  inventoryCount: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  selectedItems: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  itemTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  itemTagText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
  },
  clearAll: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.primary,
    fontWeight: Typography.fontWeights.medium,
  },
  content: {
    flex: 1,
    paddingTop: Spacing.md,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productsList: {
    paddingBottom: 120, // Extra padding to clear tab navigation and mobile bottom buttons
  },
  productCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    marginHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  productContent: {
    padding: Spacing.md,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  productName: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    flex: 1,
  },
  productActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  editButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  editButtonText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeights.medium,
  },
  productStock: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  productPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#E8F5E9',
  },
  inactiveBadge: {
    backgroundColor: '#FFEBEE',
  },
  activeText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
    color: '#2E7D32',
  },
  inactiveText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
    color: '#C62828',
  },
  section: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
  },
  servicesContainer: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.md,
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceContent: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  serviceDescription: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  servicePrice: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
  },
  addButtonContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  addButtonText: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.white,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  notAvailableContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  notAvailableText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  notAvailableSubtext: {
    fontSize: 16,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 24,
  },
});