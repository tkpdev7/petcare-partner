import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/Colors';
import apiService from '../../services/apiService';

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
  const router = useRouter();
  const [images, setImages] = useState<string[]>([]);
  const [video, setVideo] = useState('');

  const categories = [
    { label: 'Select Category', value: '' },
    { label: 'Pet Food', value: 'pet-food' },
    { label: 'Pet Accessories', value: 'accessories' },
    { label: 'Medicines', value: 'medicines' },
    { label: 'Grooming', value: 'grooming' },
    { label: 'Toys', value: 'toys' },
  ];

  const subCategories = {
    'pet-food': ['Dry Food', 'Wet Food', 'Treats', 'Supplements'],
    'accessories': ['Collars', 'Leashes', 'Beds', 'Carriers'],
    'medicines': ['Vaccines', 'Antibiotics', 'Vitamins', 'Flea Control'],
    'grooming': ['Shampoos', 'Brushes', 'Nail Clippers', 'Dental Care'],
    'toys': ['Chew Toys', 'Interactive Toys', 'Balls', 'Rope Toys'],
  };

  const handleSave = async (values: any, { setSubmitting }: any) => {
    if (images.length === 0) {
      Alert.alert('Error', 'Please add at least one product image');
      setSubmitting(false);
      return;
    }

    try {
      const productData = {
        title: values.title,
        description: values.description,
        price: parseFloat(values.price),
        category: values.category,
        subCategory: values.subCategory || undefined,
        inventoryQuantity: parseInt(values.inventoryQuantity),
        discount: values.discount ? parseFloat(values.discount) : undefined,
        images: images,
        video: video || undefined,
      };

      const response = await apiService.createProduct(productData);
      
      if (!response.success) {
        Alert.alert('Error', response.error || 'Failed to add product');
        return;
      }
      
      Alert.alert(
        'Success',
        'Product added successfully!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Add product error:', error);
      Alert.alert('Error', 'Failed to add product. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const pickImage = async () => {
    try {
      // Request permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant access to your photo library to select images.');
        return;
      }

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
      Alert.alert('Error', `Failed to pick images: ${error.message || 'Unknown error'}`);
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
      Alert.alert('Error', 'Failed to pick video');
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Product</Text>
        <View style={styles.saveButton} />
      </View>

      <Formik
        initialValues={{
          title: '',
          description: '',
          price: '',
          category: '',
          subCategory: '',
          inventoryQuantity: '',
          discount: '',
        }}
        validationSchema={productValidationSchema}
        onSubmit={handleSave}
      >
        {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue, isSubmitting }) => (
          <>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
                      onValueChange={(value) => {
                        setFieldValue('category', value);
                        setFieldValue('subCategory', '');
                      }}
                    >
                      {categories.map((category) => (
                        <Picker.Item key={category.value} label={category.label} value={category.value} />
                      ))}
                    </Picker>
                  </View>
                  {touched.category && errors.category && (
                    <Text style={styles.errorText}>{errors.category}</Text>
                  )}
                </View>

                {values.category && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Sub Category</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={values.subCategory}
                        style={styles.picker}
                        onValueChange={(value) => setFieldValue('subCategory', value)}
                      >
                        <Picker.Item label="Select Sub Category" value="" />
                        {(subCategories[values.category] || []).map((subCat) => (
                          <Picker.Item key={subCat} label={subCat} value={subCat} />
                        ))}
                      </Picker>
                    </View>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Price (₹) *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={values.price}
                    onChangeText={handleChange('price')}
                    onBlur={handleBlur('price')}
                    placeholder="Enter price"
                    keyboardType="numeric"
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
                  />
                  {touched.inventoryQuantity && errors.inventoryQuantity && (
                    <Text style={styles.errorText}>{errors.inventoryQuantity}</Text>
                  )}
                </View>
              </View>

              {/* Media Upload */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Media</Text>
                
                {/* Add Video */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Add Video</Text>
                  <TouchableOpacity style={styles.mediaButton} onPress={pickVideo}>
                    <Ionicons name="videocam-outline" size={24} color={Colors.primary} />
                    <Text style={styles.mediaButtonText}>
                      {video ? 'Video Selected' : 'Choose Video'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Add Images */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Add Image *</Text>
                  <View style={styles.imagesContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {images.map((image, index) => (
                        <View key={index} style={styles.imageItem}>
                          <Image source={{ uri: image }} style={styles.productImage} />
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
                    </ScrollView>
                  </View>
                </View>
              </View>

              {/* Submit Button */}
              <View style={styles.section}>
                <TouchableOpacity
                  style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Text style={styles.submitButtonText}>Add Product</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </>
        )}
      </Formik>
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
  saveButton: {
    padding: Spacing.xs,
  },
  saveButtonText: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
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
});