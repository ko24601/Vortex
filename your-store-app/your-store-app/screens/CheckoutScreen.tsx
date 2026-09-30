import React, { useState, useEffect, useRef } from 'react';
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

  // Dynamic Pickup Location State from Firestore
  const [pickupAddress, setPickupAddress] = useState('Loading pickup location...');

  // Interactive Coupon State
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  // PayPal SDK States
  const [isSdkReady, setIsSdkReady] = useState(false);
  const paypalButtonContainerRef = useRef<HTMLDivElement>(null);

  // Calculations
  const basketSubtotal = Object.entries(basket).reduce((sum, [id, qty]) => {
    const p = products.find((item) => item.id === id);
    return sum + (p ? p.price * qty : 0);
  }, 0);

  const discountPercent = appliedCoupon ? appliedCoupon.discountPercent : 0;
  const discountAmount = (basketSubtotal * discountPercent) / 100;
  const finalTotal = Math.max(0, basketSubtotal - discountAmount);

  // Fetch with timeout helper
  const fetchWithTimeout = async (url: string, options: any, timeoutMs = 10000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  };

  // Final checkout action handler
  const handleFinalCheckout = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      Alert.alert('Incomplete Fields', 'Please provide your name and phone number.');
      return;
    }

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

      await addDoc(collection(db, 'orders'), {
        orderReference: orderRef,
        fulfillment: fulfillmentType,
        paymentMethod: paymentMethod,
        paymentStatus: paymentMethod === 'card' ? 'Paid (Simulated)' : 'Pending',
        couponApplied: appliedCoupon ? appliedCoupon.code : null,
        discountPercent: discountPercent,
        userId: user?.uid || null,
        customer: {
          name: customerName.trim(),
          phone: customerPhone.trim(),
          address: fulfillmentType === 'delivery' ? customerAddress.trim() : `Pickup: ${pickupAddress}`,
          city: fulfillmentType === 'delivery' ? customerCity.trim() : 'N/A',
        },
        items: orderedItems,
        subtotal: basketSubtotal,
        discount: discountAmount,
        total: finalTotal,
        createdAt: Date.now(),
        status: 'Processing'
      });

      onOrderPlaced(orderRef);
    } catch (error) {
      console.error('Order submission error:', error);
      Alert.alert('Order Failed', 'Could not process your order at this time. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Automatically apply the first active coupon on mount if available
  useEffect(() => {
    if (coupons && coupons.length > 0 && !appliedCoupon) {
      setAppliedCoupon(coupons[0]);
    }
  }, [coupons]);

  // Fetch store pickup location from Firestore on mount
  useEffect(() => {
    const fetchPickupLocation = async () => {
      try {
        const configDoc = await getDoc(doc(db, 'settings', 'storeConfig'));
        if (configDoc.exists() && configDoc.data().pickupAddress) {
          setPickupAddress(configDoc.data().pickupAddress);
        } else {
          setPickupAddress('Vortex Storefront, Av. Principal 45, Madrid, Spain.');
        }
      } catch (error) {
        console.error('Error fetching pickup location:', error);
        setPickupAddress('Vortex Storefront, Av. Principal 45, Madrid, Spain.');
      }
    };

    fetchPickupLocation();
  }, []);

  // Load standard PayPal JS SDK dynamically on Web
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const clientId = 'BAARoya-d5jvDgZnul81zlpCxLemLlZg46j5q2vm1SFrUwl5OQxfISaYhl_grQvFCTI0Mcpd92ifh-xc8';
    const scriptId = 'paypal-sdk-standard';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=EUR`;
      script.async = true;
      script.onload = () => setIsSdkReady(true);
      document.body.appendChild(script);
    } else {
      if ((window as any).paypal) {
        setIsSdkReady(true);
      }
    }
  }, []);

  // Render standard PayPal Buttons when container and SDK are ready
  useEffectRef: {
    // handled inside standard effect below
  }

  useEffect(() => {
    if (Platform.OS !== 'web' || paymentMethod !== 'card' || !isSdkReady) return;

    let isMounted = true;
    const renderPayPalButtons = () => {
      try {
        if (!paypalButtonContainerRef.current) return;
        paypalButtonContainerRef.current.innerHTML = ''; // Clear container

        if ((window as any).paypal && (window as any).paypal.Buttons) {
          (window as any).paypal.Buttons({
            createOrder: (_data: any, actions: any) => {
              return actions.order.create({
                purchase_units: [
                  {
                    amount: {
                      value: finalTotal.toFixed(2),
                    },
                  },
                ],
              });
            },
            onApprove: async (_data: any, actions: any) => {
              try {
                setIsSubmitting(true);
                const orderData = await actions.order.capture();
                
                // Optional backend verification call
                try {
                  await fetchWithTimeout(
                    'https://verifypaypalpayment-n7mesbuj3q-uc.a.run.app',
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ orderID: orderData.id }),
                    },
                    10000
                  );
                } catch (verifyErr) {
                  console.warn('Backend verification warning (proceeding anyway):', verifyErr);
                }

                if (!isMounted) return;
                await storage.setItem('@store_payment_success_v2', 'true');
                await storage.setItem('@store_basket_v2', JSON.stringify({}));
                await handleFinalCheckout();
              } catch (err: any) {
                console.error('Capture error:', err);
                Alert.alert('Payment Error', 'Payment could not be completed.');
              } finally {
                if (isMounted) setIsSubmitting(false);
              }
            },
            onCancel: () => {
              if (isMounted) setIsSubmitting(false);
            },
            onError: (err: any) => {
              console.error('PayPal Buttons Error:', err);
              Alert.alert('Error', 'An error occurred during PayPal checkout.');
            }
          }).render(paypalButtonContainerRef.current);
        }
      } catch (error) {
        console.error('Error rendering standard PayPal buttons:', error);
      }
    };

    renderPayPalButtons();

    return () => {
      isMounted = false;
    };
  }, [isSdkReady, paymentMethod, finalTotal]);

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

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
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
            <Text style={[styles.toggleText, paymentMethod === 'card' && styles.activeToggleText]}>💳 Pay with PayPal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleOption, paymentMethod === 'cash' && styles.activeToggle]}
            onPress={() => setPaymentMethod('cash')}
          >
            <Text style={[styles.toggleText, paymentMethod === 'cash' && styles.activeToggleText]}>💵 Cash</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} placeholder="Jane Doe" placeholderTextColor="#9ca3af" value={customerName} onChangeText={setCustomerName} />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput style={styles.input} placeholder="+34 600 000 000" placeholderTextColor="#9ca3af" keyboardType="phone-pad" value={customerPhone} onChangeText={setCustomerPhone} />

        {fulfillmentType === 'delivery' ? (
          <>
            <Text style={styles.label}>Delivery Street Address</Text>
            <TextInput style={styles.input} placeholder="Calle San Jose" placeholderTextColor="#9ca3af" value={customerAddress} onChangeText={setCustomerAddress} />

            <Text style={styles.label}>City / Postal Code</Text>
            <TextInput style={styles.input} placeholder="Madrid, 87952" placeholderTextColor="#9ca3af" value={customerCity} onChangeText={setCustomerCity} />
          </>
        ) : (
          <View style={styles.pickupBox}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 4 }}>📍 Selected Pickup Location:</Text>
            <Text style={{ fontSize: 12, color: '#475569', lineHeight: 18 }}>{pickupAddress}</Text>
          </View>
        )}

        {/* Interactive Coupon Code Section */}
        <Text style={styles.label}>Discount Coupon</Text>
        {appliedCoupon ? (
          <View style={styles.appliedCouponRow}>
            <View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#10b981' }}>{appliedCoupon.code} Applied</Text>
              <Text style={{ fontSize: 11, color: '#64748b' }}>{appliedCoupon.discountPercent}% discount active</Text>
            </View>
            <TouchableOpacity onPress={handleRemoveCoupon}>
              <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 13 }}>Remove</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.couponInputRow}>
            <TextInput
              style={[styles.input, { flex: 1, height: 42, marginBottom: 0 }]}
              placeholder="Enter coupon code"
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
              value={couponInput}
              onChangeText={setCouponInput}
            />
            <TouchableOpacity style={styles.applyCouponBtn} onPress={handleApplyCoupon}>
              <Text style={styles.applyCouponBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Pricing Summary Box */}
        <View style={styles.sumBox}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: '#64748b', fontSize: 13 }}>Subtotal</Text>
            <Text style={{ color: '#0f172a', fontWeight: '600', fontSize: 13 }}>€{basketSubtotal.toFixed(2)}</Text>
          </View>

          {appliedCoupon && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ color: '#10b981', fontSize: 13, fontWeight: '700' }}>Discount ({appliedCoupon.code})</Text>
              <Text style={{ color: '#10b981', fontWeight: '700', fontSize: 13 }}>-€{discountAmount.toFixed(2)}</Text>
            </View>
          )}

          <View style={{ height: 1, backgroundColor: '#e2e8f0', marginVertical: 8 }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: '#0f172a', fontWeight: '700' }}>Total Amount</Text>
            <Text style={{ fontWeight: '900', color: '#d97706', fontSize: 18 }}>€{finalTotal.toFixed(2)}</Text>
          </View>
        </View>

        {/* Terms & Conditions Agreement Notice */}
        <View style={styles.termsNoticeContainer}>
          <Text style={styles.termsNoticeText}>By placing your order, you agree to our </Text>
          <TouchableOpacity onPress={onOpenTerms}>
            <Text style={styles.termsLinkText}>Terms & Conditions</Text>
          </TouchableOpacity>
        </View>

        {/* PayPal Buttons container (Web) or cash button fallback */}
        {paymentMethod === 'card' && Platform.OS === 'web' ? (
          <View style={{ marginTop: 16, zIndex: 0 }}>
            <div ref={paypalButtonContainerRef} style={{ width: '100%', minHeight: 45 }} />
          </View>
        ) : (
          <TouchableOpacity style={[styles.btn, { opacity: isSubmitting ? 0.7 : 1 }]} onPress={handleFinalCheckout} disabled={isSubmitting}>
            {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Place Order</Text>}
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={onBackToBasket} style={{ marginTop: 14, alignItems: 'center' }}>
          <Text style={{ color: '#64748b', fontWeight: '600' }}>← Back to Basket</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  sheet: { backgroundColor: '#ffffff', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  sub: { fontSize: 13, color: '#64748b', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6, marginTop: 12 },
  input: { width: '100%', height: 42, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, backgroundColor: '#f8fafc', color: '#0f172a' },
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleOption: { flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, alignItems: 'center', backgroundColor: '#f8fafc' },
  activeToggle: { backgroundColor: '#171717', borderColor: '#171717' },
  toggleText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  activeToggleText: { color: '#ffffff' },
  pickupBox: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, marginTop: 12, borderWidth: 1, borderColor: '#e2e8f0' },

  couponInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  applyCouponBtn: { backgroundColor: '#171717', height: 42, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  applyCouponBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  appliedCouponRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0fdf4', padding: 12, borderRadius: '8px' as any, borderWidth: 1, borderColor: '#bbf7d0', marginTop: 4 },

  sumBox: { backgroundColor: '#f8fafc', padding: 14, borderRadius: 12, marginTop: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  termsNoticeContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 14, alignItems: 'center' },
  termsNoticeText: { fontSize: 12, color: '#64748b' },
  termsLinkText: { fontSize: 12, color: '#d97706', fontWeight: '700', textDecorationLine: 'underline' },
  btn: { width: '100%', backgroundColor: '#171717', borderRadius: 12, height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 }
});