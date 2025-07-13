import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/Colors';

interface TimeSlot {
  id: string;
  time: string;
  isAvailable: boolean;
  isBooked: boolean;
}

interface DaySchedule {
  date: string;
  dayName: string;
  slots: TimeSlot[];
}

export default function ManageSlotsScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(0);
  
  const weekDays: DaySchedule[] = [
    {
      date: '15',
      dayName: 'Mon',
      slots: [
        { id: '1', time: '09:00', isAvailable: true, isBooked: false },
        { id: '2', time: '09:30', isAvailable: true, isBooked: true },
        { id: '3', time: '10:00', isAvailable: true, isBooked: false },
        { id: '4', time: '10:30', isAvailable: false, isBooked: false },
        { id: '5', time: '11:00', isAvailable: true, isBooked: false },
        { id: '6', time: '11:30', isAvailable: true, isBooked: true },
        { id: '7', time: '14:00', isAvailable: true, isBooked: false },
        { id: '8', time: '14:30', isAvailable: true, isBooked: false },
        { id: '9', time: '15:00', isAvailable: false, isBooked: false },
        { id: '10', time: '15:30', isAvailable: true, isBooked: false },
      ],
    },
    {
      date: '16',
      dayName: 'Tue',
      slots: [
        { id: '11', time: '09:00', isAvailable: true, isBooked: false },
        { id: '12', time: '09:30', isAvailable: true, isBooked: false },
        { id: '13', time: '10:00', isAvailable: true, isBooked: true },
        { id: '14', time: '10:30', isAvailable: true, isBooked: false },
        { id: '15', time: '11:00', isAvailable: false, isBooked: false },
        { id: '16', time: '11:30', isAvailable: true, isBooked: false },
        { id: '17', time: '14:00', isAvailable: true, isBooked: true },
        { id: '18', time: '14:30', isAvailable: true, isBooked: false },
        { id: '19', time: '15:00', isAvailable: true, isBooked: false },
        { id: '20', time: '15:30', isAvailable: false, isBooked: false },
      ],
    },
    {
      date: '17',
      dayName: 'Wed',
      slots: [
        { id: '21', time: '09:00', isAvailable: true, isBooked: false },
        { id: '22', time: '09:30', isAvailable: false, isBooked: false },
        { id: '23', time: '10:00', isAvailable: true, isBooked: false },
        { id: '24', time: '10:30', isAvailable: true, isBooked: true },
        { id: '25', time: '11:00', isAvailable: true, isBooked: false },
        { id: '26', time: '11:30', isAvailable: true, isBooked: false },
        { id: '27', time: '14:00', isAvailable: false, isBooked: false },
        { id: '28', time: '14:30', isAvailable: true, isBooked: false },
        { id: '29', time: '15:00', isAvailable: true, isBooked: true },
        { id: '30', time: '15:30', isAvailable: true, isBooked: false },
      ],
    },
  ];

  const toggleSlotAvailability = (dayIndex: number, slotId: string) => {
    // Implementation for toggling slot availability
    console.log(`Toggle slot ${slotId} for day ${dayIndex}`);
  };

  const getSlotBackgroundColor = (slot: TimeSlot) => {
    if (slot.isBooked) return Colors.primary;
    if (!slot.isAvailable) return Colors.gray300;
    return Colors.white;
  };

  const getSlotTextColor = (slot: TimeSlot) => {
    if (slot.isBooked) return Colors.white;
    if (!slot.isAvailable) return Colors.textTertiary;
    return Colors.textPrimary;
  };

  const getSlotBorderColor = (slot: TimeSlot) => {
    if (slot.isBooked) return Colors.primary;
    if (!slot.isAvailable) return Colors.gray300;
    return Colors.border;
  };

  const renderTimeSlot = ({ item: slot }: { item: TimeSlot }) => (
    <TouchableOpacity
      style={[
        styles.timeSlot,
        {
          backgroundColor: getSlotBackgroundColor(slot),
          borderColor: getSlotBorderColor(slot),
        },
      ]}
      onPress={() => toggleSlotAvailability(selectedDate, slot.id)}
      disabled={slot.isBooked}
    >
      <Text style={[styles.slotTime, { color: getSlotTextColor(slot) }]}>
        {slot.time}
      </Text>
      {slot.isBooked && (
        <View style={styles.bookedBadge}>
          <Ionicons name="checkmark" size={12} color={Colors.white} />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderDaySelector = ({ item, index }: { item: DaySchedule; index: number }) => (
    <TouchableOpacity
      style={[
        styles.dayButton,
        selectedDate === index && styles.selectedDayButton,
      ]}
      onPress={() => setSelectedDate(index)}
    >
      <Text
        style={[
          styles.dayText,
          selectedDate === index && styles.selectedDayText,
        ]}
      >
        {item.dayName}
      </Text>
      <Text
        style={[
          styles.dateText,
          selectedDate === index && styles.selectedDateText,
        ]}
      >
        {item.date}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Slots</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Calendar Navigation */}
        <View style={styles.calendarSection}>
          <View style={styles.monthHeader}>
            <TouchableOpacity style={styles.navButton}>
              <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.monthText}>January 2024</Text>
            <TouchableOpacity style={styles.navButton}>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={weekDays}
            renderItem={renderDaySelector}
            keyExtractor={(_, index) => index.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.daysList}
          />
        </View>

        {/* Time Slots */}
        <View style={styles.slotsSection}>
          <View style={styles.slotsHeader}>
            <Text style={styles.slotsTitle}>
              Available Slots - {weekDays[selectedDate]?.dayName} {weekDays[selectedDate]?.date}
            </Text>
            <TouchableOpacity style={styles.addSlotButton}>
              <Ionicons name="add" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={weekDays[selectedDate]?.slots || []}
            renderItem={renderTimeSlot}
            keyExtractor={(item) => item.id}
            numColumns={3}
            scrollEnabled={false}
            contentContainerStyle={styles.slotsGrid}
            columnWrapperStyle={styles.slotsRow}
          />
        </View>

        {/* Legend */}
        <View style={styles.legendSection}>
          <Text style={styles.legendTitle}>Legend</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: Colors.white, borderColor: Colors.border }]} />
              <Text style={styles.legendLabel}>Available</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: Colors.primary }]} />
              <Text style={styles.legendLabel}>Booked</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: Colors.gray300 }]} />
              <Text style={styles.legendLabel}>Unavailable</Text>
            </View>
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  settingsButton: {
    padding: Spacing.xs,
  },
  content: {
    flex: 1,
  },
  calendarSection: {
    backgroundColor: Colors.white,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  navButton: {
    padding: Spacing.sm,
  },
  monthText: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  daysList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  dayButton: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    minWidth: 60,
    backgroundColor: Colors.backgroundSecondary,
  },
  selectedDayButton: {
    backgroundColor: Colors.primary,
  },
  dayText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  selectedDayText: {
    color: Colors.white,
  },
  dateText: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  selectedDateText: {
    color: Colors.white,
  },
  slotsSection: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  slotsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  slotsTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    flex: 1,
  },
  addSlotButton: {
    padding: Spacing.sm,
  },
  slotsGrid: {
    gap: Spacing.md,
  },
  slotsRow: {
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  timeSlot: {
    flex: 1,
    aspectRatio: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  slotTime: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
  },
  bookedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendSection: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
  },
  legendTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  legendItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  legendColor: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  legendLabel: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});