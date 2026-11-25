import { useState, useCallback } from 'react';
import { ModalType } from '../components/CustomModal';

interface ModalConfig {
  type?: ModalType;
  title?: string;
  message: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  onPrimaryPress?: () => void;
  onSecondaryPress?: () => void;
  hidePrimaryButton?: boolean;
  hideSecondaryButton?: boolean;
}

export const useCustomModal = () => {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<ModalConfig>({
    type: 'info',
    message: '',
  });

  const showModal = useCallback((modalConfig: ModalConfig) => {
    setConfig(modalConfig);
    setVisible(true);
  }, []);

  const hideModal = useCallback(() => {
    setVisible(false);
  }, []);

  const showSuccess = useCallback((message: string, options?: Partial<ModalConfig>) => {
    showModal({
      type: 'success',
      message,
      ...options,
    });
  }, [showModal]);

  const showError = useCallback((message: string, options?: Partial<ModalConfig>) => {
    showModal({
      type: 'error',
      message,
      ...options,
    });
  }, [showModal]);

  const showWarning = useCallback((message: string, options?: Partial<ModalConfig>) => {
    showModal({
      type: 'warning',
      message,
      ...options,
    });
  }, [showModal]);

  const showInfo = useCallback((message: string, options?: Partial<ModalConfig>) => {
    showModal({
      type: 'info',
      message,
      ...options,
    });
  }, [showModal]);

  const showLoading = useCallback((message: string = 'Please wait...') => {
    showModal({
      type: 'loading',
      message,
      hidePrimaryButton: true,
      hideSecondaryButton: true,
    });
  }, [showModal]);

  const modalProps = {
    visible,
    type: config.type,
    title: config.title,
    message: config.message,
    primaryButtonText: config.primaryButtonText,
    secondaryButtonText: config.secondaryButtonText,
    onPrimaryPress: config.onPrimaryPress,
    onSecondaryPress: config.onSecondaryPress,
    onClose: hideModal,
    hidePrimaryButton: config.hidePrimaryButton,
    hideSecondaryButton: config.hideSecondaryButton,
  };

  return {
    visible,
    config,
    showModal,
    hideModal,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    modalProps,
  };
};
