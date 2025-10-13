import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../../services/apiService';

interface Medicine {
  name: string;
  dosage?: string;
  quantity?: number;
  form?: string;
}

interface RequestDetails {
  id: string;
  request_number: string;
  request_title: string;
  request_description: string;
  required_medicines: Medicine[];
  urgency_level: 'low' | 'normal' | 'high' | 'urgent';
  delivery_address: string;
  status: string;
  created_at: string;
  user_name?: string;
  user_phone?: string;
  pet_name?: string;
  pet_type?: string;
  pet_age?: string;
  prescription_url?: string;
  quote_count?: number;
}

const urgencyColors = {
  low: '#10B981',
  normal: '#3B82F6',
  high: '#F59E0B',
  urgent: '#EF4444',
};

const urgencyLabels = {
  low: 'Low Priority',
  normal: 'Normal Priority',
  high: 'High Priority',
  urgent: 'Urgent',
};

export default function ViewRequestScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [requestDetails, setRequestDetails] = useState<RequestDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequestDetails();
  }, [id]);

  const loadRequestDetails = async () => {
    try {
      setLoading(true);
      const response = await apiService.makeRequest('GET', `/medicine-request/${id}`);

      if (response.success && response.data) {
        const requestData = response.data.request || response.data;
        setRequestDetails(requestData);
      } else {
        Alert.alert('Error', response.error || 'Failed to load request details');
        router.back();
      }
    } catch (error) {
      console.error('Error loading request details:', error);
      Alert.alert('Error', 'Failed to load request details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    if (requestDetails?.user_phone) {
      Linking.openURL(`tel:${requestDetails.user_phone}`);
    } else {
      Alert.alert('Error', 'Phone number not available');
    }
  };

  const handleViewPrescription = () => {
    if (requestDetails?.prescription_url) {
      // TODO: Open prescription viewer
      Alert.alert('View Prescription', 'Opening prescription viewer...');
    } else {
      Alert.alert('Info', 'No prescription attached');
    }
  };

  const handleSendQuote = () => {
    if (!requestDetails) return;

    router.push({
      pathname: '/pharmacy-requests/send-quote',
      params: {
        requestId: requestDetails.id,
        requestTitle: requestDetails.request_title,
        medicines: JSON.stringify(requestDetails.required_medicines),
      }
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF7A59" />
          <Text style={styles.loadingText}>Loading request details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!requestDetails) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorText}>Request not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Request Header */}
        <View style={styles.requestHeader}>
          <View style={styles.titleRow}>
            <Text style={styles.requestTitle}>{requestDetails.request_title}</Text>
            <View style={[styles.urgencyBadge, { backgroundColor: urgencyColors[requestDetails.urgency_level] }]}>
              <Ionicons name="alert-circle" size={14} color="#fff" />
              <Text style={styles.urgencyText}>{urgencyLabels[requestDetails.urgency_level]}</Text>
            </View>
          </View>
          <Text style={styles.requestNumber}>Request #{requestDetails.request_number}</Text>
          <View style={styles.dateRow}>
            <Ionicons name="time-outline" size={14} color="#666" />
            <Text style={styles.dateText}>
              {new Date(requestDetails.created_at).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
        </View>

        {/* Request Description */}
        {requestDetails.request_description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{requestDetails.request_description}</Text>
          </View>
        )}

        {/* Required Medicines */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="medical" size={20} color="#FF7A59" />
            <Text style={styles.sectionTitle}>Required Medicines</Text>
          </View>
          {requestDetails.required_medicines.map((medicine, index) => (
            <View key={index} style={styles.medicineCard}>
              <View style={styles.medicineHeader}>
                <Text style={styles.medicineName}>{medicine.name}</Text>
                {medicine.quantity && (
                  <View style={styles.quantityBadge}>
                    <Text style={styles.quantityText}>Qty: {medicine.quantity}</Text>
                  </View>
                )}
              </View>
              {medicine.dosage && (
                <View style={styles.medicineDetail}>
                  <Ionicons name="pulse" size={14} color="#666" />
                  <Text style={styles.medicineDetailText}>Dosage: {medicine.dosage}</Text>
                </View>
              )}
              {medicine.form && (
                <View style={styles.medicineDetail}>
                  <Ionicons name="flask" size={14} color="#666" />
                  <Text style={styles.medicineDetailText}>Form: {medicine.form}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Prescription */}
        {requestDetails.prescription_url && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prescription</Text>
            <TouchableOpacity style={styles.prescriptionCard} onPress={handleViewPrescription}>
              <View style={styles.prescriptionIcon}>
                <Ionicons name="document-text" size={32} color="#FF7A59" />
              </View>
              <View style={styles.prescriptionInfo}>
                <Text style={styles.prescriptionTitle}>View Prescription</Text>
                <Text style={styles.prescriptionSubtitle}>Tap to view uploaded prescription</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#999" />
            </TouchableOpacity>
          </View>
        )}

        {/* Pet Information */}
        {requestDetails.pet_name && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="paw" size={20} color="#FF7A59" />
              <Text style={styles.sectionTitle}>Pet Information</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="paw-outline" size={18} color="#666" />
              <Text style={styles.infoLabel}>Name:</Text>
              <Text style={styles.infoValue}>{requestDetails.pet_name}</Text>
            </View>
            {requestDetails.pet_type && (
              <View style={styles.infoRow}>
                <Ionicons name="medical-outline" size={18} color="#666" />
                <Text style={styles.infoLabel}>Type:</Text>
                <Text style={styles.infoValue}>{requestDetails.pet_type}</Text>
              </View>
            )}
            {requestDetails.pet_age && (
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={18} color="#666" />
                <Text style={styles.infoLabel}>Age:</Text>
                <Text style={styles.infoValue}>{requestDetails.pet_age}</Text>
              </View>
            )}
          </View>
        )}

        {/* Customer Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={20} color="#FF7A59" />
            <Text style={styles.sectionTitle}>Customer Information</Text>
          </View>
          {requestDetails.user_name && (
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={18} color="#666" />
              <Text style={styles.infoLabel}>Name:</Text>
              <Text style={styles.infoValue}>{requestDetails.user_name}</Text>
            </View>
          )}
          {requestDetails.user_phone && (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={18} color="#666" />
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>{requestDetails.user_phone}</Text>
            </View>
          )}
          {requestDetails.user_phone && (
            <TouchableOpacity style={styles.callButton} onPress={handleCall}>
              <Ionicons name="call" size={20} color="#fff" />
              <Text style={styles.callButtonText}>Call Customer</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Delivery Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={20} color="#FF7A59" />
            <Text style={styles.sectionTitle}>Delivery Address</Text>
          </View>
          <View style={styles.addressCard}>
            <Ionicons name="location-outline" size={18} color="#666" />
            <Text style={styles.addressText}>{requestDetails.delivery_address}</Text>
          </View>
        </View>

        {/* Quote Statistics */}
        {requestDetails.quote_count !== undefined && (
          <View style={styles.statsCard}>
            <Ionicons name="document-text-outline" size={24} color="#3B82F6" />
            <Text style={styles.statsText}>
              {requestDetails.quote_count} {requestDetails.quote_count === 1 ? 'Quote' : 'Quotes'} submitted by other partners
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Action Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.sendQuoteButton} onPress={handleSendQuote}>
          <Ionicons name="paper-plane" size={20} color="#fff" />
          <Text style={styles.sendQuoteButtonText}>Send Quote</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  requestHeader: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  requestTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  urgencyText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  requestNumber: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  descriptionText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  medicineCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  medicineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  quantityBadge: {
    backgroundColor: '#FF7A59',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  quantityText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  medicineDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  medicineDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  prescriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  prescriptionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  prescriptionInfo: {
    flex: 1,
  },
  prescriptionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  prescriptionSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 15,
    color: '#666',
    marginLeft: 8,
    marginRight: 8,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  callButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  addressText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginLeft: 8,
    flex: 1,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  statsText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  bottomContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sendQuoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF7A59',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  sendQuoteButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
