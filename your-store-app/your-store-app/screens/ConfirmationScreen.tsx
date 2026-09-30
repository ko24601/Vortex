import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

interface ConfirmationScreenProps {
  onReturnHome: () => void;
}

export default function ConfirmationScreen({ onReturnHome }: ConfirmationScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.successIcon}>
          <Text style={{ fontSize: 32 }}>✓</Text>
        </View>
        <Text style={styles.title}>Order Placed Successfully!</Text>
        <Text style={styles.sub}>
          Thank you for shopping with Vortex. Your order has been securely saved to Firebase Firestore and is currently processing.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={onReturnHome}>
          <Text style={styles.btnText}>Return to Store</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  card: { alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#f1f5f9' },
  successIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#ecfdf5', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  sub: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  btn: { width: '100%', backgroundColor: '#171717', borderRadius: 12, height: 48, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 }
});