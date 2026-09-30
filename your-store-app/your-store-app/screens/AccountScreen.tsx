import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface AccountScreenProps {
  user?: any;
  isAdminUser?: boolean;
  onSignOut: () => void;
  onNavigateSettings?: () => void;
  onNavigateAdmin?: () => void;
  onNavigateAuth?: () => void;
  onReturnHome?: () => void;
}

export default function AccountScreen({ 
  user: propUser, 
  isAdminUser,
  onSignOut, 
  onNavigateSettings, 
  onNavigateAdmin,
  onNavigateAuth 
}: AccountScreenProps) {
  // Fix: Track authentication state locally to prevent crashes and sync properly
  const [currentUser, setCurrentUser] = useState<any>(propUser || auth.currentUser);
  const [authLoading, setAuthLoading] = useState(!propUser);

  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Keep local user state synchronized with Firebase auth changes
  useEffect(() => {
    if (propUser) {
      setCurrentUser(propUser);
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [propUser]);

  // Fetch orders specific to the logged-in user in real-time
  useEffect(() => {
    if (authLoading) {
      setLoadingOrders(true);
      return;
    }

    if (!currentUser || !currentUser.uid) {
      setUserOrders([]);
      setLoadingOrders(false);
      return;
    }

    const q = query(collection(db, 'orders'), where('userId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      orders.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
      setUserOrders(orders);
      setLoadingOrders(false);
    }, (error) => {
      console.error('Error fetching user orders:', error);
      setLoadingOrders(false);
    });

    return () => unsubscribe();
  }, [currentUser, authLoading]);

  // Show a loading screen while resolving authentication status
  if (authLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#d97706" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {currentUser ? (
          /* --- LOGGED IN FULL SCREEN VIEW --- */
          <View style={styles.card}>
            <View style={styles.avatarBox}>
              <Ionicons name="person" size={36} color="#d97706" />
            </View>
            <Text style={styles.welcomeText}>Welcome Back</Text>
            <Text style={styles.emailText}>{currentUser.email || 'VIP Member'}</Text>

            {isAdminUser && (
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>🛡️ Admin Account</Text>
              </View>
            )}

            <View style={styles.actionList}>
              {isAdminUser && onNavigateAdmin && (
                <TouchableOpacity style={styles.actionBtn} onPress={onNavigateAdmin}>
                  <Ionicons name="settings-outline" size={18} color="#ffffff" />
                  <Text style={styles.actionBtnText}>Developer / Admin Dashboard</Text>
                </TouchableOpacity>
              )}

              {onNavigateSettings && (
                <TouchableOpacity style={styles.actionBtn} onPress={onNavigateSettings}>
                  <Ionicons name="options-outline" size={18} color="#ffffff" />
                  <Text style={styles.actionBtnText}>Preferences & Settings</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* --- ORDER HISTORY SECTION --- */}
            <View style={styles.ordersSection}>
              <Text style={styles.sectionTitle}>📦 My Order History</Text>
              
              {loadingOrders ? (
                <ActivityIndicator color="#d97706" style={{ marginVertical: 14 }} />
              ) : userOrders.length === 0 ? (
                <View style={styles.emptyOrdersBox}>
                  <Text style={styles.emptyOrdersText}>No past orders found for this account.</Text>
                </View>
              ) : (
                userOrders.map((order) => {
                  const status = order.status || order.deliveryStatus || 'Processing';
                  const customer = order.customer || {};
                  const orderDate = order.createdAt ? new Date(order.createdAt) : null;

                  return (
                    <View key={order.id} style={styles.orderCard}>
                      <View style={styles.orderCardHeader}>
                        <Text style={styles.orderRef}>#{order.orderReference || order.id.slice(0, 8)}</Text>
                        <View style={[styles.statusTag, status === 'Delivered' ? styles.statusDelivered : styles.statusPending]}>
                          <Text style={[styles.statusTagText, status === 'Delivered' ? styles.textDelivered : styles.textPending]}>
                            {status}
                          </Text>
                        </View>
                      </View>

                      {/* Customer Information */}
                      <Text style={styles.orderMeta}>
                        Customer: {customer.name || 'N/A'}
                      </Text>
                      <Text style={styles.orderMeta}>
                        Phone: {customer.phone || 'N/A'}
                      </Text>

                      {/* Order Details */}
                      <Text style={styles.orderMeta}>Fulfillment: <Text style={{ color: '#ffffff', textTransform: 'capitalize' }}>{order.fulfillment || 'Delivery'}</Text></Text>
                      <Text style={styles.orderMeta}>Payment: <Text style={{ color: '#ffffff', textTransform: 'capitalize' }}>{order.paymentMethod === 'card' ? '💳 Card (PayPal)' : '💵 Cash'}</Text></Text>

                      {/* Pricing Summary */}
                      <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#2e2e2e' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ color: '#a3a3a3', fontSize: 11 }}>Subtotal</Text>
                          <Text style={{ fontWeight: '600', fontSize: 11 }}>€{order.subtotal?.toFixed(2) || '0.00'}</Text>
                        </View>
                        {order.discount && order.discount > 0 ? (
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ color: '#10b981', fontSize: 11 }}>Discount ({order.couponApplied || 'N/A'}%)</Text>
                            <Text style={{ color: '#10b981', fontWeight: '600', fontSize: 11 }}>
                              -€{order.discount.toFixed(2)}
                            </Text>
                          </View>
                        ) : null}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 11 }}>Total</Text>
                          <Text style={{ fontWeight: '800', fontSize: 12, color: '#d97706' }}>
                            €{order.total?.toFixed(2) || '0.00'}
                          </Text>
                        </View>
                        {orderDate && (
                          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 4 }}>
                            <Text style={{ color: '#888888', fontSize: 10 }}>
                              {orderDate.toLocaleDateString()} {orderDate.toLocaleTimeString()}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Items List */}
                      {order.items && order.items.length > 0 && (
                        <View style={{ marginTop: 8 }}>
                          <Text style={{ fontWeight: '600', marginBottom: 4, color: '#ffffff', fontSize: 11 }}>Items:</Text>
                          {order.items.map((item: any, idx: number) => (
                            <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                              <Text style={{ flex: 1, fontSize: 10, color: '#cccccc' }}>
                                • {item.productName} (x{item.quantity})
                              </Text>
                              <Text style={{ fontSize: 10, color: '#a3a3a3', textAlign: 'right' }}>
                                €{((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>

            <TouchableOpacity style={styles.signOutBtn} onPress={onSignOut}>
              <Text style={styles.signOutBtnText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* --- LOGGED OUT FULL SCREEN VIEW --- */
          <View style={styles.card}>
            <View style={styles.avatarBox}>
              <Ionicons name="lock-closed-outline" size={36} color="#d97706" />
            </View>
            <Text style={styles.welcomeText}>Account Access</Text>
            <Text style={styles.subText}>
              Sign in or create an account to manage orders, sync preferences, and access exclusive drops.
            </Text>

            <TouchableOpacity style={styles.primaryBtn} onPress={onNavigateAuth}>
              <Text style={styles.primaryBtnText}>Sign In or Sign Up</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#171717',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
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
  welcomeText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  emailText: {
    color: '#d97706',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 16,
  },
  adminBadge: {
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
    borderWidth: 1,
    borderColor: '#d97706',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  adminBadgeText: {
    color: '#d97706',
    fontSize: 12,
    fontWeight: '800',
  },
  subText: {
    color: '#a3a3a3',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  actionList: {
    width: '100%',
    marginBottom: 16,
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#212121',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#2e2e2e',
    gap: 12,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  ordersSection: {
    width: '100%',
    marginTop: 6,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  emptyOrdersBox: {
    backgroundColor: '#212121',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  emptyOrdersText: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '600',
  },
  orderCard: {
    backgroundColor: '#212121',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2e2e2e',
    marginBottom: 10,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderRef: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  statusTag: {
    propUser: undefined,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusDelivered: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusPending: {
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  textDelivered: {
    color: '#10b981',
  },
  textPending: {
    color: '#d97706',
  },
  orderMeta: {
    color: '#a3a3a3',
    fontSize: 12,
    marginBottom: 2,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#d97706',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  signOutBtn: {
    width: '100%',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  signOutBtnText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '800',
  },
});