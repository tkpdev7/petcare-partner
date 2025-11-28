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
import apiService from '../../services/apiService';

interface MedicineQuote {
  name: string;
  price: number;
  quantity: number;
  available: boolean;
  notes?: string;
}

export default function SendQuoteScreen() {
  const router = useRouter();
  const { requestId, requestTitle, medicines } = useLocalSearchParams();

  const [parsedMedicines, setParsedMedicines] = useState<any[]>([]);
  const [medicineQuotes, setMedicineQuotes] = useState<MedicineQuote[]>([]);
  const [deliveryTime, setDeliveryTime] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      const medicinesArray = typeof medicines === 'string' ? JSON.parse(medicines) : [];
      setParsedMedicines(medicinesArray);

      // Initialize medicine quotes
      setMedicineQuotes(
        medicinesArray.map((med: any) => ({
          name: med.name,
          price: 0,
          quantity: med.quantity || 1,
          available: true,
          notes: '',
        }))
      );
    } catch (error) {
      console.error('Error parsing medicines:', error);
      Alert.alert('Error', 'Failed to load medicine information');
      router.back();
    }
  }, [medicines]);

  const updateMedicineQuote = (index: number, field: keyof MedicineQuote, value: any) => {
    const updated = [...medicineQuotes];
    updated[index] = { ...updated[index], [field]: value };
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
    // Check if at least one medicine is available with price
    const hasAvailableMedicine = medicineQuotes.some(
      quote => quote.available && quote.price > 0
    );

    if (!hasAvailableMedicine) {
      Alert.alert('Validation Error', 'Please provide price for at least one available medicine');
      return false;
    }

    // Check if delivery time is provided
    if (!deliveryTime.trim()) {
      Alert.alert('Validation Error', 'Please provide estimated delivery time');
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
        request_id: requestId,
        quoted_medicines: quotedMedicines,
        total_amount: totalAmount,
        estimated_delivery_time: deliveryTime,
        additional_notes: additionalNotes,
        availability_status: availabilityStatus,
      };

      const response = await apiService.makeRequest('POST', '/quote', quoteData);

      if (response.success) {
        router.replace({
          pathname: '/pharmacy-requests/success',
          params: {
            totalAmount: totalAmount.toString(),
            requestTitle: requestTitle,
          }
        });
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

  const handleCancel = () => {
    Alert.alert(
      'Cancel Quote',
      'Are you sure you want to cancel? All entered information will be lost.',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes', onPress: () => router.back() },
      ]
    );
  };

  const totalAmount = calculateTotalAmount();
  const availableCount = medicineQuotes.filter(q => q.available).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Quote</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Request Info */}
          <View style={styles.requestInfoCard}>
            <Text style={styles.requestInfoTitle}>{requestTitle}</Text>
            <Text style={styles.requestInfoSubtitle}>Request #{requestId}</Text>
          </View>

          {/* Medicines Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="medical" size={20} color="#FF7A59" />
              <Text style={styles.sectionTitle}>Medicine Quotes</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Provide pricing for each medicine
            </Text>

            {medicineQuotes.map((quote, index) => (
              <View key={index} style={styles.medicineQuoteCard}>
                <View style={styles.medicineQuoteHeader}>
                  <View style={styles.medicineNameRow}>
                    <Ionicons name="medical-outline" size={18} color="#666" />
                    <Text style={styles.medicineName}>{quote.name}</Text>
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

          {/* Delivery Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time" size={20} color="#FF7A59" />
              <Text style={styles.sectionTitle}>Delivery Information</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Estimated Delivery Time *</Text>
              <TextInput
                style={styles.input}
                value={deliveryTime}
                onChangeText={setDeliveryTime}
                placeholder="e.g., 2-3 hours, Same day, 24 hours"
              />
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
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Time:</Text>
              <Text style={styles.summaryValue}>
                {deliveryTime || 'Not specified'}
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
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  requestInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF7A59',
  },
  requestInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  requestInfoSubtitle: {
    fontSize: 13,
    color: '#999',
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
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
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
  medicineNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
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
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  submitButton: {
    flex: 2,
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
