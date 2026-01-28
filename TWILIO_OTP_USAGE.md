# Twilio OTP Service Usage - Partner App

## Import the Service

```typescript
import twilioOTPService from '@/services/twilioOtp.service';
```

The service is exported as a singleton instance, so you can use it directly.

---

## 1. Send OTP

### Basic Usage

```typescript
import twilioOTPService from '@/services/twilioOtp.service';

const handleSendOTP = async () => {
  try {
    const result = await twilioOTPService.sendPhoneOTP('9876543210');

    console.log('✅ OTP sent!');
    console.log('Phone:', result.phone);
    console.log('Expires in:', result.expiresIn);

    // In development mode, OTP is included in response
    if (result.otp) {
      console.log('OTP (dev mode):', result.otp);
    }

    // Show success message to user
    Alert.alert('Success', result.message);
  } catch (error: any) {
    console.error('❌ Error:', error.error);
    Alert.alert('Error', error.error || 'Failed to send OTP');
  }
};
```

### With Custom Modal

```typescript
import twilioOTPService from '@/services/twilioOtp.service';
import { useCustomModal } from '@/hooks/useCustomModal';

const PhoneVerificationScreen = () => {
  const modal = useCustomModal();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    setLoading(true);

    try {
      const result = await twilioOTPService.sendPhoneOTP(phone);

      modal.showSuccess(result.message, {
        onPrimaryPress: () => {
          modal.hideModal();
          // Navigate to OTP input screen
          router.push({
            pathname: '/otp-verification',
            params: {
              phone: result.phone,
              devOTP: result.otp // For testing
            }
          });
        }
      });
    } catch (error: any) {
      modal.showError(error.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    // Your UI here
  );
};
```

---

## 2. Verify OTP

### Basic Usage

```typescript
import twilioOTPService from '@/services/twilioOtp.service';
import AsyncStorage from '@react-native-async-storage/async-storage';

const handleVerifyOTP = async (phone: string, otp: string) => {
  try {
    const result = await twilioOTPService.verifyPhoneOTP(phone, otp);

    console.log('✅ Phone verified!');
    console.log('User data:', result.data);

    // Save authentication token (partner app uses 'partnerToken')
    await AsyncStorage.setItem('partnerToken', result.token);
    await AsyncStorage.setItem('partnerData', JSON.stringify(result.data));

    // Navigate to dashboard
    router.replace('/dashboard');

    Alert.alert('Success', 'Phone number verified successfully!');
  } catch (error: any) {
    console.error('❌ Verification error:', error.error);
    Alert.alert('Error', error.error || 'Invalid OTP');
  }
};
```

### Complete OTP Screen Example

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import twilioOTPService from '@/services/twilioOtp.service';
import { useCustomModal } from '@/hooks/useCustomModal';
import CustomModal from '@/components/CustomModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OTPVerificationScreen = () => {
  const params = useLocalSearchParams();
  const phone = params.phone as string;
  const modal = useCustomModal();

  const [otp, setOTP] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      modal.showError('Please enter a 6-digit OTP');
      return;
    }

    setLoading(true);

    try {
      const result = await twilioOTPService.verifyPhoneOTP(phone, otp);

      // Save authentication
      await AsyncStorage.setItem('partnerToken', result.token);
      await AsyncStorage.setItem('partnerData', JSON.stringify(result.data));

      modal.showSuccess('Phone verified successfully!', {
        onPrimaryPress: () => {
          modal.hideModal();
          router.replace('/dashboard');
        }
      });
    } catch (error: any) {
      modal.showError(error.error || 'Invalid OTP. Please try again.');
      setOTP(''); // Clear OTP input
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.subtitle}>Sent to {phone}</Text>

      <TextInput
        value={otp}
        onChangeText={setOTP}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="000000"
        style={styles.otpInput}
      />

      <TouchableOpacity
        onPress={handleVerify}
        disabled={loading}
        style={styles.verifyButton}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.verifyButtonText}>Verify</Text>
        )}
      </TouchableOpacity>

      <CustomModal
        visible={modal.visible}
        type={modal.config.type}
        title={modal.config.title}
        message={modal.config.message}
        onPrimaryPress={modal.config.onPrimaryPress}
        onClose={modal.hideModal}
      />
    </View>
  );
};
```

---

## 3. Resend OTP

### Basic Usage

```typescript
import twilioOTPService from '@/services/twilioOtp.service';

const handleResendOTP = async (phone: string) => {
  try {
    const result = await twilioOTPService.resendPhoneOTP(phone);

    Alert.alert('Success', 'New OTP sent to your phone!');

    // In development mode
    if (result.otp) {
      console.log('New OTP (dev mode):', result.otp);
    }
  } catch (error: any) {
    Alert.alert('Error', error.error || 'Failed to resend OTP');
  }
};
```

### With Timer and Custom Modal

```typescript
import React, { useState, useEffect } from 'react';
import twilioOTPService from '@/services/twilioOtp.service';
import { useCustomModal } from '@/hooks/useCustomModal';

const OTPScreen = ({ phone }) => {
  const modal = useCustomModal();
  const [canResend, setCanResend] = useState(false);
  const [timer, setTimer] = useState(60);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  const handleResend = async () => {
    if (!canResend || resending) return;

    setResending(true);

    try {
      const result = await twilioOTPService.resendPhoneOTP(phone);

      modal.showSuccess('New OTP sent to your phone!');

      // Reset timer
      setTimer(60);
      setCanResend(false);

      // Auto-fill OTP in dev mode
      if (result.otp && __DEV__) {
        console.log('New OTP:', result.otp);
      }
    } catch (error: any) {
      modal.showError(error.error || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <View>
      {/* OTP input here */}

      <TouchableOpacity
        onPress={handleResend}
        disabled={!canResend || resending}
        style={[
          styles.resendButton,
          (!canResend || resending) && styles.resendButtonDisabled
        ]}
      >
        <Text style={styles.resendButtonText}>
          {resending
            ? 'Sending...'
            : canResend
            ? 'Resend OTP'
            : `Resend in ${timer}s`}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
```

---

## 4. Validate Phone Number

### Basic Usage

```typescript
import twilioOTPService from '@/services/twilioOtp.service';

const handlePhoneInput = (phone: string) => {
  if (twilioOTPService.validatePhoneNumber(phone)) {
    console.log('✅ Valid phone number');
    setPhoneError('');
  } else {
    setPhoneError('Please enter a valid 10-digit phone number');
  }
};
```

### Form Validation Example

```typescript
import twilioOTPService from '@/services/twilioOtp.service';
import { useCustomModal } from '@/hooks/useCustomModal';

const PhoneInputScreen = () => {
  const modal = useCustomModal();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    // Validate phone
    if (!twilioOTPService.validatePhoneNumber(phone)) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    // Clear error and proceed
    setError('');
    setLoading(true);

    try {
      await twilioOTPService.sendPhoneOTP(phone);

      router.push({
        pathname: '/otp-verification',
        params: { phone }
      });
    } catch (error: any) {
      modal.showError(error.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        value={phone}
        onChangeText={(text) => {
          setPhone(text);
          setError(''); // Clear error on input
        }}
        keyboardType="phone-pad"
        maxLength={10}
        placeholder="Enter 10-digit phone number"
        style={styles.phoneInput}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity onPress={handleSubmit} disabled={loading}>
        <Text>{loading ? 'Sending...' : 'Send OTP'}</Text>
      </TouchableOpacity>
    </View>
  );
};
```

---

## 5. Format Phone Number

### Display Formatting

```typescript
import twilioOTPService from '@/services/twilioOtp.service';

const PhoneDisplay = ({ phone }) => {
  const formatted = twilioOTPService.formatPhoneForDisplay(phone);

  return (
    <Text style={styles.phoneText}>Phone: {formatted}</Text>
  );
};

// Example:
// Input: "9876543210"
// Output: "+91 98765 43210"
```

---

## Complete Partner Registration Flow

### Step 1: Phone Input Screen

```typescript
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import twilioOTPService from '@/services/twilioOtp.service';
import { useCustomModal } from '@/hooks/useCustomModal';
import CustomModal from '@/components/CustomModal';
import { Colors, Typography, Spacing } from '@/constants/Colors';

export default function PartnerPhoneVerification() {
  const modal = useCustomModal();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = async () => {
    // Validate
    if (!twilioOTPService.validatePhoneNumber(phone)) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await twilioOTPService.sendPhoneOTP(phone);

      // Navigate to OTP screen
      router.push({
        pathname: '/verify-otp',
        params: {
          phone: result.phone,
          devOTP: result.otp // For testing in dev mode
        }
      });
    } catch (error: any) {
      modal.showError(error.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ padding: Spacing.lg }}>
        <Text style={{ ...Typography.h2, marginBottom: Spacing.md }}>
          Verify Your Phone
        </Text>

        <Text style={{ ...Typography.body, marginBottom: Spacing.lg }}>
          We'll send you a 6-digit OTP to verify your phone number
        </Text>

        <TextInput
          value={phone}
          onChangeText={(text) => {
            setPhone(text);
            setError('');
          }}
          keyboardType="phone-pad"
          maxLength={10}
          placeholder="Enter 10-digit phone number"
          style={{
            borderWidth: 1,
            borderColor: error ? Colors.error : Colors.border,
            borderRadius: 8,
            padding: Spacing.md,
            fontSize: 16,
            marginBottom: Spacing.sm
          }}
        />

        {error ? (
          <Text style={{ color: Colors.error, marginBottom: Spacing.md }}>
            {error}
          </Text>
        ) : null}

        <TouchableOpacity
          onPress={handleSendOTP}
          disabled={loading}
          style={{
            backgroundColor: Colors.primary,
            padding: Spacing.md,
            borderRadius: 8,
            alignItems: 'center',
            opacity: loading ? 0.6 : 1
          }}
        >
          <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>
            {loading ? 'Sending...' : 'Send OTP'}
          </Text>
        </TouchableOpacity>
      </View>

      <CustomModal
        visible={modal.visible}
        type={modal.config.type}
        title={modal.config.title}
        message={modal.config.message}
        onClose={modal.hideModal}
      />
    </SafeAreaView>
  );
}
```

### Step 2: OTP Verification Screen

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import twilioOTPService from '@/services/twilioOtp.service';
import { useCustomModal } from '@/hooks/useCustomModal';
import CustomModal from '@/components/CustomModal';
import { Colors, Typography, Spacing } from '@/constants/Colors';

export default function VerifyOTPScreen() {
  const params = useLocalSearchParams();
  const phone = params.phone as string;
  const devOTP = params.devOTP as string;
  const modal = useCustomModal();

  const [otp, setOTP] = useState(__DEV__ && devOTP ? devOTP : '');
  const [loading, setLoading] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [timer, setTimer] = useState(60);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(prev => prev - 1), 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      modal.showError('Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);

    try {
      const result = await twilioOTPService.verifyPhoneOTP(phone, otp);

      // Save authentication
      await AsyncStorage.setItem('partnerToken', result.token);
      await AsyncStorage.setItem('partnerData', JSON.stringify(result.data));

      modal.showSuccess('Phone verified successfully!', {
        onPrimaryPress: () => {
          modal.hideModal();
          router.replace('/dashboard');
        }
      });
    } catch (error: any) {
      modal.showError(error.error || 'Invalid OTP');
      setOTP('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    try {
      const result = await twilioOTPService.resendPhoneOTP(phone);
      modal.showSuccess('New OTP sent!');

      setTimer(60);
      setCanResend(false);

      if (result.otp && __DEV__) {
        setOTP(result.otp);
      }
    } catch (error: any) {
      modal.showError(error.error);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ padding: Spacing.lg }}>
        <Text style={{ ...Typography.h2, marginBottom: Spacing.sm }}>
          Enter OTP
        </Text>

        <Text style={{ ...Typography.body, marginBottom: Spacing.lg }}>
          We sent a 6-digit code to {twilioOTPService.formatPhoneForDisplay(phone)}
        </Text>

        <TextInput
          value={otp}
          onChangeText={setOTP}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="000000"
          style={{
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: 8,
            padding: Spacing.md,
            fontSize: 24,
            letterSpacing: 8,
            textAlign: 'center',
            marginBottom: Spacing.lg
          }}
        />

        <TouchableOpacity
          onPress={handleVerify}
          disabled={loading}
          style={{
            backgroundColor: Colors.primary,
            padding: Spacing.md,
            borderRadius: 8,
            alignItems: 'center',
            marginBottom: Spacing.md,
            opacity: loading ? 0.6 : 1
          }}
        >
          <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>
            {loading ? 'Verifying...' : 'Verify OTP'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleResend}
          disabled={!canResend}
          style={{ alignItems: 'center' }}
        >
          <Text style={{ color: canResend ? Colors.primary : Colors.gray }}>
            {canResend ? 'Resend OTP' : `Resend in ${timer}s`}
          </Text>
        </TouchableOpacity>
      </View>

      <CustomModal
        visible={modal.visible}
        type={modal.config.type}
        title={modal.config.title}
        message={modal.config.message}
        onPrimaryPress={modal.config.onPrimaryPress}
        onClose={modal.hideModal}
      />
    </SafeAreaView>
  );
}
```

---

## Error Handling

All service methods throw errors with this structure:

```typescript
{
  success: false,
  error: string,
  details?: string
}
```

### Common Errors

- `"Invalid phone number format"` - Validation failed
- `"No account found with this phone number"` - User doesn't exist
- `"Phone number is already verified"` - Cannot resend
- `"Invalid OTP"` - Wrong code
- `"OTP has expired"` - Older than 10 minutes

---

## Best Practices

1. **Use Custom Modal**: Leverage the existing `useCustomModal` hook
2. **Token Storage**: Save to `partnerToken` (not just `token`)
3. **Development Mode**: Auto-fill OTP when `__DEV__` is true
4. **Timer**: 60-second countdown before resend
5. **Validation**: Always validate before API calls
6. **Logging**: Service includes console logs with emojis (✅❌📤🔐🔄)

---

**Service Location:** `services/twilioOtp.service.ts`
**Backend Docs:** See `TWILIO_API_REFERENCE.md` in backend folder
