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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import AppHeader from '../../components/AppHeader';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/Colors';

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

export default function AccountScreen() {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
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
      const data = await AsyncStorage.getItem('partnerData');
      if (data) {
        const parsed = JSON.parse(data);
        setPartnerData({
          ...parsed,
          description: parsed.description || '',
          rating: parsed.rating || 4.5,
          reviewCount: parsed.reviewCount || 23,
        });
      }
    } catch (error) {
      console.error('Error loading partner data:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await AsyncStorage.setItem('partnerData', JSON.stringify(partnerData));
      Alert.alert('Success', 'Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleImagePicker = async () => {
    try {
      // Request permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant access to your photo library to select images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPartnerData(prev => ({
          ...prev,
          profilePhoto: result.assets[0].uri
        }));
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', `Failed to pick image: ${error.message || 'Unknown error'}`);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove(['partnerToken', 'partnerData']);
            router.replace('/auth/login');
          },
        },
      ]
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <TouchableOpacity
            style={styles.profileImageContainer}
            onPress={isEditing ? handleImagePicker : undefined}
            disabled={!isEditing}
          >
            {partnerData.profilePhoto ? (
              <Image source={{ uri: partnerData.profilePhoto }} style={styles.profileImage} />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="person" size={48} color="#ccc" />
              </View>
            )}
            {isEditing && (
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
            <Text style={styles.infoLabel}>Business Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.editInput}
                value={partnerData.name}
                onChangeText={(text) => setPartnerData(prev => ({ ...prev, name: text }))}
                placeholder="Enter business name"
              />
            ) : (
              <Text style={styles.infoValue}>{partnerData.name}</Text>
            )}
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Email</Text>
            <View style={styles.readOnlyContainer}>
              <Text style={styles.readOnlyText}>{partnerData.email}</Text>
              <Ionicons name="lock-closed" size={16} color="#999" />
            </View>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Phone</Text>
            <View style={styles.readOnlyContainer}>
              <Text style={styles.readOnlyText}>{partnerData.phone}</Text>
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

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Description</Text>
            {isEditing ? (
              <TextInput
                style={[styles.editInput, styles.textArea]}
                value={partnerData.description}
                onChangeText={(text) => setPartnerData(prev => ({ ...prev, description: text }))}
                placeholder="Enter business description"
                multiline
                numberOfLines={4}
              />
            ) : (
              <Text style={styles.infoValue}>{partnerData.description || 'No description added'}</Text>
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
      </ScrollView>
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
  content: {
    flex: 1,
    paddingBottom: 120, // Extra padding to clear tab navigation and mobile bottom buttons
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
    fontSize: 12,
    color: '#666',
    marginTop: 4,
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