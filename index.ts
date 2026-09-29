import { registerRootComponent } from 'expo';
import { Alert, Platform } from 'react-native';

// React Native Web Alert polyfill for interactive alerts & confirmation dialogs
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title?: string, message?: string, buttons?: any[]) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    if (buttons && buttons.length > 1) {
      const confirmAction = buttons.find(b => b.style !== 'cancel' && b.text?.toLowerCase() !== 'cancel') || buttons[buttons.length - 1];
      const cancelAction = buttons.find(b => b.style === 'cancel' || b.text?.toLowerCase() === 'cancel');
      if (window.confirm(text)) {
        confirmAction?.onPress?.();
      } else {
        cancelAction?.onPress?.();
      }
    } else {
      window.alert(text);
      if (buttons && buttons[0]?.onPress) {
        buttons[0].onPress();
      }
    }
  };
}

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
