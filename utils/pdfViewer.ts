import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/**
 * View a PDF from base64 string
 * @param base64String - The base64-encoded PDF content
 * @param fileName - Optional filename for the PDF (default: 'prescription.pdf')
 */
export const viewPDF = async (base64String: string, fileName: string = 'prescription.pdf'): Promise<void> => {
  try {
    // Create file path in cache directory
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

    // Write base64 content to file
    await FileSystem.writeAsStringAsync(fileUri, base64String, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();

    if (isAvailable) {
      // Share/open the PDF file
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'View Prescription',
        UTI: 'com.adobe.pdf',
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (error) {
    console.error('Error viewing PDF:', error);
    throw error;
  }
};

/**
 * Download/Save a PDF from base64 string
 * @param base64String - The base64-encoded PDF content
 * @param fileName - Filename for the PDF
 */
export const downloadPDF = async (base64String: string, fileName: string): Promise<string> => {
  try {
    let fileUri: string;

    if (Platform.OS === 'android') {
      // On Android, use Downloads directory
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

      if (!permissions.granted) {
        throw new Error('Storage permission denied');
      }

      fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        fileName,
        'application/pdf'
      );

      await FileSystem.writeAsStringAsync(fileUri, base64String, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } else {
      // On iOS, use document directory
      fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, base64String, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }

    return fileUri;
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw error;
  }
};
