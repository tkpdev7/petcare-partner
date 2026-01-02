import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type ModalType = 'success' | 'error' | 'loading' | 'warning' | 'info';

interface CustomModalProps {
  visible: boolean;
  type?: ModalType;
  title?: string;
  message: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  onPrimaryPress?: () => void;
  onSecondaryPress?: () => void;
  onClose?: () => void;
  hidePrimaryButton?: boolean;
  hideSecondaryButton?: boolean;
}

const CustomModal: React.FC<CustomModalProps> = ({
  visible,
  type = 'info',
  title,
  message,
  primaryButtonText = 'OK',
  secondaryButtonText = 'Close',
  onPrimaryPress,
  onSecondaryPress,
  onClose,
  hidePrimaryButton = false,
  hideSecondaryButton = true,
}) => {
  const getIconConfig = () => {
    switch (type) {
      case 'success':
        return { name: 'checkmark-circle', color: '#4CAF50' };
      case 'error':
        return { name: 'close-circle', color: '#F44336' };
      case 'warning':
        return { name: 'warning', color: '#FF9800' };
      case 'info':
        return { name: 'information-circle', color: '#2196F3' };
      case 'loading':
        return null; // No icon for loading
      default:
        return { name: 'information-circle', color: '#2196F3' };
    }
  };

  const getDefaultTitle = () => {
    if (title) return title;
    switch (type) {
      case 'success':
        return 'Success!';
      case 'error':
        return 'Error';
      case 'warning':
        return 'Warning';
      case 'loading':
        return 'Loading...';
      default:
        return 'Notice';
    }
  };

  const getPrimaryButtonColor = () => {
    switch (type) {
      case 'error':
        return '#F44336';
      case 'warning':
        return '#FF9800';
      case 'success':
        return '#4CAF50';
      default:
        return '#ED6D4E';
    }
  };

  const iconConfig = getIconConfig();

  const handlePrimaryPress = () => {
    if (onPrimaryPress) {
      onPrimaryPress();
    } else if (onClose) {
      onClose();
    }
  };

  const handleSecondaryPress = () => {
    if (onSecondaryPress) {
      onSecondaryPress();
    } else if (onClose) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.content}>
            {/* Close Button (X icon) */}
            {type !== 'loading' && onClose && (
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
              >
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            )}

            {/* Icon or Loading Spinner */}
            {type === 'loading' ? (
              <View style={styles.iconContainer}>
                <ActivityIndicator size="large" color="#ED6D4E" />
              </View>
            ) : iconConfig ? (
              <View style={styles.iconContainer}>
                <Ionicons name={iconConfig.name as any} size={80} color={iconConfig.color} />
              </View>
            ) : null}

            {/* Title */}
            <Text style={styles.title}>{getDefaultTitle()}</Text>

            {/* Message */}
            <Text style={styles.message}>{message}</Text>

            {/* Buttons */}
            {!hidePrimaryButton && type !== 'loading' && (
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: getPrimaryButtonColor() }]}
                onPress={handlePrimaryPress}
              >
                <Text style={styles.primaryButtonText}>{primaryButtonText}</Text>
              </TouchableOpacity>
            )}

            {!hideSecondaryButton && type !== 'loading' && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleSecondaryPress}
              >
                <Text style={styles.secondaryButtonText}>{secondaryButtonText}</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    padding: 5,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: '#ED6D4E',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ED6D4E',
  },
  secondaryButtonText: {
    color: '#ED6D4E',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CustomModal;
