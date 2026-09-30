import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
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
  const baseUrl = `${window.location.origin}${window.location.pathname}`;

  // Interactive Coupon State
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

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

  // Handle applying user-entered coupon code
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

  const basketSubtotal = Object.entries(basket).reduce((sum, [id, qty]) => {
    const p = products.find((item) => item.id === id);
    return sum + (p ? p.price * qty : 0);
  }, 0);

  const discountPercent = appliedCoupon ? appliedCoupon.discountPercent : 0;
  const discountAmount = (basketSubtotal * discountPercent) / 100;
  const finalTotal = Math.max(0, basketSubtotal - discountAmount);

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
        userId: user?.uid || null, // Add userId if user is logged in
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

  // Helper function for fetch with timeout
  const fetchWithTimeout = async (url, options, timeoutMs = 10000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
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
            <TextInput style={styles.input} placeholder="Madird, 87952" placeholderTextColor="#9ca3af" value={customerCity} onChangeText={setCustomerCity} />
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

        {paymentMethod === 'card' && Platform.OS === 'web' ? (
          <View style={{ marginTop: 16, zIndex: 0 }}>
            <PayPalScriptProvider options={{ "clientId": "BAARoya-d5jvDgZnul81zlpCxLemLlZg46j5q2vm1SFrUwl5OQxfISaYhl_grQvFCTI0Mcpd92ifh-xc8", currency: "EUR" }}>
              <PayPalButtons
                style={{ layout: "vertical", color: "black", shape: "rect" }}
                onClick={(data, actions) => {
                  if (!customerName.trim() || !customerPhone.trim()) {
                    Alert.alert('Incomplete Fields', 'Please provide your name and phone number.');
                    return actions.reject();
                  }
                  if (fulfillmentType === 'delivery' && (!customerAddress.trim() || !customerCity.trim())) {
                    Alert.alert('Address Missing', 'Please provide your delivery address and city.');
                    return actions.reject();
                  }
                  return actions.resolve();
                }}
                createOrder={(data, actions) => {
                  // Build item list for PayPal so the buyer can see exactly what they ordered
                  const paypalItems = Object.entries(basket).map(([id, qty]) => {
                    const prod = products.find(p => p.id === id);
                    return {
                      name: prod ? prod.name : 'Item',
                      unit_amount: {
                        currency_code: 'EUR',
                        value: prod ? prod.price.toFixed(2) : '0.00',
                      },
                      quantity: String(qty),
                    };
                  });

                  // If a discount is applied, add it as a negative line (discount)
                  const itemsSubtotal = paypalItems.reduce(
                    (sum, item) => sum + parseFloat(item.unit_amount.value) * parseInt(item.quantity),
                    0
                  );

                  // Build shipping address for PayPal if delivery
                  const shippingAddress = fulfillmentType === 'delivery'
                    ? {
                      name: { full_name: customerName.trim() },
                      address: {
                        address_line_1: customerAddress.trim(),
                        admin_area_2: customerCity.trim(),
                        country_code: 'ES',
                      },
                      phone_number: { national_number: customerPhone.trim() }
                    }
                    : undefined;

                  return actions.order.create({
                    intent: 'CAPTURE',
                    application_context: {
                      brand_name: 'VORTEX',
                      return_url: baseUrl,
                      cancel_url: baseUrl,
                      shipping_preference: fulfillmentType === 'delivery' ? 'SET_PROVIDED_ADDRESS' : 'NO_SHIPPING',
                      user_action: 'PAY_NOW',
                    },
                    purchase_units: [
                      {
                        description: fulfillmentType === 'delivery'
                          ? `Delivery to: ${customerAddress.trim()}, ${customerCity.trim()}`
                          : `Store Pickup — ${pickupAddress}`,
                        items: paypalItems,
                        amount: {
                          currency_code: 'EUR',
                          value: finalTotal.toFixed(2),
                          breakdown: {
                            item_total: {
                              currency_code: 'EUR',
                              value: itemsSubtotal.toFixed(2),
                            },
                            discount: {
                              currency_code: 'EUR',
                              value: discountAmount.toFixed(2),
                            },
                          },
                        },
                        ...(shippingAddress ? { shipping: shippingAddress } : {}),
                      },
                    ],
                  });
                }}
                onApprove={async (data, actions) => {
                  try {
                    setIsSubmitting(true);
                    // Capture the payment client-side
                    await actions.order!.capture();

                    // Verify server-side via Firebase Cloud Function with timeout
                    const verifyRes = await fetchWithTimeout(
                      'https://verifypaypalpayment-n7mesbuj3q-uc.a.run.app',
                      {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderID: data.orderID }),
                      },
                      10000 // 10 seconds timeout
                    );
                    const verifyData = await verifyRes.json();
                    if (verifyData.verified) {
                      // Set payment success flag and clear basket
                      await storage.setItem('@store_payment_success_v2', 'true');
                      await storage.setItem('@store_basket_v2', JSON.stringify({}));
                      await handleFinalCheckout();
                    } else {
                      Alert.alert('Payment Error', 'Payment could not be verified. Please contact support.');
                    }
                  } catch (err) {
                    // Handle timeout or other errors
                    if (err.name === 'TimeoutError') {
                      Alert.alert(
                        'Payment Verification Timeout',
                        'We are verifying your payment. Please check your PayPal account for confirmation. Your payment may still be processing.'
                      );
                      // Even if verification times out, we proceed optimistically since payment was captured
                      await storage.setItem('@store_payment_success_v2', 'true');
                      await storage.setItem('@store_basket_v2', JSON.stringify({}));
                      await handleFinalCheckout();
                    } else {
                      Alert.alert('Error', 'Something went wrong after payment. Please contact support.');
                    }
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
              />
            </PayPalScriptProvider>
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
  appliedCouponRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0fdf4', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0', marginTop: 4 },

  sumBox: { backgroundColor: '#f8fafc', padding: 14, borderRadius: 12, marginTop: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  termsNoticeContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 14, alignItems: 'center' },
  termsNoticeText: { fontSize: 12, color: '#64748b' },
  termsLinkText: { fontSize: 12, color: '#d97706', fontWeight: '700', textDecorationLine: 'underline' },
  btn: { width: '100%', backgroundColor: '#171717', borderRadius: 12, height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 }
});