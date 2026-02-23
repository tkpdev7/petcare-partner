import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/Colors';
import apiService from '../../services/apiService';
import CustomModal from '../../components/CustomModal';
import { useCustomModal } from '../../hooks/useCustomModal';
import KeyboardAwareScrollView from '../../components/KeyboardAwareScrollView';

export default function VerifyPhoneScreen() {
  const router = useRouter();
  const modal = useCustomModal();
  const { phone } = useLocalSearchParams<{ phone: string }>();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(true); // true while initial OTP is being sent
  const [resendCooldown, setResendCooldown] = useState(30);
  const inputRef = useRef<TextInput>(null);

  // Send OTP as soon as this screen mounts
  useEffect(() => {
    if (phone) {
      triggerSendOtp();
    }
  }, [phone]);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const triggerSendOtp = async () => {
    setSending(true);
    try {
      await apiService.sendPhoneOtp(phone!);
    } catch {
      // Non-fatal — OTP is also logged on server side
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  };

  const handleVerify = async () => {
    if (!otp || otp.length !== 6) {
      modal.showError('Please enter the 6-digit code sent to your phone.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.verifyPhoneOtp(phone!, otp);

      if (!response.success) {
        modal.showError(response.error || 'Invalid OTP. Please try again.');
        return;
      }

      modal.showSuccess(
        'Your phone number has been verified! Your account is pending admin approval. You will be able to sign in once approved.',
        {
          title: 'Verification Successful',
          primaryButtonText: 'Go to Sign In',
          onPrimaryPress: () => {
            modal.hideModal();
            router.replace('/auth/login');
          },
        }
      );
    } catch {
      modal.showError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResendCooldown(30);
    setOtp('');
    await triggerSendOtp();
    modal.showSuccess('A new code has been sent to your mobile number.');
  };

  const maskedPhone = phone
    ? phone.replace(/(\+?\d{2,3})(\d+)(\d{4})/, (_, c, m, e) => `${c}${'*'.repeat(m.length)}${e}`)
    : '';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareScrollView>
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="phone-portrait-outline" size={40} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Verify Mobile Number</Text>
            <Text style={styles.subtitle}>
              {sending
                ? 'Sending OTP to your mobile...'
                : `Enter the 6-digit code sent to\n${maskedPhone}`}
            </Text>
          </View>

          {sending ? (
            <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
          ) : (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <TextInput
                  ref={inputRef}
                  style={styles.otpInput}
                  value={otp}
                  onChangeText={text => setOtp(text.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  textAlign="center"
                  placeholder="— — — — — —"
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>

              <TouchableOpacity
                style={[styles.verifyButton, (loading || otp.length !== 6) && styles.verifyButtonDisabled]}
                onPress={handleVerify}
                disabled={loading || otp.length !== 6}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.verifyButtonText}>Verify OTP</Text>
                )}
              </TouchableOpacity>

              <View style={styles.resendRow}>
                <Text style={styles.resendLabel}>Didn't receive the code? </Text>
                {resendCooldown > 0 ? (
                  <Text style={styles.cooldown}>Resend in {resendCooldown}s</Text>
                ) : (
                  <TouchableOpacity onPress={handleResend}>
                    <Text style={styles.resendLink}>Resend OTP</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      </KeyboardAwareScrollView>
      <CustomModal {...modal.modalProps} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF5F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSizes['3xl'],
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  loader: {
    marginTop: Spacing.xxl,
  },
  form: {
    gap: Spacing.lg,
  },
  inputContainer: {
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  otpInput: {
    fontSize: 32,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    letterSpacing: 12,
  },
  verifyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  verifyButtonDisabled: {
    opacity: 0.5,
    elevation: 0,
  },
  verifyButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  resendLabel: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
  },
  resendLink: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeights.bold,
  },
  cooldown: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textTertiary,
  },
});
