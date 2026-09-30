import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';

interface Props {
  visible: boolean;
  onClose: () => void;
  userEmail?: string;
  isAdmin: boolean;
}

export default function PreferencesModal({ visible, onClose, userEmail, isAdmin }: Props) {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      onClose();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.headerRow}>
            <Text style={styles.modalTitle}>Account Preferences</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24.5} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="person-circle-outline" size={48} color="#ff8c00" />
            <Text style={styles.emailText}>{userEmail || 'Signed in user'}</Text>
            <View style={[styles.badge, isAdmin ? styles.adminBadge : styles.userBadge]}>
              <Text style={styles.badgeText}>{isAdmin ? 'Administrator' : 'Standard Customer'}</Text>
            </View>
          </View>

          <View style={styles.optionsList}>
            <TouchableOpacity style={styles.optionRow}>
              <Ionicons name="notifications-outline" size={20} color="#ffffff" />
              <Text style={styles.optionText}>Push Notifications</Text>
              <Ionicons name="chevron-forward" size={18} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionRow}>
              <Ionicons name="shield-outline" size={20} color="#ffffff" />
              <Text style={styles.optionText}>Privacy & Security</Text>
              <Ionicons name="chevron-forward" size={18} color="#666" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color="#ff4444" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: '50%',
    borderWidth: 1,
    borderColor: '#222',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  infoCard: {
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  emailText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
  },
  badge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  adminBadge: {
    backgroundColor: 'rgba(255, 140, 0, 0.2)',
  },
  userBadge: {
    backgroundColor: 'rgba(100, 100, 100, 0.2)',
  },
  badgeText: {
    color: '#ff8c00',
    fontSize: 12,
    fontWeight: 'bold',
  },
  optionsList: {
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  optionText: {
    color: '#ffffff',
    fontSize: 15,
    flex: 1,
    marginLeft: 14,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  signOutText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});