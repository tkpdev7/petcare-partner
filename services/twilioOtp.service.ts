import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentApiConfig } from '../config/api';

const API_BASE_URL = getCurrentApiConfig();

/**
 * Response type for send OTP endpoint
 */
export interface SendOTPResponse {
  success: boolean;
  message: string;
  phone: string;
  expiresIn: string;
  otp?: string; // Only in development mode
}

/**
 * Response type for verify OTP endpoint
 */
export interface VerifyOTPResponse {
  success: boolean;
  message: string;
  token: string;
  data: {
    id: number;
    name: string;
    email: string;
    phone: string;
    phoneVerified: boolean;
  };
}

/**
 * Response type for resend OTP endpoint
 */
export interface ResendOTPResponse {
  success: boolean;
  message: string;
  phone: string;
  expiresIn: string;
  otp?: string; // Only in development mode
}

/**
 * Error response type
 */
export interface OTPErrorResponse {
  success: false;
  error: string;
  details?: string;
}

/**
 * Twilio OTP Service for Partner App
 *
 * Provides phone number verification using Twilio SMS OTP
 */
class TwilioOTPService {
  private apiClient;

  constructor() {
    this.apiClient = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.apiClient.interceptors.request.use(
      async (config) => {
        try {
          const token = await AsyncStorage.getItem('partnerToken');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error('Error getting partner token:', error);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  /**
   * Send OTP to phone number via SMS
   *
   * @param phone - Phone number (10 digits or E.164 format with +)
   * @returns Promise with send OTP response
   *
   * @example
   * ```typescript
   * const result = await twilioOTPService.sendPhoneOTP('9876543210');
   * if (result.success) {
   *   console.log('OTP sent!', result.otp); // OTP shown in dev mode
   * }
   * ```
   */
  async sendPhoneOTP(phone: string): Promise<SendOTPResponse> {
    try {
      console.log('📤 Sending OTP to:', phone);
      const response = await this.apiClient.post<SendOTPResponse>('/auth/phone/send-otp', {
        phone
      });
      console.log('✅ OTP sent successfully');
      return response.data;
    } catch (error: any) {
      console.error('❌ Send OTP error:', error.response?.data || error.message);
      const errorData: OTPErrorResponse = error.response?.data || {
        success: false,
        error: error.message || 'Failed to send OTP'
      };
      throw errorData;
    }
  }

  /**
   * Verify the OTP sent to phone number
   *
   * @param phone - Phone number
   * @param otp - 6-digit OTP code
   * @returns Promise with verification response including auth token
   *
   * @example
   * ```typescript
   * const result = await twilioOTPService.verifyPhoneOTP('9876543210', '123456');
   * if (result.success) {
   *   // Save token
   *   await AsyncStorage.setItem('partnerToken', result.token);
   *   console.log('Phone verified!', result.data);
   * }
   * ```
   */
  async verifyPhoneOTP(phone: string, otp: string): Promise<VerifyOTPResponse> {
    try {
      console.log('🔐 Verifying OTP for:', phone);
      const response = await this.apiClient.post<VerifyOTPResponse>('/auth/phone/verify-otp', {
        phone,
        otp
      });
      console.log('✅ OTP verified successfully');
      return response.data;
    } catch (error: any) {
      console.error('❌ Verify OTP error:', error.response?.data || error.message);
      const errorData: OTPErrorResponse = error.response?.data || {
        success: false,
        error: error.message || 'Failed to verify OTP'
      };
      throw errorData;
    }
  }

  /**
   * Resend OTP to phone number
   *
   * @param phone - Phone number
   * @returns Promise with resend OTP response
   *
   * @example
   * ```typescript
   * const result = await twilioOTPService.resendPhoneOTP('9876543210');
   * if (result.success) {
   *   console.log('New OTP sent!', result.otp); // OTP shown in dev mode
   * }
   * ```
   */
  async resendPhoneOTP(phone: string): Promise<ResendOTPResponse> {
    try {
      console.log('🔄 Resending OTP to:', phone);
      const response = await this.apiClient.post<ResendOTPResponse>('/auth/phone/resend-otp', {
        phone
      });
      console.log('✅ OTP resent successfully');
      return response.data;
    } catch (error: any) {
      console.error('❌ Resend OTP error:', error.response?.data || error.message);
      const errorData: OTPErrorResponse = error.response?.data || {
        success: false,
        error: error.message || 'Failed to resend OTP'
      };
      throw errorData;
    }
  }

  /**
   * Validate phone number format
   *
   * @param phone - Phone number to validate
   * @returns True if valid, false otherwise
   *
   * @example
   * ```typescript
   * if (twilioOTPService.validatePhoneNumber('9876543210')) {
   *   // Valid phone number
   * }
   * ```
   */
  validatePhoneNumber(phone: string): boolean {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // Check if it's a 10-digit Indian number
    if (cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned)) {
      return true;
    }

    // Check if it's a valid E.164 format (starts with + and has 10-15 digits)
    if (phone.startsWith('+') && cleaned.length >= 10 && cleaned.length <= 15) {
      return true;
    }

    return false;
  }

  /**
   * Format phone number to display format
   *
   * @param phone - Phone number
   * @returns Formatted phone number
   *
   * @example
   * ```typescript
   * twilioOTPService.formatPhoneForDisplay('9876543210') // Returns "+91 98765 43210"
   * ```
   */
  formatPhoneForDisplay(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.length === 10) {
      return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }

    return phone;
  }
}

// Create singleton instance
const twilioOTPService = new TwilioOTPService();

// Export both the class and instance
export { TwilioOTPService };
export default twilioOTPService;
