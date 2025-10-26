import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Formik } from 'formik';
import * as Yup from 'yup';
import MapView, { Marker } from 'react-native-maps';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/Colors';
import apiService from '../../services/apiService';

// Validation schema
const registrationValidationSchema = Yup.object().shape({
  businessName: Yup.string()
    .min(2, 'Business name must be at least 2 characters')
    .required('Business name is required'),
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  phone: Yup.string()
    .matches(/^\d{10}$/, 'Phone number must be exactly 10 digits')
    .required('Phone number is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
    .matches(/(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
    .matches(/(?=.*\d)/, 'Password must contain at least one number')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),
  partnerType: Yup.string()
    .required('Please select a partner type'),
  address: Yup.string()
    .min(10, 'Please provide a complete address')
    .required('Address is required'),
});

export default function RegisterScreen() {
  const router = useRouter();
  // Non-form data that doesn't need validation
  const [storeLocation, setStoreLocation] = useState({ latitude: 0, longitude: 0, address: '' });
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState(false);
  
  // Initialize with default business hours
  const defaultOpeningTime = new Date();
  defaultOpeningTime.setHours(9, 0, 0, 0); // 9:00 AM
  const defaultClosingTime = new Date();
  defaultClosingTime.setHours(18, 0, 0, 0); // 6:00 PM
  
  const [openingTime, setOpeningTime] = useState(defaultOpeningTime);
  const [closingTime, setClosingTime] = useState(defaultClosingTime);
  const [timeUpdateTrigger, setTimeUpdateTrigger] = useState(0); // Force re-render trigger
  const [registrationDocument, setRegistrationDocument] = useState(null as any);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showOpeningTimePicker, setShowOpeningTimePicker] = useState(false);
  const [showClosingTimePicker, setShowClosingTimePicker] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [countryCode, setCountryCode] = useState('+91');
  const [showCountryCodeDropdown, setShowCountryCodeDropdown] = useState(false);

  const partnerTypes = [
    { label: 'Veterinary Clinic', value: 'veterinary', icon: 'medical' },
    { label: 'Grooming & Spa', value: 'grooming', icon: 'cut' },
    { label: 'Pharmacy', value: 'pharmacy', icon: 'medkit' },
    { label: 'Pet Essentials Store', value: 'essentials', icon: 'storefront' },
  ];

  const countryCodes = [
    { code: '+91', country: 'India', flag: '🇮🇳' },
    { code: '+1', country: 'USA', flag: '🇺🇸' },
    { code: '+44', country: 'UK', flag: '🇬🇧' },
    { code: '+61', country: 'Australia', flag: '🇦🇺' },
    { code: '+971', country: 'UAE', flag: '🇦🇪' },
  ];

  const validateAdditionalFields = () => {
    if (!storeLocation.address) {
      Alert.alert('Error', 'Please pin your store location');
      return false;
    }
    return true;
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        setRegistrationDocument(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const pickLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to select store location');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const addressString = `${address[0]?.street || 'Unnamed Road'}, ${address[0]?.city || 'Unknown City'}, ${address[0]?.region || 'Unknown Region'}`;
      
      setStoreLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: addressString.trim(),
      });

      // Show success message
      Alert.alert(
        'Location Set',
        `Store location set to:\n${addressString.trim()}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Failed to get location. Please try again.');
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Format time for API (24-hour HH:MM format)
  const formatTimeForAPI = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleRegister = async (values: any, { setSubmitting }: any) => {
    if (!validateAdditionalFields()) {
      setSubmitting(false);
      return;
    }

    try {
      const registrationData = {
        businessName: values.businessName,
        email: values.email,
        phone: `${countryCode}${values.phone}`, // Combine country code with phone number
        password: values.password,
        partnerType: values.partnerType,
        address: values.address,
        storeLocation: storeLocation,
        openingTime: formatTimeForAPI(openingTime),
        closingTime: formatTimeForAPI(closingTime),
        registrationDocument: registrationDocument?.uri || null
      };

      const response = await apiService.register(registrationData);

      if (!response.success) {
        Alert.alert('Registration Failed', response.error || 'Please try again');
        return;
      }

      // Registration successful
      if (response.bypass) {
        // Email verification bypassed - account is auto-verified
        Alert.alert(
          'Registration Successful',
          'Your account has been created and verified! You can now sign in.',
          [
            {
              text: 'Sign In',
              onPress: () => router.push('/auth/login')
            }
          ]
        );
      } else {
        // Normal flow - redirect to verification
        Alert.alert(
          'Registration Successful',
          'Your account has been created successfully! Please check your email for the verification code.',
          [
            {
              text: 'Verify Email',
              onPress: () => router.push(`/auth/verify?email=${encodeURIComponent(values.email)}`)
            }
          ]
        );
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Partner Registration</Text>
        <Text style={styles.subtitle}>Join our partner network</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        <Formik
          initialValues={{
            businessName: '',
            email: '',
            phone: '',
            password: '',
            confirmPassword: '',
            partnerType: '',
            address: '',
          }}
          validationSchema={registrationValidationSchema}
          onSubmit={handleRegister}
        >
          {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue, isSubmitting }) => (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <View style={styles.iconContainer}>
                  <Ionicons name="business-outline" size={20} color="#666" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your business name"
                  placeholderTextColor="#999"
                  value={values.businessName}
                  onChangeText={handleChange('businessName')}
                  onBlur={handleBlur('businessName')}
                />
              </View>
              {touched.businessName && errors.businessName && (
                <Text style={styles.errorText}>{errors.businessName}</Text>
              )}

              <View style={styles.inputContainer}>
                <View style={styles.iconContainer}>
                  <Ionicons name="mail-outline" size={20} color="#666" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your business email"
                  placeholderTextColor="#999"
                  value={values.email}
                  onChangeText={handleChange('email')}
                  onBlur={handleBlur('email')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {touched.email && errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}

              <View style={styles.inputContainer}>
                <View style={styles.iconContainer}>
                  <Ionicons name="call-outline" size={20} color="#666" />
                </View>
                <TouchableOpacity
                  style={styles.countryCodeButton}
                  onPress={() => setShowCountryCodeDropdown(!showCountryCodeDropdown)}
                >
                  <Text style={styles.countryCodeText}>
                    {countryCodes.find(c => c.code === countryCode)?.flag} {countryCode}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>
                <View style={styles.phoneDivider} />
                <TextInput
                  style={styles.phoneInput}
                  placeholder="10-digit number"
                  placeholderTextColor="#999"
                  value={values.phone}
                  onChangeText={(text) => {
                    // Only allow digits and limit to 10 characters
                    const digitsOnly = text.replace(/\D/g, '');
                    if (digitsOnly.length <= 10) {
                      setFieldValue('phone', digitsOnly);
                    }
                  }}
                  onBlur={handleBlur('phone')}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
              {touched.phone && errors.phone && (
                <Text style={styles.errorText}>{errors.phone}</Text>
              )}

              {showCountryCodeDropdown && (
                <View style={styles.dropdownList}>
                  {countryCodes.map((country) => (
                    <TouchableOpacity
                      key={country.code}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setCountryCode(country.code);
                        setShowCountryCodeDropdown(false);
                      }}
                    >
                      <Text style={styles.countryFlag}>{country.flag}</Text>
                      <Text style={styles.dropdownItemText}>{country.country} ({country.code})</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.inputContainer}>
                <View style={styles.iconContainer}>
                  <Ionicons name="options-outline" size={20} color="#666" />
                </View>
                <TouchableOpacity 
                  style={styles.dropdownButton}
                  onPress={() => setShowDropdown(!showDropdown)}
                >
                  <Text style={[styles.dropdownText, !values.partnerType && styles.placeholderText]}>
                    {values.partnerType 
                      ? partnerTypes.find(t => t.value === values.partnerType)?.label 
                      : 'Select Partner Type *'
                    }
                  </Text>
                  <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={20} color="#666" />
                </TouchableOpacity>
              </View>
              {touched.partnerType && errors.partnerType && (
                <Text style={styles.errorText}>{errors.partnerType}</Text>
              )}
              
              {showDropdown && (
                <View style={styles.dropdownList}>
                  {partnerTypes.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setFieldValue('partnerType', type.value);
                        setShowDropdown(false);
                      }}
                    >
                      <Ionicons name={type.icon as any} size={20} color={Colors.primary} />
                      <Text style={styles.dropdownItemText}>{type.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={[styles.inputContainer, styles.textAreaContainer]}>
                <View style={[styles.iconContainer, styles.iconContainerTop]}>
                  <Ionicons name="location-outline" size={20} color="#666" />
                </View>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Enter building name and street address"
                  placeholderTextColor="#999"
                  value={values.address}
                  onChangeText={handleChange('address')}
                  onBlur={handleBlur('address')}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
              {touched.address && errors.address && (
                <Text style={styles.errorText}>{errors.address}</Text>
              )}
          
              <TouchableOpacity style={styles.locationButton} onPress={async () => {
                // Get current location when opening map
                try {
                  const { status } = await Location.requestForegroundPermissionsAsync();
                  if (status === 'granted') {
                    const location = await Location.getCurrentPositionAsync({});
                    if (storeLocation.latitude === 0) { // Only set if no location is already set
                      setStoreLocation(prev => ({
                        ...prev,
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                      }));
                    }
                  }
                } catch (error) {
                  console.log('Location permission denied or error:', error);
                }
                setMapLoading(true);
                setMapError(false);
                setShowMapModal(true);
              }}>
                <Ionicons name="map-outline" size={20} color={Colors.primary} />
                <Text style={styles.locationButtonText}>
                  {storeLocation.address ? 'Update Store Location' : 'Pin Store Location *'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
              </TouchableOpacity>
              
              {storeLocation.address && (
                <View style={styles.selectedLocation}>
                  <Ionicons name="location" size={16} color={Colors.primary} />
                  <Text style={styles.selectedLocationText}>{storeLocation.address}</Text>
                </View>
              )}
          
              <View style={styles.timeContainer} key={`times-${timeUpdateTrigger}`}>
                <TouchableOpacity 
                  style={styles.timeButton}
                  onPress={() => setShowOpeningTimePicker(true)}
                >
                  <Ionicons name="time-outline" size={20} color={Colors.primary} />
                  <Text style={styles.timeButtonText}>
                    <Text style={styles.timeLabel}>Opening: </Text>
                    <Text style={styles.timeValue}>{formatTime(openingTime)}</Text>
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.timeButton}
                  onPress={() => setShowClosingTimePicker(true)}
                >
                  <Ionicons name="time-outline" size={20} color={Colors.primary} />
                  <Text style={styles.timeButtonText}>
                    <Text style={styles.timeLabel}>Closing: </Text>
                    <Text style={styles.timeValue}>{formatTime(closingTime)}</Text>
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.documentPicker} onPress={pickDocument}>
                <View style={styles.iconContainer}>
                  <Ionicons name="document-attach-outline" size={20} color="#666" />
                </View>
                <Text style={styles.documentText}>
                  {registrationDocument 
                    ? registrationDocument.name 
                    : 'Upload Registration Document'
                  }
                </Text>
                <Ionicons name="cloud-upload-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>

              <View style={styles.inputContainer}>
                <View style={styles.iconContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="#666" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#999"
                  value={values.password}
                  onChangeText={handleChange('password')}
                  onBlur={handleBlur('password')}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
              {touched.password && errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}

              <View style={styles.inputContainer}>
                <View style={styles.iconContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="#666" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor="#999"
                  value={values.confirmPassword}
                  onChangeText={handleChange('confirmPassword')}
                  onBlur={handleBlur('confirmPassword')}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
              {touched.confirmPassword && errors.confirmPassword && (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              )}

              <TouchableOpacity
                style={[styles.registerButton, isSubmitting && styles.registerButtonDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.registerButtonText}>Register</Text>
                )}
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account?</Text>
                <TouchableOpacity onPress={() => router.push('/auth/login')}>
                  <Text style={styles.linkText}> Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Formik>
        
        {/* Map Modal */}
        <Modal
          visible={showMapModal}
          animationType="slide"
          presentationStyle="fullScreen"
        >
          <View style={styles.mapModalContainer}>
            <View style={styles.mapModalHeader}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowMapModal(false)}
              >
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.mapModalTitle}>Pin Your Store Location</Text>
              <TouchableOpacity
                style={styles.modalDoneButton}
                onPress={async () => {
                  if (storeLocation.latitude && storeLocation.longitude) {
                    try {
                      const address = await Location.reverseGeocodeAsync({
                        latitude: storeLocation.latitude,
                        longitude: storeLocation.longitude,
                      });
                      const addressString = `${address[0]?.street || address[0]?.name || 'Unknown Location'}, ${address[0]?.city || 'Unknown City'}, ${address[0]?.region || 'Unknown Region'}`;
                      setStoreLocation(prev => ({
                        ...prev,
                        address: addressString.trim(),
                      }));
                      setShowMapModal(false);
                      Alert.alert('Location Set ✅', `Store location pinned at:\n${addressString.trim()}`);
                    } catch (error) {
                      setShowMapModal(false);
                      Alert.alert('Location Set ✅', 'Store location has been pinned successfully!');
                    }
                  } else {
                    Alert.alert('No Location Selected', 'Please tap on the map to pin your store location');
                  }
                }}
              >
                <Text style={styles.modalDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
            
            {mapLoading && (
              <View style={styles.mapLoadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.mapLoadingText}>Loading Map...</Text>
              </View>
            )}

            {mapError && (
              <View style={styles.mapErrorContainer}>
                <Text style={styles.mapErrorText}>Failed to load map</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => {
                    setMapError(false);
                    setMapLoading(true);
                  }}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            <MapView
              style={[styles.map, (mapLoading || mapError) && styles.mapHidden]}
              initialRegion={{
                latitude: storeLocation.latitude || 37.78825,
                longitude: storeLocation.longitude || -122.4324,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }}
              onPress={(event) => {
                const { latitude, longitude } = event.nativeEvent.coordinate;
                setStoreLocation({
                  latitude,
                  longitude,
                  address: storeLocation.address, // Keep existing address until confirmed
                });
              }}
              onMapReady={() => {
                setMapLoading(false);
                setMapError(false);
              }}
              onError={() => {
                setMapLoading(false);
                setMapError(true);
              }}
              loadingEnabled={true}
              showsUserLocation={true}
              showsMyLocationButton={true}
            >
              {storeLocation.latitude !== 0 && storeLocation.longitude !== 0 && (
                <Marker
                  coordinate={{
                    latitude: storeLocation.latitude,
                    longitude: storeLocation.longitude,
                  }}
                  title="Store Location"
                  description="Your store will be located here"
                />
              )}
            </MapView>
            
            <View style={styles.mapInstructions}>
              <Text style={styles.instructionText}>
                📍 Tap anywhere on the map to pin your store location
              </Text>
              <Text style={styles.instructionSubtext}>
                The blue dot shows your current location
              </Text>
              {storeLocation.latitude !== 0 && storeLocation.longitude !== 0 && (
                <View style={styles.coordinateDisplay}>
                  <Text style={styles.coordinateText}>
                    📍 {storeLocation.latitude.toFixed(6)}, {storeLocation.longitude.toFixed(6)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Modal>
        
        {showOpeningTimePicker && (
          <DateTimePicker
            value={openingTime}
            mode="time"
            display="default"
            onChange={(event, selectedTime) => {
              setShowOpeningTimePicker(false);
              if (selectedTime && event.type === 'set') {
                setOpeningTime(selectedTime);
                setTimeUpdateTrigger(prev => prev + 1); // Force re-render
                console.log('Opening time set to:', selectedTime.toLocaleTimeString());
              }
            }}
          />
        )}
        
        {showClosingTimePicker && (
          <DateTimePicker
            value={closingTime}
            mode="time"
            display="default"
            onChange={(event, selectedTime) => {
              setShowClosingTimePicker(false);
              if (selectedTime && event.type === 'set') {
                setClosingTime(selectedTime);
                setTimeUpdateTrigger(prev => prev + 1); // Force re-render
                console.log('Closing time set to:', selectedTime.toLocaleTimeString());
              }
            }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2, // Extra padding at bottom
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    marginLeft: -Spacing.sm,
  },
  title: {
    fontSize: Typography.fontSizes['2xl'],
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textSecondary,
  },
  form: {
    gap: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 56,
  },
  iconContainer: {
    width: 24,
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: Typography.fontSizes.base,
    color: Colors.textPrimary,
  },
  textArea: {
    minHeight: 80,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
  },
  iconContainerTop: {
    paddingTop: Spacing.md,
  },
  dropdownButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  placeholderText: {
    color: Colors.textSecondary,
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    marginTop: -Spacing.sm,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.md,
  },
  dropdownItemText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textPrimary,
    flex: 1,
  },
  countryCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingRight: Spacing.sm,
  },
  countryCodeText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeights.medium,
  },
  countryFlag: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  phoneDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm,
  },
  phoneInput: {
    flex: 1,
    fontSize: Typography.fontSizes.base,
    color: Colors.textPrimary,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    backgroundColor: Colors.backgroundTertiary,
  },
  locationButtonText: {
    flex: 1,
    fontSize: Typography.fontSizes.base,
    color: Colors.primary,
    fontWeight: Typography.fontWeights.medium,
  },
  selectedLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  selectedLocationText: {
    flex: 1,
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
  },
  timeContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  timeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  timeButtonText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeights.medium,
  },
  timeLabel: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeights.medium,
  },
  timeValue: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeights.bold,
  },
  documentPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderStyle: 'dashed',
    minHeight: 56,
  },
  documentText: {
    flex: 1,
    fontSize: Typography.fontSizes.base,
    color: Colors.textSecondary,
    marginLeft: Spacing.md,
  },
  eyeIcon: {
    padding: Spacing.xs,
  },
  registerButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.sm,
  },
  linkText: {
    color: Colors.primary,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.fontSizes.sm,
    marginTop: Spacing.xs,
    marginLeft: Spacing.md,
    marginBottom: Spacing.sm,
  },
  // Location Modal Styles
  mapModalContainer: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  mapModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.white,
  },
  modalCloseButton: {
    padding: Spacing.sm,
  },
  mapModalTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  modalDoneButton: {
    paddingHorizontal: Spacing.sm,
  },
  modalDoneText: {
    color: Colors.primary,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
  },
  map: {
    flex: 1,
  },
  mapHidden: {
    opacity: 0,
  },
  mapLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
    zIndex: 1,
  },
  mapLoadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSizes.base,
    color: Colors.textSecondary,
  },
  mapErrorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
    zIndex: 1,
    padding: Spacing.lg,
  },
  mapErrorText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
  },
  mapInstructions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  instructionText: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  instructionSubtext: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  coordinateDisplay: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.sm,
  },
  coordinateText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeights.medium,
    textAlign: 'center',
  },
  locationOptions: {
    flex: 1,
  },
  locationContent: {
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  currentLocationSection: {
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
  },
  manualLocationSection: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
  },
  locationSectionTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  locationSectionDesc: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  useCurrentLocationButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  useCurrentLocationText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
  },
  coordinateInputs: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    width: '100%',
  },
  coordinateInput: {
    flex: 1,
  },
  coordinateLabel: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  coordinateField: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSizes.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
  },
  setManualLocationButton: {
    backgroundColor: Colors.textSecondary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  setManualLocationText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
  },
});