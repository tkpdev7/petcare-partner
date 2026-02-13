import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AppHeader from '../../components/AppHeader';
import CustomModal from '../../components/CustomModal';
import { useCustomModal } from '../../hooks/useCustomModal';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/Colors';
import apiService from '../../services/apiService';

interface Slot {
  id: number;
  partner_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  slot_duration: number;
  is_available: boolean;
  is_booked: boolean;
  created_at: string;
}

export default function MySlotsScreen() {
  const router = useRouter();
  const modal = useCustomModal();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSlot, setExpandedSlot] = useState<number | null>(null);
  const [partnerName, setPartnerName] = useState('Partner');

  // Date filter states
  const [fromDate, setFromDate] = useState<Date>(new Date());
  const [toDate, setToDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30); // Default to 30 days from today
    return date;
  });
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSlots();
      loadPartnerInfo();
    }, [])
  );

  const loadPartnerInfo = async () => {
    try {
      const response = await apiService.getProfile();
      if (response.success && response.data) {
        setPartnerName(response.data.business_name || response.data.name || 'Partner');
      }
    } catch (error) {
      console.error('Load partner info error:', error);
    }
  };

  const loadSlots = async () => {
    try {
      setLoading(true);
      const formattedFromDate = formatDateForAPI(fromDate);
      const formattedToDate = formatDateForAPI(toDate);

      // Get slots within selected date range
      const response = await apiService.getPartnerSlots({
        from_date: formattedFromDate,
        to_date: formattedToDate,
        limit: 1500,
      });

      if (response.success) {
        // Handle both direct array and nested data structure
        const slotsData = Array.isArray(response.data)
          ? response.data
          : (response.data?.data || []);

        // Filter out booked slots - only show available upcoming slots
        const availableSlots = slotsData.filter((slot: Slot) => !slot.is_booked);
        setSlots(availableSlots);
      } else {
        console.error('Failed to load slots:', response.error);
        setSlots([]);
      }
    } catch (error) {
      console.error('Load slots error:', error);
      modal.showError('Failed to load slots');
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSlots();
    setRefreshing(false);
  };

  const formatDateForAPI = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  const handleDeleteSlot = async (date: string, dateSlots: Slot[]) => {
    modal.showWarning(
      `Are you sure you want to delete all ${dateSlots.length} slot(s) for ${formatDate(date)}?`,
      {
        title: 'Delete Slots',
        primaryButtonText: 'Delete',
        secondaryButtonText: 'Cancel',
        onPrimaryPress: async () => {
          modal.hideModal();
            try {
              let deletedCount = 0;
              let notFoundCount = 0;
              let failedCount = 0;

              console.log(`Attempting to delete ${dateSlots.length} slots for date ${date}`);

              // Delete all slots for this date
              for (const slot of dateSlots) {
                console.log(`Deleting slot ID: ${slot.id}`);
                const response = await apiService.deletePartnerSlot(slot.id);

                if (response.success) {
                  deletedCount++;
                  console.log(`Slot ${slot.id} deleted successfully`);
                } else if (response.error?.includes('not found') || response.error?.includes('404')) {
                  notFoundCount++;
                  console.log(`Slot ${slot.id} not found (already deleted)`);
                } else {
                  failedCount++;
                  console.error(`Failed to delete slot ${slot.id}:`, response.error);
                }
              }

              console.log(`Delete summary - Deleted: ${deletedCount}, Not Found: ${notFoundCount}, Failed: ${failedCount}`);

              if (failedCount === 0) {
                if (notFoundCount > 0) {
                  modal.showSuccess(`${deletedCount} slot(s) deleted. ${notFoundCount} were already removed.`);
                } else {
                  modal.showSuccess(`All ${deletedCount} slot(s) deleted successfully`);
                }
              } else {
                modal.showWarning(`${deletedCount} deleted, ${notFoundCount} already removed, ${failedCount} failed`, {
                  title: 'Partial Success'
                });
              }

              loadSlots();
            } catch (error) {
              console.error('Delete slots error:', error);
              modal.showError('Failed to delete slots');
            }
          },
        onSecondaryPress: modal.hideModal
      }
    );
  };

  const groupSlotsByDate = () => {
    // Ensure slots is always an array
    if (!Array.isArray(slots)) {
      console.error('Slots is not an array:', slots);
      return [];
    }

    const grouped: { [key: string]: Slot[] } = {};

    slots.forEach(slot => {
      if (!grouped[slot.slot_date]) {
        grouped[slot.slot_date] = [];
      }
      grouped[slot.slot_date].push(slot);
    });

    // Sort slots within each date by start_time
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => a.start_time.localeCompare(b.start_time));
    });

    // Convert to array and sort by date
    return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
  };

  const toggleExpand = (slotId: number) => {
    setExpandedSlot(expandedSlot === slotId ? null : slotId);
  };

  const handleFromDateChange = (event: any, selectedDate?: Date) => {
    setShowFromPicker(Platform.OS === 'ios'); // Keep picker open on iOS
    if (selectedDate) {
      setFromDate(selectedDate);
      // If from date is after to date, adjust to date
      if (selectedDate > toDate) {
        const newToDate = new Date(selectedDate);
        newToDate.setDate(newToDate.getDate() + 7); // Set to 7 days later
        setToDate(newToDate);
      }
    }
  };

  const handleToDateChange = (event: any, selectedDate?: Date) => {
    setShowToPicker(Platform.OS === 'ios'); // Keep picker open on iOS
    if (selectedDate) {
      // Ensure to date is not before from date
      if (selectedDate >= fromDate) {
        setToDate(selectedDate);
      } else {
        modal.showWarning('To date cannot be before From date');
      }
    }
  };

  const applyDateFilter = () => {
    loadSlots();
  };

  const renderDateSection = ({ item }: { item: [string, Slot[]] }) => {
    const [date, dateSlots] = item;
    const firstSlot = dateSlots[0];
    const lastSlot = dateSlots[dateSlots.length - 1];
    const isExpanded = expandedSlot === parseInt(date.replace(/-/g, '')); // Use date as unique ID

    return (
      <View style={styles.slotCard}>
        <TouchableOpacity
          style={styles.slotCardHeader}
          onPress={() => toggleExpand(parseInt(date.replace(/-/g, '')))}
          activeOpacity={0.7}
        >
          <View style={styles.slotHeaderLeft}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {partnerName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.slotHeaderInfo}>
              <Text style={styles.partnerName}>{partnerName}</Text>
              <Text style={styles.slotDate}>
                Slots - {formatDate(date)}
              </Text>
            </View>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.slotDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>From date:</Text>
              <Text style={styles.detailValue}>{formatDate(date)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>To date:</Text>
              <Text style={styles.detailValue}>{formatDate(date)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Start time:</Text>
              <Text style={styles.detailValue}>{formatTime(firstSlot.start_time)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>End time:</Text>
              <Text style={styles.detailValue}>{formatTime(lastSlot.end_time)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Slot duration:</Text>
              <Text style={styles.detailValue}>{firstSlot.slot_duration} minutes</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Slots Create on:</Text>
              <Text style={styles.detailValue}>
                {formatTime(firstSlot.start_time)} & {formatDate(date)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total slots:</Text>
              <Text style={styles.detailValue}>{dateSlots.length} slot(s)</Text>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => router.push({
                  pathname: '/service-time',
                  params: {
                    prefillDate: date,
                    prefillStartTime: firstSlot.start_time,
                    prefillEndTime: lastSlot.end_time,
                    prefillDuration: firstSlot.slot_duration
                  }
                })}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteSlot(date, dateSlots)}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const groupedSlots = groupSlotsByDate();

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="My Slots" showBackButton={true} />

      {/* Date Filter Section */}
      <View style={styles.filterContainer}>
        <View style={styles.dateRow}>
          {/* From Date */}
          <View style={styles.datePickerWrapper}>
            <Text style={styles.filterLabel}>From Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowFromPicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
              <Text style={styles.dateText}>{formatDate(formatDateForAPI(fromDate))}</Text>
            </TouchableOpacity>
          </View>

          {/* To Date */}
          <View style={styles.datePickerWrapper}>
            <Text style={styles.filterLabel}>To Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowToPicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
              <Text style={styles.dateText}>{formatDate(formatDateForAPI(toDate))}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Apply Filter Button */}
        <TouchableOpacity
          style={styles.applyFilterButton}
          onPress={applyDateFilter}
        >
          <Ionicons name="funnel-outline" size={18} color={Colors.white} />
          <Text style={styles.applyFilterText}>Apply Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Date Pickers */}
      {showFromPicker && (
        <DateTimePicker
          value={fromDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleFromDateChange}
          minimumDate={new Date()}
        />
      )}

      {showToPicker && (
        <DateTimePicker
          value={toDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleToDateChange}
          minimumDate={fromDate}
        />
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your slots...</Text>
        </View>
      ) : groupedSlots.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={80} color={Colors.gray300} />
          <Text style={styles.emptyTitle}>No slots found</Text>
          <Text style={styles.emptySubtitle}>
            Create your first slots to get started
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/service-time')}
          >
            <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
            <Text style={styles.createButtonText}>Create Slots</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={groupedSlots}
            renderItem={renderDateSection}
            keyExtractor={(item) => item[0]}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />

          {/* Add Slot Button */}
          <TouchableOpacity
            style={styles.addSlotButton}
            onPress={() => router.push('/service-time')}
          >
            <Ionicons name="add-circle" size={20} color={Colors.primary} />
            <Text style={styles.addSlotText}>Add Slot</Text>
          </TouchableOpacity>
        </>
      )}

      <CustomModal
        visible={modal.visible}
        type={modal.config.type}
        title={modal.config.title}
        message={modal.config.message}
        primaryButtonText={modal.config.primaryButtonText}
        secondaryButtonText={modal.config.secondaryButtonText}
        onPrimaryPress={modal.config.onPrimaryPress}
        onSecondaryPress={modal.config.onSecondaryPress}
        hidePrimaryButton={modal.config.hidePrimaryButton}
        hideSecondaryButton={modal.config.hideSecondaryButton}
        onClose={modal.hideModal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
  },
  emptySubtitle: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  createButtonText: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.white,
  },
  listContainer: {
    padding: Spacing.lg,
    paddingBottom: 80,
  },
  slotCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  slotCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  slotHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.white,
  },
  slotHeaderInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  slotDate: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
  },
  slotDetails: {
    padding: Spacing.md,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  detailLabel: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textPrimary,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  editButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  editButtonText: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.primary,
  },
  deleteButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  deleteButtonText: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.error || '#F44336',
  },
  addSlotButton: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: 0,
    right: 0,
    marginHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addSlotText: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
  },
  filterContainer: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  datePickerWrapper: {
    flex: 1,
  },
  filterLabel: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  dateText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeights.medium,
  },
  applyFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  applyFilterText: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.white,
  },
});
