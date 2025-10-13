import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SuccessScreen() {
  const router = useRouter();
  const { totalAmount, requestTitle } = useLocalSearchParams();

  const scaleAnim = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGoToRequests = () => {
    router.replace('/pharmacy-requests');
  };

  const handleGoToHome = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Success Icon */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark" size={80} color="#fff" />
          </View>
        </Animated.View>

        {/* Success Message */}
        <Animated.View style={[styles.messageContainer, { opacity: fadeAnim }]}>
          <Text style={styles.title}>Quote Sent Successfully!</Text>
          <Text style={styles.subtitle}>
            Your quote has been submitted to the customer
          </Text>
        </Animated.View>

        {/* Quote Details */}
        <Animated.View style={[styles.detailsCard, { opacity: fadeAnim }]}>
          <View style={styles.detailRow}>
            <Ionicons name="document-text-outline" size={20} color="#666" />
            <Text style={styles.detailLabel}>Request:</Text>
          </View>
          <Text style={styles.detailValue}>{requestTitle || 'Medicine Request'}</Text>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={20} color="#666" />
            <Text style={styles.detailLabel}>Quote Amount:</Text>
          </View>
          <Text style={styles.amountValue}>₹{totalAmount || '0.00'}</Text>

          <View style={styles.divider} />

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#3B82F6" />
            <Text style={styles.infoText}>
              The customer will review your quote along with other submissions. You'll be notified if your quote is accepted.
            </Text>
          </View>
        </Animated.View>

        {/* Illustration or Animation Space */}
        <Animated.View style={[styles.illustrationContainer, { opacity: fadeAnim }]}>
          <View style={styles.illustrationCircle}>
            <Ionicons name="paper-plane" size={60} color="#FF7A59" />
          </View>
          <Text style={styles.illustrationText}>Your quote is on its way!</Text>
        </Animated.View>
      </View>

      {/* Action Buttons */}
      <Animated.View style={[styles.buttonContainer, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleGoToRequests}>
          <Ionicons name="list" size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>View All Requests</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleGoToHome}>
          <Ionicons name="home-outline" size={20} color="#FF7A59" />
          <Text style={styles.secondaryButtonText}>Go to Home</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  iconContainer: {
    marginBottom: 30,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 30,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    marginLeft: 8,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
    marginBottom: 16,
    marginLeft: 28,
  },
  amountValue: {
    fontSize: 32,
    color: '#10B981',
    fontWeight: 'bold',
    marginBottom: 16,
    marginLeft: 28,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#3B82F6',
    lineHeight: 18,
    marginLeft: 8,
  },
  illustrationContainer: {
    alignItems: 'center',
  },
  illustrationCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  illustrationText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  buttonContainer: {
    paddingHorizontal: 30,
    paddingBottom: 30,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#FF7A59',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 8,
    shadowColor: '#FF7A59',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  secondaryButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FF7A59',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF7A59',
  },
});
