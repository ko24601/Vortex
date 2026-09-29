import { Platform } from 'react-native';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithCredential } from 'firebase/auth';
import { auth } from '../firebase'; // We can also use getAuth() but we have it exported.

// On native, we need to import the GoogleSignin module
let isGoogleSigninConfigured = false;

export const signInWithGoogle = async () => {
  if (Platform.OS === 'web') {
    // Web: Use Firebase Popup
    const provider = new GoogleAuthProvider();
    return await signInWithPopup(auth, provider);
  } else {
    // Native: Use @react-native-google-signin/google-signin to get the ID token, then Firebase credential
    // Import the module only on native
    const GoogleSignin = await import('@react-native-google-signin/google-signin');

    // Configure GoogleSignin if not already done
    if (!isGoogleSigninConfigured) {
      try {
        GoogleSignin.GoogleSignin.configure({
          webClientId: '606112501977-deqe907ak8gbqmo097jmmfgd4dbbb8m5.apps.googleusercontent.com',
          iosClientId: '606112501977-4bfp3vs8enm2ld0i6ukaudjkcf5che8f.apps.googleusercontent.com',
        });
        isGoogleSigninConfigured = true;
      } catch (e) {
        console.log('Google Signin configuration error:', e);
      }
    }

    // Check for Play Services (Android)
    if (Platform.OS === 'android') {
      await GoogleSignin.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    // Sign in with Google
    const userInfo = await GoogleSignin.GoogleSignin.signIn();
    const idToken = userInfo.data?.idToken;

    if (!idToken) {
      throw new Error('No Google ID token found.');
    }

    // Create Firebase credential and sign in
    const credential = GoogleAuthProvider.credential(idToken);
    return await signInWithCredential(auth, credential);
  }
};