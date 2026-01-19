import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { requestMediaPermissionLazy } from '../../utils/permissions';
import AppHeader from '../../components/AppHeader';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/Colors';
import CustomModal from '../../components/CustomModal';
import { useCustomModal } from '../../hooks/useCustomModal';
import KeyboardAwareScrollView from '../../components/KeyboardAwareScrollView';

interface PartnerData {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  serviceType: string;
  verified: boolean;
  profilePhoto?: string;
  description?: string;
  rating: number;
  reviewCount: number;
}

// Helper function to mask email address
const maskEmail = (email: string): string => {
  if (!email) return '';
  const [localPart, domain] = email.split('@');
  if (!domain) return email;

  const visibleChars = Math.min(2, Math.floor(localPart.length / 3));
  const maskedLocal = localPart.substring(0, visibleChars) + '****';

  const [domainName, tld] = domain.split('.');
  const maskedDomain = domainName.charAt(0) + '****' + (tld ? '.' + tld : '');

  return `${maskedLocal}@${maskedDomain}`;
};

// Helper function to mask phone number
const maskPhone = (phone: string): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, ''); // Remove non-digits

  if (cleaned.length <= 4) return phone;

  // Show last 3 digits, mask the rest
  const lastDigits = cleaned.slice(-3);
  const maskedPart = '*'.repeat(Math.min(6, cleaned.length - 3));
  const prefix = cleaned.length > 10 ? cleaned.substring(0, cleaned.length - 10) + ' ' : '';

  return `${prefix}${maskedPart}${lastDigits}`;
};

export default function AccountScreen() {
  const router = useRouter();
  const modal = useCustomModal();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [partnerData, setPartnerData] = useState<PartnerData>({
    id: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    serviceType: '',
    verified: false,
    description: '',
    rating: 0,
    reviewCount: 0,
  });

  useEffect(() => {
    loadPartnerData();
  }, []);

  const loadPartnerData = async () => {
    try {
      // STEP 1: Load from AsyncStorage immediately for instant display
      const cachedData = await AsyncStorage.getItem('partnerData');
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        setPartnerData({
          ...parsed,
          description: parsed.description || '',
          rating: parsed.rating || 4.5,
          reviewCount: parsed.reviewCount || 0,
        });
        console.log('Loaded cached partner data');
      }

      // STEP 2: Fetch fresh data from API in background to sync
      try {
        const apiService = (await import('../../services/apiService')).default;
        const response = await apiService.getProfile();
        console.log('Profile API response:', response);

        if (response.success && response.data && response.data.data) {
          // API returns nested data: response.data.data contains actual partner info
          const apiData = response.data.data;
          const newData = {
            id: apiData.id,
            name: apiData.name || apiData.business_name,
            email: apiData.email,
            phone: apiData.phone,
            address: apiData.address || '',
            serviceType: apiData.serviceType,
            verified: apiData.verified,
            profilePhoto: apiData.profilePhoto,
            description: apiData.description || '',
            rating: parseFloat(apiData.rating) || 4.5,
            reviewCount: apiData.reviewCount || 0,
          };
          console.log('Synced fresh partner data from API:', {
            name: newData.name,
            email: newData.email,
            phone: newData.phone,
            hasPhoto: !!newData.profilePhoto
          });
          setPartnerData(newData);
          // Update local storage cache
          await AsyncStorage.setItem('partnerData', JSON.stringify(newData));
        }
      } catch (apiError) {
        console.log('API fetch failed, using cached data:', apiError.message);
        // It's okay, we already loaded cached data above
      }
    } catch (error) {
      console.error('Error loading partner data:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Import apiService at the top of the file to use it here
      const apiService = (await import('../../services/apiService')).default;

      // Call API to update profile
      const response = await apiService.updatePartnerProfile({
        name: partnerData.name,
        address: partnerData.address,
      });

      if (response.success) {
        // Update local storage
        await AsyncStorage.setItem('partnerData', JSON.stringify(partnerData));
        modal.showSuccess('Profile updated successfully');
        setIsEditing(false);
        // Reload fresh data
        await loadPartnerData();
      } else {
        modal.showError(response.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      modal.showError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleImagePicker = async () => {
    try {
      // Request permissions lazily with soft prompt
      const mediaGranted = await requestMediaPermissionLazy();
      if (!mediaGranted) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;

        // Show uploading indicator
        setUploadingImage(true);

        try {
          // Import apiService
          const apiService = (await import('../../services/apiService')).default;

          // Upload image to backend (using 'users' bucket for all user types including partners)
          const uploadResponse = await apiService.uploadImage(imageUri, 'users', 'profiles');

          if (uploadResponse.success && uploadResponse.data?.url) {
            const photoUrl = uploadResponse.data.url;

            // Update partner profile photo in database
            const updateResponse = await apiService.updatePartnerPhoto(photoUrl);

            if (updateResponse.success) {
              // Update local state
              setPartnerData(prev => ({
                ...prev,
                profilePhoto: photoUrl
              }));

              // Update AsyncStorage
              const updatedData = { ...partnerData, profilePhoto: photoUrl };
              await AsyncStorage.setItem('partnerData', JSON.stringify(updatedData));

              modal.showSuccess('Profile photo updated successfully!');
            } else {
              modal.showError(updateResponse.error || 'Failed to update profile photo');
            }
          } else {
            modal.showError(uploadResponse.error || 'Failed to upload image');
          }
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          modal.showError('Failed to upload image');
        } finally {
          setUploadingImage(false);
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      modal.showError(`Failed to pick image: ${error.message || 'Unknown error'}`);
    }
  };

  const handleLogout = () => {
    modal.showWarning(
      'Are you sure you want to logout?',
      {
        title: 'Logout',
        primaryButtonText: 'Logout',
        secondaryButtonText: 'Cancel',
        hideSecondaryButton: false,
        onPrimaryPress: async () => {
          modal.hideModal();
          await AsyncStorage.multiRemove(['partnerToken', 'partnerData']);
          router.replace('/auth/login');
        },
        onSecondaryPress: () => {
          modal.hideModal();
        }
      }
    );
  };

  const getServiceTypeDisplay = (type: string) => {
    switch (type) {
      case 'veterinary': return 'Veterinary Clinic';
      case 'grooming': return 'Grooming & Spa';
      case 'pharmacy': return 'Pharmacy & Pet Essentials';
      default: return type;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader 
        title="Profile" 
        showBackButton={false}
        rightComponent={
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => isEditing ? handleSave() : setIsEditing(true)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Ionicons 
                name={isEditing ? "checkmark" : "create"} 
                size={24} 
                color={Colors.white} 
              />
            )}
          </TouchableOpacity>
        }
      />

      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileSection}>
          <TouchableOpacity
            style={styles.profileImageContainer}
            onPress={handleImagePicker}
            disabled={uploadingImage}
          >
            {uploadingImage ? (
              <View style={styles.placeholderImage}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : partnerData.profilePhoto ? (
              <Image source={{ uri: partnerData.profilePhoto }} style={styles.profileImage} />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="person" size={48} color="#ccc" />
              </View>
            )}
            {!uploadingImage && (
              <View style={styles.editImageOverlay}>
                <Ionicons name="camera" size={20} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.businessName}>{partnerData.name}</Text>
          <Text style={styles.serviceType}>{getServiceTypeDisplay(partnerData.serviceType)}</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.ratingText}>{partnerData.rating}</Text>
              </View>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{partnerData.reviewCount}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.verifiedContainer}>
                <Ionicons 
                  name={partnerData.verified ? "checkmark-circle" : "close-circle"} 
                  size={16} 
                  color={partnerData.verified ? "#10B981" : "#EF4444"} 
                />
                <Text style={[
                  styles.verifiedText,
                  { color: partnerData.verified ? "#10B981" : "#EF4444" }
                ]}>
                  {partnerData.verified ? 'Verified' : 'Pending'}
                </Text>
              </View>
              <Text style={styles.statLabel}>Status</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Business Information</Text>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Email</Text>
            <View style={styles.readOnlyContainer}>
              <Text style={styles.readOnlyText}>{maskEmail(partnerData.email)}</Text>
              <Ionicons name="lock-closed" size={16} color="#999" />
            </View>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Phone</Text>
            <View style={styles.readOnlyContainer}>
              <Text style={styles.readOnlyText}>{maskPhone(partnerData.phone)}</Text>
              <Ionicons name="lock-closed" size={16} color="#999" />
            </View>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Service Type</Text>
            <View style={styles.readOnlyContainer}>
              <Text style={styles.readOnlyText}>{getServiceTypeDisplay(partnerData.serviceType)}</Text>
              <Ionicons name="lock-closed" size={16} color="#999" />
            </View>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Address</Text>
            {isEditing ? (
              <TextInput
                style={[styles.editInput, styles.textArea]}
                value={partnerData.address}
                onChangeText={(text) => setPartnerData(prev => ({ ...prev, address: text }))}
                placeholder="Enter business address"
                multiline
                numberOfLines={3}
              />
            ) : (
              <Text style={styles.infoValue}>{partnerData.address}</Text>
            )}
          </View>
        </View>

        <View style={styles.actionSection}>
          {isEditing && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setIsEditing(false);
                loadPartnerData(); // Reset data
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
      <CustomModal {...modal.modalProps} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  editButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 140, // Extra padding to clear tab navigation and mobile bottom buttons
  },
  profileSection: {
    backgroundColor: Colors.white,
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  placeholderImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editImageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF7A59',
    borderRadius: 15,
    padding: 6,
  },
  businessName: {
    fontSize: Typography.fontSizes.xxl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  serviceType: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
    width: '100%',
  },
  verifiedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoSection: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  infoItem: {
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoValue: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  readOnlyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  readOnlyText: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  actionSection: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#EF4444',
  },
});