import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform, Alert } from 'react-native';

/**
 * Opens a PDF file with the device's default PDF viewer
 * On Android: Uses IntentLauncher to directly open with default PDF app
 * On iOS: Uses Sharing API (iOS limitation)
 */
export const viewPDF = async (base64String: string, fileName: string = 'document.pdf'): Promise<void> => {
  try {
    console.log('[viewPDF] Opening PDF:', fileName);

    // Clean base64 string - remove data URL prefix if present
    const cleanBase64 = base64String.replace(/^data:application\/pdf;base64,/, '');

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const uniqueFileName = `${fileName.replace('.pdf', '')}_${timestamp}.pdf`;
    const fileUri = `${FileSystem.documentDirectory}${uniqueFileName}`;

    // Write the base64 string to a file
    await FileSystem.writeAsStringAsync(fileUri, cleanBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Verify file was created
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      throw new Error('File was not created successfully');
    }

    console.log('[viewPDF] File created:', fileUri, 'Size:', fileInfo.size);

    // Open with device's default PDF viewer
    if (Platform.OS === 'android') {
      // On Android, use IntentLauncher to open with default PDF app
      const contentUri = await FileSystem.getContentUriAsync(fileUri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        type: 'application/pdf',
      });
      console.log('[viewPDF] PDF opened with Android Intent');
    } else {
      // On iOS, use Sharing API (this is the iOS way to open files with other apps)
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Open PDF',
        UTI: 'com.adobe.pdf',
      });
      console.log('[viewPDF] PDF shared on iOS');
    }
  } catch (error) {
    console.error('[viewPDF] Error:', error);
    Alert.alert('Error', 'Failed to open PDF file. Please try again.');
    throw error;
  }
};

/**
 * Downloads a PDF file to the device's storage
 * On Android: Saves to user-selected directory
 * On iOS: Saves to app's document directory
 */
export const downloadPDF = async (base64String: string, fileName: string): Promise<string> => {
  try {
    console.log('[downloadPDF] Downloading PDF:', fileName);

    // Clean base64 string
    const cleanBase64 = base64String.replace(/^data:application\/pdf;base64,/, '');

    let fileUri: string;

    if (Platform.OS === 'android') {
      // On Android, let user choose where to save
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

      if (!permissions.granted) {
        throw new Error('Storage permission denied');
      }

      fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        fileName,
        'application/pdf'
      );

      await FileSystem.writeAsStringAsync(fileUri, cleanBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } else {
      // On iOS, save to document directory and share
      fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, cleanBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Share to allow user to save to Files app
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Save PDF',
        UTI: 'com.adobe.pdf',
      });
    }

    console.log('[downloadPDF] PDF saved:', fileUri);
    Alert.alert('Success', 'PDF downloaded successfully');
    return fileUri;
  } catch (error) {
    console.error('[downloadPDF] Error:', error);
    Alert.alert('Error', 'Failed to download PDF. Please try again.');
    throw error;
  }
};

/**
 * Opens an image file - prepares it for viewing in an in-app modal
 * Returns the local file URI for use with Image component
 */
export const prepareImageForViewing = async (
  base64String: string,
  fileName: string = 'image.jpg'
): Promise<string> => {
  try {
    console.log('[prepareImageForViewing] Preparing image:', fileName);

    // Clean base64 string - remove data URL prefix if present
    const cleanBase64 = base64String.replace(/^data:image\/[a-z]+;base64,/, '');

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const uniqueFileName = `${fileName.replace(/\.[^.]+$/, '')}_${timestamp}.${fileName.split('.').pop()}`;
    const fileUri = `${FileSystem.cacheDirectory}${uniqueFileName}`;

    // Write the base64 string to a file
    await FileSystem.writeAsStringAsync(fileUri, cleanBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Verify file was created
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      throw new Error('Image file was not created successfully');
    }

    console.log('[prepareImageForViewing] Image ready:', fileUri);
    return fileUri;
  } catch (error) {
    console.error('[prepareImageForViewing] Error:', error);
    throw error;
  }
};

/**
 * Downloads an image file to the device's storage
 */
export const downloadImage = async (base64String: string, fileName: string): Promise<string> => {
  try {
    console.log('[downloadImage] Downloading image:', fileName);

    // Clean base64 string
    const cleanBase64 = base64String.replace(/^data:image\/[a-z]+;base64,/, '');

    // Determine MIME type from file extension
    const ext = fileName.toLowerCase().split('.').pop();
    const mimeType = ext === 'png' ? 'image/png' :
                     ext === 'gif' ? 'image/gif' :
                     ext === 'webp' ? 'image/webp' : 'image/jpeg';

    let fileUri: string;

    if (Platform.OS === 'android') {
      // On Android, let user choose where to save
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

      if (!permissions.granted) {
        throw new Error('Storage permission denied');
      }

      fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        fileName,
        mimeType
      );

      await FileSystem.writeAsStringAsync(fileUri, cleanBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } else {
      // On iOS, save to document directory and share
      fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, cleanBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Share to allow user to save to Photos app
      await Sharing.shareAsync(fileUri, {
        mimeType,
        dialogTitle: 'Save Image',
      });
    }

    console.log('[downloadImage] Image saved:', fileUri);
    Alert.alert('Success', 'Image downloaded successfully');
    return fileUri;
  } catch (error) {
    console.error('[downloadImage] Error:', error);
    Alert.alert('Error', 'Failed to download image. Please try again.');
    throw error;
  }
};

/**
 * Check if a URL is a PDF
 */
export const isPDF = (url: string): boolean => {
  return url.toLowerCase().endsWith('.pdf') || url.toLowerCase().includes('.pdf?');
};

/**
 * Check if a URL is an image
 */
export const isImage = (url: string): boolean => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  const lowerUrl = url.toLowerCase();
  return imageExtensions.some(ext => lowerUrl.endsWith(ext) || lowerUrl.includes(`${ext}?`));
};

/**
 * Get MIME type from file name
 */
const getMimeType = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase();

  const mimeTypes: { [key: string]: string } = {
    'pdf': 'application/pdf',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
  };

  return mimeTypes[extension || ''] || 'application/octet-stream';
};
