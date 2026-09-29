// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAuth, getAuth, getReactNativePersistence } from "firebase/auth";
import { storage as localStorageWrapper } from './utils/storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyC73PAfpp7PxInR5hEw_P2rvNrZmysMQf0",
  authDomain: "dads-ee515.firebaseapp.com",
  projectId: "dads-ee515",
  storageBucket: "dads-ee515.firebasestorage.app",
  messagingSenderId: "606112501977",
  appId: "1:606112501977:web:f004fe98a48824fa1ceec8",
  measurementId: "G-J745JS515N"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);

// Conditionally initialize Auth based on platform (Web vs Native)
export const auth = Platform.OS === 'web'
  ? getAuth(app)
  : initializeAuth(app, {
      persistence: getReactNativePersistence(localStorageWrapper)
    });