import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TermsScreen({ navigation }) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#D4AF37" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TERMS & CONDITIONS</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Last Updated: September 2026</Text>

        <Text style={styles.sectionTitle}>1. Introduction</Text>
        <Text style={styles.bodyText}>
          Welcome to Vortex. By accessing our mobile application and purchasing our products, you agree to be bound by these Terms and Conditions. Please read them carefully before making any transactions.
        </Text>

        <Text style={styles.sectionTitle}>2. Luxury Goods & Authenticity</Text>
        <Text style={styles.bodyText}>
          Vortex curates exclusive, high-end luxury items. All product descriptions, imagery, and specifications are presented with utmost accuracy. We reserve the right to limit quantities of any products or services that we offer.
        </Text>

        <Text style={styles.sectionTitle}>3. Purchases & Payments</Text>
        <Text style={styles.bodyText}>
          All orders are subject to availability and confirmation of the order price. Transactions processed through our checkout system are secure. We reserve the right to refuse any order placed with us.
        </Text>

        <Text style={styles.sectionTitle}>4. Shipping & Delivery</Text>
        <Text style={styles.bodyText}>
          Delivery times may vary depending on your shipping address and selected courier service. Vortex is not responsible for delays caused by customs clearance or courier operational issues.
        </Text>

        <Text style={styles.sectionTitle}>5. Returns & Refunds</Text>
        <Text style={styles.bodyText}>
          Due to the exclusive nature of our luxury inventory, returns are handled on a case-by-case basis within 14 days of delivery. Items must be unworn, unused, and in their original packaging with all security tags attached.
        </Text>

        <Text style={styles.sectionTitle}>6. Privacy Policy</Text>
        <Text style={styles.bodyText}>
          Your submission of personal information through the store is governed by our Privacy Policy. We utilize secure encryption to protect your data and never share your credentials with unauthorized third parties.
        </Text>

        <Text style={styles.sectionTitle}>7. Contact Information</Text>
        <Text style={styles.bodyText}>
          For any inquiries, legal notices, or support questions regarding these terms, please contact our concierge team directly through the app support portal.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#D4AF37',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  lastUpdated: {
    color: '#666666',
    fontSize: 12,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
    letterSpacing: 1,
  },
  bodyText: {
    color: '#AAAAAA',
    fontSize: 14,
    lineHeight: 22,
  },
});