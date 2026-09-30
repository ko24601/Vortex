import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, writeBatch, getDocs } from 'firebase/firestore';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read?: boolean;
  createdAt?: any;
}

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  userId?: string; // Pass the current user's ID to fetch targeted alerts
}

export default function NotificationsModal({
  visible,
  onClose,
  userId,
}: NotificationsModalProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!visible) return;

    setLoading(true);
    // Query notifications collection, optionally filtered by user or general broadcasts
    const notifsRef = collection(db, 'notifications');
    const q = userId 
      ? query(notifsRef, where('userId', 'in', [userId, 'all']), orderBy('createdAt', 'desc'))
      : query(notifsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotes: NotificationItem[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        // Format timestamp if available
        const timeAgo = data.createdAt?.toDate 
          ? formatTimeAgo(data.createdAt.toDate()) 
          : 'Recent';

        return {
          id: docSnap.id,
          title: data.title || 'Alert',
          message: data.message || '',
          time: timeAgo,
          read: data.read || false,
        };
      });

      setNotifications(fetchedNotes);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching notifications: ', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [visible, userId]);

  const handleMarkAllAsRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications.forEach((item) => {
        if (!item.read) {
          const ref = doc(db, 'notifications', item.id);
          batch.update(ref, { read: true });
        }
      });
      await batch.commit();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  // Simple helper to format dates nicely
  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + 'y ago';
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + 'mo ago';
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + 'd ago';
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + 'h ago';
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + 'm ago';
    return 'Just now';
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.modalTitle}>Notifications</Text>
              <Text style={styles.modalSub}>Stay updated with your latest alerts</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Action Row */}
          {notifications.some(n => !n.read) && (
            <TouchableOpacity style={styles.markReadBtn} onPress={handleMarkAllAsRead}>
              <Text style={styles.markReadText}>Mark all as read</Text>
            </TouchableOpacity>
          )}

          {/* Notification List */}
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>Loading alerts...</Text>
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🔔</Text>
                <Text style={styles.emptyTitle}>No notifications yet</Text>
                <Text style={styles.emptySub}>We will notify you when something important arrives.</Text>
              </View>
            ) : (
              notifications.map((item) => (
                <View key={item.id} style={[styles.notificationCard, !item.read && styles.unreadCard]}>
                  <View style={styles.notificationHeader}>
                    <Text style={styles.notifTitle}>{item.title}</Text>
                    <Text style={styles.notifTime}>{item.time}</Text>
                  </View>
                  <Text style={styles.notifMessage}>{item.message}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderTopColor: '#262626',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 2,
  },
  modalSub: {
    fontSize: 12,
    color: '#a3a3a3',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1f1f1f',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262626',
  },
  closeBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  markReadBtn: {
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  markReadText: {
    color: '#d97706',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  notificationCard: {
    backgroundColor: '#181818',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#262626',
  },
  unreadCard: {
    borderColor: '#d97706',
    backgroundColor: '#1f1a14',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  notifTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  notifTime: {
    color: '#737373',
    fontSize: 11,
    fontWeight: '600',
  },
  notifMessage: {
    color: '#d4d4d4',
    fontSize: 13,
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptySub: {
    color: '#737373',
    fontSize: 12,
    textAlign: 'center',
  },
});