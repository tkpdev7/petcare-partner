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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/Colors';

interface Category {
  id: string;
  name: string;
  item_count: number;
  parent_category?: string;
}

export default function CategoryListScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([
    { id: '1', name: 'Category 2', item_count: 24 },
    { id: '2', name: 'Category 2', item_count: 5 },
    { id: '3', name: 'Category 1', item_count: 3 },
  ]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    filterCategories();
  }, [searchQuery, selectedFilter, categories]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await apiService.getCategories();
      // if (response.success) {
      //   setCategories(response.data);
      // }

      // Using dummy data for now
      setTimeout(() => {
        setLoading(false);
        setRefreshing(false);
      }, 500);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterCategories = () => {
    let filtered = [...categories];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(category =>
        category.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by selected tab (if needed)
    if (selectedFilter !== 'All') {
      // Add custom filtering logic here
    }

    setFilteredCategories(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCategories();
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    try {
      // TODO: Add API call to create category
      // const response = await apiService.createCategory({ name: newCategoryName });

      // For now, just add to local state
      const newCategory: Category = {
        id: Date.now().toString(),
        name: newCategoryName,
        item_count: 0,
      };

      setCategories([...categories, newCategory]);
      setShowAddModal(false);
      setNewCategoryName('');
      Alert.alert('Success', 'Category added successfully');
    } catch (error) {
      console.error('Error adding category:', error);
      Alert.alert('Error', 'Failed to add category');
    }
  };

  const handleEditCategory = (category: Category) => {
    // TODO: Navigate to edit screen
    Alert.alert('Edit Category', `Edit ${category.name}`);
  };

  const handleDeleteCategory = (category: Category) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setCategories(categories.filter(c => c.id !== category.id));
            Alert.alert('Success', 'Category deleted successfully');
          },
        },
      ]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedFilter('All');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="menu" size={24} color="#fff" />
          <Text style={styles.headerTitle}>Category list</Text>
          <Ionicons name="notifications-outline" size={24} color="#fff" />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading categories...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="menu" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Category list</Text>
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
            placeholder="Search for Products"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabsContainer}>
          <View style={styles.filterTabs}>
            {['All', 'Category 1', 'Category 2'].map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.filterTab, selectedFilter === tab && styles.activeFilterTab]}
                onPress={() => setSelectedFilter(tab)}
              >
                <Text style={[styles.filterTabText, selectedFilter === tab && styles.activeFilterTabText]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Filter Count and Clear */}
        <View style={styles.filterResultsContainer}>
          <Text style={styles.filterResultsText}>{filteredCategories.length} Category Found</Text>
          {(searchQuery || selectedFilter !== 'All') && (
            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.clearFiltersText}>Clear all</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Selected Filters Tags */}
        {searchQuery && (
          <View style={styles.selectedFiltersContainer}>
            <View style={styles.filterTag}>
              <Text style={styles.filterTagText}>Item 1</Text>
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.filterTag}>
              <Text style={styles.filterTagText}>Item 2</Text>
              <TouchableOpacity>
                <Ionicons name="close-circle" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Categories List */}
        {filteredCategories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={80} color={Colors.lightGray} />
            <Text style={styles.emptyTitle}>No Categories Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'Try adjusting your search'
                : 'Add your first category to get started'}
            </Text>
          </View>
        ) : (
          <View style={styles.categoriesContainer}>
            {filteredCategories.map((category) => (
              <View key={category.id} style={styles.categoryCard}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryName}>Category Name</Text>
                  <TouchableOpacity onPress={() => handleEditCategory(category)}>
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.categoryStock}>Stock {category.item_count} units • {category.name}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.floatingAddButton}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Add Category Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Category</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Category Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter category name"
                placeholderTextColor="#999"
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                autoFocus
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowAddModal(false);
                    setNewCategoryName('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleAddCategory}
                >
                  <Text style={styles.saveButtonText}>Add Category</Text>
                </TouchableOpacity>
              </View>
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
  filterTabsContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 4,
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
  categoriesContainer: {
    paddingHorizontal: 16,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
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
  categoryStock: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#FAFAFA',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
