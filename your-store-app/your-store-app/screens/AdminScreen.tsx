import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Switch,
  Linking
} from 'react-native';
import { launchImageLibraryAsync } from '../utils/imagePicker';
import { db, storage, auth } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function AdminScreen({
  user,
  adminEmail,
  setAdminEmail,
  adminPassword,
  setAdminPassword,
  onLogin,
  onLogout,
  products = [],
  coupons = [],
  onRefreshData,
  onReturnHome,
}) {
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'orders' | 'coupons' | 'settings'

  // Product Editing State
  const [editingProductId, setEditingProductId] = useState(null);
  const [adminName, setAdminName] = useState('');
  const [adminBrand, setAdminBrand] = useState('Louis Vuitton');
  const [adminCategory, setAdminCategory] = useState('Shoes');
  const [adminPrice, setAdminPrice] = useState('200');
  const [adminSize, setAdminSize] = useState('EU 41 / US 8');
  const [adminCondition, setAdminCondition] = useState('New');
  const [adminInStock, setAdminInStock] = useState(true);
  const [adminStockQuantity, setAdminStockQuantity] = useState('10');

  // Dynamic Key Features State
  const [featureInput, setFeatureInput] = useState('');
  const [keyFeatures, setKeyFeatures] = useState([]);

  const [imageUris, setImageUris] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Orders Management State
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  // New Coupon Input State
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponDiscountInput, setCouponDiscountInput] = useState('10');

  // Store Configuration / Pickup Location State
  const [pickupLocationInput, setPickupLocationInput] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);
  const [currentUser, setCurrentUser] = useState(null | any);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      setOrdersLoading(true);
      return;
    }

    if (!currentUser || !currentUser.uid) {
      setOrders([]);
      setOrdersLoading(false);
      return;
    }

    // Fetch Orders in real-time
    const unsubscribeOrders = onSnapshot(
      collection(db, 'orders'),
      (snapshot) => {
        const orderList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        orderList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setOrders(orderList);
        setOrdersLoading(false);
      },
      (error) => {
        console.error('Error fetching orders:', error);
        setOrdersLoading(false);
      }
    );

    // Fetch Store Settings (Pickup Location)
    const fetchStoreConfig = async () => {
      try {
        const configDoc = await getDoc(doc(db, 'settings', 'storeConfig'));
        if (configDoc.exists()) {
          setPickupLocationInput(configDoc.data().pickupAddress || '');
        }
      } catch (e) {
        console.error('Error loading store config:', e);
      }
    };
    fetchStoreConfig();

    return () => unsubscribeOrders();
  }, [currentUser, authLoading]);

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        deliveryStatus: newStatus,
      });
      Alert.alert('Success', `Order status updated to "${newStatus}"`);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    Alert.alert(
      'Delete Order',
      'Are you sure you want to delete this order? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'orders', orderId));
              Alert.alert('Success', 'Order deleted successfully!');
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          }
        }
      ]
    );
  };

  const handleSavePickupLocation = async () => {
    if (!pickupLocationInput.trim()) {
      Alert.alert('Error', 'Please enter a valid pickup address.');
      return;
    }
    try {
      setSavingLocation(true);
      await setDoc(doc(db, 'settings', 'storeConfig'), {
        pickupAddress: pickupLocationInput.trim(),
      }, { merge: true });
      Alert.alert('Success', 'Store pickup location updated!');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingLocation(false);
    }
  };

  const pickImages = async () => {
    let result = await launchImageLibraryAsync({
      mediaTypes: 'Images',
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      const newUris = result.assets.map((a) => a.uri);
      setImageUris((prev) => [...prev, ...newUris]);
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setImageUris((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleAddFeature = () => {
    if (!featureInput.trim()) return;
    setKeyFeatures((prev) => [...prev, featureInput.trim()]);
    setFeatureInput('');
  };

  const handleRemoveFeature = (indexToRemove) => {
    setKeyFeatures((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSaveProduct = async () => {
    if (!adminName || !adminPrice || imageUris.length === 0) {
      Alert.alert('Missing Fields', 'Please fill in product name, price, and select at least one image.');
      return;
    }
    try {
      setUploading(true);
      const uploadedUrls = [];

      for (const uri of imageUris) {
        if (uri.startsWith('http')) {
          uploadedUrls.push(uri);
        } else {
          const res = await fetch(uri);
          const blob = await res.blob();
          const storageRef = ref(storage, `products/${Date.now()}-${Math.random()}`);
          await uploadBytes(storageRef, blob);
          uploadedUrls.push(await getDownloadURL(storageRef));
        }
      }

      const qty = parseInt(adminStockQuantity, 10) || 0;

      const productPayload = {
        name: adminName.trim(),
        brand: adminBrand.trim() || 'N/A',
        category: adminCategory.trim() || 'General',
        price: parseFloat(adminPrice) || 0,
        size: adminSize.trim() || 'EU 41',
        sizes: adminSize.trim() || 'EU 41',
        condition: adminCondition.trim() || 'New',
        inStock: adminInStock && qty > 0,
        stockQuantity: qty,
        stock: qty,
        inStockCount: qty,
        keyFeatures: keyFeatures.length > 0 ? keyFeatures : ['Premium Quality Materials'],
        image: uploadedUrls[0],
        images: uploadedUrls,
        createdAt: Date.now(),
      };

      if (editingProductId) {
        await updateDoc(doc(db, 'products', editingProductId), productPayload);
        Alert.alert('Success', 'Product updated!');
      } else {
        await addDoc(collection(db, 'products'), productPayload);
        Alert.alert('Success', 'Product published!');
      }

      resetProductForm();
      if (typeof onRefreshData === 'function') onRefreshData();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteProduct = (productId) => {
    Alert.alert('Delete Product', 'Remove this product from inventory?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'products', productId));
            if (typeof onRefreshData === 'function') onRefreshData();
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const handleAddCoupon = async () => {
    if (!couponCodeInput.trim() || !couponDiscountInput) {
      Alert.alert('Missing Fields', 'Please enter a coupon code and discount percentage.');
      return;
    }
    try {
      await addDoc(collection(db, 'coupons'), {
        code: couponCodeInput.trim().toUpperCase(),
        discountPercent: parseFloat(couponDiscountInput) || 10,
      });
      Alert.alert('Success', `Coupon ${couponCodeInput.toUpperCase()} created!`);
      setCouponCodeInput('');
      setCouponDiscountInput('10');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDeleteCoupon = (couponId) => {
    Alert.alert('Delete Coupon', 'Are you sure you want to remove this coupon?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'coupons', couponId));
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const resetProductForm = () => {
    setEditingProductId(null);
    setAdminName('');
    setAdminBrand('Louis Vuitton');
    setAdminPrice('200');
    setAdminCategory('Shoes');
    setAdminSize('EU 41 / US 8');
    setAdminCondition('New');
    setAdminInStock(true);
    setAdminStockQuantity('10');
    setKeyFeatures([]);
    setFeatureInput('');
    setImageUris([]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.sheet}>
        {!currentUser ? (
          <>
            <Text style={styles.title}>🔒 Restricted Admin Access</Text>
            <Text style={styles.sub}>Please sign in with authorized manager credentials.</Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="admin@vortex.com"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              value={adminEmail}
              onChangeText={setAdminEmail}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              value={adminPassword}
              onChangeText={setAdminPassword}
            />

            <TouchableOpacity style={styles.btn} onPress={onLogin}>
              <Text style={styles.btnText}>Authenticate Admin</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onReturnHome} style={{ marginTop: 14, alignItems: 'center' }}>
              <Text style={{ color: '#64748b', fontWeight: '600' }}>← Return to Store</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.title}>Store Manager</Text>
              <TouchableOpacity onPress={onLogout}>
                <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Logout</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sub}>Connected: {currentUser?.email}</Text>

            {/* TAB SWITCHER */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'products' && styles.activeTabBtn]}
                onPress={() => setActiveTab('products')}
              >
                <Text style={[styles.tabText, activeTab === 'products' && styles.activeTabText]}>
                  📦 Products
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'orders' && styles.activeTabBtn]}
                onPress={() => setActiveTab('orders')}
              >
                <Text style={[styles.tabText, activeTab === 'orders' && styles.activeTabText]}>
                  🧾 Orders ({orders.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'coupons' && styles.activeTabBtn]}
                onPress={() => setActiveTab('coupons')}
              >
                <Text style={[styles.tabText, activeTab === 'coupons' && styles.activeTabText]}>
                  🎟️ Coupons
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'settings' && styles.activeTabBtn]}
                onPress={() => setActiveTab('settings')}
              >
                <Text style={[styles.tabText, activeTab === 'settings' && styles.activeTabText]}>
                  📍 Pickup
                </Text>
              </TouchableOpacity>
            </View>

            {/* PRODUCTS TAB */}
            {activeTab === 'products' ? (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.subTitle}>{editingProductId ? '✏️ Edit Product' : '📦 Add Product'}</Text>
                  {editingProductId && (
                    <TouchableOpacity onPress={resetProductForm}>
                      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>+ New Product</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.label}>Product Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Louis Vuitton Sneakers"
                  placeholderTextColor="#9ca3af"
                  value={adminName}
                  onChangeText={setAdminName}
                />

                <View style={styles.rowGrid}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Brand</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Louis Vuitton"
                      placeholderTextColor="#9ca3af"
                      value={adminBrand}
                      onChangeText={setAdminBrand}
                    />
                  </View>
                  <View style={{ width: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Category</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Shoes"
                      placeholderTextColor="#9ca3af"
                      value={adminCategory}
                      onChangeText={setAdminCategory}
                    />
                  </View>
                </View>

                <View style={styles.rowGrid}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Price (€) *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="199.99"
                      placeholderTextColor="#9ca3af"
                      keyboardType="decimal-pad"
                      value={adminPrice}
                      onChangeText={(text) => {
                        // Allow digits and a single decimal point
                        const cleaned = text.replace(/[^0-9.]/g, '');
                        const parts = cleaned.split('.');
                        if (parts.length > 2) return; // reject second decimal point
                        setAdminPrice(cleaned);
                      }}
                    />
                  </View>
                  <View style={{ width: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Size (optional)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="EU 41 / US 8"
                      placeholderTextColor="#9ca3af"
                      value={adminSize}
                      onChangeText={setAdminSize}
                    />
                  </View>
                </View>

                <View style={styles.rowGrid}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Condition</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="New"
                      placeholderTextColor="#9ca3af"
                      value={adminCondition}
                      onChangeText={setAdminCondition}
                    />
                  </View>
                  <View style={{ width: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Quantity in Stock *</Text>
                    <View style={styles.qtyContainer}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => {
                          const current = parseInt(adminStockQuantity, 10) || 0;
                          const nextVal = Math.max(0, current - 1);
                          setAdminStockQuantity(String(nextVal));
                          if (nextVal === 0) setAdminInStock(false);
                        }}
                      >
                        <Text style={styles.qtyBtnText}>-</Text>
                      </TouchableOpacity>
                      <TextInput
                        style={styles.qtyInput}
                        placeholder="10"
                        placeholderTextColor="#9ca3af"
                        keyboardType="numeric"
                        value={adminStockQuantity}
                        onChangeText={(val) => {
                          setAdminStockQuantity(val);
                          const num = parseInt(val, 10) || 0;
                          setAdminInStock(num > 0);
                        }}
                      />
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => {
                          const current = parseInt(adminStockQuantity, 10) || 0;
                          const nextVal = current + 1;
                          setAdminStockQuantity(String(nextVal));
                          setAdminInStock(true);
                        }}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={styles.switchContainer}>
                  <Text style={styles.switchLabel}>
                    Stock Status: <Text style={{ color: adminInStock ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{adminInStock ? 'In Stock' : 'Out of Stock'}</Text>
                  </Text>
                  <Switch
                    value={adminInStock}
                    onValueChange={(val) => {
                      setAdminInStock(val);
                      if (!val) setAdminStockQuantity('0');
                      else if (adminStockQuantity === '0') setAdminStockQuantity('10');
                    }}
                    trackColor={{ false: '#cbd5e1', true: '#10b981' }}
                    thumbColor="#ffffff"
                  />
                </View>

                <Text style={styles.label}>Key Features</Text>
                <View style={styles.featureInputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="e.g. Premium materials"
                    placeholderTextColor="#9ca3af"
                    value={featureInput}
                    onChangeText={setFeatureInput}
                  />
                  <TouchableOpacity style={styles.addFeatureBtn} onPress={handleAddFeature}>
                    <Text style={styles.addFeatureBtnText}>+ Add</Text>
                  </TouchableOpacity>
                </View>

                {keyFeatures.length > 0 && (
                  <View style={styles.featureListContainer}>
                    {keyFeatures.map((feature, index) => (
                      <View key={index} style={styles.featureChip}>
                        <Text style={styles.featureChipText}>• {feature}</Text>
                        <TouchableOpacity onPress={() => handleRemoveFeature(index)}>
                          <Text style={styles.removeChipText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity style={styles.pickerBtn} onPress={pickImages}>
                  <Text style={{ fontWeight: '600', color: '#475569' }}>🖼️ Pick Product Images</Text>
                </TouchableOpacity>

                {imageUris.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailContainer}>
                    {imageUris.map((uri, index) => (
                      <View key={index} style={styles.thumbnailWrapper}>
                        <Image source={{ uri }} style={styles.thumbnail} />
                        <TouchableOpacity style={styles.deleteBadge} onPress={() => handleRemoveImage(index)}>
                          <Text style={styles.deleteBadgeText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}

                <TouchableOpacity
                  style={[styles.btn, { marginTop: 14, opacity: uploading ? 0.6 : 1 }]}
                  onPress={handleSaveProduct}
                  disabled={uploading}
                >
                  {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{editingProductId ? 'Save Product Changes' : 'Publish Product'}</Text>}
                </TouchableOpacity>

                <View style={styles.divider} />
                <Text style={styles.subTitle}>🛠️ Inventory ({products.length})</Text>
                {products.map((p) => {
                  const stockDisplay = p.stockQuantity ?? p.stock ?? p.inStockCount ?? (p.inStock !== false ? 10 : 0);
                  return (
                    <View key={p.id} style={styles.row}>
                      <Image source={{ uri: p.image }} style={{ width: 40, height: 40, borderRadius: 6 }} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text numberOfLines={1} style={{ fontWeight: '700', fontSize: 13, color: '#0f172a' }}>{p.name}</Text>
                        <Text style={{ fontSize: 11, color: '#64748b' }}>€{p.price} • {p.brand || p.category}</Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: stockDisplay > 0 ? '#10b981' : '#ef4444' }}>Stock: {stockDisplay} units</Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => {
                          setEditingProductId(p.id);
                          setAdminName(p.name);
                          setAdminBrand(p.brand || 'Louis Vuitton');
                          setAdminCategory(p.category || 'Shoes');
                          setAdminPrice(p.price ? p.price.toString() : '0');
                          setAdminSize(p.size || p.sizes || 'EU 41');
                          setAdminCondition(p.condition || 'New');
                          setAdminStockQuantity(String(stockDisplay));
                          setKeyFeatures(Array.isArray(p.keyFeatures) ? p.keyFeatures : []);
                          setImageUris(p.images || [p.image]);
                        }}
                        style={{ marginRight: 10 }}
                      >
                        <Text style={{ color: '#d97706', fontWeight: 'bold' }}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={() => handleDeleteProduct(p.id)}>
                        <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </>
            ) : activeTab === 'orders' ? (
              /* ORDERS TAB WITH EDITABLE DELIVERY STATUS */
              <View style={{ marginTop: 10 }}>
                <Text style={styles.subTitle}>🧾 Customer Orders Management</Text>
                {ordersLoading ? (
                  <ActivityIndicator color="#d97706" style={{ marginVertical: 20 }} />
                ) : orders.length === 0 ? (
                  <Text style={styles.sub}>No orders found in Firestore.</Text>
                ) : (
                  orders.map((item) => {
                    const currentStatus = item.status || item.deliveryStatus || 'Pending';
                    const customer = item.customer || {};
                    return (
                      <View key={item.id} style={styles.orderCard}>
                        <View style={styles.orderHeader}>
                          <Text style={styles.orderId}>Order #{item.id.slice(0, 8)}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={[styles.orderStatus, { color: currentStatus === 'Delivered' ? '#10b981' : '#d97706' }]}>
                              {currentStatus}
                            </Text>
                            <TouchableOpacity onPress={() => handleDeleteOrder(item.id)}>
                              <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 12, marginLeft: 8 }}>Delete</Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Customer Information */}
                        <Text style={styles.orderMeta}>
                          Customer: {customer.name || 'N/A'}
                        </Text>
                        <TouchableOpacity
                          style={styles.orderMeta}
                          onPress={() => {
                            if (customer.phone && customer.phone !== 'N/A') {
                              Linking.openURL(`tel:${customer.phone}`).catch(err =>
                                console.error('Error initiating call:', err)
                              );
                            }
                          }}
                        >
                          <Text style={{ color: '#64748b' }}>
                            Phone: {customer.phone || 'N/A'}
                          </Text>
                        </TouchableOpacity>
                        {fulfillmentType === 'delivery' ? (
                          <>
                            <Text style={styles.orderMeta}>
                              Address: {customer.address || 'N/A'}
                            </Text>
                            <Text style={styles.orderMeta}>
                              City: {customer.city || 'N/A'}
                            </Text>
                          </>
                        ) : (
                          <Text style={styles.orderMeta}>
                            Pickup Location: {customer.address || 'N/A'}
                          </>
                        )}

                        {/* Order Details */}
                        <Text style={[styles.label, { marginTop: 8, marginBottom: 4 }]}>
                          Order Details:
                        </Text>
                        {item.items && Array.isArray(item.items) ? (
                          item.items.map((orderItem, index) => (
                            <View key={index} style={styles.orderItem}>
                              <Text style={{ fontWeight: '600' }}>
                                ×{orderItem.quantity} {orderItem.productName || 'Unknown Item'}
                              </Text>
                              <Text style={{ color: '#64748b', fontSize: 11 }}>
                                €{orderItem.price?.toFixed(2) || '0.00'} each
                              </Text>
                            </View>
                          ))
                        ) : (
                          <Text style={{ color: '#64748b', fontStyle: 'italic' }}>
                            No item details available
                          </>
                        )}

                        {/* Payment and Fulfillment Info */}
                        <View style={{ flexDirection: 'row', marginTop: 8, gap: 12 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: '#64748b', fontSize: 11 }}>
                              Payment Method:
                            </Text>
                            <Text style={{ fontWeight: '600' }}>
                              {item.paymentMethod === 'card' ? '💳 Card (PayPal)' : '💵 Cash'}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: '#64748b', fontSize: 11 }}>
                              Fulfillment:
                            </Text>
                            <Text style={{ fontWeight: '600' }}>
                              {item.fulfillment === 'delivery' ? '🚚 Delivery' : '🏬 Pickup'}
                            </Text>
                          </View>
                        </View>

                        {/* Pricing Summary */}
                        <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e2e8f0' }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ color: '#64748b', fontSize: 12 }}>Subtotal</Text>
                            <Text style={{ fontWeight: '600', fontSize: 12 }}>€{item.subtotal?.toFixed(2) || '0.00'}</Text>
                          </View>
                          {item.discount && item.discount > 0 ? (
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text style={{ color: '#10b981', fontSize: 12 }}>Discount ({item.couponApplied || 'N/A'}%)</Text>
                              <Text style={{ color: '#10b981', fontWeight: '600', fontSize: 12 }}>
                                -€{item.discount.toFixed(2)}
                              </Text>
                            </View>
                          ) : null}
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ color: '#0f172a', fontWeight: '600', fontSize: 12 }}>Total</Text>
                            <Text style={{ fontWeight: '700', fontSize: 14, color: '#d97706' }}>
                              €{item.total?.toFixed(2) || '0.00'}
                            </Text>
                          </View>
                        </View>

                        <Text style={[styles.label, { marginTop: 8 }]}>Update Delivery Status:</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                          {['Processing', 'Dispatched', 'Ready for Pickup', 'Delivered'].map((statusOption) => (
                            <TouchableOpacity
                              key={statusOption}
                              style={[
                                styles.statusBtn,
                                currentStatus === statusOption && styles.statusBtnActive
                              ]}
                              onPress={() => handleUpdateOrderStatus(item.id, statusOption)}
                            >
                              <Text style={[
                                styles.statusBtnText,
                                currentStatus === statusOption && styles.statusBtnTextActive
                              ]}>
                                {statusOption}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            ) : activeTab === 'coupons' ? (
              /* COUPONS TAB */
              <View style={{ marginTop: 10 }}>
                <Text style={styles.subTitle}>🎟️ Create Discount Coupon</Text>
                <Text style={styles.label}>Coupon Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="VORTEX20"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="characters"
                  value={couponCodeInput}
                  onChangeText={setCouponCodeInput}
                />

                <Text style={styles.label}>Discount Percentage (%)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="15"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  value={couponDiscountInput}
                  onChangeText={setCouponDiscountInput}
                />

                <TouchableOpacity style={styles.btn} onPress={handleAddCoupon}>
                  <Text style={styles.btnText}>Save Coupon</Text>
                </TouchableOpacity>

                <View style={styles.divider} />
                <Text style={styles.subTitle}>Active Coupons ({coupons.length})</Text>

                {coupons.length === 0 ? (
                  <Text style={styles.sub}>No active coupons available.</Text>
                ) : (
                  coupons.map((c) => (
                    <View key={c.id} style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '800', color: '#0f172a', fontSize: 14 }}>{c.code}</Text>
                        <Text style={{ fontSize: 12, color: '#10b981', fontWeight: '700' }}>{c.discountPercent}% OFF</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleDeleteCoupon(c.id)}>
                        <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            ) : (
              /* PICKUP LOCATION SETTINGS TAB */
              <View style={{ marginTop: 10 }}>
                <Text style={styles.subTitle}>📍 Edit Store Pickup Location</Text>
                <Text style={styles.sub}>Set the address where customers can collect their local orders.</Text>

                <Text style={styles.label}>Pickup Address *</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  multiline
                  placeholder="e.g. VORTEX Store, Calle Principal 12, 30710 Roldán, Murcia"
                  placeholderTextColor="#9ca3af"
                  value={pickupLocationInput}
                  onChangeText={setPickupLocationInput}
                />

                <TouchableOpacity
                  style={[styles.btn, { marginTop: 14, opacity: savingLocation ? 0.6 : 1 }]}
                  onPress={handleSavePickupLocation}
                  disabled={savingLocation}
                >
                  {savingLocation ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save Pickup Location</Text>}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  sheet: { backgroundColor: '#ffffff', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  subTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginTop: 14, marginBottom: 4 },
  sub: { fontSize: 13, color: '#64748b', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4, marginTop: 10 },
  input: { width: '100%', height: 42, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, backgroundColor: '#f8fafc', color: '#0f172a' },
  btn: { width: '100%', backgroundColor: '#171717', borderRadius: 10, height: 46, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  pickerBtn: { backgroundColor: '#f8fafc', height: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', marginTop: 12 },
  rowGrid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  qtyContainer: { flexDirection: 'row', alignItems: 'center', height: 42, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, backgroundColor: '#f8fafc', overflow: 'hidden' },
  qtyBtn: { width: 36, height: '100%', backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  qtyInput: { flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '700', color: '#0f172a', height: '100%' },

  switchContainer: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, height: 44, paddingHorizontal: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8 },
  switchLabel: { fontSize: 12, fontWeight: '700', color: '#334155' },

  featureInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  addFeatureBtn: { backgroundColor: '#0f172a', height: 42, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  addFeatureBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  featureListContainer: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', padding: 10, borderRadius: 8, marginTop: 8, gap: 6 },
  featureChip: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  featureChipText: { color: '#0f172a', fontSize: 12, fontWeight: '600' },
  removeChipText: { color: '#ef4444', fontWeight: 'bold', fontSize: 13, marginLeft: 8 },

  thumbnailContainer: { marginTop: 10, flexDirection: 'row' },
  thumbnailWrapper: { position: 'relative', marginRight: 8 },
  thumbnail: { width: 60, height: 60, borderRadius: 8 },
  deleteBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#ef4444', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  deleteBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },

  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 16 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, marginBottom: 6, borderWidth: 1, borderColor: '#e2e8f0' },

  tabContainer: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 10, padding: 4, marginVertical: 10 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  activeTabBtn: { backgroundColor: '#ffffff', elevation: 2 },
  tabText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  activeTabText: { color: '#0f172a', fontWeight: '800' },

  orderCard: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  orderId: { fontWeight: '800', fontSize: 13, color: '#0f172a' },
  orderStatus: { fontWeight: '800', fontSize: 12 },
  orderMeta: { fontSize: 12, color: '#64748b', marginBottom: 2 },

  statusBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#e2e8f0', borderWidth: 1, borderColor: '#cbd5e1' },
  statusBtnActive: { backgroundColor: '#171717', borderColor: '#171717' },
  statusBtnText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  statusBtnTextActive: { color: '#ffffff' }
});