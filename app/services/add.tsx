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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Formik } from 'formik';
import * as Yup from 'yup';
import AppHeader from '../../components/AppHeader';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/Colors';
import apiService from '../../services/apiService';

// Validation schema
const serviceValidationSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, 'Service name must be at least 2 characters')
    .required('Service name is required'),
  description: Yup.string()
    .min(10, 'Description must be at least 10 characters'),
  duration: Yup.number()
    .min(1, 'Duration must be at least 1 minute')
    .max(600, 'Duration cannot exceed 600 minutes'),
  price: Yup.number()
    .min(1, 'Price must be greater than 0')
    .required('Price is required'),
  category: Yup.string()
    .required('Please select a category'),
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
      
      if (response.success && response.data && response.data.data) {
        const service = response.data.data;
        setInitialValues({
          name: service.name || '',
          description: service.description || '',
          duration: service.duration ? service.duration.toString() : '',
          price: service.price ? service.price.toString() : '',
          category: service.category || '',
        });
      } else {
        Alert.alert('Error', 'Failed to load service data');
        router.back();
      }
    } catch (error) {
      console.error('Error loading service:', error);
      Alert.alert('Error', 'Failed to load service data');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const serviceCategories = [
    'General Consultation',
    'Vaccination',
    'Surgery',
    'Dental Care',
    'Emergency Care',
    'Grooming',
    'Laboratory Tests',
    'Health Checkup',
  ];

  const handleSave = async (values: any, { setSubmitting }: any) => {
    try {
      const serviceData = {
        name: values.name,
        description: values.description,
        duration: values.duration ? parseInt(values.duration) : undefined,
        price: parseFloat(values.price),
        category: values.category
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
        <AppHeader title={isEditMode ? "Edit Service" : "Add Service"} showBackButton={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading service...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title={isEditMode ? "Edit Service" : "Add Service"} showBackButton={true} />

      <Formik
        initialValues={initialValues}
        enableReinitialize={true}
        validationSchema={serviceValidationSchema}
        onSubmit={handleSave}
      >
        {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue, isSubmitting }) => (
          <>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Service Name */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Service Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Service Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter service name"
                    placeholderTextColor={Colors.textSecondary}
                    value={values.name}
                    onChangeText={handleChange('name')}
                    onBlur={handleBlur('name')}
                  />
                  {touched.name && errors.name && (
                    <Text style={styles.errorText}>{errors.name}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Enter service description"
                    placeholderTextColor={Colors.textSecondary}
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

                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Text style={styles.label}>Duration (minutes)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="30"
                      placeholderTextColor={Colors.textSecondary}
                      value={values.duration}
                      onChangeText={handleChange('duration')}
                      onBlur={handleBlur('duration')}
                      keyboardType="numeric"
                    />
                    {touched.duration && errors.duration && (
                      <Text style={styles.errorText}>{errors.duration}</Text>
                    )}
                  </View>

                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Text style={styles.label}>Price *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="₹0"
                      placeholderTextColor={Colors.textSecondary}
                      value={values.price}
                      onChangeText={handleChange('price')}
                      onBlur={handleBlur('price')}
                      keyboardType="numeric"
                    />
                    {touched.price && errors.price && (
                      <Text style={styles.errorText}>{errors.price}</Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Category Selection */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Category *</Text>
                <Text style={styles.sectionSubtitle}>Select a category for your service</Text>
                
                <View style={styles.categoryGrid}>
                  {serviceCategories.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryCard,
                        values.category === category && styles.selectedCategory
                      ]}
                      onPress={() => setFieldValue('category', category)}
                    >
                      <View style={[
                        styles.categoryIcon,
                        { backgroundColor: values.category === category ? Colors.primary : Colors.backgroundSecondary }
                      ]}>
                        <Ionicons 
                          name="medical-outline" 
                          size={20} 
                          color={values.category === category ? Colors.white : Colors.textSecondary} 
                        />
                      </View>
                      <Text style={[
                        styles.categoryText,
                        values.category === category && styles.selectedCategoryText
                      ]}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {touched.category && errors.category && (
                  <Text style={styles.errorText}>{errors.category}</Text>
                )}
              </View>

              {/* Add some bottom padding for the save button */}
              <View style={styles.bottomPadding} />
            </ScrollView>

            {/* Save Button */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.saveButton, isSubmitting && styles.disabledButton]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Text style={styles.saveButtonText}>{isEditMode ? 'Updating...' : 'Adding...'}</Text>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color={Colors.white} />
                    <Text style={styles.saveButtonText}>{isEditMode ? 'Update Service' : 'Add Service'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
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
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: Colors.white,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  input: {
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
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectedCategory: {
    backgroundColor: Colors.backgroundTertiary,
    borderColor: Colors.primary,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  categoryText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  selectedCategoryText: {
    color: Colors.primary,
    fontWeight: Typography.fontWeights.bold,
  },
  bottomPadding: {
    height: 100,
  },
  buttonContainer: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  disabledButton: {
    backgroundColor: Colors.textSecondary,
  },
  saveButtonText: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.white,
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.fontSizes.sm,
    marginTop: Spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
});