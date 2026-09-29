import { Platform } from 'react-native';

// Define the return type to match expo-image-picker's launchImageLibraryAsync
export interface ImagePickerAsset {
  uri: string;
  // The following properties are optional but present in expo-image-picker; we only need uri for our usage
  width?: number;
  height?: number;
  fileName?: string;
  fileSize?: number;
  type?: string;
}

export interface ImagePickerResult {
  canceled: boolean;
  assets: ImagePickerAsset[];
}

// Helper to create a file input and resolve with selected files
async function pickImagesWeb(options: {
  mediaTypes?: any;
  allowsMultipleSelection?: boolean;
  quality?: number;
}): Promise<ImagePickerResult> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = options.allowsMultipleSelection || false;

    input.onchange = () => {
      if (input.files && input.files.length > 0) {
        const assets: ImagePickerAsset[] = Array.from(input.files).map((file) => ({
          uri: URL.createObjectURL(file),
          // Note: We don't have width/height here, but the code only uses uri.
          // If needed, we could add image loading to get dimensions, but skip for simplicity.
          fileName: file.name,
          fileSize: file.size,
          type: file.type,
        }));
        resolve({ canceled: false, assets });
      } else {
        resolve({ canceled: true, assets: [] });
      }
      // Clean up: remove the input element from DOM
      input.remove();
    };

    // Handle cancel (if user closes dialog without selecting)
    // Note: There's no standard cancel event for file input, but we can treat no selection as cancel.
    // We'll rely on onchange with empty files.

    // Click the input to open file dialog
    input.click();
  });
}

// Main function that mirrors expo-image-picker's launchImageLibraryAsync
export async function launchImageLibraryAsync(options: {
  mediaTypes?: any;
  allowsMultipleSelection?: boolean;
  quality?: number;
}): Promise<ImagePickerResult> {
  if (Platform.OS === 'web') {
    return pickImagesWeb(options);
  } else {
    // Import expo-image-picker only on native to avoid bundling it for web
    const ImagePicker = await import('expo-image-picker');
    return ImagePicker.launchImageLibraryAsync(options);
  }
}