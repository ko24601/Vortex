import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { getUserOrders } from '../services/orderService';

export const OrderHistoryScreen = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    const fetched = await getUserOrders();
    setOrders(fetched);
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#d97706" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Orders</Text>
      {orders.length === 0 ? (
        <Text style={styles.emptyText}>No orders found.</Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id || Math.random().toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.orderId}>Order #{item.id?.slice(0, 8)}</Text>
                <Text style={[styles.status, { color: item.status === 'Delivered' ? '#10b981' : '#d97706' }]}>
                  {item.status}
                </Text>
              </View>
              <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              <Text style={styles.total}>Total: €{item.totalAmount.toFixed(2)}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', padding: 16 },
  center: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 16 },
  emptyText: { color: '#737373', textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: '#171717', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#262626' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  orderId: { color: '#ffffff', fontWeight: '800' },
  status: { fontWeight: '800', fontSize: 12 },
  date: { color: '#737373', fontSize: 12, marginBottom: 8 },
  total: { color: '#ffffff', fontWeight: '700', fontSize: 14 }
});