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
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/Colors';
import apiService from '../services/apiService';

interface Review {
  id: string;
  customerName: string;
  rating: number;
  review_text: string;
  service_quality_rating?: number;
  cleanliness_rating?: number;
  staff_behavior_rating?: number;
  value_for_money_rating?: number;
  would_recommend: boolean;
  is_anonymous: boolean;
  created_at: string;
  appointment_date: string;
  appointment_time: string;
  service_name: string;
  service_category?: string;
  pet_name?: string;
  pet_species?: string;
  partner_reply?: string;
  reply_date?: string;
  isExpanded?: boolean;
}

interface ReviewStats {
  average_rating: number;
  total_reviews: number;
  five_star_count: number;
  four_star_count: number;
  three_star_count: number;
  two_star_count: number;
  one_star_count: number;
  avg_service_quality?: number;
  avg_cleanliness?: number;
  avg_staff_behavior?: number;
  avg_value_for_money?: number;
  recommend_percentage?: number;
}

export default function ReviewsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  // Reply modal state
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  useEffect(() => {
    loadReviewsData();
  }, []);

  const loadReviewsData = async (isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Load reviews and stats in parallel
      const [reviewsResponse, statsResponse] = await Promise.all([
        apiService.getPartnerReviews({
          page: 1,
          limit: 50,
          rating: selectedFilter === 'All' ? undefined : parseInt(selectedFilter),
        }),
        apiService.getPartnerReviewStats()
      ]);

      if (reviewsResponse.success && reviewsResponse.data) {
        const reviewsData = reviewsResponse.data.reviews || reviewsResponse.data.data?.reviews || [];
        const formattedReviews: Review[] = reviewsData.map((review: any) => ({
          id: review.id,
          customerName: review.customer_name || 'Anonymous User',
          rating: review.rating,
          review_text: review.comment || review.review_comment || review.review_text || '',
          service_quality_rating: review.service_quality_rating,
          cleanliness_rating: review.cleanliness_rating,
          staff_behavior_rating: review.staff_behavior_rating,
          value_for_money_rating: review.value_for_money_rating,
          would_recommend: review.would_recommend || true,
          is_anonymous: review.is_anonymous || false,
          created_at: review.date || review.created_at,
          appointment_date: review.appointment?.date || review.appointment_date,
          appointment_time: review.appointment?.time || review.appointment_time || '10:00 AM',
          service_name: review.service_name || 'Service',
          service_category: review.service_category,
          pet_name: review.appointment?.petName || review.pet_name,
          pet_species: review.appointment?.petType || review.pet_type,
          partner_reply: review.partner_reply,
          reply_date: review.reply_date,
        }));
        
        setReviews(formattedReviews);
      }

      if (statsResponse.success && statsResponse.data) {
        const statsData = statsResponse.data.data || statsResponse.data;
        
        // Transform the stats to match our interface
        const transformedStats = {
          average_rating: parseFloat(statsData.averageRating || 0),
          total_reviews: parseInt(statsData.totalReviews || 0),
          five_star_count: statsData.ratingBreakdown?.[5] || 0,
          four_star_count: statsData.ratingBreakdown?.[4] || 0,
          three_star_count: statsData.ratingBreakdown?.[3] || 0,
          two_star_count: statsData.ratingBreakdown?.[2] || 0,
          one_star_count: statsData.ratingBreakdown?.[1] || 0,
        };
        
        setReviewStats(transformedStats);
      }

    } catch (error) {
      console.error('Error loading reviews data:', error);
      Alert.alert('Error', 'Failed to load reviews. Please try again.');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const toggleReviewDetails = (reviewId: string) => {
    setExpandedReview(
      expandedReview === reviewId ? null : reviewId
    );
  };

  const handleReplyPress = (reviewId: string) => {
    const review = reviews.find(r => r.id === reviewId);
    if (review && review.partner_reply) {
      setReplyText(review.partner_reply);
    } else {
      setReplyText('');
    }
    setSelectedReviewId(reviewId);
    setReplyModalVisible(true);
  };

  const handleSubmitReply = async () => {
    if (!selectedReviewId || !replyText.trim()) {
      Alert.alert('Error', 'Please enter a reply');
      return;
    }

    setReplySubmitting(true);
    try {
      const response = await apiService.createReviewReply(selectedReviewId, replyText.trim());
      
      if (response.success) {
        Alert.alert('Success', 'Reply submitted successfully');
        setReplyModalVisible(false);
        setReplyText('');
        setSelectedReviewId(null);
        // Refresh reviews to show the new reply
        loadReviewsData(true);
      } else {
        Alert.alert('Error', response.error || 'Failed to submit reply');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit reply. Please try again.');
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleFilterChange = (newFilter: string) => {
    setSelectedFilter(newFilter);
    loadReviewsData();
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
              onValueChange={handleFilterChange}
            >
              {getFilterOptions().map((option) => (
                <Picker.Item key={option.value} label={option.label} value={option.value} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Overall Rating Stats */}
        {reviewStats && (
          <View style={styles.statsContainer}>
            <View style={styles.overallRating}>
              <Text style={styles.ratingNumber}>{reviewStats.average_rating || 0}</Text>
              <View style={styles.starsContainer}>
                {renderStars(reviewStats.average_rating || 0, 20)}
              </View>
              <Text style={styles.totalReviews}>Based on {reviewStats.total_reviews || 0} reviews</Text>
              {reviewStats.recommend_percentage && (
                <Text style={styles.recommendText}>
                  {reviewStats.recommend_percentage}% would recommend
                </Text>
              )}
            </View>
            
            <View style={styles.ratingBreakdown}>
              {[
                { star: 5, count: reviewStats.five_star_count },
                { star: 4, count: reviewStats.four_star_count },
                { star: 3, count: reviewStats.three_star_count },
                { star: 2, count: reviewStats.two_star_count },
                { star: 1, count: reviewStats.one_star_count },
              ].map(({ star, count }) => (
                <View key={star} style={styles.ratingRow}>
                  <Text style={styles.starLabel}>{star}★</Text>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { 
                          width: reviewStats.total_reviews > 0 
                            ? `${((count || 0) / reviewStats.total_reviews) * 100}%` 
                            : '0%'
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.ratingCount}>{count || 0}</Text>
                </View>
              ))}
            </View>
            
            {/* Detailed Stats */}
            {(reviewStats.avg_service_quality || reviewStats.avg_cleanliness || 
              reviewStats.avg_staff_behavior || reviewStats.avg_value_for_money) && (
              <View style={styles.detailedStats}>
                <Text style={styles.detailedStatsTitle}>Average Ratings</Text>
                {reviewStats.avg_service_quality && (
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Service Quality:</Text>
                    <Text style={styles.statValue}>{reviewStats.avg_service_quality}/5</Text>
                  </View>
                )}
                {reviewStats.avg_cleanliness && (
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Cleanliness:</Text>
                    <Text style={styles.statValue}>{reviewStats.avg_cleanliness}/5</Text>
                  </View>
                )}
                {reviewStats.avg_staff_behavior && (
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Staff Behavior:</Text>
                    <Text style={styles.statValue}>{reviewStats.avg_staff_behavior}/5</Text>
                  </View>
                )}
                {reviewStats.avg_value_for_money && (
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Value for Money:</Text>
                    <Text style={styles.statValue}>{reviewStats.avg_value_for_money}/5</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Reviews List */}
        <View style={styles.reviewsContainer}>
          {reviews.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-outline" size={64} color={Colors.textTertiary} />
              <Text style={styles.emptyStateTitle}>No reviews found</Text>
              <Text style={styles.emptyStateText}>
                {selectedFilter === 'All'
                  ? 'No reviews have been submitted yet.'
                  : `No reviews match the selected filter (${selectedFilter}).`}
              </Text>
            </View>
          ) : (
            reviews.map((review) => (
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
                  <Text style={styles.reviewComment}>{review.review_text}</Text>
                  
                  {/* Service Details */}
                  <View style={styles.serviceDetails}>
                    <Text style={styles.serviceDetailTitle}>Service Details</Text>
                    <Text style={styles.serviceDetailText}>Service: {review.service_name}</Text>
                    <Text style={styles.serviceDetailText}>
                      Date: {new Date(review.appointment_date).toLocaleDateString()} at {review.appointment_time}
                    </Text>
                    {review.pet_name && (
                      <Text style={styles.serviceDetailText}>
                        Pet: {review.pet_name}{review.pet_species ? ` (${review.pet_species})` : ''}
                      </Text>
                    )}
                    
                    {/* Detailed Ratings */}
                    {(review.service_quality_rating || review.cleanliness_rating || 
                      review.staff_behavior_rating || review.value_for_money_rating) && (
                      <View style={styles.detailedRatingsSection}>
                        <Text style={styles.detailedRatingsTitle}>Detailed Ratings</Text>
                        {review.service_quality_rating && (
                          <View style={styles.ratingDetail}>
                            <Text style={styles.ratingDetailLabel}>Service Quality:</Text>
                            <View style={styles.ratingDetailStars}>
                              {renderStars(review.service_quality_rating, 12)}
                            </View>
                          </View>
                        )}
                        {review.cleanliness_rating && (
                          <View style={styles.ratingDetail}>
                            <Text style={styles.ratingDetailLabel}>Cleanliness:</Text>
                            <View style={styles.ratingDetailStars}>
                              {renderStars(review.cleanliness_rating, 12)}
                            </View>
                          </View>
                        )}
                        {review.staff_behavior_rating && (
                          <View style={styles.ratingDetail}>
                            <Text style={styles.ratingDetailLabel}>Staff Behavior:</Text>
                            <View style={styles.ratingDetailStars}>
                              {renderStars(review.staff_behavior_rating, 12)}
                            </View>
                          </View>
                        )}
                        {review.value_for_money_rating && (
                          <View style={styles.ratingDetail}>
                            <Text style={styles.ratingDetailLabel}>Value for Money:</Text>
                            <View style={styles.ratingDetailStars}>
                              {renderStars(review.value_for_money_rating, 12)}
                            </View>
                          </View>
                        )}
                      </View>
                    )}

                    {review.would_recommend !== undefined && (
                      <Text style={styles.recommendationText}>
                        {review.would_recommend ? '✅ Would recommend' : '❌ Would not recommend'}
                      </Text>
                    )}
                  </View>

                  {/* Partner Reply Section */}
                  {review.partner_reply ? (
                    <View style={styles.replySection}>
                      <Text style={styles.replySectionTitle}>Your Reply</Text>
                      <Text style={styles.replyText}>{review.partner_reply}</Text>
                      {review.reply_date && (
                        <Text style={styles.replyDate}>
                          Replied on {new Date(review.reply_date).toLocaleDateString()}
                        </Text>
                      )}
                      <TouchableOpacity 
                        style={styles.editReplyButton}
                        onPress={() => handleReplyPress(review.id)}
                      >
                        <Text style={styles.editReplyButtonText}>Edit Reply</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.replyButton}
                      onPress={() => handleReplyPress(review.id)}
                    >
                      <Ionicons name="chatbubble-outline" size={16} color={Colors.primary} />
                      <Text style={styles.replyButtonText}>Reply to Review</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ))
          )}
        </View>
      </ScrollView>

      {/* Reply Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={replyModalVisible}
        onRequestClose={() => setReplyModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reply to Review</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setReplyModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.replyTextInput}
              value={replyText}
              onChangeText={setReplyText}
              placeholder="Write your professional response to this review..."
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.characterCount}>{replyText.length}/500</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setReplyModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalSubmitButton, (!replyText.trim() || replySubmitting) && styles.modalSubmitButtonDisabled]}
                onPress={handleSubmitReply}
                disabled={!replyText.trim() || replySubmitting}
              >
                {replySubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSubmitButtonText}>Submit Reply</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: Spacing.md,
  },
  recommendText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  detailedStats: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  detailedStatsTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statLabel: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
  },
  statValue: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textPrimary,
  },
  serviceDetails: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  serviceDetailTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  serviceDetailText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  detailedRatingsSection: {
    marginTop: Spacing.md,
  },
  detailedRatingsTitle: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  ratingDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  ratingDetailLabel: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    flex: 1,
  },
  ratingDetailStars: {
    flexDirection: 'row',
  },
  recommendationText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
    fontWeight: Typography.fontWeights.medium,
  },
  replySection: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.backgroundSecondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  replySectionTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  replyText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textPrimary,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  replyDate: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textTertiary,
    marginBottom: Spacing.sm,
  },
  editReplyButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.sm,
  },
  editReplyButtonText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeights.medium,
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  replyButtonText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeights.medium,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  modalCloseButton: {
    padding: Spacing.xs,
  },
  replyTextInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSizes.base,
    color: Colors.textPrimary,
    minHeight: 120,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textTertiary,
    textAlign: 'right',
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.sm,
  },
  modalCancelButtonText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeights.medium,
  },
  modalSubmitButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
  },
  modalSubmitButtonDisabled: {
    backgroundColor: Colors.textTertiary,
  },
  modalSubmitButtonText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.white,
    fontWeight: Typography.fontWeights.bold,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
  },
  emptyStateTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyStateText: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});