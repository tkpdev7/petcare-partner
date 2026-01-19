import React from 'react';
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ImageViewerProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  onDownload?: () => void;
}

const { width, height } = Dimensions.get('window');

/**
 * Full-screen image viewer modal component
 * Displays images in a modal with close and download options
 */
const ImageViewer: React.FC<ImageViewerProps> = ({ visible, imageUri, onClose, onDownload }) => {
  const [loading, setLoading] = React.useState(true);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.container}>
        {/* Header with close and download buttons */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerSpacer} />

          {onDownload && (
            <TouchableOpacity onPress={onDownload} style={styles.headerButton}>
              <Ionicons name="download-outline" size={26} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Image display area */}
        <View style={styles.imageContainer}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ED6D4E" />
            </View>
          )}

          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="contain"
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              console.error('Failed to load image');
            }}
          />
        </View>

        {/* Footer with tap hint */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={onClose} style={styles.footerCloseArea}>
            {/* Invisible touchable area for closing */}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerSpacer: {
    flex: 1,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: width,
    height: height - 120,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  footer: {
    height: 60,
  },
  footerCloseArea: {
    flex: 1,
  },
});

export default ImageViewer;
