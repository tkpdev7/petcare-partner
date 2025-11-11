import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppHeader from '../../components/AppHeader';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/Colors';
import { getServices, deleteService } from '../../services/apiService';

interface Service {
  id: string;
  name: string;
  description: string;
  short_description?: string;
  category: string;
  duration: number;
  price: number;
  is_active: boolean;
  created_at: string;
}

export default function ServicesScreen() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [partnerId, setPartnerId] = useState<string>('');

  useEffect(() => {
    loadPartnerData();
  }, []);

  const loadPartnerData = async () => {
    try {
      const data = await AsyncStorage.getItem('partnerData');
      if (data) {
        const parsed = JSON.parse(data);
        setPartnerId(parsed.id);
        fetchServices(parsed.id);
      }
    } catch (error) {
      console.error('Error loading partner data:', error);
      setLoading(false);
    }
  };

  const fetchServices = async (partnerIdParam?: string) => {
    try {
      const id = partnerIdParam || partnerId;
      if (!id) return;

      const response = await getServices({ partner_id: id });

      if (response.success) {
        setServices(response.services || []);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      Alert.alert('Error', 'Failed to load services');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchServices();
  };

  const handleAddService = () => {
    router.push('/services/add');
  };

  const handleEditService = (service: Service) => {
    router.push(`/services/add?id=${service.id}&mode=edit`);
  };

  const handleDeleteService = (service: Service) => {
    Alert.alert(
      'Delete Service',
      `Are you sure you want to delete "${service.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await deleteService(service.id);
              if (response.success) {
                Alert.alert('Success', 'Service deleted successfully');
                fetchServices();
              } else {
                Alert.alert('Error', response.message || 'Failed to delete service');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete service');
            }
          },
        },
      ]
    );
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: any } = {
      'General Consultation': 'medical',
      'Vaccination': 'shield-checkmark',
      'Surgery': 'medkit',
      'Dental Care': 'medical',
      'Emergency Care': 'alert-circle',
      'Grooming': 'cut',
      'Laboratory Tests': 'flask',
      'Health Checkup': 'fitness',
    };
    return icons[category] || 'medical';
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'General Consultation': '#6366F1',
      'Vaccination': '#10B981',
      'Surgery': '#EF4444',
      'Dental Care': '#F59E0B',
      'Emergency Care': '#DC2626',
      'Grooming': '#8B5CF6',
      'Laboratory Tests': '#06B6D4',
      'Health Checkup': '#EC4899',
    };
    return colors[category] || '#6B7280';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="My Services" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading services...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="My Services" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{services.length}</Text>
            <Text style={styles.statLabel}>Total Services</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {services.filter((s) => s.is_active).length}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {services.filter((s) => !s.is_active).length}
            </Text>
            <Text style={styles.statLabel}>Inactive</Text>
          </View>
        </View>

        {/* Add Service Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddService}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle" size={24} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add New Service</Text>
        </TouchableOpacity>

        {/* Services List */}
        {services.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="medical" size={80} color={Colors.lightGray} />
            <Text style={styles.emptyTitle}>No Services Yet</Text>
            <Text style={styles.emptyText}>
              Add your first service to start receiving appointments from customers
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={handleAddService}
            >
              <Text style={styles.emptyButtonText}>Add Service</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.servicesContainer}>
            <Text style={styles.sectionTitle}>Your Services</Text>
            {services.map((service) => (
              <View key={service.id} style={styles.serviceCard}>
                {/* Category Badge */}
                <View
                  style={[
                    styles.categoryBadge,
                    { backgroundColor: getCategoryColor(service.category) + '15' },
                  ]}
                >
                  <Ionicons
                    name={getCategoryIcon(service.category)}
                    size={20}
                    color={getCategoryColor(service.category)}
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      { color: getCategoryColor(service.category) },
                    ]}
                  >
                    {service.category}
                  </Text>
                </View>

                {/* Service Info */}
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.serviceDescription} numberOfLines={2}>
                    {service.short_description || service.description}
                  </Text>

                  {/* Service Details */}
                  <View style={styles.serviceDetails}>
                    <View style={styles.detailItem}>
                      <Ionicons name="time-outline" size={16} color={Colors.gray} />
                      <Text style={styles.detailText}>{service.duration} mins</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="cash-outline" size={16} color={Colors.gray} />
                      <Text style={styles.detailText}>₹{service.price}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: service.is_active
                            ? '#10B98115'
                            : '#EF444415',
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor: service.is_active
                              ? '#10B981'
                              : '#EF4444',
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          { color: service.is_active ? '#10B981' : '#EF4444' },
                        ]}
                      >
                        {service.is_active ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => handleEditService(service)}
                  >
                    <Ionicons name="pencil" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteService(service)}
                  >
                    <Ionicons name="trash" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.body,
    color: Colors.gray,
    marginTop: Spacing.sm,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Colors.shadow,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.h2,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.gray,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.lightGray,
    marginHorizontal: Spacing.md,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Colors.shadow,
  },
  addButtonText: {
    ...Typography.button,
    color: '#FFFFFF',
    marginLeft: Spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  emptyTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  emptyButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  emptyButtonText: {
    ...Typography.button,
    color: '#FFFFFF',
  },
  servicesContainer: {
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Colors.shadow,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  categoryText: {
    ...Typography.caption,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  serviceInfo: {
    marginBottom: Spacing.sm,
  },
  serviceName: {
    ...Typography.h4,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  serviceDescription: {
    ...Typography.body,
    color: Colors.gray,
    marginBottom: Spacing.sm,
  },
  serviceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.md,
    marginTop: Spacing.xs,
  },
  detailText: {
    ...Typography.caption,
    color: Colors.gray,
    marginLeft: Spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.xs,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#6366F1',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
});
