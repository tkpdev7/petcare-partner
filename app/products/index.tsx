import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/Colors';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: 'pharmacy' | 'essentials';
  prescriptionRequired: boolean;
  ageLimit?: string;
  stock: number;
  isActive: boolean;
}

export default function ProductsScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pharmacy' | 'essentials'>('all');
  const [partnerData, setPartnerData] = useState<any>(null);
  const [inventoryStats, setInventoryStats] = useState({
    totalProducts: 55,
    totalCategories: 15,
    lowStock: 8,
    outOfStock: 3,
  });

  useEffect(() => {
    loadPartnerData();
    loadProducts();
  }, []);

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
      // TODO: Replace with actual API call
      const mockProducts: Product[] = [
        {
          id: '1',
          name: 'Dog Multivitamin Tablets',
          description: 'Essential vitamins for dogs of all ages',
          price: 850,
          images: ['https://via.placeholder.com/200'],
          category: 'pharmacy',
          prescriptionRequired: false,
          ageLimit: '6 months+',
          stock: 25,
          isActive: true,
        },
        {
          id: '2',
          name: 'Cat Deworming Medicine',
          description: 'Effective deworming solution for cats',
          price: 450,
          images: ['https://via.placeholder.com/200'],
          category: 'pharmacy',
          prescriptionRequired: true,
          ageLimit: '3 months+',
          stock: 15,
          isActive: true,
        },
        {
          id: '3',
          name: 'Premium Dog Food',
          description: 'High-quality dry dog food with real chicken',
          price: 1200,
          images: ['https://via.placeholder.com/200'],
          category: 'essentials',
          prescriptionRequired: false,
          stock: 30,
          isActive: true,
        },
        {
          id: '4',
          name: 'Pet Grooming Kit',
          description: 'Complete grooming set with brush, nail clipper, and shampoo',
          price: 750,
          images: ['https://via.placeholder.com/200'],
          category: 'essentials',
          prescriptionRequired: false,
          stock: 10,
          isActive: false,
        },
      ];
      
      setProducts(mockProducts);
    } catch (error) {
      console.error('Error loading products:', error);
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
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setProducts(prev => prev.filter(product => product.id !== productId));
          },
        },
      ]
    );
  };

  const renderProductCard = ({ item }: { item: Product }) => (
    <View style={[styles.productCard, !item.isActive && styles.inactiveCard]}>
      <Image source={{ uri: item.images[0] }} style={styles.productImage} />
      
      <View style={styles.productInfo}>
        <View style={styles.productHeader}>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <View style={styles.productActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/products/add?id=${item.id}&mode=edit`)}
            >
              <Ionicons name="create-outline" size={20} color="#FF7A59" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => toggleProductStatus(item.id)}
            >
              <Ionicons
                name={item.isActive ? "eye-outline" : "eye-off-outline"}
                size={20}
                color={item.isActive ? "#10B981" : "#6B7280"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => deleteProduct(item.id)}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
        
        <Text style={styles.productDescription} numberOfLines={2}>
          {item.description}
        </Text>
        
        <View style={styles.productDetails}>
          <Text style={styles.productPrice}>₹{item.price}</Text>
          <View style={styles.productTags}>
            <View style={[
              styles.categoryTag,
              { backgroundColor: item.category === 'pharmacy' ? '#EBF8FF' : '#F0FDF4' }
            ]}>
              <Text style={[
                styles.categoryText,
                { color: item.category === 'pharmacy' ? '#1E40AF' : '#166534' }
              ]}>
                {item.category === 'pharmacy' ? 'Pharmacy' : 'Essentials'}
              </Text>
            </View>
            
            {item.prescriptionRequired && (
              <View style={styles.prescriptionTag}>
                <Ionicons name="medical" size={12} color="#DC2626" />
                <Text style={styles.prescriptionText}>Rx</Text>
              </View>
            )}
            
            {item.ageLimit && (
              <View style={styles.ageLimitTag}>
                <Text style={styles.ageLimitText}>{item.ageLimit}</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.stockInfo}>
          <Ionicons name="cube-outline" size={16} color="#666" />
          <Text style={styles.stockText}>Stock: {item.stock}</Text>
          <View style={[
            styles.statusDot,
            { backgroundColor: item.isActive ? '#10B981' : '#6B7280' }
          ]} />
          <Text style={styles.statusText}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
    </View>
  );

  // Check if partner is pharmacy type
  const isPharmacyPartner = partnerData?.serviceType === 'pharmacy';

  if (!isPharmacyPartner) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notAvailableContainer}>
          <Ionicons name="medical-outline" size={64} color="#ccc" />
          <Text style={styles.notAvailableText}>Product Management</Text>
          <Text style={styles.notAvailableSubtext}>
            This feature is only available for Pharmacy & Pet Essentials partners
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Inventory</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/products/add')}
          >
            <Ionicons name="add" size={24} color={Colors.white} />
          </TouchableOpacity>
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
        <View style={styles.statsCard}>
          <Text style={styles.statsNumber}>{inventoryStats.lowStock}</Text>
          <Text style={styles.statsLabel}>Low Stock</Text>
        </View>
        <View style={styles.statsCard}>
          <Text style={styles.statsNumber}>{inventoryStats.outOfStock}</Text>
          <Text style={styles.statsLabel}>Out of Stock</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => router.push('/products/categories')}
        >
          <Ionicons name="grid-outline" size={20} color={Colors.primary} />
          <Text style={styles.quickActionText}>Categories</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => router.push('/products/add')}
        >
          <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
          <Text style={styles.quickActionText}>Add Product</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.filterContainer}>
        {[
          { key: 'all', label: 'All' },
          { key: 'pharmacy', label: 'Pharmacy' },
          { key: 'essentials', label: 'Essentials' },
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

      <View style={styles.content}>
        {filteredProducts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>No products found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery 
                ? 'Try adjusting your search' 
                : 'Add your first product to get started'
              }
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            renderItem={renderProductCard}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.productsList}
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
  header: {
    backgroundColor: Colors.white,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSizes['2xl'],
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  addButton: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  statsCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  quickActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  quickActionText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.primary,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
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
    backgroundColor: Colors.white,
    gap: Spacing.md,
  },
  filterButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeFilterButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textSecondary,
  },
  activeFilterText: {
    color: Colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  productsList: {
    paddingBottom: 20,
  },
  productCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  inactiveCard: {
    opacity: 0.6,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.md,
  },
  productInfo: {
    flex: 1,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productName: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  productActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    padding: 4,
  },
  productDescription: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    lineHeight: Typography.lineHeights.relaxed * Typography.fontSizes.sm,
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
  },
  productTags: {
    flexDirection: 'row',
    gap: 6,
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  prescriptionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 2,
  },
  prescriptionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  ageLimitTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  ageLimitText: {
    fontSize: 12,
    color: '#4B5563',
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stockText: {
    fontSize: 12,
    color: '#666',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
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