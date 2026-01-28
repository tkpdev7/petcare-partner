import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/Colors';
import apiService from '../../services/apiService';
import CustomModal from '../../components/CustomModal';
import { useCustomModal } from '../../hooks/useCustomModal';
import KeyboardAwareScrollView from '../../components/KeyboardAwareScrollView';

const validationSchema = Yup.object().shape({
  identifier: Yup.string()
    .required("Email or phone number is required")
    .test("email-or-phone", "Please enter a valid email or phone number", (value) => {
      if (!value) return false;

      // Check if it's a valid email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(value)) return true;

      // Check if it's a valid phone number (10 digits or with +91)
      const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
      return phoneRegex.test(value.replace(/\s/g, ""));
    }),
});

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const modal = useCustomModal();

  const handleSendOTP = async (values: { identifier: string }, { setSubmitting }: any) => {
    try {
      const response = await apiService.forgotPasswordRequestOTP(values.identifier);

      if (!response.success) {
        modal.showError(response.error || 'Failed to send OTP', { title: 'Error' });
        return;
      }

      modal.showSuccess('OTP sent successfully!', {
        onPrimaryPress: () => {
          modal.hideModal();
          router.push({
            pathname: '/auth/verify-otp',
            params: {
              identifier: values.identifier,
              verificationType: response.data.verificationType,
              otpSentTo: response.data.otpSentTo,
            },
          });
        },
      });
    } catch (error) {
      console.error('Send OTP error:', error);
      modal.showError('Failed to send OTP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareScrollView>
        <View style={styles.content}>
          <TouchableOpacity
            onPress={() => router.push('/auth/login')}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/images/gogol-icon.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Enter your email or phone number to receive an OTP
            </Text>
          </View>

          <Formik
            initialValues={{ identifier: '' }}
            validationSchema={validationSchema}
            onSubmit={handleSendOTP}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting }) => (
              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email or Phone Number"
                    placeholderTextColor={Colors.textTertiary}
                    value={values.identifier}
                    onChangeText={handleChange('identifier')}
                    onBlur={handleBlur('identifier')}
                    keyboardType="default"
                    autoCapitalize="none"
                  />
                </View>
                {touched.identifier && errors.identifier && (
                  <Text style={styles.errorText}>{errors.identifier}</Text>
                )}

                <TouchableOpacity
                  style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Send OTP</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.footer}>
                  <Text style={styles.footerText}>Remember your password? </Text>
                  <TouchableOpacity onPress={() => router.push('/auth/login')}>
                    <Text style={styles.linkText}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Formik>
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
    justifyContent: 'center',
  },
  backButton: {
    marginBottom: Spacing.xl,
    alignSelf: 'flex-start',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  logoImage: {
    width: 60,
    height: 60,
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
    paddingHorizontal: Spacing.md,
  },
  form: {
    gap: Spacing.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  icon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: Typography.fontSizes.base,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeights.normal,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.sm,
  },
  linkText: {
    color: Colors.primary,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.fontSizes.sm,
    marginTop: Spacing.xs,
    marginLeft: Spacing.md,
    marginBottom: Spacing.sm,
  },
});
