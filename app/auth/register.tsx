import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Modal,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
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
import CustomModal from '../../components/CustomModal';
import { useCustomModal } from '../../hooks/useCustomModal';
import StateDropdown from '../../components/StateDropdown';

// Validation schema
const registrationValidationSchema = Yup.object().shape({
  businessName: Yup.string()
    .min(2, 'Business name must be at least 2 characters')
    .required('Business name is required'),
  ownerNamePrefix: Yup.string()
    .required('Owner name prefix is required'),
  ownerFirstName: Yup.string()
    .min(2, 'Owner first name must be at least 2 characters')
    .required('Owner first name is required'),
  ownerLastName: Yup.string()
    .min(2, 'Owner last name must be at least 2 characters')
    .required('Owner last name is required'),
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
   building_flat: Yup.string()
     .required('Building/Door no/Flat no is required'),
   street_road: Yup.string()
     .required('Road name/Street name is required'),
   city: Yup.string()
     .required('City is required'),
   state: Yup.string()
     .required('State is required'),
   pincode: Yup.string()
     .matches(/^[0-9]{6}$/, 'Pincode must be exactly 6 digits')
     .required('Pincode is required'),
});

export default function RegisterScreen() {
  const router = useRouter();
  const modal = useCustomModal();
  // Non-form data that doesn't need validation
  const [storeLocation, setStoreLocation] = useState({ latitude: 0, longitude: 0, address: '' });
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const formikRef = React.useRef<any>(null);
  const mapRef = React.useRef<MapView>(null);
  
  // Initialize with default business hours
  const defaultOpeningTime = new Date();
  defaultOpeningTime.setHours(9, 0, 0, 0); // 9:00 AM
  const defaultClosingTime = new Date();
  defaultClosingTime.setHours(18, 0, 0, 0); // 6:00 PM
  
  const [openingTime, setOpeningTime] = useState(defaultOpeningTime);
  const [closingTime, setClosingTime] = useState(defaultClosingTime);
  const [timeUpdateTrigger, setTimeUpdateTrigger] = useState(0); // Force re-render trigger
  const [document1, setDocument1] = useState(null as any);
  const [document2, setDocument2] = useState(null as any);
  const [document3, setDocument3] = useState(null as any);
  const [document4, setDocument4] = useState(null as any);
  
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
      modal.showError('Please pin your store location on the map');
      return false;
    }

    // Validate that actual coordinates are set (not default 0,0)
    if (!storeLocation.latitude || !storeLocation.longitude ||
        (storeLocation.latitude === 0 && storeLocation.longitude === 0)) {
      modal.showError('Please use "Pick Current Location" button or tap on the map to pin your exact store location. This is required for customers to find you.', { title: 'Location Required' });
      return false;
    }

    // Validate mandatory documents
    if (!document1) {
      modal.showError('Document 1 is required', { title: 'Required' });
      return false;
    }

    if (!document2) {
      modal.showError('Document 2 is required', { title: 'Required' });
      return false;
    }

    return true;
  };

  const pickDocument = async (setDocument: React.Dispatch<React.SetStateAction<any>>) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        setDocument(result.assets[0]);
      }
    } catch (error) {
      modal.showError('Failed to pick document');
    }
  };

  const searchLocation = async () => {
    if (!searchQuery.trim()) {
      modal.showWarning('Please enter a location to search', { title: 'Empty Search' });
      return;
    }

    try {
      setSearchLoading(true);
      const results = await Location.geocodeAsync(searchQuery);

      if (results.length > 0) {
        const { latitude, longitude } = results[0];
        setStoreLocation({
          latitude,
          longitude,
          address: searchQuery,
        });

        // Animate map to searched location
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 1000);
        }

        modal.showSuccess('Tap "Done" to confirm this location', { title: 'Location Found' });
      } else {
        modal.showWarning('Could not find this location. Please try a different search term.', { title: 'Not Found' });
      }
    } catch (error) {
      console.error('Search error:', error);
      modal.showError('Failed to search location. Please try again.', { title: 'Search Error' });
    } finally {
      setSearchLoading(false);
    }
  };

  const pickLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        modal.showError('Location permission is required to select store location', { title: 'Permission Denied' });
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
      modal.showSuccess(`Store location set to:\n${addressString.trim()}`, { title: 'Location Set' });
    } catch (error) {
      console.error('Location error:', error);
      modal.showError('Failed to get location. Please try again.');
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
        ownerNamePrefix: values.ownerNamePrefix,
        ownerFirstName: values.ownerFirstName,
        ownerLastName: values.ownerLastName,
        email: values.email,
        phone: `${countryCode}${values.phone}`, // Combine country code with phone number
        password: values.password,
        partnerType: values.partnerType,
        building_flat: values.building_flat,
        street_road: values.street_road,
        locality: values.locality || null,
        city: values.city,
        state: values.state,
        pincode: values.pincode,
        storeLocation: storeLocation,
        openingTime: formatTimeForAPI(openingTime),
        closingTime: formatTimeForAPI(closingTime),
        document1: document1?.uri || null,
        document2: document2?.uri || null,
        document3: document3?.uri || null,
        document4: document4?.uri || null,
      };

      const response = await apiService.register(registrationData);

      if (!response.success) {
        modal.showError(response.error || 'Please try again', { title: 'Registration Failed' });
        return;
      }

      // Registration successful
      if (response.bypass) {
        // Email verification bypassed - account is auto-verified
        modal.showSuccess(
          'Your account has been created and verified! You can now sign in.',
          {
            title: 'Registration Successful',
            onClose: () => router.push('/auth/login')
          }
        );
      } else {
        // Normal flow - redirect to verification
        modal.showSuccess(
          'Your account has been created successfully! Please check your email for the verification code.',
          {
            title: 'Registration Successful',
            onClose: () => router.push(`/auth/verify?email=${encodeURIComponent(values.email)}`)
          }
        );
      }
    } catch (error) {
      console.error('Registration error:', error);
      modal.showError('Registration failed. Please try again.');
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
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/auth/login');
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Partner Registration</Text>
        <Text style={styles.subtitle}>Join our partner network</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >

        <Formik
          innerRef={formikRef}
            initialValues={{
              businessName: '',
              ownerNamePrefix: '',
              ownerFirstName: '',
              ownerLastName: '',
              email: '',
              phone: '',
              password: '',
              partnerType: '',
              building_flat: '',
              street_road: '',
              locality: '',
              city: '',
              state: '',
              pincode: '',
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

               {/* Owner Name Fields */}
               <View style={styles.ownerNameRow}>
                 <View style={styles.prefixContainer}>
                   <TextInput
                     style={styles.prefixInput}
                     placeholder="Prefix"
                     placeholderTextColor="#999"
                     value={values.ownerNamePrefix}
                     onChangeText={handleChange('ownerNamePrefix')}
                     onBlur={handleBlur('ownerNamePrefix')}
                     maxLength={10}
                   />
                 </View>
                 <View style={[styles.inputContainer, styles.ownerNameInput]}>
                   <View style={styles.iconContainer}>
                     <Ionicons name="person-outline" size={20} color="#666" />
                   </View>
                   <TextInput
                     style={styles.input}
                     placeholder="Owner first name"
                     placeholderTextColor="#999"
                     value={values.ownerFirstName}
                     onChangeText={handleChange('ownerFirstName')}
                     onBlur={handleBlur('ownerFirstName')}
                   />
                 </View>
               </View>
               {touched.ownerNamePrefix && errors.ownerNamePrefix && (
                 <Text style={styles.errorText}>{errors.ownerNamePrefix}</Text>
               )}
               {touched.ownerFirstName && errors.ownerFirstName && (
                 <Text style={styles.errorText}>{errors.ownerFirstName}</Text>
               )}

               <View style={styles.inputContainer}>
                 <View style={styles.iconContainer}>
                   <Ionicons name="person-outline" size={20} color="#666" />
                 </View>
                 <TextInput
                   style={styles.input}
                   placeholder="Owner last name"
                   placeholderTextColor="#999"
                   value={values.ownerLastName}
                   onChangeText={handleChange('ownerLastName')}
                   onBlur={handleBlur('ownerLastName')}
                 />
               </View>
               {touched.ownerLastName && errors.ownerLastName && (
                 <Text style={styles.errorText}>{errors.ownerLastName}</Text>
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

               <View style={styles.inputContainer}>
                 <View style={styles.iconContainer}>
                   <Ionicons name="business-outline" size={20} color="#666" />
                 </View>
                 <TextInput
                   style={styles.input}
                   placeholder="Building/Door no/Flat no"
                   placeholderTextColor="#999"
                   value={values.building_flat}
                   onChangeText={handleChange('building_flat')}
                   onBlur={handleBlur('building_flat')}
                 />
               </View>
               {touched.building_flat && errors.building_flat && (
                 <Text style={styles.errorText}>{errors.building_flat}</Text>
               )}

               <View style={styles.inputContainer}>
                 <View style={styles.iconContainer}>
                   <Ionicons name="map-outline" size={20} color="#666" />
                 </View>
                 <TextInput
                   style={styles.input}
                   placeholder="Road name/Street name"
                   placeholderTextColor="#999"
                   value={values.street_road}
                   onChangeText={handleChange('street_road')}
                   onBlur={handleBlur('street_road')}
                 />
               </View>
               {touched.street_road && errors.street_road && (
                 <Text style={styles.errorText}>{errors.street_road}</Text>
               )}

               <View style={styles.inputContainer}>
                 <View style={styles.iconContainer}>
                   <Ionicons name="location-outline" size={20} color="#666" />
                 </View>
                 <TextInput
                   style={styles.input}
                   placeholder="Locality (optional)"
                   placeholderTextColor="#999"
                   value={values.locality}
                   onChangeText={handleChange('locality')}
                   onBlur={handleBlur('locality')}
                 />
               </View>

               <View style={styles.inputContainer}>
                 <View style={styles.iconContainer}>
                   <Ionicons name="home-outline" size={20} color="#666" />
                 </View>
                 <TextInput
                   style={styles.input}
                   placeholder="City"
                   placeholderTextColor="#999"
                   value={values.city}
                   onChangeText={handleChange('city')}
                   onBlur={handleBlur('city')}
                 />
               </View>
               {touched.city && errors.city && (
                 <Text style={styles.errorText}>{errors.city}</Text>
               )}

               <StateDropdown
                 label="State/UT"
                 value={values.state}
                 onChangeText={(v) => handleChange("state", v)}
               />
               {touched.state && errors.state && (
                 <Text style={styles.errorText}>{errors.state}</Text>
               )}

               <View style={styles.inputContainer}>
                 <View style={styles.iconContainer}>
                   <Ionicons name="pin-outline" size={20} color="#666" />
                 </View>
                 <TextInput
                   style={styles.input}
                   placeholder="Pincode (6 digits)"
                   placeholderTextColor="#999"
                   value={values.pincode}
                   onChangeText={(text) => {
                     // Only allow digits and limit to 6 characters
                     const digitsOnly = text.replace(/\D/g, '');
                     if (digitsOnly.length <= 6) {
                       handleChange('pincode')(digitsOnly);
                       // Auto-fetch location when pincode is complete
                       if (digitsOnly.length === 6) {
                         // Add pincode auto-fetch logic here if needed
                       }
                     }
                   }}
                   onBlur={handleBlur('pincode')}
                   keyboardType="number-pad"
                   maxLength={6}
                 />
               </View>
               {touched.pincode && errors.pincode && (
                 <Text style={styles.errorText}>{errors.pincode}</Text>
               )}
          
              <View style={styles.timeContainer} key={`times-${timeUpdateTrigger}`}>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setShowOpeningTimePicker(true)}
                >
                  <Ionicons name="time-outline" size={18} color={Colors.primary} />
                  <View style={styles.timeTextContainer}>
                    <Text style={styles.timeLabel}>Opening</Text>
                    <Text style={styles.timeValue} numberOfLines={1} ellipsizeMode="tail">{formatTime(openingTime)}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setShowClosingTimePicker(true)}
                >
                  <Ionicons name="time-outline" size={18} color={Colors.primary} />
                  <View style={styles.timeTextContainer}>
                    <Text style={styles.timeLabel}>Closing</Text>
                    <Text style={styles.timeValue} numberOfLines={1} ellipsizeMode="tail">{formatTime(closingTime)}</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.documentPicker} onPress={() => pickDocument(setDocument1)}>
                <View style={styles.iconContainer}>
                  <Ionicons name="document-attach-outline" size={20} color="#666" />
                </View>
                <Text style={styles.documentText}>
                  {document1
                    ? document1.name
                    : 'Document 1 *'
                  }
                </Text>
                <Ionicons name="cloud-upload-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.documentPicker} onPress={() => pickDocument(setDocument2)}>
                <View style={styles.iconContainer}>
                  <Ionicons name="document-attach-outline" size={20} color="#666" />
                </View>
                <Text style={styles.documentText}>
                  {document2
                    ? document2.name
                    : 'Document 2 *'
                  }
                </Text>
                <Ionicons name="cloud-upload-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.documentPicker} onPress={() => pickDocument(setDocument3)}>
                <View style={styles.iconContainer}>
                  <Ionicons name="document-attach-outline" size={20} color="#666" />
                </View>
                <Text style={styles.documentText}>
                  {document3
                    ? document3.name
                    : 'Document 3 (Optional)'
                  }
                </Text>
                <Ionicons name="cloud-upload-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.documentPicker} onPress={() => pickDocument(setDocument4)}>
                <View style={styles.iconContainer}>
                  <Ionicons name="document-attach-outline" size={20} color="#666" />
                </View>
                <Text style={styles.documentText}>
                  {document4
                    ? document4.name
                    : 'Document 4 (Optional)'
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
                  <Text style={styles.registerButtonText}>Submit for Verification</Text>
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
                      // Auto-populate the manual address field
                      if (formikRef.current) {
                        formikRef.current.setFieldValue('address', addressString.trim());
                      }
                      setShowMapModal(false);
                      modal.showSuccess(`Store location pinned at:\n${addressString.trim()}`, { title: 'Location Set' });
                    } catch (error) {
                      setShowMapModal(false);
                      modal.showSuccess('Store location has been pinned successfully!', { title: 'Location Set' });
                    }
                  } else {
                    modal.showWarning('Please tap on the map to pin your store location', { title: 'No Location Selected' });
                  }
                }}
              >
                <Text style={styles.modalDoneText}>Done</Text>
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search for a location..."
                  placeholderTextColor="#999"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={searchLocation}
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={styles.searchButton}
                onPress={searchLocation}
                disabled={searchLoading}
              >
                {searchLoading ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.searchButtonText}>Search</Text>
                )}
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
              ref={mapRef}
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
      </KeyboardAvoidingView>
      <CustomModal {...modal.modalProps} />
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
    paddingBottom: 100, // Increased bottom padding for keyboard
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
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
    minHeight: 64,
  },
  timeTextContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    flexShrink: 1,
  },
  timeLabel: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeights.medium,
    marginBottom: 4,
    flexShrink: 1,
  },
  timeValue: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeights.bold,
    lineHeight: 18,
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

  // Owner Name Styles
  ownerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  prefixContainer: {
    width: 80,
    height: 56,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  prefixInput: {
    width: '100%',
    textAlign: 'center',
    fontSize: Typography.fontSizes.base,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeights.normal,
  },
  ownerNameInput: {
    flex: 1,
  },
});