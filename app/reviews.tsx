import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/Colors';

interface Review {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  date: string;
  isExpanded?: boolean;
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export default function ReviewsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  
  const [reviewStats, setReviewStats] = useState<ReviewStats>({
    averageRating: 4.5,
    totalReviews: 127,
    ratingBreakdown: {
      5: 85,
      4: 25,
      3: 12,
      2: 3,
      1: 2,
    },
  });

  const [reviews, setReviews] = useState<Review[]>([
    {
      id: '1',
      customerName: 'Arjun Kumar',
      rating: 4.5,
      comment: 'Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint. Velit officia consequat duis enim velit mollit. Exercitation veniam consequat sunt nostrud amet.',
      date: '2 days ago',
    },
    {
      id: '2',
      customerName: 'Arjun Kumar',
      rating: 4.5,
      comment: 'Great service and very professional staff. My pet was well taken care of.',
      date: '1 week ago',
    },
    {
      id: '3',
      customerName: 'Arjun Kumar',
      rating: 4.5,
      comment: 'Excellent experience. Will definitely come back again. Highly recommended!',
      date: '2 weeks ago',
    },
    {
      id: '4',
      customerName: 'Arjun Kumar',
      rating: 4.5,
      comment: 'Very satisfied with the treatment provided to my dog. Thank you!',
      date: '3 weeks ago',
    },
  ]);

  useEffect(() => {
    loadReviewsData();
  }, []);

  const loadReviewsData = async () => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In real implementation, fetch data from API
      // const response = await apiService.getReviews();
      
    } catch (error) {
      console.error('Error loading reviews data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleReviewDetails = (reviewId: string) => {
    setExpandedReview(
      expandedReview === reviewId ? null : reviewId
    );
  };

  const renderStars = (rating: number, size: number = 16) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={i} name="star" size={size} color="#FFD700" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={size} color="#FFD700" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={size} color="#E5E7EB" />
      );
    }

    return stars;
  };

  const getFilterOptions = () => [
    { label: 'All', value: 'All' },
    { label: '5★ & above', value: '5' },
    { label: '4★ & above', value: '4' },
    { label: '3★ & above', value: '3' },
    { label: '2★ & above', value: '2' },
    { label: '1★ & above', value: '1' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reviews</Text>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading reviews...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reviews</Text>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Filter Selector */}
        <View style={styles.filterSelector}>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedFilter}
              style={styles.picker}
              onValueChange={(value) => setSelectedFilter(value)}
            >
              {getFilterOptions().map((option) => (
                <Picker.Item key={option.value} label={option.label} value={option.value} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Overall Rating Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.overallRating}>
            <Text style={styles.ratingNumber}>{reviewStats.averageRating}</Text>
            <View style={styles.starsContainer}>
              {renderStars(reviewStats.averageRating, 20)}
            </View>
            <Text style={styles.totalReviews}>Based on {reviewStats.totalReviews} reviews</Text>
          </View>
          
          <View style={styles.ratingBreakdown}>
            {[5, 4, 3, 2, 1].map((star) => (
              <View key={star} style={styles.ratingRow}>
                <Text style={styles.starLabel}>{star}★</Text>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        width: `${(reviewStats.ratingBreakdown[star as keyof typeof reviewStats.ratingBreakdown] / reviewStats.totalReviews) * 100}%` 
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.ratingCount}>
                  {reviewStats.ratingBreakdown[star as keyof typeof reviewStats.ratingBreakdown]}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Reviews List */}
        <View style={styles.reviewsContainer}>
          {reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <TouchableOpacity
                style={styles.reviewHeader}
                onPress={() => toggleReviewDetails(review.id)}
              >
                <View style={styles.reviewInfo}>
                  <View style={styles.customerInfo}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {review.customerName.split(' ').map(n => n[0]).join('')}
                      </Text>
                    </View>
                    <View style={styles.customerDetails}>
                      <Text style={styles.customerName}>{review.customerName}</Text>
                      <View style={styles.ratingInfo}>
                        <View style={styles.starsRow}>
                          {renderStars(review.rating)}
                        </View>
                        <Text style={styles.ratingValue}>{review.rating}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.reviewDate}>{review.date}</Text>
                </View>
                <Ionicons 
                  name={expandedReview === review.id ? "chevron-up" : "chevron-down"}
                  size={20} 
                  color={Colors.textSecondary} 
                />
              </TouchableOpacity>

              {expandedReview === review.id && (
                <View style={styles.reviewDetails}>
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                </View>
              )}
            </View>
          ))}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSizes.base,
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.white,
    flex: 1,
    textAlign: 'center',
  },
  notificationButton: {
    padding: Spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  filterSelector: {
    marginBottom: Spacing.lg,
  },
  pickerContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: Colors.textPrimary,
  },
  statsContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  overallRating: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  ratingNumber: {
    fontSize: 48,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  totalReviews: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
  },
  ratingBreakdown: {
    gap: Spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  starLabel: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
    width: 25,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
  },
  ratingCount: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    width: 30,
    textAlign: 'right',
  },
  reviewsContainer: {
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  reviewCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  reviewInfo: {
    flex: 1,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.white,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  ratingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  starsRow: {
    flexDirection: 'row',
  },
  ratingValue: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textPrimary,
  },
  reviewDate: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  reviewDetails: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },
  reviewComment: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
});