import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { db } from '../firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { storage } from '../utils/storage';
import { Product, Coupon } from '../App';

interface CheckoutScreenProps {
  basket: { [key: string]: number };
  products: Product[];
  coupons?: Coupon[];
  onOrderPlaced: (refCode: string) => void;
  onBackToBasket: () => void;
  onOpenTerms: () => void;
  user?: any;
}

export default function CheckoutScreen({ basket, products, coupons = [], onOrderPlaced, onBackToBasket, onOpenTerms, user }: CheckoutScreenProps) {
  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pickupAddress, setPickupAddress] = useState('Loading pickup location...');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  // Calculations
  const basketSubtotal = Object.entries(basket).reduce((sum, [id, qty]) => {
    const p = products.find((item) => item.id === id);
    return sum + (p ? p.price * qty : 0);
  }, 0);

  const discountPercent = appliedCoupon ? appliedCoupon.discountPercent : 0;
  const discountAmount = (basketSubtotal * discountPercent) / 100;
  
  const cardFee = paymentMethod === 'card' ? 0.50 : 0;
  const finalTotal = Math.max(0, basketSubtotal - discountAmount + cardFee);

  const handleCheckout = async () => {
    if (fulfillmentType === 'delivery' && (!customerAddress.trim() || !customerCity.trim())) {
      Alert.alert('Address Missing', 'Please provide your delivery address and city.');
      return;
    }

    try {
      setIsSubmitting(true);
      const orderRef = `VT-${Math.floor(1000 + Math.random() * 9000)}`;

      const orderedItems = Object.entries(basket).map(([id, qty]) => {
        const prod = products.find(p => p.id === id);
        return {
          productId: id,
          productName: prod ? prod.name : 'Unknown Item',
          price: prod ? prod.price : 0,
          quantity: qty
        };
      });

      // Save order to Firestore first
      await addDoc(collection(db, 'orders'), {
        orderReference: orderRef,
        fulfillment: fulfillmentType,
        paymentMethod: paymentMethod,
        paymentStatus: paymentMethod === 'card' ? 'Pending Card (Stripe)' : 'Pending Cash',
        couponApplied: appliedCoupon ? appliedCoupon.code : null,
        discountPercent: discountPercent,
        userId: user?.uid || null,
        customer: {
          name: customerName.trim() || 'Guest Customer',
          phone: customerPhone.trim() || 'N/A',
          address: fulfillmentType === 'delivery' ? customerAddress.trim() : `Pickup: ${pickupAddress}`,
          city: fulfillmentType === 'delivery' ? customerCity.trim() : 'N/A',
        },
        items: orderedItems,
        subtotal: basketSubtotal,
        discount: discountAmount,
        fee: cardFee,
        total: finalTotal,
        createdAt: Date.now(),
        status: 'Processing'
      });

      await storage.setItem('@store_basket_v2', JSON.stringify({}));

      if (paymentMethod === 'card') {
        // Prepare items array for the dynamic Firebase function
        const checkoutPayloadItems = Object.entries(basket).map(([id, qty]) => {
          const prod = products.find(p => p.id === id);
          return {
            name: prod ? prod.name : 'Store Item',
            price: prod ? prod.price : 0,
            quantity: qty
          };
        });

        // Replace with your actual Firebase Cloud Function URL
        const functionUrl = 'https://us-central1-dads-ee515.cloudfunctions.net/createDynamicCheckout';
        
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: checkoutPayloadItems,
            successUrl: `https://ko24601.github.io/Vortex/?session_id=${orderRef}&success=true`,
            cancelUrl: `https://ko24601.github.io/Vortex/?canceled=true`
          })
        });

        const data = await response.json();

        if (data.url) {
          if (Platform.OS === 'web') {
            window.location.href = data.url; // Redirects browser directly to Stripe-hosted page
          } else {
            onOrderPlaced(orderRef);
          }
        } else {
          throw new Error(data.error || 'Failed to generate checkout session');
        }
      } else {
        onOrderPlaced(orderRef);
      }

    } catch (error) {
      console.error('Order submission error:', error);
      Alert.alert('Order Failed', 'Could not process your card payment session. Please try again.');
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (coupons && coupons.length > 0 && !appliedCoupon) {
      setAppliedCoupon(coupons[0]);
    }
  }, [coupons]);

  useEffect(() => {
    const fetchPickupLocation = async () => {
      try {
        const configDoc = await getDoc(doc(db, 'settings', 'storeConfig'));
        if (configDoc.exists() && configDoc.data().pickupAddress) {
          setPickupAddress(configDoc.data().pickupAddress);
        } else {
          setPickupAddress('Vortex Storefront, Roldán, Murcia, Spain.');
        }
      } catch (error) {
        console.error('Error fetching pickup location:', error);
        setPickupAddress('Vortex Storefront, Roldán, Murcia, Spain.');
      }
    };
    fetchPickupLocation();
  }, []);

  const handleApplyCoupon = () => {
    const trimmedCode = couponInput.trim().toUpperCase();
    if (!trimmedCode) return;
    const foundCoupon = coupons.find((c) => c.code.toUpperCase() === trimmedCode);
    if (foundCoupon) {
      setAppliedCoupon(foundCoupon);
      setCouponInput('');
      Alert.alert('Success', `Coupon ${foundCoupon.code} applied (${foundCoupon.discountPercent}% OFF)!`);
    } else {
      Alert.alert('Invalid Code', 'This coupon code does not exist or has expired.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.sheet}>
        <Text style={styles.title}>Checkout & Fulfillment</Text>
        <Text style={styles.sub}>Select your delivery preference and payment method.</Text>

        <Text style={styles.label}>Fulfillment Method</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleOption, fulfillmentType === 'delivery' && styles.activeToggle]}
            onPress={() => setFulfillmentType('delivery')}
          >
            <Text style={[styles.toggleText, fulfillmentType === 'delivery' && styles.activeToggleText]}>🚚 Delivery</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleOption, fulfillmentType === 'pickup' && styles.activeToggle]}
            onPress={() => setFulfillmentType('pickup')}
          >
            <Text style={[styles.toggleText, fulfillmentType === 'pickup' && styles.activeToggleText]}>🏬 Pickup</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Payment Method</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleOption, paymentMethod === 'card' && styles.activeToggle]}
            onPress={() => setPaymentMethod('card')}
          >
            <Text style={[styles.toggleText, paymentMethod === 'card' && styles.activeToggleText]}>💳 Pay with Card (Stripe)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleOption, paymentMethod === 'cash' && styles.activeToggle]}
            onPress={() => setPaymentMethod('cash')}
          >
            <Text style={[styles.toggleText, paymentMethod === 'cash' && styles.activeToggleText]}>💵 Cash</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Full Name (Optional)</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Jane Doe" 
          placeholderTextColor="#64748b" 
          value={customerName} 
          onChangeText={setCustomerName}
        />

        <Text style={styles.label}>Phone Number (Optional)</Text>
        <TextInput 
          style={styles.input} 
          placeholder="+34 600 000 000" 
          placeholderTextColor="#64748b" 
          keyboardType="phone-pad" 
          value={customerPhone} 
          onChangeText={setCustomerPhone}
        />

        {fulfillmentType === 'delivery' ? (
          <>
            <Text style={styles.label}>Delivery Street Address</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Calle Principal" 
              placeholderTextColor="#64748b" 
              value={customerAddress} 
              onChangeText={setCustomerAddress}
            />

            <Text style={styles.label}>City / Postal Code</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Murcia, 30709" 
              placeholderTextColor="#64748b" 
              value={customerCity} 
              onChangeText={setCustomerCity}
            />
          </>
        ) : (
          <View style={styles.pickupBox}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#f8fafc', marginBottom: 4 }}>📍 Selected Pickup Location:</Text>
            <Text style={{ fontSize: 12, color: '#94a3b8', lineHeight: 18 }}>{pickupAddress}</Text>
          </View>
        )}

        <Text style={styles.label}>Discount Coupon</Text>
        {appliedCoupon ? (
          <View style={styles.appliedCouponRow}>
            <View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#34d399' }}>{appliedCoupon.code} Applied</Text>
              <Text style={{ fontSize: 11, color: '#94a3b8' }}>{appliedCoupon.discountPercent}% discount active</Text>
            </View>
            <TouchableOpacity onPress={() => setAppliedCoupon(null)}>
              <Text style={{ color: '#f87171', fontWeight: 'bold', fontSize: 13 }}>Remove</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.couponInputRow}>
            <TextInput
              style={[styles.input, { flex: 1, height: 42, marginBottom: 0 }]}
              placeholder="Enter coupon code"
              placeholderTextColor="#64748b"
              autoCapitalize="characters"
              value={couponInput}
              onChangeText={setCouponInput}
            />
            <TouchableOpacity style={styles.applyCouponBtn} onPress={handleApplyCoupon}>
              <Text style={styles.applyCouponBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.sumBox}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: '#94a3b8', fontSize: 13 }}>Subtotal</Text>
            <Text style={{ color: '#f8fafc', fontWeight: '600', fontSize: 13 }}>€{basketSubtotal.toFixed(2)}</Text>
          </View>

          {appliedCoupon && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ color: '#34d399', fontSize: 13, fontWeight: '700' }}>Discount ({appliedCoupon.code})</Text>
              <Text style={{ color: '#34d399', fontWeight: '700', fontSize: 13 }}>-€{discountAmount.toFixed(2)}</Text>
            </View>
          )}

          {paymentMethod === 'card' && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ color: '#94a3b8', fontSize: 13 }}>Card Processing Fee</Text>
              <Text style={{ color: '#f8fafc', fontWeight: '600', fontSize: 13 }}>€{cardFee.toFixed(2)}</Text>
            </View>
          )}

          <View style={{ height: 1, backgroundColor: '#334155', marginVertical: 8 }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: '#f8fafc', fontWeight: '700' }}>Total Amount</Text>
            <Text style={{ fontWeight: '900', color: '#fbbf24', fontSize: 18 }}>€{finalTotal.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.termsNoticeContainer}>
          <Text style={styles.termsNoticeText}>By placing your order, you agree to our </Text>
          <TouchableOpacity onPress={onOpenTerms}>
            <Text style={styles.termsLinkText}>Terms & Conditions</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.btn, { opacity: isSubmitting ? 0.7 : 1 }]} 
          onPress={handleCheckout} 
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>
              {paymentMethod === 'card' ? 'Proceed to Secure Card Payment' : 'Place Order (Cash)'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={onBackToBasket} style={{ marginTop: 14, alignItems: 'center' }}>
          <Text style={{ color: '#94a3b8', fontWeight: '600' }}>← Back to Basket</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  sheet: { backgroundColor: '#111827', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#1f2937' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc', marginBottom: 4 },
  sub: { fontSize: 13, color: '#94a3b8', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', color: '#cbd5e1', marginBottom: 6, marginTop: 12 },
  input: { width: '100%', height: 42, paddingHorizontal: 12, borderWidth: 1, borderColor: '#374151', borderRadius: 8, backgroundColor: '#1f2937', color: '#f8fafc' },
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleOption: { flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: '#374151', borderRadius: 8, alignItems: 'center', backgroundColor: '#1f2937' },
  activeToggle: { backgroundColor: '#fbbf24', borderColor: '#fbbf24' },
  toggleText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  activeToggleText: { color: '#111827', fontWeight: '800' },
  pickupBox: { backgroundColor: '#1f2937', padding: 12, borderRadius: 8, marginTop: 12, borderWidth: 1, borderColor: '#374151' },
  couponInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  applyCouponBtn: { backgroundColor: '#374151', height: 42, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  applyCouponBtnText: { color: '#f8fafc', fontWeight: '800', fontSize: 13 },
  appliedCouponRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#064e3b', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#059669', marginTop: 4 },
  sumBox: { backgroundColor: '#1f2937', padding: 14, borderRadius: 12, marginTop: 16, borderWidth: 1, borderColor: '#374151' },
  termsNoticeContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 14, alignItems: 'center' },
  termsNoticeText: { fontSize: 12, color: '#94a3b8' },
  termsLinkText: { fontSize: 12, color: '#fbbf24', fontWeight: '700', textDecorationLine: 'underline' },
  btn: { width: '100%', backgroundColor: '#2563eb', borderRadius: 12, height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 }
});