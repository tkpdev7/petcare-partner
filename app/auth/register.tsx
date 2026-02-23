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
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
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
  const [locationLoading, setLocationLoading] = useState(false);
  const [initialLocationSet, setInitialLocationSet] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 13.0827, // Default to Chennai
    longitude: 80.2707,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
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
  const [dateOfIncorporation, setDateOfIncorporation] = useState<Date | null>(null);
  const [showIncorporationDatePicker, setShowIncorporationDatePicker] = useState(false);

  // Auto-detect current location when map modal opens (only once)
  React.useEffect(() => {
    if (showMapModal && !initialLocationSet) {
      // Automatically try to get user's current location when modal opens
      const autoDetectLocation = async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            await pickLocation();
            setInitialLocationSet(true);
          }
        } catch (error) {
          console.error('Auto-detect location error:', error);
          // Silently fail - user can manually select location
        }
      };
      autoDetectLocation();
    }
  }, [showMapModal]);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showOpeningTimePicker, setShowOpeningTimePicker] = useState(false);
  const [showClosingTimePicker, setShowClosingTimePicker] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showPrefixDropdown, setShowPrefixDropdown] = useState(false);
  const [countryCode, setCountryCode] = useState('+91');
  const [showCountryCodeDropdown, setShowCountryCodeDropdown] = useState(false);

  const prefixOptions = [
    { label: 'Mr.', value: 'Mr' },
    { label: 'Mrs.', value: 'Mrs' },
    { label: 'Ms.', value: 'Ms' },
    { label: 'Dr.', value: 'Dr' },
  ];

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
    if (!dateOfIncorporation) {
      modal.showError('Please select Date of Incorporation');
      return false;
    }
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

    // Prevent multiple simultaneous searches
    if (searchLoading) {
      return;
    }

    try {
      setSearchLoading(true);
      const results = await Location.geocodeAsync(searchQuery);

      if (results.length > 0) {
        const { latitude, longitude } = results[0];

        // Reverse geocode to get detailed address
        const address = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        const addressData = address[0];
        const addressString = `${addressData?.street || addressData?.name || 'Unknown Location'}, ${addressData?.city || 'Unknown City'}, ${addressData?.region || 'Unknown Region'}`.trim();

        // Update both location and map region immediately
        setStoreLocation({
          latitude,
          longitude,
          address: addressString || searchQuery,
        });

        // Update controlled map region to center on found location
        setMapRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });

        // Auto-fill form fields
        if (formikRef.current && addressData) {
          if (addressData.street) {
            formikRef.current.setFieldValue('street_road', addressData.street);
          }
          if (addressData.city) {
            formikRef.current.setFieldValue('city', addressData.city);
          }
          if (addressData.region) {
            formikRef.current.setFieldValue('state', addressData.region);
          }
          if (addressData.postalCode) {
            formikRef.current.setFieldValue('pincode', addressData.postalCode);
          }
        }

        modal.showSuccess('Location found! Tap "Done" to confirm.', { title: 'Location Found' });
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
    // Prevent multiple simultaneous calls
    if (locationLoading) {
      return;
    }

    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        modal.showError('Location permission is required to select store location', { title: 'Permission Denied' });
        setLocationLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const addressData = address[0];
      const addressString = `${addressData?.street || 'Unnamed Road'}, ${addressData?.city || 'Unknown City'}, ${addressData?.region || 'Unknown Region'}`;

      // Update both location and map region immediately in a single batch
      const newLat = location.coords.latitude;
      const newLng = location.coords.longitude;

      setStoreLocation({
        latitude: newLat,
        longitude: newLng,
        address: addressString.trim(),
      });

      // Update map region immediately to center on the pinned location
      setMapRegion({
        latitude: newLat,
        longitude: newLng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      // Auto-fill address fields if formik ref is available
      if (formikRef.current && addressData) {
        if (addressData.street) {
          formikRef.current.setFieldValue('street_road', addressData.street);
        }
        if (addressData.city) {
          formikRef.current.setFieldValue('city', addressData.city);
        }
        if (addressData.region) {
          formikRef.current.setFieldValue('state', addressData.region);
        }
        if (addressData.postalCode) {
          formikRef.current.setFieldValue('pincode', addressData.postalCode);
        }
      }

      // Show success message
      modal.showSuccess('Location set and address fields auto-filled!', { title: 'Location Set' });
    } catch (error) {
      console.error('Location error:', error);
      modal.showError('Failed to get location. Please try again.');
    } finally {
      setLocationLoading(false);
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

  const uploadDocumentToSupabase = async (doc: any, folderPath: string): Promise<string | null> => {
    if (!doc?.uri) return null;
    const result = await apiService.uploadDocument(
      doc.uri,
      doc.name || 'document',
      doc.mimeType || 'application/octet-stream',
      'partners',
      folderPath
    );
    if (result.success && result.data?.url) {
      return result.data.url;
    }
    return null;
  };

  const handleRegister = async (values: any, { setSubmitting }: any) => {
    if (!validateAdditionalFields()) {
      setSubmitting(false);
      return;
    }

    try {
      // Upload documents to Supabase first
      const docUploads = await Promise.all([
        uploadDocumentToSupabase(document1, 'registration-documents'),
        uploadDocumentToSupabase(document2, 'registration-documents'),
        uploadDocumentToSupabase(document3, 'registration-documents'),
        uploadDocumentToSupabase(document4, 'registration-documents'),
      ]);

      if (!docUploads[0] || !docUploads[1]) {
        modal.showError('Failed to upload mandatory documents. Please try again.');
        setSubmitting(false);
        return;
      }

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
        dateOfIncorporation: dateOfIncorporation ? dateOfIncorporation.toISOString().split('T')[0] : null,
        openingTime: formatTimeForAPI(openingTime),
        closingTime: formatTimeForAPI(closingTime),
        document1: docUploads[0],
        document2: docUploads[1],
        document3: docUploads[2],
        document4: docUploads[3],
      };

      const response = await apiService.register(registrationData);

      if (!response.success) {
        modal.showError(response.error || 'Please try again', { title: 'Registration Failed' });
        return;
      }

      // Registration successful — always go to phone OTP verification
      const fullPhone = `${countryCode}${values.phone}`;
      modal.showSuccess(
        'Account created! We\'ve sent a verification code to your mobile number.',
        {
          title: 'Registration Successful',
          primaryButtonText: 'Verify Now',
          onPrimaryPress: () => {
            modal.hideModal();
            router.push(`/auth/verify-phone?phone=${encodeURIComponent(fullPhone)}`);
          },
        }
      );
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
            console.log('Back button pressed');
            router.replace('/auth/login');
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Partner Registration</Text>
        <Text style={styles.subtitle}>Join our partner network</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        enabled={Platform.OS === 'ios'}
      >
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        bounces={true}
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
                 <View style={styles.prefixWrapper}>
                   <TouchableOpacity
                     style={styles.prefixContainer}
                     onPress={() => setShowPrefixDropdown(!showPrefixDropdown)}
                   >
                     <Text style={[styles.prefixText, !values.ownerNamePrefix && styles.placeholderText]}>
                       {values.ownerNamePrefix ? `${values.ownerNamePrefix}.` : 'Prefix'}
                     </Text>
                     <Ionicons name="chevron-down" size={14} color="#666" />
                   </TouchableOpacity>

                   {/* Prefix Dropdown */}
                   {showPrefixDropdown && (
                     <View style={styles.prefixDropdownList}>
                       {prefixOptions.map((prefix) => (
                         <TouchableOpacity
                           key={prefix.value}
                           style={styles.dropdownItem}
                           onPress={() => {
                             setFieldValue('ownerNamePrefix', prefix.value);
                             setShowPrefixDropdown(false);
                           }}
                         >
                           <Text style={styles.dropdownItemText}>{prefix.label}</Text>
                         </TouchableOpacity>
                       ))}
                     </View>
                   )}
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

               <TouchableOpacity style={styles.locationButton} onPress={() => {
                 // Open modal IMMEDIATELY for instant response
                 setMapLoading(true);
                 setMapError(false);
                 setShowMapModal(true);

                 // THEN try to get current location in background (non-blocking)
                 (async () => {
                   try {
                     const { status } = await Location.requestForegroundPermissionsAsync();
                     if (status === 'granted') {
                       const location = await Location.getCurrentPositionAsync({});
                       const newLat = location.coords.latitude;
                       const newLng = location.coords.longitude;

                       // Update map region to center on current location
                       setMapRegion({
                         latitude: newLat,
                         longitude: newLng,
                         latitudeDelta: 0.01,
                         longitudeDelta: 0.01,
                       });

                       // If no location is already set, also update store location
                       if (storeLocation.latitude === 0) {
                         setStoreLocation(prev => ({
                           ...prev,
                           latitude: newLat,
                           longitude: newLng,
                         }));
                       }
                     }
                   } catch (error) {
                     console.log('Location permission denied or error:', error);
                   }
                 })();
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
          
              {/* Date of Incorporation */}
              <Text style={styles.label}>Date of Incorporation</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowIncorporationDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
                <Text style={styles.dateButtonText}>
                  {dateOfIncorporation
                    ? dateOfIncorporation.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                    : 'Select Incorporation Date'}
                </Text>
              </TouchableOpacity>

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
                onPress={() => {
                  // Validate that location has been selected (not default 0,0)
                  if (storeLocation.latitude && storeLocation.longitude &&
                      !(storeLocation.latitude === 0 && storeLocation.longitude === 0)) {
                    setShowMapModal(false);
                    modal.showSuccess('Store location has been pinned successfully!', { title: 'Location Set' });
                  } else {
                    modal.showWarning('Please tap on the map to pin your store location or use "Use Current Location" button', { title: 'No Location Selected' });
                  }
                }}
              >
                <Text style={styles.modalDoneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchTextInput}
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
              provider={PROVIDER_GOOGLE}
              ref={mapRef}
              style={[styles.map, (mapLoading || mapError) && styles.mapHidden]}
              region={mapRegion}
              onRegionChangeComplete={(region) => {
                // Only update the map region for visual centering, NOT the coordinates
                // This allows users to pan/explore without changing their selected location
                setMapRegion(region);
              }}
              onPress={async (event) => {
                const { latitude, longitude } = event.nativeEvent.coordinate;

                // Immediately update coordinates and center map
                setMapRegion(prev => ({
                  ...prev,
                  latitude,
                  longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }));

                // Perform reverse geocoding immediately to get address
                try {
                  const address = await Location.reverseGeocodeAsync({
                    latitude,
                    longitude,
                  });

                  const addressData = address[0];
                  const addressString = `${addressData?.street || addressData?.name || 'Unknown Location'}, ${addressData?.city || 'Unknown City'}, ${addressData?.region || 'Unknown Region'}`;

                  setStoreLocation({
                    latitude,
                    longitude,
                    address: addressString.trim(),
                  });

                  // Auto-fill form fields
                  if (formikRef.current && addressData) {
                    if (addressData.street) {
                      formikRef.current.setFieldValue('street_road', addressData.street);
                    }
                    if (addressData.city) {
                      formikRef.current.setFieldValue('city', addressData.city);
                    }
                    if (addressData.region) {
                      formikRef.current.setFieldValue('state', addressData.region);
                    }
                    if (addressData.postalCode) {
                      formikRef.current.setFieldValue('pincode', addressData.postalCode);
                    }
                  }
                } catch (error) {
                  console.error('Reverse geocoding error:', error);
                  // If reverse geocoding fails, still save the coordinates
                  setStoreLocation({
                    latitude,
                    longitude,
                    address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                  });
                }
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
                This will help customers find your store
              </Text>
              {storeLocation.latitude !== 0 && storeLocation.longitude !== 0 && (
                <View style={styles.coordinateDisplay}>
                  <Text style={styles.coordinateText}>
                    📍 {storeLocation.latitude.toFixed(6)}, {storeLocation.longitude.toFixed(6)}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.currentLocationButton, locationLoading && styles.buttonDisabled]}
              onPress={pickLocation}
              disabled={locationLoading}
            >
              {locationLoading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Ionicons name="locate" size={20} color="#fff" />
              )}
              <Text style={styles.currentLocationText}>
                {locationLoading ? 'Getting Location...' : 'Use Current Location'}
              </Text>
            </TouchableOpacity>
          </View>
        </Modal>
        
        {showIncorporationDatePicker && (
          <DateTimePicker
            value={dateOfIncorporation || new Date()}
            mode="date"
            display="default"
            maximumDate={new Date()} // Can't select future dates
            onChange={(event, selectedDate) => {
              setShowIncorporationDatePicker(false);
              if (selectedDate && event.type === 'set') {
                setDateOfIncorporation(selectedDate);
              }
            }}
          />
        )}

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
    paddingBottom: 150, // Increased bottom padding for keyboard
    flexGrow: 1,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: Spacing.md,
    marginBottom: Spacing.md,
    zIndex: 10,
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
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    backgroundColor: Colors.white,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  dateButtonText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textPrimary,
    flex: 1,
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
  prefixWrapper: {
    position: 'relative',
    marginRight: Spacing.sm,
  },
  prefixContainer: {
    width: 90,
    height: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    gap: 4,
    backgroundColor: Colors.white,
  },
  prefixText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeights.medium,
  },
  prefixDropdownList: {
    position: 'absolute',
    top: 58,
    left: 0,
    width: 90,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    zIndex: 1000,
    elevation: 5,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  ownerNameInput: {
    flex: 1,
  },

  // Map Modal Styles
  mapModalContainer: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  mapModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.white,
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  mapModalTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Spacing.md,
  },
  modalCloseButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundSecondary,
  },
  modalDoneButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
  },
  modalDoneButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.backgroundSecondary,
  },
  searchTextInput: {
    flex: 1,
    paddingVertical: Spacing.sm,
    fontSize: Typography.fontSizes.base,
    color: Colors.textPrimary,
  },
  searchButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
  },
  pickLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  pickLocationButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
  },
  map: {
    flex: 1,
    width: '100%',
  },
  mapHidden: {
    height: 0,
    opacity: 0,
  },
  mapLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
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
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    padding: Spacing.xl,
  },
  mapErrorText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
  },
  mapInstructions: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    elevation: 4,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  instructionText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeights.medium,
    marginBottom: Spacing.xs,
  },
  instructionSubtext: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  coordinateDisplay: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.sm,
  },
  coordinateText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  currentLocationButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    elevation: 4,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  currentLocationText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});