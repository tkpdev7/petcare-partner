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
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  prescription_file_url?: string;
  quote_count?: number;
}

interface MedicineQuote {
  name: string;
  price: number;
  quantity: number;
  available: boolean;
  notes?: string;
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

export default function SendQuoteScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [requestDetails, setRequestDetails] = useState<RequestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [partnerId, setPartnerId] = useState<string>('');
  const [medicineQuotes, setMedicineQuotes] = useState<MedicineQuote[]>([
    { name: '', price: 0, quantity: 1, available: true, notes: '' }
  ]);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPartnerData();
    loadRequestDetails();
  }, [id]);

  const loadPartnerData = async () => {
    try {
      const partnerDataStr = await AsyncStorage.getItem('partnerData');
      if (partnerDataStr) {
        const partnerData = JSON.parse(partnerDataStr);
        setPartnerId(partnerData.id);
      } else {
        Alert.alert('Error', 'Partner information not found');
        router.back();
      }
    } catch (error) {
      console.error('Error loading partner data:', error);
      Alert.alert('Error', 'Failed to load partner information');
      router.back();
    }
  };

  const loadRequestDetails = async () => {
    try {
      setLoading(true);
      const response = await apiService.makeRequest('GET', `/medicine-request/${id}`);

      console.log('=== FULL API RESPONSE ===');
      console.log('Response:', JSON.stringify(response, null, 2));

      if (response.success && response.data) {
        const requestData = response.data.request || response.data;

        console.log('=== REQUEST DATA ===');
        console.log('Request Data:', JSON.stringify(requestData, null, 2));
        console.log('prescription_file_url:', requestData.prescription_file_url);
        console.log('prescription_url:', requestData.prescription_url);
        console.log('documents:', requestData.documents);
        console.log('document_url:', requestData.document_url);

        // Check all possible prescription locations
        const prescriptionUrl =
          requestData.prescription_file_url ||
          requestData.prescription_url ||
          requestData.document_url ||
          (requestData.documents && requestData.documents[0]?.url) ||
          null;

        console.log('Final prescription URL:', prescriptionUrl);

        // Add the prescription URL to the request data if found
        if (prescriptionUrl && !requestData.prescription_file_url) {
          requestData.prescription_file_url = prescriptionUrl;
        }

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

  const handleViewPrescription = async () => {
    if (requestDetails?.prescription_file_url) {
      try {
        const canOpen = await Linking.canOpenURL(requestDetails.prescription_file_url);
        if (canOpen) {
          await Linking.openURL(requestDetails.prescription_file_url);
        } else {
          Alert.alert('Error', 'Cannot open prescription file');
        }
      } catch (error) {
        console.error('Error opening prescription:', error);
        Alert.alert('Error', 'Failed to open prescription file');
      }
    } else {
      Alert.alert('Info', 'No prescription attached');
    }
  };

  const updateMedicineQuote = (index: number, field: keyof MedicineQuote, value: any) => {
    const updated = [...medicineQuotes];
    updated[index] = { ...updated[index], [field]: value };
    setMedicineQuotes(updated);
  };

  const addMedicine = () => {
    setMedicineQuotes([
      ...medicineQuotes,
      { name: '', price: 0, quantity: 1, available: true, notes: '' }
    ]);
  };

  const removeMedicine = (index: number) => {
    if (medicineQuotes.length === 1) {
      Alert.alert('Error', 'You must have at least one medicine in the quote');
      return;
    }
    const updated = medicineQuotes.filter((_, i) => i !== index);
    setMedicineQuotes(updated);
  };

  const calculateTotalAmount = () => {
    return medicineQuotes.reduce((total, quote) => {
      if (quote.available && quote.price > 0) {
        return total + (quote.price * quote.quantity);
      }
      return total;
    }, 0);
  };

  const validateQuote = () => {
    // Check if all medicines have names
    const hasEmptyName = medicineQuotes.some(quote => !quote.name.trim());
    if (hasEmptyName) {
      Alert.alert('Validation Error', 'Please enter medicine names for all items');
      return false;
    }

    // Check if at least one medicine is available with price
    const hasAvailableMedicine = medicineQuotes.some(
      quote => quote.available && quote.price > 0
    );

    if (!hasAvailableMedicine) {
      Alert.alert('Validation Error', 'Please provide price for at least one available medicine');
      return false;
    }

    return true;
  };

  const handleSubmitQuote = async () => {
    if (!validateQuote()) return;

    setSubmitting(true);
    try {
      // Prepare quoted medicines data
      const quotedMedicines = medicineQuotes.map(quote => ({
        name: quote.name,
        price: quote.price,
        quantity: quote.quantity,
        available: quote.available,
        notes: quote.notes || '',
      }));

      const totalAmount = calculateTotalAmount();

      // Determine availability status based on available medicines
      let availabilityStatus = 'available';
      const availableMeds = medicineQuotes.filter(q => q.available);
      if (availableMeds.length === 0) {
        availabilityStatus = 'unavailable';
      } else if (availableMeds.length < medicineQuotes.length) {
        availabilityStatus = 'partial';
      }

      const quoteData = {
        request_id: id,
        partner_id: partnerId,
        quoted_medicines: quotedMedicines,
        total_amount: totalAmount,
        additional_notes: additionalNotes,
        availability_status: availabilityStatus,
      };

      const response = await apiService.makeRequest('POST', '/quote', quoteData);

      if (response.success) {
        Alert.alert(
          'Success',
          'Quote submitted successfully! The customer will be notified.',
          [
            {
              text: 'OK',
              onPress: () => router.push('/pharmacy-requests'),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to submit quote');
      }
    } catch (error) {
      console.error('Error submitting quote:', error);
      Alert.alert('Error', 'Failed to submit quote. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.push('/pharmacy-requests')}>
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
          <TouchableOpacity style={styles.backButton} onPress={() => router.push('/pharmacy-requests')}>
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

  const totalAmount = calculateTotalAmount();
  const availableCount = medicineQuotes.filter(q => q.available).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/pharmacy-requests')}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Quote</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Request Header */}
          <View style={styles.requestHeader}>
            <View style={styles.titleRow}>
              <View style={styles.titleContainer}>
                <Text style={styles.requestTitle}>{requestDetails.request_title}</Text>
                <Text style={styles.requestNumber}>Request #{requestDetails.request_number || requestDetails.id}</Text>
              </View>
              <View style={[styles.urgencyBadge, { backgroundColor: urgencyColors[requestDetails.urgency_level] }]}>
                <Ionicons name="alert-circle" size={14} color="#fff" />
                <Text style={styles.urgencyText}>{urgencyLabels[requestDetails.urgency_level]}</Text>
              </View>
            </View>
          </View>

          {/* Request Description */}
          {requestDetails.request_description && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text-outline" size={20} color="#FF7A59" />
                <Text style={styles.sectionTitle}>Description</Text>
              </View>
              <Text style={styles.descriptionText}>{requestDetails.request_description}</Text>
            </View>
          )}

          {/* Prescription - Prominent Section */}
          {requestDetails.prescription_file_url ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text" size={20} color="#FF7A59" />
                <Text style={styles.sectionTitle}>Customer's Prescription</Text>
              </View>
              <TouchableOpacity style={styles.prescriptionCardProminent} onPress={handleViewPrescription}>
                <View style={styles.prescriptionIconLarge}>
                  <Ionicons name="document-text" size={48} color="#FF7A59" />
                </View>
                <View style={styles.prescriptionInfoCenter}>
                  <Text style={styles.prescriptionTitleLarge}>View Prescription Document</Text>
                  <Text style={styles.prescriptionSubtitleLarge}>
                    Check the prescription to understand medicine requirements
                  </Text>
                  <View style={styles.tapToViewButton}>
                    <Ionicons name="eye-outline" size={18} color="#fff" />
                    <Text style={styles.tapToViewText}>Tap to View</Text>
                  </View>
                </View>
              </TouchableOpacity>
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={18} color="#3B82F6" />
                <Text style={styles.infoBoxText}>
                  Based on the prescription, enter the medicines you can provide below
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="medical" size={20} color="#FF7A59" />
                <Text style={styles.sectionTitle}>Medicine Information</Text>
              </View>
              <View style={styles.noPrescriptionBox}>
                <Ionicons name="alert-circle" size={24} color="#F59E0B" />
                <Text style={styles.noPrescriptionText}>
                  No prescription uploaded. You may contact the customer for details.
                </Text>
              </View>
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
              <>
                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={18} color="#666" />
                  <Text style={styles.infoLabel}>Phone:</Text>
                  <Text style={styles.infoValue}>{requestDetails.user_phone}</Text>
                </View>
                <TouchableOpacity style={styles.callButton} onPress={handleCall}>
                  <Ionicons name="call" size={20} color="#fff" />
                  <Text style={styles.callButtonText}>Call Customer</Text>
                </TouchableOpacity>
              </>
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

          {/* Medicine Quotes Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="medical" size={20} color="#FF7A59" />
              <Text style={styles.sectionTitle}>Your Quote</Text>
              <TouchableOpacity style={styles.addButton} onPress={addMedicine}>
                <Ionicons name="add-circle" size={28} color="#FF7A59" />
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionSubtitle}>
              Enter medicine details and pricing
            </Text>

            {medicineQuotes.map((quote, index) => (
              <View key={index} style={styles.medicineQuoteCard}>
                <View style={styles.medicineQuoteHeader}>
                  <View style={styles.medicineHeaderTop}>
                    <View style={styles.medicineNameRow}>
                      <Ionicons name="medical-outline" size={18} color="#666" />
                      <Text style={styles.medicineLabel}>Medicine #{index + 1}</Text>
                    </View>
                    {medicineQuotes.length > 1 && (
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => removeMedicine(index)}
                      >
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Medicine Name Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Medicine Name *</Text>
                    <TextInput
                      style={styles.input}
                      value={quote.name}
                      onChangeText={(text) => updateMedicineQuote(index, 'name', text)}
                      placeholder="Enter medicine name"
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.availabilityToggle}
                    onPress={() => updateMedicineQuote(index, 'available', !quote.available)}
                  >
                    <Ionicons
                      name={quote.available ? 'checkmark-circle' : 'close-circle'}
                      size={24}
                      color={quote.available ? '#10B981' : '#EF4444'}
                    />
                    <Text style={[
                      styles.availabilityText,
                      { color: quote.available ? '#10B981' : '#EF4444' }
                    ]}>
                      {quote.available ? 'Available' : 'Not Available'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {quote.available && (
                  <>
                    <View style={styles.inputRow}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Quantity</Text>
                        <TextInput
                          style={styles.input}
                          value={quote.quantity.toString()}
                          onChangeText={(text) => {
                            const num = parseInt(text) || 0;
                            updateMedicineQuote(index, 'quantity', num);
                          }}
                          keyboardType="number-pad"
                          placeholder="Qty"
                        />
                      </View>

                      <View style={[styles.inputGroup, { flex: 2 }]}>
                        <Text style={styles.inputLabel}>Price per Unit (₹)</Text>
                        <TextInput
                          style={styles.input}
                          value={quote.price > 0 ? quote.price.toString() : ''}
                          onChangeText={(text) => {
                            const num = parseFloat(text) || 0;
                            updateMedicineQuote(index, 'price', num);
                          }}
                          keyboardType="decimal-pad"
                          placeholder="0.00"
                        />
                      </View>
                    </View>

                    {quote.price > 0 && quote.quantity > 0 && (
                      <View style={styles.subtotalRow}>
                        <Text style={styles.subtotalLabel}>Subtotal:</Text>
                        <Text style={styles.subtotalAmount}>
                          ₹{(quote.price * quote.quantity).toFixed(2)}
                        </Text>
                      </View>
                    )}

                    <TextInput
                      style={styles.notesInput}
                      value={quote.notes}
                      onChangeText={(text) => updateMedicineQuote(index, 'notes', text)}
                      placeholder="Add notes (optional)"
                      multiline
                    />
                  </>
                )}
              </View>
            ))}
          </View>

          {/* Additional Notes */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text" size={20} color="#FF7A59" />
              <Text style={styles.sectionTitle}>Additional Information</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Additional Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={additionalNotes}
                onChangeText={setAdditionalNotes}
                placeholder="Any additional information for the customer..."
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          {/* Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Quote Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Available Medicines:</Text>
              <Text style={styles.summaryValue}>
                {availableCount} of {medicineQuotes.length}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotalLabel}>Total Amount:</Text>
              <Text style={styles.summaryTotalValue}>₹{totalAmount.toFixed(2)}</Text>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomContainer}>
          <View style={styles.totalBar}>
            <Text style={styles.totalBarLabel}>Total Quote:</Text>
            <Text style={styles.totalBarAmount}>₹{totalAmount.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmitQuote}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.submitButtonText}>Submitting...</Text>
              </>
            ) : (
              <>
                <Ionicons name="paper-plane" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Submit Quote</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
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
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  requestNumber: {
    fontSize: 14,
    color: '#999',
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
    fontSize: 11,
    color: '#fff',
    fontWeight: 'bold',
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
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  addButton: {
    padding: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  prescriptionCardProminent: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#FF7A59',
    alignItems: 'center',
    marginBottom: 12,
  },
  prescriptionIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  prescriptionInfoCenter: {
    alignItems: 'center',
  },
  prescriptionTitleLarge: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  prescriptionSubtitleLarge: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  tapToViewButton: {
    flexDirection: 'row',
    backgroundColor: '#FF7A59',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    gap: 8,
  },
  tapToViewText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  infoBoxText: {
    fontSize: 13,
    color: '#3B82F6',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  noPrescriptionBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFEDD5',
    alignItems: 'center',
  },
  noPrescriptionText: {
    fontSize: 14,
    color: '#F59E0B',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
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
  medicineQuoteCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  medicineQuoteHeader: {
    marginBottom: 12,
  },
  medicineHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  medicineNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  medicineLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#666',
    marginLeft: 8,
  },
  deleteButton: {
    padding: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
  },
  availabilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availabilityText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  notesInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#333',
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
    marginBottom: 8,
  },
  subtotalLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  subtotalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF7A59',
  },
  summaryCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#FFEDD5',
    marginVertical: 8,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF7A59',
  },
  bottomContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalBarLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalBarAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF7A59',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#FF7A59',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
