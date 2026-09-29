import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
}

interface BasketScreenProps {
  basket: { [key: string]: number };
  products: Product[];
  coupons?: any[];
  onUpdateBasket: (newBasket: { [key: string]: number }) => void;
  onProceedToCheckout: () => void;
}

export default function BasketScreen({
  basket,
  products,
  onUpdateBasket,
  onProceedToCheckout,
}: BasketScreenProps) {
  // Map basket keys to full product objects
  const basketItems = Object.keys(basket)
    .map((id) => {
      const product = products.find((p) => p.id === id);
      const quantity = basket[id];
      if (!product || !quantity || quantity <= 0) return null;
      return { ...product, quantity };
    })
    .filter(Boolean) as (Product & { quantity: number })[];

  const handleIncrease = (id: string, currentQty: number) => {
    const updated = { ...basket, [id]: currentQty + 1 };
    onUpdateBasket(updated);
  };

  const handleDecrease = (id: string, currentQty: number) => {
    const updated = { ...basket };
    if (currentQty > 1) {
      updated[id] = currentQty - 1;
    } else {
      delete updated[id]; // Purge key when qty reaches 0
    }
    onUpdateBasket(updated);
  };

  const handleRemove = (id: string) => {
    const updated = { ...basket };
    delete updated[id]; // Purge key completely
    onUpdateBasket(updated);
  };

  const subtotal = basketItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (basketItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🛍️</Text>
        <Text style={styles.emptyTitle}>Your Basket is Empty</Text>
        <Text style={styles.emptySub}>
          Explore our collection and add your favorite items.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.headerTitle}>Your Basket</Text>

        {basketItems.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            <Image source={{ uri: item.image }} style={styles.itemImage} />

            <View style={styles.itemDetails}>
              <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.itemPrice}>€{(item.price * item.quantity).toFixed(2)}</Text>

              {/* Quantity Stepper Row */}
              <View style={styles.stepperRow}>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => handleDecrease(item.id, item.quantity)}
                  >
                    <Text style={styles.stepperBtnText}>-</Text>
                  </TouchableOpacity>

                  <Text style={styles.stepperVal}>{item.quantity}</Text>

                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => handleIncrease(item.id, item.quantity)}
                  >
                    <Text style={styles.stepperBtnText}>+</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleRemove(item.id)}
                >
                  <Text style={styles.deleteBtnText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}

        {/* Pricing Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryVal}>€{subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={styles.summaryValFree}>FREE</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalVal}>€{subtotal.toFixed(2)}</Text>
          </View>

          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={onProceedToCheckout}
          >
            <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#ffffff', marginBottom: 16 },
  
  emptyContainer: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: '#ffffff', fontSize: 20, fontWeight: '800', marginBottom: 6 },
  emptySub: { color: '#737373', fontSize: 13, textAlign: 'center' },

  itemCard: { flexDirection: 'row', backgroundColor: '#171717', borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#262626' },
  itemImage: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#262626' },
  itemDetails: { flex: 1, marginLeft: 12, justifyContent: 'space-between' },
  itemName: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  itemPrice: { color: '#d97706', fontSize: 15, fontWeight: '900', marginVertical: 4 },

  stepperRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a0a0a', borderRadius: 8, borderWidth: 1, borderColor: '#262626' },
  stepperBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  stepperBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  stepperVal: { color: '#ffffff', fontSize: 13, fontWeight: '800', paddingHorizontal: 8 },
  deleteBtn: { padding: 6 },
  deleteBtnText: { fontSize: 16 },

  summaryCard: { backgroundColor: '#171717', borderRadius: 16, padding: 16, marginTop: 12, borderWidth: 1, borderColor: '#262626' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { color: '#a3a3a3', fontSize: 13 },
  summaryVal: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  summaryValFree: { color: '#10b981', fontSize: 13, fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#262626', marginVertical: 10 },
  totalLabel: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  totalVal: { color: '#d97706', fontSize: 18, fontWeight: '900' },
  checkoutBtn: { backgroundColor: '#d97706', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  checkoutBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 15 },
});