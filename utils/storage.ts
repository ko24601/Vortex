import { Platform } from 'react-native';

// Define the storage interface to match AsyncStorage's methods we use
export const storage = {
  // Get item from storage
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        console.warn('Failed to get item from localStorage:', e);
        return null;
      }
    } else {
      // Import AsyncStorage only on native to avoid web bundle issues
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      return AsyncStorage.getItem(key);
    }
  },

  // Set item in storage
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        window.localStorage.setItem(key, value);
      } catch (e) {
        console.warn('Failed to set item in localStorage:', e);
      }
    } else {
      // Import AsyncStorage only on native
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      return AsyncStorage.setItem(key, value);
    }
  },

  // Remove item from storage
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        window.localStorage.removeItem(key);
      } catch (e) {
        console.warn('Failed to remove item from localStorage:', e);
      }
    } else {
      // Import AsyncStorage only on native
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      return AsyncStorage.removeItem(key);
    }
  },
};

// For convenience, we can also export a clear method if needed
export const clearStorage = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    try {
      window.localStorage.clear();
    } catch (e) {
      console.warn('Failed to clear localStorage:', e);
    }
  } else {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    return AsyncStorage.clear();
  }
};