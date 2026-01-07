import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { Formik } from 'formik';
import * as Yup from 'yup';
import * as ImagePicker from 'expo-image-picker';
import { requestMediaPermissionLazy } from '../../utils/permissions';
import * as DocumentPicker from 'expo-document-picker';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/Colors';
import apiService from '../../services/apiService';
import CustomModal from '../../components/CustomModal';
import { useCustomModal } from '../../hooks/useCustomModal';

// Validation schema (removed discount field)
const serviceValidationSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, 'Service name must be at least 2 characters')
    .required('Service name is required'),
  description: Yup.string()
    .min(10, 'Description must be at least 10 characters')
    .required('Description is required'),
  duration: Yup.number()
    .min(1, 'Duration must be at least 1 minute')
    .max(600, 'Duration cannot exceed 600 minutes')
    .required('Duration is required'),
  price: Yup.number()
    .min(1, 'Price must be greater than 0')
    .required('Price is required'),
  category: Yup.string()
    .required('Please select a category'),
});

export default function AddServiceScreen() {
  const modal = useCustomModal();
  const router = useRouter();
  const { id, mode } = useLocalSearchParams();
  const isEditMode = mode === 'edit' && id;
  const isViewMode = mode === 'view' && id;
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(isEditMode); // Track if we're currently editing in view mode
  const [initialValues, setInitialValues] = useState({
    name: '',
    description: '',
    duration: '',
    price: '',
    category: '',
    subCategory: '',
  });

  // Image and video state
  const [images, setImages] = useState<string[]>([]);
  const [video, setVideo] = useState('');

  // Category management state
  const [categories, setCategories] = useState<any[]>([]);
  useEffect(() => { console.log('🔄 Categories state updated:', categories.length, 'categories'); }, [categories]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [selectedCategoryForSubcat, setSelectedCategoryForSubcat] = useState('');
  const formikRef = React.useRef<any>(null);

  const handleDeleteService = async () => {
    modal.showConfirm(
      'Delete Service',
      'Are you sure you want to delete this service? This action cannot be undone.',
      async () => {
        try {
          setLoading(true);
          const response = await apiService.deleteService(id as string);
          if (response.success) {
            modal.showSuccess('Service deleted successfully');
            router.replace('/(tabs)/products'); // Go back to services list
          } else {
            modal.showError(response.error || 'Failed to delete service');
          }
        } catch (error) {
          console.error('Delete service error:', error);
          modal.showError('Failed to delete service');
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const handleEditService = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  useEffect(() => {
    const loadData = async () => {
      // Load categories first
      const cats = await loadCategories();
      // Then load service data if in edit mode, passing the loaded categories
      if (isEditMode) {
        await loadServiceData(cats);
      }
    };
    loadData();
  }, [isEditMode, id]);

  // Ensure subcategory value is set after subcategories are loaded
  useEffect(() => {
    if (subcategories.length > 0 && initialValues.subCategory && formikRef.current) {
      const currentFormikValue = formikRef.current.values.subCategory;
      if (currentFormikValue !== initialValues.subCategory) {
        console.log('🎯 Setting subcategory from useEffect:', initialValues.subCategory);
        formikRef.current.setFieldValue('subCategory', initialValues.subCategory);
      }
    }
  }, [subcategories, initialValues.subCategory]);

  const loadCategories = async () => {
    try {
      const response = await apiService.getCategoriesForService();
      console.log('📦 Categories API Response:', JSON.stringify(response, null, 2));

      if (response.success && response.data) {
        // Handle double-nested response from apiService
        // Response structure: { success, data: { success, data: [...] } }
        let categoriesData = [];

        if (Array.isArray(response.data)) {
          // Direct array
          categoriesData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          // Double-nested (from apiService wrapper)
          categoriesData = response.data.data;
        } else if (response.data.categories && Array.isArray(response.data.categories)) {
          // Nested in categories property
          categoriesData = response.data.categories;
        }

        console.log('✅ Categories loaded:', categoriesData.length, 'items');
        console.log('📋 Sample category:', categoriesData[0]);
        setCategories(categoriesData);
        return categoriesData; // Return for immediate use
      } else {
        console.log('❌ No categories in response');
        setCategories([]);
        return [];
      }
    } catch (error) {
      console.error('❌ Error loading categories:', error);
      setCategories([]);
      return [];
    }
  };

  const loadServiceData = async (loadedCategories) => {
    try {
      setLoading(true);
      const response = await apiService.getService(id as string);

      if (response.success && response.data) {
        const service = response.data.data || response.data;
        const categoriesToUse = loadedCategories || categories;

        console.log('📝 Loading service for edit:', service.name);
        console.log('📂 Available categories:', categoriesToUse.length);

        console.log('🔍 Service data:', {
          category: service.category,
          categoryId: service.categoryId,
          category_id: service.category_id,
          categoryType: typeof service.category,
          subcategoryId: service.subcategoryId,
          subcategory_id: service.subcategory_id,
          sub_category: service.sub_category
        });
        // Handle different category formats
        let categoryValue = '';
        let subcategoryValue = '';

        // Priority 1: categoryId (camelCase from API)
        if (service.categoryId) {
          categoryValue = service.categoryId.toString();
          console.log('✓ Using categoryId (camelCase):', categoryValue);
        }
        // Priority 2: category_id (snake_case fallback)
        else if (service.category_id) {
          categoryValue = service.category_id.toString();
          console.log('✓ Using category_id (snake_case):', categoryValue);
        }
        // Priority 3: category as number (current format)
        else if (service.category && typeof service.category === 'number') {
          categoryValue = service.category.toString();
          console.log('✓ Using category (number):', categoryValue);
        }
        // Priority 4: category as numeric string
        else if (service.category && !isNaN(Number(service.category))) {
          categoryValue = service.category.toString();
          console.log('✓ Using category (numeric string):', categoryValue);
        }
        // Priority 5: category as string name (old format), try to find matching category by name
        else if (service.category && typeof service.category === 'string') {
          console.log('🔍 Old format - looking for category by name:', service.category);
          const matchingCategory = categoriesToUse.find(
            cat => cat.name.toLowerCase() === service.category.toLowerCase()
          );
          if (matchingCategory) {
            categoryValue = matchingCategory.id.toString();
            console.log('✓ Found matching category ID:', categoryValue, 'for', matchingCategory.name);
          } else {
            console.log('❌ No matching category found for:', service.category);
          }
        }

        // Handle different subcategory formats
        // Priority 1: subcategoryId (camelCase from API) - THIS IS THE FIX!
        if (service.subcategoryId) {
          subcategoryValue = service.subcategoryId.toString();
          console.log('✓ Using subcategoryId (camelCase):', subcategoryValue);
        }
        // Priority 2: subcategory_id (snake_case fallback)
        else if (service.subcategory_id) {
          subcategoryValue = service.subcategory_id.toString();
          console.log('✓ Using subcategory_id (snake_case):', subcategoryValue);
        }
        // Priority 3: sub_category (legacy format)
        else if (service.sub_category && typeof service.sub_category === 'number') {
          subcategoryValue = service.sub_category.toString();
          console.log('✓ Using sub_category (number):', subcategoryValue);
        } else if (service.sub_category && !isNaN(Number(service.sub_category))) {
          subcategoryValue = service.sub_category.toString();
          console.log('✓ Using sub_category (numeric string):', subcategoryValue);
        }
        const initialData = {
          name: service.name || '',
          description: service.description || '',
          duration: service.duration ? service.duration.toString() : '',
          price: service.price ? service.price.toString() : '',
          category: categoryValue,
          subCategory: subcategoryValue,
        };

        console.log('📋 Setting initial values:', initialData);

        setInitialValues(initialData);

        // Load images and video if they exist
        if (service.images && Array.isArray(service.images) && service.images.length > 0) {
          console.log('📸 Loading service images:', service.images.length);
          setImages(service.images);
        }
        if (service.video) {
          console.log('🎥 Loading service video:', service.video);
          setVideo(service.video);
        }

        // Load subcategories if category is a valid numeric ID
        if (categoryValue && !isNaN(Number(categoryValue))) {
          console.log('📥 Loading subcategories for category:', categoryValue);
          await loadSubcategories(categoryValue);
          // Subcategory value will be set by the useEffect that watches subcategories state
          console.log('✅ Subcategories loaded, useEffect will handle setting the value');
        }
      }
    } catch (error) {
      console.error('Error loading service:', error);
      modal.showError('Failed to load service data');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const loadSubcategories = async (categoryId: string) => {
    if (!categoryId) {
      setSubcategories([]);
      return;
    }

    try {
      const response = await apiService.getSubcategoriesForCategory(categoryId);
      console.log('📦 Subcategories API Response:', response);

      if (response.success && response.data) {
        // Handle double-nested response from apiService
        let subcategoriesData = [];

        if (Array.isArray(response.data)) {
          subcategoriesData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          subcategoriesData = response.data.data;
        } else if (response.data.subcategories && Array.isArray(response.data.subcategories)) {
          subcategoriesData = response.data.subcategories;
        }

        console.log('✅ Subcategories loaded:', subcategoriesData.length, 'items');
        setSubcategories(subcategoriesData);
      } else {
        setSubcategories([]);
      }
    } catch (error) {
      console.error('❌ Error loading subcategories:', error);
      setSubcategories([]);
    }
  };

  // Image picker
  const pickImage = async () => {
    try {
      // Request permissions lazily with soft prompt
      const mediaGranted = await requestMediaPermissionLazy();
      if (!mediaGranted) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images',
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => asset.uri);
        setImages(prev => [...prev, ...newImages].slice(0, 5)); // Max 5 images
      }
    } catch (error) {
      console.error('Image picker error:', error);
      modal.showError(`Failed to pick images: ${error.message || 'Unknown error'}`);
    }
  };

  // Video picker
  const pickVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        setVideo(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Video picker error:', error);
      modal.showError('Failed to pick video');
    }
  };

  // Remove image
  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Remove video
  const removeVideo = () => {
    setVideo('');
  };

  const handleCategoryChange = (categoryId: string, setFieldValue: any) => {
    setFieldValue('category', categoryId);
    setFieldValue('subCategory', ''); // Reset subcategory
    setSelectedCategoryForSubcat(categoryId);
    loadSubcategories(categoryId);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      modal.showError('Please enter category name');
      return;
    }

    try {
      const response = await apiService.createCategory({
        name: newCategoryName.trim(),
      });

      if (response.success) {
        setShowCategoryModal(false);
        setNewCategoryName('');
        await loadCategories();

        // Auto-select the newly created category
        const newCategoryId = response.data.id?.toString();
        if (newCategoryId && formikRef.current) {
          formikRef.current.setFieldValue('category', newCategoryId);
          setSelectedCategoryForSubcat(newCategoryId);
          // Load subcategories for the new category
          loadSubcategories(newCategoryId);
        }
        modal.showSuccess('Category created successfully');
      } else {
        modal.showError(response.error || 'Failed to create category');
      }
    } catch (error) {
      console.error('Create category error:', error);
      modal.showError('Failed to create category');
    }
  };

  const handleCreateSubcategory = async () => {
    if (!newSubcategoryName.trim()) {
      modal.showError('Please enter subcategory name');
      return;
    }

    if (!selectedCategoryForSubcat) {
      modal.showError('Please select a category first');
      return;
    }

    try {
      const response = await apiService.createSubcategory({
        name: newSubcategoryName.trim(),
        categoryId: selectedCategoryForSubcat,
      });

      if (response.success) {
        setShowSubcategoryModal(false);
        setNewSubcategoryName('');
        await loadSubcategories(selectedCategoryForSubcat);

        // Auto-select the newly created subcategory
        const newSubcategoryId = response.data.id?.toString();
        if (newSubcategoryId && formikRef.current) {
          formikRef.current.setFieldValue('subCategory', newSubcategoryId);
        }
        modal.showSuccess('Subcategory created successfully');
      } else {
        modal.showError(response.error || 'Failed to create subcategory');
      }
    } catch (error) {
      console.error('Create subcategory error:', error);
      modal.showError('Failed to create subcategory');
    }
  };

  const handleSubmit = async (values: any) => {
    // Validate at least one image
    if (images.length === 0) {
      modal.showError('Please add at least one service image');
      return;
    }

    try {
      setLoading(true);

      const serviceData = {
        name: values.name,
        description: values.description,
        duration: parseInt(values.duration),
        price: parseFloat(values.price),
        category: values.category,
        subCategory: values.subCategory,
        images: images,
        video: video || undefined,
      };

      console.log('📤 Submitting service:', serviceData);

      let response;
      if (isEditMode) {
        response = await apiService.updateService(id as string, serviceData);
      } else {
        response = await apiService.createService(serviceData);
      }

      console.log('📥 Service creation response:', response);

      if (response.success) {
        const message = isEditMode
          ? 'Service updated successfully'
          : 'Service created successfully';

        modal.showSuccess(message, {
          onClose: () => router.back()
        });
      } else {
        modal.showError(response.error || 'Failed to save service');
      }
    } catch (error) {
      console.error('Submit error:', error);
      modal.showError('Failed to save service');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading service...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isViewMode ? 'View Service' : isEditMode ? 'Edit Service' : 'Add Service'}
          </Text>
          {isViewMode && (
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleEditService}
              >
                <Ionicons name="create-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerButton, { marginLeft: 10 }]}
                onPress={handleDeleteService}
              >
                <Ionicons name="trash-outline" size={20} color="#F44336" />
              </TouchableOpacity>
            </View>
          )}
          {!isViewMode && <View style={{ width: 24 }} />}
        </View>

        <Formik
          innerRef={formikRef}
          initialValues={initialValues}
          validationSchema={serviceValidationSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            setFieldValue,
            values,
            errors,
            touched,
          }) => (
            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
            >
              {/* Service Name */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Service Name</Text>
                <TextInput
                  style={[styles.input, isViewMode && !isEditing && styles.readOnlyInput]}
                  placeholder="Enter service name"
                  placeholderTextColor="#999"
                  value={values.name}
                  onChangeText={handleChange('name')}
                  onBlur={handleBlur('name')}
                  editable={!(isViewMode && !isEditing)}
                />
                {touched.name && errors.name && (
                  <Text style={styles.errorText}>{errors.name}</Text>
                )}
              </View>

              {/* Description */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea, isViewMode && !isEditing && styles.readOnlyInput]}
                  placeholder="Enter service description"
                  placeholderTextColor="#999"
                  value={values.description}
                  onChangeText={handleChange('description')}
                  onBlur={handleBlur('description')}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!(isViewMode && !isEditing)}
                />
                {touched.description && errors.description && (
                  <Text style={styles.errorText}>{errors.description}</Text>
                )}
              </View>

              {/* Service Images - Only show in edit/add mode */}
              {!(isViewMode && !isEditing) && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Service Images (Max 5) *</Text>
                <View style={styles.imageGrid}>
                  {images.map((image, index) => (
                    <View key={index} style={styles.imageItem}>
                      <Image source={{ uri: image }} style={styles.serviceImage} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeImage(index)}
                      >
                        <Ionicons name="close-circle" size={24} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {images.length < 5 && (
                    <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
                      <Ionicons name="camera-outline" size={32} color={Colors.textSecondary} />
                      <Text style={styles.addImageText}>Add Photo</Text>
                    </TouchableOpacity>
                  )}
                 </View>
                </View>
              )}

              {/* Service Video - Only show in edit/add mode */}
              {!(isViewMode && !isEditing) && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Service Video (Optional)</Text>
                {video ? (
                  <View style={styles.videoContainer}>
                    <View style={styles.videoPlaceholder}>
                      <Ionicons name="videocam" size={40} color={Colors.primary} />
                      <Text style={styles.videoText}>Video selected</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeVideoButton}
                      onPress={removeVideo}
                    >
                      <Ionicons name="close-circle" size={24} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.addVideoButton} onPress={pickVideo}>
                    <Ionicons name="videocam-outline" size={32} color={Colors.textSecondary} />
                    <Text style={styles.addVideoText}>Add Video</Text>
                  </TouchableOpacity>
                 )}
                </View>
              )}

              {/* Category */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Category</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={values.category}
                    onValueChange={(value) => handleCategoryChange(value, setFieldValue)}
                    style={styles.picker}
                    enabled={!(isViewMode && !isEditing)}
                  >
                    <Picker.Item label="Select Category" value="" />
                    {categories.map((cat: any) => (
                      <Picker.Item
                        key={cat.id}
                        label={cat.name}
                        value={cat.id.toString()}
                      />
                    ))}
                  </Picker>
                </View>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setShowCategoryModal(true)}
                >
                  <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
                  <Text style={styles.addButtonText}>Add Category</Text>
                </TouchableOpacity>
                {touched.category && errors.category && (
                  <Text style={styles.errorText}>{errors.category}</Text>
                )}
              </View>

              {/* Sub Category */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Sub Category (Optional)</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={values.subCategory}
                    onValueChange={(value) => setFieldValue('subCategory', value)}
                    style={styles.picker}
                    enabled={!(isViewMode && !isEditing) && !!values.category}
                  >
                    <Picker.Item label="Select Sub Category" value="" />
                    {subcategories.map((subcat: any) => (
                      <Picker.Item
                        key={subcat.id}
                        label={subcat.name}
                        value={subcat.id.toString()}
                      />
                    ))}
                  </Picker>
                </View>
                <TouchableOpacity
                  style={[styles.addButton, !values.category && styles.addButtonDisabled]}
                  onPress={() => {
                    if (values.category) {
                      setSelectedCategoryForSubcat(values.category);
                      setShowSubcategoryModal(true);
                    }
                  }}
                  disabled={!values.category}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={20}
                    color={values.category ? Colors.primary : '#999'}
                  />
                  <Text
                    style={[
                      styles.addButtonText,
                      !values.category && styles.addButtonTextDisabled,
                    ]}
                  >
                    Add Subcategory
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Duration and Price */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Duration & Price</Text>
                <View style={styles.row}>
                  <View style={styles.halfInput}>
                    <Text style={styles.inputLabel}>Duration (mins)</Text>
                    <TextInput
                      style={[styles.input, isViewMode && !isEditing && styles.readOnlyInput]}
                      placeholder="30"
                      placeholderTextColor="#999"
                      value={values.duration}
                      onChangeText={handleChange('duration')}
                      onBlur={handleBlur('duration')}
                      keyboardType="numeric"
                      editable={!(isViewMode && !isEditing)}
                    />
                    {touched.duration && errors.duration && (
                      <Text style={styles.errorText}>{errors.duration}</Text>
                    )}
                  </View>

                  <View style={styles.halfInput}>
                    <Text style={styles.inputLabel}>Price</Text>
                    <View style={styles.priceInputContainer}>
                      <Text style={styles.currencySymbol}>₹</Text>
                      <TextInput
                        style={[styles.input, styles.priceInput, isViewMode && !isEditing && styles.readOnlyInput]}
                        placeholder="500"
                        placeholderTextColor="#999"
                        value={values.price}
                        onChangeText={handleChange('price')}
                        onBlur={handleBlur('handleBlur')}
                        keyboardType="decimal-pad"
                        editable={!(isViewMode && !isEditing)}
                      />
                    </View>
                    {touched.price && errors.price && (
                      <Text style={styles.errorText}>{errors.price}</Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              {isViewMode && !isEditing ? (
                // View Mode Buttons
                <View style={styles.viewModeActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={handleEditService}
                  >
                    <Ionicons name="create-outline" size={20} color={Colors.white} />
                    <Text style={styles.actionButtonText}>Edit Service</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={handleDeleteService}
                  >
                    <Ionicons name="trash-outline" size={20} color={Colors.white} />
                    <Text style={styles.actionButtonText}>Delete Service</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                // Edit/Add Mode Buttons
                <View style={styles.editModeActions}>
                  <TouchableOpacity
                    style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                    onPress={() => handleSubmit()}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitButtonText}>
                        {isEditMode ? 'Update Service' : 'Create Service'}
                      </Text>
                    )}
                  </TouchableOpacity>

                  {isViewMode && isEditing && (
                    <TouchableOpacity
                      style={[styles.cancelButton]}
                      onPress={handleCancelEdit}
                      disabled={loading}
                    >
                      <Text style={styles.cancelButtonText}>Cancel Edit</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </Formik>

        {/* Add Category Modal */}
        <Modal
          visible={showCategoryModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCategoryModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add New Category</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Category Name"
                placeholderTextColor="#999"
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    setShowCategoryModal(false);
                    setNewCategoryName('');
                  }}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSave]}
                  onPress={handleCreateCategory}
                >
                  <Text style={[styles.modalButtonText, styles.modalButtonTextSave]}>
                    Add
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Add Subcategory Modal */}
        <Modal
          visible={showSubcategoryModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowSubcategoryModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add New Subcategory</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Subcategory Name"
                placeholderTextColor="#999"
                value={newSubcategoryName}
                onChangeText={setNewSubcategoryName}
                autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    setShowSubcategoryModal(false);
                    setNewSubcategoryName('');
                  }}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSave]}
                  onPress={handleCreateSubcategory}
                >
                  <Text style={[styles.modalButtonText, styles.modalButtonTextSave]}>
                    Add
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>

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
    backgroundColor: '#F5F5F5',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    paddingLeft: 12,
  },
  priceInput: {
    flex: 1,
    borderWidth: 0,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 14,
    color: Colors.primary,
    marginLeft: 6,
    fontWeight: '500',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonTextDisabled: {
    color: '#999',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.fontSizes.sm,
    marginTop: Spacing.xs,
    marginLeft: Spacing.md,
    marginBottom: Spacing.sm,
  },

  // View Mode Styles
  viewModeActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  editModeActions: {
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  editButton: {
    backgroundColor: Colors.primary,
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
  },

  // Header Styles
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: Spacing.xs,
  },

  // Read-only Input Style
  readOnlyInput: {
    backgroundColor: '#f5f5f5',
    color: '#666',
  },

  // Cancel Button
  cancelButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  cancelButtonText: {
    color: Colors.primary,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
  },
});
