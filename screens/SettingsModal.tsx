import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Switch, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { storage } from '../utils/storage';

interface SettingsScreenProps {
  user: any;
  isAdminUser?: boolean;
  onSignOut: () => void;
  onNavigateAdmin?: () => void;
  onReturnHome: () => void;
}

export default function SettingsScreen({ onReturnHome }: SettingsScreenProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(true);
  const [soundFXEnabled, setSoundFXEnabled] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);

  // Load saved preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const notif = await storage.getItem('@pref_notifications');
      const dark = await storage.getItem('@pref_dark_mode');
      const sound = await storage.getItem('@pref_sound_fx');

      if (notif !== null) setNotificationsEnabled(JSON.parse(notif));
      if (dark !== null) setDarkModeEnabled(JSON.parse(dark));
      if (sound !== null) setSoundFXEnabled(JSON.parse(sound));
    } catch (e) {
      console.error('Failed to load preferences', e);
    }
  };

  const handleToggleNotification = async (val: boolean) => {
    setNotificationsEnabled(val);
    await storage.setItem('@pref_notifications', JSON.stringify(val));
  };

  const handleToggleDarkMode = async (val: boolean) => {
    setDarkModeEnabled(val);
    await storage.setItem('@pref_dark_mode', JSON.stringify(val));
  };

  const handleToggleSoundFX = async (val: boolean) => {
    setSoundFXEnabled(val);
    await storage.setItem('@pref_sound_fx', JSON.stringify(val));
  };

  return (
    <View style={styles.container}>
      {/* Header with working back/exit button */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onReturnHome} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preferences & Settings</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Section: General */}
        <Text style={styles.sectionHeader}>App Preferences</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications-outline" size={20} color="#d97706" style={styles.settingIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingTitle}>Push Notifications</Text>
                <Text style={styles.settingDesc}>Receive order updates and exclusive drop alerts</Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotification}
              trackColor={{ false: '#262626', true: '#d97706' }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="moon-outline" size={20} color="#d97706" style={styles.settingIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingTitle}>Dark Theme</Text>
                <Text style={styles.settingDesc}>Optimized for low-light environments</Text>
              </View>
            </View>
            <Switch
              value={darkModeEnabled}
              onValueChange={handleToggleDarkMode}
              trackColor={{ false: '#262626', true: '#d97706' }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="musical-notes-outline" size={20} color="#d97706" style={styles.settingIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingTitle}>Interface Sound FX</Text>
                <Text style={styles.settingDesc}>Play audio feedback on interactions</Text>
              </View>
            </View>
            <Switch
              value={soundFXEnabled}
              onValueChange={handleToggleSoundFX}
              trackColor={{ false: '#262626', true: '#d97706' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Section: System & Support */}
        <Text style={styles.sectionHeader}>System & Support</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.7}
            onPress={() => setTermsModalVisible(true)}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#a3a3a3" style={styles.settingIcon} />
              <Text style={styles.actionText}>Privacy Policy & Terms</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#737373" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.actionRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="information-circle-outline" size={20} color="#a3a3a3" style={styles.settingIcon} />
              <Text style={styles.actionText}>App Version (v1.2.0)</Text>
            </View>
          </View>
        </View>

        {/* Return Button */}
        <TouchableOpacity style={styles.returnBtn} onPress={onReturnHome} activeOpacity={0.8}>
          <Text style={styles.returnBtnText}>Save & Return</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Privacy Policy & Terms Modal */}
      <Modal
        visible={termsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTermsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Privacy Policy & Terms</Text>
              <TouchableOpacity onPress={() => setTermsModalVisible(false)}>
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.modalTextBold}>1. Data Collection</Text>
              <Text style={styles.modalText}>
                We collect essential account data (such as email addresses and authentication tokens via Firebase) strictly for maintaining your user profile, order history, and preferences.
              </Text>

              <Text style={styles.modalTextBold}>2. Security & Admin Privileges</Text>
              <Text style={styles.modalText}>
                Admin access is regulated through secure Firestore database flags. Unauthorized tampering with database permissions is strictly prohibited.
              </Text>

              <Text style={styles.modalTextBold}>3. Terms of Service</Text>
              <Text style={styles.modalText}>
                By utilizing this application, you agree to abide by all platform rules, product purchase conditions, and community guidelines. All transactions and digital preferences are securely synchronized.
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setTermsModalVisible(false)}
            >
              <Text style={styles.modalCloseBtnText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    backgroundColor: '#0a0a0a',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#171717',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262626',
  },
  headerTitle: { color: '#ffffff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  sectionHeader: {
    color: '#737373',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 16,
    paddingLeft: 4,
  },
  card: { backgroundColor: '#171717', borderRadius: 16, borderWidth: 1, borderColor: '#262626', overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  settingInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 12 },
  settingIcon: { marginRight: 14 },
  settingTitle: { color: '#ffffff', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  settingDesc: { color: '#737373', fontSize: 11, lineHeight: 15 },
  actionText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#222222', marginLeft: 50 },
  returnBtn: {
    backgroundColor: '#d97706',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  returnBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#171717',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
    paddingBottom: 12,
  },
  modalTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  modalTextBold: { color: '#ffffff', fontSize: 13, fontWeight: '700', marginTop: 12, marginBottom: 4 },
  modalText: { color: '#a3a3a3', fontSize: 12, lineHeight: 18 },
  modalCloseBtn: {
    backgroundColor: '#d97706',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  modalCloseBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
});