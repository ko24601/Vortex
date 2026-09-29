import { Platform } from 'react-native';

// Register for push notifications and return whether permission is granted
export const registerForPushNotifications = async (): Promise<boolean> => {
  if (Platform.OS === 'web') {
    const status = await Notification.requestPermission();
    return status === 'granted';
  } else {
    // Import expo-notifications only on native to avoid web bundle issues
    const Notifications = await import('expo-notifications');
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }
};

// Schedule a local notification (immediate, as trigger: null is used in the existing code)
export const scheduleLocalNotification = async (title: string, body: string): Promise<void> => {
  if (Platform.OS === 'web') {
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    } else {
      // Permission not granted; we could request it here, but to avoid being intrusive, we just log.
      console.warn('Unable to schedule notification: Notification permission not granted');
    }
    // Resolve immediately
    return Promise.resolve();
  } else {
    // Import expo-notifications only on native
    const Notifications = await import('expo-notifications');
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  }
};