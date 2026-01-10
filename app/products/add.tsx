import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Switch,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { requestMediaPermissionLazy } from '../../utils/permissions';
import * as DocumentPicker from 'expo-document-picker';
import KeyboardAwareScrollView from '../../components/KeyboardAwareScrollView';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/Colors';
import apiService from '../../services/apiService';
import CustomModal from '../../components/CustomModal';
import { useCustomModal } from '../../hooks/useCustomModal';

// Validation schema
const productValidationSchema = Yup.object().shape({
  title: Yup.string()
    .min(3, 'Product title must be at least 3 characters')
    .required('Product title is required'),
  description: Yup.string()
    .min(10, 'Description must be at least 10 characters')
    .required('Description is required'),
  price: Yup.number()
    .min(0.01, 'Price must be greater than 0')
    .required('Price is required'),
  category: Yup.string()
    .required('Please select a category'),
  inventoryQuantity: Yup.number()
    .min(0, 'Inventory quantity cannot be negative')
    .integer('Inventory quantity must be a whole number')
    .required('Inventory quantity is required'),
  discount: Yup.number()
    .min(0, 'Discount cannot be negative')
    .max(100, 'Discount cannot exceed 100%'),
});

export default function AddProductScreen() {
  const modal = useCustomModal();
  const router = useRouter();
  const { id, mode } = useLocalSearchParams();
  const isEditMode = mode === 'edit' && id;
  const isViewMode = mode === 'view' && id;
  const [isEditing, setIsEditing] = useState(!isViewMode); // Start in edit mode unless viewing
  const [loading, setLoading] = useState(false);
  const [initialValues, setInitialValues] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    subCategory: '',
    inventoryQuantity: '',
    discount: '',
  });
  const [images, setImages] = useState<string[]>([]);
  const [video, setVideo] = useState('');

  // Category management state
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [selectedCategoryForSubcat, setSelectedCategoryForSubcat] = useState('');
  const formikRef = React.useRef<any>(null);

  useEffect(() => {
    const loadData = async () => {
      // Load categories first
      const cats = await loadCategories();
      // Then load product data if in edit mode or view mode, passing the loaded categories
      if (isEditMode || isViewMode) {
        await loadProductData(cats);
      }
    };
    loadData();
  }, [isEditMode, isViewMode, id]);

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
      const response = await apiService.getCategoriesForProduct();
      console.log(' Categories API Response:', JSON.stringify(response, null, 2));

      if (response.success && response.data) {
        // Handle double-nested response from apiService
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

        console.log(' Categories loaded:', categoriesData.length, 'items');
        console.log(' Sample category:', categoriesData[0]);
        setCategories(categoriesData);
        return categoriesData; // Return for immediate use
      } else {
        console.log(' No categories in response');
        setCategories([]);
        return [];
      }
    } catch (error) {
      console.error(' Error loading categories:', error);
      setCategories([]);
      return [];
    }
  };

  const loadProductData = async (loadedCategories) => {
    try {
      setLoading(true);
      const response = await apiService.getProduct(id as string);
      if (response.success && response.data) {
        const product = response.data.data || response.data;
        const categoriesToUse = loadedCategories || categories;

        console.log(' Loading product for edit:', product.title);
        console.log(' Available categories:', categoriesToUse.length);

        // Handle different category formats
        let categoryValue = '';
        let subcategoryValue = '';

        // Priority 1: categoryId (camelCase from API) - FIXED!
        if (product.categoryId) {
          categoryValue = product.categoryId.toString();
          console.log('✓ Using categoryId (camelCase):', categoryValue);
        }
        // Priority 2: category_id (snake_case fallback)
        else if (product.category_id) {
          categoryValue = product.category_id.toString();
          console.log('✓ Using category_id (snake_case):', categoryValue);
        }
        // Priority 3: category as number (current format)
        else if (product.category && typeof product.category === 'number') {
          categoryValue = product.category.toString();
          console.log('✓ Using category (number):', categoryValue);
        }
        // Priority 4: category as numeric string
        else if (product.category && !isNaN(Number(product.category))) {
          categoryValue = product.category.toString();
          console.log('✓ Using category (numeric string):', categoryValue);
        }
        // Priority 5: category as string name (old format), try to find matching category by name
        else if (product.category && typeof product.category === 'string') {
          console.log('🔍 Old format - looking for category by name:', product.category);
          const matchingCategory = categoriesToUse.find(
            cat => cat.name.toLowerCase() === product.category.toLowerCase()
          );
          if (matchingCategory) {
            categoryValue = matchingCategory.id.toString();
            console.log('✓ Found matching category ID:', categoryValue, 'for', matchingCategory.name);
          } else {
            console.log('❌ No matching category found for:', product.category);
          }
        }

        // Handle different subcategory formats
        // Priority 1: subcategoryId (camelCase from API) - FIXED!
        if (product.subcategoryId) {
          subcategoryValue = product.subcategoryId.toString();
          console.log('✓ Using subcategoryId (camelCase):', subcategoryValue);
        }
        // Priority 2: subcategory_id (snake_case fallback)
        else if (product.subcategory_id) {
          subcategoryValue = product.subcategory_id.toString();
          console.log('✓ Using subcategory_id (snake_case):', subcategoryValue);
        }
        // Priority 3: subCategory (legacy camelCase)
        else if (product.subCategory && typeof product.subCategory === 'number') {
          subcategoryValue = product.subCategory.toString();
          console.log('✓ Using subCategory (number):', subcategoryValue);
        }
        // Priority 4: sub_category (legacy format)
        else if (product.sub_category && typeof product.sub_category === 'number') {
          subcategoryValue = product.sub_category.toString();
          console.log('✓ Using sub_category (number):', subcategoryValue);
        } else if (product.sub_category && !isNaN(Number(product.sub_category))) {
          subcategoryValue = product.sub_category.toString();
          console.log('✓ Using sub_category (numeric string):', subcategoryValue);
        }

        const initialData = {
          title: product.name || product.title || '',
          description: product.description || '',
          price: product.price?.toString() || '',
          category: categoryValue,
          subCategory: subcategoryValue,
          inventoryQuantity: product.stock?.toString() || product.inventoryQuantity?.toString() || '',
          discount: product.discount?.toString() || '',
        };

        console.log(' Setting initial values:', initialData);

        setInitialValues(initialData);

        // Load subcategories if category is a valid numeric ID
        if (categoryValue && !isNaN(Number(categoryValue))) {
          console.log(' Loading subcategories for category:', categoryValue);
          await loadSubcategories(categoryValue);
          // Subcategory value will be set by the useEffect that watches subcategories state
          console.log('✅ Subcategories loaded, useEffect will handle setting the value');
        }
        if (product.images && Array.isArray(product.images)) {
          setImages(product.images);
        }
        if (product.video) {
          setVideo(product.video);
        }
      }
    } catch (error) {
      console.error('Error loading product:', error);
      modal.showError('Failed to load product data');
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
      const response = await apiService.getSubcategoriesForProductCategory(categoryId);
      console.log(' Subcategories API Response:', response);

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

        console.log(' Subcategories loaded:', subcategoriesData.length, 'items');
        setSubcategories(subcategoriesData);
      } else {
        setSubcategories([]);
      }
    } catch (error) {
      console.error(' Error loading subcategories:', error);
      setSubcategories([]);
    }
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
      const response = await apiService.createProductCategory({
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
      const response = await apiService.createProductSubcategory({
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

  const handleDelete = async () => {
    if (!id) return;

    modal.showWarning('Are you sure you want to delete this product? This action cannot be undone.', {
      title: 'Delete Product',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          modal.showLoading('Deleting product...');
          const response = await apiService.deleteProduct(id as string);

          if (!response.success) {
            modal.showError(response.error || 'Failed to delete product');
            return;
          }

          modal.showSuccess('Product deleted successfully!', {
            onClose: () => router.back()
          });
        } catch (error) {
          console.error('Delete product error:', error);
          modal.showError('Failed to delete product. Please try again.');
        }
      },
    });
  };

  const handleSave = async (values: any, { setSubmitting }: any) => {
    if (images.length === 0) {
      modal.showError('Please add at least one product image');
      setSubmitting(false);
      return;
    }

    try {
      // Upload images to Supabase first
      modal.showLoading('Uploading images...');
      const uploadedImageUrls: string[] = [];

      for (let i = 0; i < images.length; i++) {
        const imageUri = images[i];

        // Skip if it's already a URL (http/https) - meaning it's already uploaded
        if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
          uploadedImageUrls.push(imageUri);
          continue;
        }

        // Upload local image to Supabase
        const uploadResponse = await apiService.uploadImage(imageUri, 'products', 'product-images');

        if (!uploadResponse.success || !uploadResponse.data?.url) {
          modal.showError(`Failed to upload image ${i + 1}. Please try again.`);
          setSubmitting(false);
          return;
        }

        uploadedImageUrls.push(uploadResponse.data.url);
      }

      // Upload video if present
      let uploadedVideoUrl = video;
      if (video && !video.startsWith('http://') && !video.startsWith('https://')) {
        // For now, we'll skip video upload as it's not in the uploadImage method
        // You can add video upload support later if needed
        uploadedVideoUrl = undefined;
      }

      modal.showLoading(`${isEditMode ? 'Updating' : 'Creating'} product...`);

      const productData = {
        title: values.title,
        description: values.description,
        price: parseFloat(values.price),
        category: values.category,
        subCategory: values.subCategory || undefined,
        inventoryQuantity: parseInt(values.inventoryQuantity),
        discount: values.discount ? parseFloat(values.discount) : undefined,
        images: uploadedImageUrls, // Use uploaded URLs instead of local paths
        video: uploadedVideoUrl,
      };

      const response = isEditMode
        ? await apiService.updateProduct(id as string, productData)
        : await apiService.createProduct(productData);

      if (!response.success) {
        modal.showError(response.error || `Failed to ${isEditMode ? 'update' : 'add'} product`);
        return;
      }

      modal.showSuccess(`Product ${isEditMode ? 'updated' : 'added'} successfully!`, {
        onClose: () => router.back()
      });
    } catch (error) {
      console.error(`${isEditMode ? 'Update' : 'Add'} product error:`, error);
      modal.showError(`Failed to ${isEditMode ? 'update' : 'add'} product. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  const pickImage = async () => {
    try {
      // Request permissions lazily with soft prompt
      const mediaGranted = await requestMediaPermissionLazy();
      if (!mediaGranted) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false, // Upload one at a time to show progress
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;

        // Upload immediately like profile photo
        modal.showLoading('Uploading image...');
        try {
          const uploadResponse = await apiService.uploadImage(imageUri, 'products', 'product-images');

          if (uploadResponse.success && uploadResponse.data?.url) {
            setImages(prev => [...prev, uploadResponse.data.url].slice(0, 5)); // Max 5 images
            modal.showSuccess('Image uploaded successfully!');
          } else {
            modal.showError('Failed to upload image. Please try again.');
          }
        } catch (error) {
          console.error('Image upload error:', error);
          modal.showError('Failed to upload image. Please try again.');
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      modal.showError(`Failed to pick images: ${error.message || 'Unknown error'}`);
    }
  };

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
      modal.showError('Failed to pick video');
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  if (loading && (isEditMode || isViewMode)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading product...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/(tabs)/products')}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isViewMode ? 'Product Details' : isEditMode ? 'Edit Product' : 'Add Product'}
        </Text>
        <View style={styles.headerActions}>
          {(isViewMode || (isEditMode && id)) && (
            <>
              {isViewMode && (
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => setIsEditing(true)}
                >
                  <Ionicons name="create-outline" size={24} color={Colors.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.iconButton, { marginLeft: 12 }]}
                onPress={handleDelete}
              >
                <Ionicons name="trash-outline" size={24} color={Colors.error} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <Formik
        innerRef={formikRef}
        initialValues={initialValues}
        validationSchema={productValidationSchema}
        onSubmit={handleSave}
        enableReinitialize={true}
      >
        {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue, isSubmitting }) => (
          <>
            <KeyboardAwareScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Product Form */}
              <View style={styles.section}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Title *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={values.title}
                    onChangeText={handleChange('title')}
                    onBlur={handleBlur('title')}
                    placeholder="Enter product title"
                    editable={!isViewMode || isEditing}
                  />
                  {touched.title && errors.title && (
                    <Text style={styles.errorText}>{errors.title}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Add Description *</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={values.description}
                    onChangeText={handleChange('description')}
                    onBlur={handleBlur('description')}
                    placeholder="Enter product description"
                    multiline
                    numberOfLines={4}
                    editable={!isViewMode || isEditing}
                  />
                  {touched.description && errors.description && (
                    <Text style={styles.errorText}>{errors.description}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Category *</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={values.category}
                      style={styles.picker}
                      onValueChange={(value) => handleCategoryChange(value, setFieldValue)}
                      enabled={!isViewMode || isEditing}
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
                  {(!isViewMode || isEditing) && (
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => setShowCategoryModal(true)}
                    >
                      <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
                      <Text style={styles.addButtonText}>Add Category</Text>
                    </TouchableOpacity>
                  )}
                  {touched.category && errors.category && (
                    <Text style={styles.errorText}>{errors.category}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Sub Category</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={values.subCategory}
                      style={styles.picker}
                      onValueChange={(value) => setFieldValue('subCategory', value)}
                      enabled={!!values.category && (!isViewMode || isEditing)}
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
                  {(!isViewMode || isEditing) && (
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
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Price (₹) *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={values.price}
                    onChangeText={handleChange('price')}
                    onBlur={handleBlur('price')}
                    placeholder="Enter price"
                    keyboardType="numeric"
                    editable={!isViewMode || isEditing}
                  />
                  {touched.price && errors.price && (
                    <Text style={styles.errorText}>{errors.price}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Add Discount (%)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={values.discount}
                    onChangeText={handleChange('discount')}
                    onBlur={handleBlur('discount')}
                    placeholder="Enter discount percentage"
                    keyboardType="numeric"
                    editable={!isViewMode || isEditing}
                  />
                  {touched.discount && errors.discount && (
                    <Text style={styles.errorText}>{errors.discount}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Inventory Quantity *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={values.inventoryQuantity}
                    onChangeText={handleChange('inventoryQuantity')}
                    onBlur={handleBlur('inventoryQuantity')}
                    placeholder="Enter inventory quantity"
                    keyboardType="numeric"
                    editable={!isViewMode || isEditing}
                  />
                  {touched.inventoryQuantity && errors.inventoryQuantity && (
                    <Text style={styles.errorText}>{errors.inventoryQuantity}</Text>
                  )}
                </View>
              </View>

              {/* Media Upload */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Media</Text>
                
                {/* Add Video - Hide in view mode */}
                {(!isViewMode || isEditing) && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Add Video</Text>
                    <TouchableOpacity style={styles.mediaButton} onPress={pickVideo}>
                      <Ionicons name="videocam-outline" size={24} color={Colors.primary} />
                      <Text style={styles.mediaButtonText}>
                        {video ? 'Video Selected' : 'Choose Video'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Add Images */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Add Image *</Text>
                  <View style={styles.imagesContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {images.map((image, index) => (
                        <View key={index} style={styles.imageItem}>
                          <Image source={{ uri: image }} style={styles.productImage} />
                          {(!isViewMode || isEditing) && (
                            <TouchableOpacity
                              style={styles.removeImageButton}
                              onPress={() => removeImage(index)}
                            >
                              <Ionicons name="close-circle" size={24} color={Colors.error} />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                      
                      {images.length < 5 && (!isViewMode || isEditing) && (
                        <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
                          <Ionicons name="camera-outline" size={32} color={Colors.textSecondary} />
                          <Text style={styles.addImageText}>Add Photo</Text>
                        </TouchableOpacity>
                      )}
                    </ScrollView>
                  </View>
                </View>
              </View>

              {/* Submit Button - Only show when adding new product or editing */}
              {(!isViewMode || isEditing) && (
                <View style={styles.section}>
                  <TouchableOpacity
                    style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color={Colors.white} />
                    ) : (
                      <Text style={styles.submitButtonText}>
                        {isEditMode || isViewMode ? 'Update Product' : 'Add Product'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </KeyboardAwareScrollView>

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
          </>
        )}
      </Formik>

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: Spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSizes.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.white,
    minHeight: 50,
    justifyContent: 'center',
  },
  picker: {
    height: 50,
    color: Colors.textPrimary,
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  mediaButtonText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.primary,
    fontWeight: Typography.fontWeights.medium,
  },
  imagesContainer: {
    minHeight: 120,
  },
  imageItem: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.sm,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.white,
    borderRadius: 12,
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.white,
  },
  bottomSpacing: {
    height: 40,
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.fontSizes.sm,
    marginTop: Spacing.xs,
    marginLeft: Spacing.md,
    marginBottom: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 20,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F5F5F5',
  },
  modalButtonSave: {
    backgroundColor: Colors.primary,
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  modalButtonTextSave: {
    color: '#fff',
  },
});