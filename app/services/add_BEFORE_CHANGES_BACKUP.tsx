import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/Colors';
import apiService from '../../services/apiService';

// Validation schema
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
  discount: Yup.number()
    .min(0, 'Discount cannot be negative')
    .max(100, 'Discount cannot exceed 100%'),
});

export default function AddServiceScreen() {
  const router = useRouter();
  const { id, mode } = useLocalSearchParams();
  const isEditMode = mode === 'edit' && id;
  const [loading, setLoading] = useState(false);
  const [initialValues, setInitialValues] = useState({
    name: '',
    description: '',
    duration: '',
    price: '',
    category: '',
    subCategory: '',
    discount: '',
  });

  useEffect(() => {
    if (isEditMode) {
      loadServiceData();
    }
  }, [isEditMode, id]);

  const loadServiceData = async () => {
    try {
      setLoading(true);
      const response = await apiService.getService(id as string);

      if (response.success && response.data) {
        const service = response.data.data || response.data;
        setInitialValues({
          name: service.name || '',
          description: service.description || '',
          duration: service.duration ? service.duration.toString() : '',
          price: service.price ? service.price.toString() : '',
          category: service.category || '',
          subCategory: service.sub_category || '',
          discount: service.discount ? service.discount.toString() : '',
        });
      }
    } catch (error) {
      console.error('Error loading service:', error);
      Alert.alert('Error', 'Failed to load service data');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { label: 'Select Category', value: '' },
    { label: 'General Consultation', value: 'general-consultation' },
    { label: 'Vaccination', value: 'vaccination' },
    { label: 'Surgery', value: 'surgery' },
    { label: 'Dental Care', value: 'dental-care' },
    { label: 'Emergency Care', value: 'emergency-care' },
    { label: 'Grooming', value: 'grooming' },
    { label: 'Laboratory Tests', value: 'laboratory-tests' },
    { label: 'Health Checkup', value: 'health-checkup' },
  ];

  const subCategories: { [key: string]: string[] } = {
    'general-consultation': ['In-Clinic', 'Home Visit', 'Online Consultation'],
    'vaccination': ['Puppy Vaccination', 'Adult Vaccination', 'Booster Shots'],
    'surgery': ['Minor Surgery', 'Major Surgery', 'Emergency Surgery'],
    'dental-care': ['Teeth Cleaning', 'Tooth Extraction', 'Dental Checkup'],
    'grooming': ['Bath', 'Haircut', 'Nail Trim', 'Full Grooming'],
    'laboratory-tests': ['Blood Test', 'Urine Test', 'X-Ray', 'Ultrasound'],
    'health-checkup': ['Basic Checkup', 'Comprehensive Checkup', 'Senior Pet Checkup'],
  };

  const handleSave = async (values: any, { setSubmitting }: any) => {
    try {
      const serviceData = {
        name: values.name,
        description: values.description,
        duration: parseInt(values.duration),
        price: parseFloat(values.price),
        category: values.category,
        sub_category: values.subCategory || undefined,
        discount: values.discount ? parseFloat(values.discount) : 0,
      };

      let response;
      if (isEditMode) {
        response = await apiService.updateService(id as string, serviceData);
      } else {
        response = await apiService.createService(serviceData);
      }

      if (!response.success) {
        Alert.alert('Error', response.error || `Failed to ${isEditMode ? 'update' : 'add'} service`);
        return;
      }

      Alert.alert('Success', `Service ${isEditMode ? 'updated' : 'added'} successfully`, [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error(`${isEditMode ? 'Update' : 'Create'} service error:`, error);
      Alert.alert('Error', `Failed to ${isEditMode ? 'update' : 'add'} service`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditMode ? 'Edit Service' : 'Add Service'}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading service...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditMode ? 'Edit Service' : 'Add Service'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <Formik
        initialValues={initialValues}
        enableReinitialize={true}
        validationSchema={serviceValidationSchema}
        onSubmit={handleSave}
      >
        {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue, isSubmitting }) => (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={100}
          >
            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Title Section */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Service Name"
                  placeholderTextColor="#999"
                  value={values.name}
                  onChangeText={handleChange('name')}
                  onBlur={handleBlur('name')}
                />
                {touched.name && errors.name && (
                  <Text style={styles.errorText}>{errors.name}</Text>
                )}
              </View>

              {/* Description Section */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Add Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe your service..."
                  placeholderTextColor="#999"
                  value={values.description}
                  onChangeText={handleChange('description')}
                  onBlur={handleBlur('description')}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                {touched.description && errors.description && (
                  <Text style={styles.errorText}>{errors.description}</Text>
                )}
              </View>

              {/* Category Dropdowns */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Category</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={values.category}
                    onValueChange={(value) => {
                      setFieldValue('category', value);
                      setFieldValue('subCategory', ''); // Reset subcategory
                    }}
                    style={styles.picker}
                  >
                    {categories.map((cat) => (
                      <Picker.Item key={cat.value} label={cat.label} value={cat.value} />
                    ))}
                  </Picker>
                </View>
                {touched.category && errors.category && (
                  <Text style={styles.errorText}>{errors.category}</Text>
                )}

                {/* Subcategory - only show if category is selected */}
                {values.category && subCategories[values.category] && (
                  <View style={styles.subCategoryContainer}>
                    <Text style={styles.sectionLabel}>Sub Category</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={values.subCategory}
                        onValueChange={(value) => setFieldValue('subCategory', value)}
                        style={styles.picker}
                      >
                        <Picker.Item label="Select Sub Category" value="" />
                        {subCategories[values.category].map((sub) => (
                          <Picker.Item key={sub} label={sub} value={sub.toLowerCase().replace(/ /g, '-')} />
                        ))}
                      </Picker>
                    </View>
                  </View>
                )}

                {/* Add Category Button */}
                <TouchableOpacity style={styles.addCategoryButton}>
                  <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
                  <Text style={styles.addCategoryText}>Add Category</Text>
                </TouchableOpacity>
              </View>

              {/* Duration and Price */}
              <View style={styles.section}>
                <View style={styles.row}>
                  <View style={styles.halfInput}>
                    <Text style={styles.sectionLabel}>Duration</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="30 mins"
                      placeholderTextColor="#999"
                      value={values.duration}
                      onChangeText={handleChange('duration')}
                      onBlur={handleBlur('duration')}
                      keyboardType="numeric"
                    />
                    {touched.duration && errors.duration && (
                      <Text style={styles.errorText}>{errors.duration}</Text>
                    )}
                  </View>

                  <View style={styles.halfInput}>
                    <Text style={styles.sectionLabel}>Price</Text>
                    <View style={styles.priceInputContainer}>
                      <Text style={styles.currencySymbol}>₹</Text>
                      <TextInput
                        style={[styles.input, styles.priceInput]}
                        placeholder="11.22"
                        placeholderTextColor="#999"
                        value={values.price}
                        onChangeText={handleChange('price')}
                        onBlur={handleBlur('price')}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    {touched.price && errors.price && (
                      <Text style={styles.errorText}>{errors.price}</Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Discount */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Add Discount</Text>
                <TextInput
                  style={styles.input}
                  placeholder="--"
                  placeholderTextColor="#999"
                  value={values.discount}
                  onChangeText={handleChange('discount')}
                  onBlur={handleBlur('discount')}
                  keyboardType="numeric"
                />
                {touched.discount && errors.discount && (
                  <Text style={styles.errorText}>{errors.discount}</Text>
                )}
              </View>

              {/* Bottom spacing */}
              <View style={{ height: 100 }} />
            </ScrollView>

            {/* Submit Button */}
            <View style={styles.submitButtonContainer}>
              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.disabledButton]}
                onPress={() => handleSubmit()}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}
      </Formik>
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
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: '#333',
  },
  subCategoryContainer: {
    marginTop: 16,
  },
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
  },
  addCategoryText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 6,
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
  },
  currencySymbol: {
    position: 'absolute',
    left: 16,
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
    zIndex: 1,
  },
  priceInput: {
    paddingLeft: 32,
  },
  errorText: {
    color: Colors.error || '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  submitButtonContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCC',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
});
