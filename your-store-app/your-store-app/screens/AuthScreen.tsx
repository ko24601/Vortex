import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { signInWithGoogle } from '../utils/authService';

interface AuthScreenProps {
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  isSignUp: boolean;
  setIsSignUp: (val: boolean) => void;
  onSubmit: () => Promise<void>;
  onReturnHome: () => void;
}

export default function AuthScreen({
  email,
  setEmail,
  password,
  setPassword,
  isSignUp,
  setIsSignUp,
  onSubmit,
  onReturnHome
}: AuthScreenProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Note: Google Sign-In configuration is now handled in the authService utility.

  const handlePress = async () => {
    if (!email || !password) {
      setErrorMessage('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await onSubmit(); // Calls handleAuthSubmit in App.tsx
    } catch (error: any) {
      setErrorMessage(error.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setLoading(true);
    try {
      const userCred = await signInWithGoogle();

      // Verify or create Firestore User profile document
      if (userCred?.user) {
        const userRef = doc(db, 'users', userCred.user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            email: userCred.user.email,
            isAdmin: false,
            createdAt: serverTimestamp()
          });
        }
      }
      onReturnHome();
    } catch (err: any) {
      if (err.code !== 'SIGN_IN_CANCELLED' && err.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(err.message || 'Google Sign-In failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.avatarBox}>
            <Ionicons name={isSignUp ? "person-add-outline" : "lock-closed-outline"} size={36} color="#d97706" />
          </View>

          <Text style={styles.title}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>
          <Text style={styles.subtitle}>
            {isSignUp
              ? 'Sign up to automatically sign in & save your preferences'
              : 'Sign in to access your VORTEX profile'}
          </Text>

          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="name@example.com"
              placeholderTextColor="#737373"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#737373"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handlePress}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitBtnText}>{isSignUp ? 'Create Account & Sign In' : 'Sign In'}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR CONNECT WITH</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign In Button */}
          <TouchableOpacity
            style={[styles.socialBtn, loading && { opacity: 0.7 }]}
            onPress={handleGoogleSignIn}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-google" size={18} color="#ffffff" />
            <Text style={styles.socialBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchModeBtn}
            onPress={() => {
              setIsSignUp(!isSignUp);
              setErrorMessage(null);
            }}
          >
            <Text style={styles.switchModeText}>
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: '#171717',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6
  },
  avatarBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#383838',
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '900', color: '#ffffff', marginBottom: 6, letterSpacing: 0.5 },
  subtitle: { fontSize: 13, color: '#a3a3a3', textAlign: 'center', marginBottom: 24 },
  errorBox: {
    width: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16
  },
  errorText: { color: '#ef4444', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  inputGroup: { width: '100%', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', color: '#a3a3a3', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    color: '#ffffff',
    fontSize: 14,
    width: '100%'
  },
  submitBtn: {
    width: '100%',
    backgroundColor: '#d97706',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 14
  },
  submitBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#262626' },
  dividerText: { color: '#737373', fontSize: 10, fontWeight: '800', marginHorizontal: 10, letterSpacing: 1 },
  socialBtn: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#0a0a0a',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#262626',
    marginBottom: 16
  },
  socialBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  switchModeBtn: { alignItems: 'center', paddingVertical: 8 },
  switchModeText: { color: '#a3a3a3', fontSize: 13, fontWeight: '600' }
});