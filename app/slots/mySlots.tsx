import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
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
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'booked'>('upcoming');

  useFocusEffect(
    useCallback(() => {
      loadSlots();
    }, [])
  );

  const loadSlots = async () => {
    try {
      setLoading(true);
      const today = new Date();
      const formattedToday = formatDateForAPI(today);

      // Get slots from today onwards
      const response = await apiService.getPartnerSlots({
        from_date: formattedToday,
        limit: 100,
      });

      if (response.success) {
        setSlots(response.data || []);
      } else {
        console.error('Failed to load slots:', response.error);
      }
    } catch (error) {
      console.error('Load slots error:', error);
      Alert.alert('Error', 'Failed to load slots');
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
      month: 'short',
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

  const handleDeleteSlot = async (slotId: number) => {
    Alert.alert(
      'Delete Slot',
      'Are you sure you want to delete this slot?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.deletePartnerSlot(slotId);
              if (response.success) {
                Alert.alert('Success', 'Slot deleted successfully');
                loadSlots();
              } else {
                Alert.alert('Error', response.error || 'Failed to delete slot');
              }
            } catch (error) {
              console.error('Delete slot error:', error);
              Alert.alert('Error', 'Failed to delete slot');
            }
          },
        },
      ]
    );
  };

  const getFilteredSlots = () => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    switch (filter) {
      case 'upcoming':
        return slots.filter(slot => {
          const slotDate = new Date(slot.slot_date);
          slotDate.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // If slot is today, check if time has passed
          if (slotDate.getTime() === today.getTime()) {
            const [hours, minutes] = slot.start_time.split(':').map(Number);
            const slotTime = hours * 60 + minutes;
            return slotTime > currentTime && !slot.is_booked;
          }

          // Future dates that are not booked
          return slotDate > today && !slot.is_booked;
        });

      case 'booked':
        return slots.filter(slot => slot.is_booked);

      case 'all':
      default:
        return slots;
    }
  };

  const groupSlotsByDate = (filteredSlots: Slot[]) => {
    const grouped: { [key: string]: Slot[] } = {};

    filteredSlots.forEach(slot => {
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

  const getStatusColor = (slot: Slot) => {
    if (slot.is_booked) return Colors.primary;
    if (!slot.is_available) return Colors.gray300;
    return Colors.success || '#4CAF50';
  };

  const getStatusText = (slot: Slot) => {
    if (slot.is_booked) return 'Booked';
    if (!slot.is_available) return 'Unavailable';
    return 'Available';
  };

  const renderSlotCard = ({ item }: { item: Slot }) => (
    <View style={styles.slotCard}>
      <View style={styles.slotCardHeader}>
        <View style={styles.timeContainer}>
          <Ionicons name="time-outline" size={20} color={Colors.textSecondary} />
          <Text style={styles.slotTime}>
            {formatTime(item.start_time)} - {formatTime(item.end_time)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item) }]}>
          <Text style={styles.statusText}>{getStatusText(item)}</Text>
        </View>
      </View>

      <View style={styles.slotDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="hourglass-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.detailText}>{item.slot_duration} minutes</Text>
        </View>
      </View>

      {!item.is_booked && (
        <View style={styles.slotActions}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteSlot(item.id)}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.error || '#F44336'} />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.is_booked && (
        <View style={styles.bookedNote}>
          <Ionicons name="information-circle" size={16} color={Colors.primary} />
          <Text style={styles.bookedNoteText}>This slot has an active booking</Text>
        </View>
      )}
    </View>
  );

  const renderDateSection = ({ item }: { item: [string, Slot[]] }) => {
    const [date, dateSlots] = item;
    return (
      <View style={styles.dateSection}>
        <View style={styles.dateSectionHeader}>
          <Ionicons name="calendar" size={20} color={Colors.primary} />
          <Text style={styles.dateSectionTitle}>{formatDate(date)}</Text>
          <View style={styles.slotCountBadge}>
            <Text style={styles.slotCountText}>{dateSlots.length} slots</Text>
          </View>
        </View>
        <FlatList
          data={dateSlots}
          renderItem={renderSlotCard}
          keyExtractor={(slot) => slot.id.toString()}
          scrollEnabled={false}
        />
      </View>
    );
  };

  const filteredSlots = getFilteredSlots();
  const groupedSlots = groupSlotsByDate(filteredSlots);

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="My Slots" />

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'upcoming' && styles.activeFilterTab]}
          onPress={() => setFilter('upcoming')}
        >
          <Text style={[styles.filterTabText, filter === 'upcoming' && styles.activeFilterTabText]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'booked' && styles.activeFilterTab]}
          onPress={() => setFilter('booked')}
        >
          <Text style={[styles.filterTabText, filter === 'booked' && styles.activeFilterTabText]}>
            Booked
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.activeFilterTab]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.activeFilterTabText]}>
            All
          </Text>
        </TouchableOpacity>
      </View>

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
            {filter === 'upcoming'
              ? 'You have no upcoming available slots'
              : filter === 'booked'
              ? 'You have no booked slots'
              : 'Create your first slots to get started'}
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/slots/manageSlots')}
          >
            <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
            <Text style={styles.createButtonText}>Create Slots</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={groupedSlots}
          renderItem={renderDateSection}
          keyExtractor={(item) => item[0]}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  filterTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeFilterTab: {
    borderBottomColor: Colors.primary,
  },
  filterTabText: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textSecondary,
  },
  activeFilterTabText: {
    color: Colors.primary,
    fontWeight: Typography.fontWeights.bold,
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
  },
  dateSection: {
    marginBottom: Spacing.lg,
  },
  dateSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dateSectionTitle: {
    flex: 1,
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  slotCountBadge: {
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  slotCountText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textSecondary,
  },
  slotCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  slotCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  slotTime: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.white,
  },
  slotDetails: {
    marginBottom: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  detailText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
  },
  slotActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  deleteButtonText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.error || '#F44336',
  },
  bookedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  bookedNoteText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.primary,
    fontStyle: 'italic',
  },
});
