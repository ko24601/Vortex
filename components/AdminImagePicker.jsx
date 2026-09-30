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
  Switch
} from 'react-native';
import { launchImageLibraryAsync } from '../utils/imagePicker';
import { db, storage } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
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
  onRefreshData,
  onReturnHome,
}) {
  const [activeTab, setActiveTab] = useState('products');

  // Product Editing State
  const [editingProductId, setEditingProductId] = useState(null);
  const [adminName, setAdminName] = useState('');
  const [adminBrand, setAdminBrand] = useState('Louis Vuitton');
  const [adminCategory, setAdminCategory] = useState('Shoes');
  const [adminPrice, setAdminPrice] = useState('200');
  const [adminSize, setAdminSize] = useState('EU 41 / US 8');
  const [adminCondition, setAdminCondition] = useState('New');
  const [adminInStock, setAdminInStock] = useState(true);
  const [adminStockQuantity, setAdminStockQuantity] = useState('1'); // Track stock quantity

  // Dynamic Key Features State
  const [featureInput, setFeatureInput] = useState('');
  const [keyFeatures, setKeyFeatures] = useState([]);

  const [imageUris, setImageUris] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Orders Management State
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  // Listen to Firestore Orders
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(
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
    return () => unsubscribe();
  }, [user]);

  // Pick images
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

  // Remove individual image thumbnail
  const handleRemoveImage = (indexToRemove) => {
    setImageUris((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  // Add Key Feature item
  const handleAddFeature = () => {
    if (!featureInput.trim()) return;
    setKeyFeatures((prev) => [...prev, featureInput.trim()]);
    setFeatureInput('');
  };

  // Remove Key Feature item
  const handleRemoveFeature = (indexToRemove) => {
    setKeyFeatures((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  // Save / Update Product
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

      const parsedStockQty = parseInt(adminStockQuantity, 10) || 0;

      const productPayload = {
        name: adminName.trim(),
        brand: adminBrand.trim() || 'N/A',
        category: adminCategory.trim() || 'General',
        price: parseFloat(adminPrice) || 0,
        size: adminSize.trim() || 'EU 41',
        sizes: adminSize.trim() || 'EU 41',
        condition: adminCondition.trim() || 'New',
        inStock: adminInStock && parsedStockQty > 0,
        stockQuantity: parsedStockQty,
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
      onRefreshData();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteProduct = (productId) => {
    Alert.alert('Delete Product', 'Are you sure you want to delete this product from inventory?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'products', productId));
            Alert.alert('Deleted', 'Product removed.');
            onRefreshData();
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
    setAdminStockQuantity('1');
    setKeyFeatures([]);
    setFeatureInput('');
    setImageUris([]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.sheet}>
        {!user ? (
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
            <Text style={styles.sub}>Connected: {user.email}</Text>

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

                {/* Product Name */}
                <Text style={styles.label}>Product Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Louis Vuitton Sneakers"
                  placeholderTextColor="#9ca3af"
                  value={adminName}
                  onChangeText={setAdminName}
                />

                {/* Brand & Category Row */}
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

                {/* Price & Size Row */}
                <View style={styles.rowGrid}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Price (€) *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="200"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      value={adminPrice}
                      onChangeText={setAdminPrice}
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

                {/* Condition & Stock Quantity Row */}
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
                    <TextInput
                      style={styles.input}
                      placeholder="10"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      value={adminStockQuantity}
                      onChangeText={(val) => {
                        setAdminStockQuantity(val);
                        if (parseInt(val, 10) <= 0) {
                          setAdminInStock(false);
                        } else {
                          setAdminInStock(true);
                        }
                      }}
                    />
                  </View>
                </View>

                {/* In Stock Toggle Row */}
                <View style={styles.switchContainer}>
                  <Text style={[styles.label, { marginTop: 0 }]}>
                    Status: {adminInStock ? 'Available for Purchase' : 'Out of Stock'}
                  </Text>
                  <Switch
                    value={adminInStock}
                    onValueChange={(val) => {
                      setAdminInStock(val);
                      if (!val) setAdminStockQuantity('0');
                    }}
                    trackColor={{ false: '#cbd5e1', true: '#10b981' }}
                    thumbColor="#ffffff"
                  />
                </View>

                {/* DYNAMIC KEY FEATURES SECTION */}
                <Text style={styles.label}>Key Features (Upload to Firestore)</Text>
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

                {/* Added Key Features Chip List */}
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

                {/* Pick Images Button */}
                <TouchableOpacity style={styles.pickerBtn} onPress={pickImages}>
                  <Text style={{ fontWeight: '600', color: '#475569' }}>
                    🖼️ Pick Product Images
                  </Text>
                </TouchableOpacity>

                {/* Image Thumbnails with Delete Feature */}
                {imageUris.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailContainer}>
                    {imageUris.map((uri, index) => (
                      <View key={index} style={styles.thumbnailWrapper}>
                        <Image source={{ uri }} style={styles.thumbnail} />
                        <TouchableOpacity
                          style={styles.deleteBadge}
                          onPress={() => handleRemoveImage(index)}
                        >
                          <Text style={styles.deleteBadgeText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}

                {/* Save/Publish Button */}
                <TouchableOpacity
                  style={[styles.btn, { marginTop: 14, opacity: uploading ? 0.6 : 1 }]}
                  onPress={handleSaveProduct}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnText}>
                      {editingProductId ? 'Save Product Changes' : 'Publish Product'}
                    </Text>
                  )}
                </TouchableOpacity>

                <View style={styles.divider} />
                <Text style={styles.subTitle}>🛠️ Inventory ({products.length})</Text>
                {products.map((p) => (
                  <View key={p.id} style={styles.row}>
                    <Image source={{ uri: p.image }} style={{ width: 40, height: 40, borderRadius: 6 }} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text numberOfLines={1} style={{ fontWeight: '700', fontSize: 13, color: '#0f172a' }}>
                        {p.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#64748b' }}>
                        €{p.price} • {p.brand || p.category}
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: (p.stockQuantity ?? (p.inStock ? 1 : 0)) > 0 ? '#10b981' : '#ef4444' }}>
                        Stock: {p.stockQuantity ?? (p.inStock ? 'In Stock' : '0')} units
                      </Text>
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
                        setAdminInStock(p.inStock !== false);
                        setAdminStockQuantity(p.stockQuantity !== undefined ? p.stockQuantity.toString() : (p.inStock !== false ? '1' : '0'));
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
                ))}
              </>
            ) : (
              /* ORDERS TAB */
              <View style={{ marginTop: 10 }}>
                {ordersLoading ? (
                  <ActivityIndicator color="#d97706" style={{ marginVertical: 20 }} />
                ) : orders.length === 0 ? (
                  <Text style={styles.sub}>No orders found in Firestore.</Text>
                ) : (
                  orders.map((item) => (
                    <View key={item.id} style={styles.orderCard}>
                      <View style={styles.orderHeader}>
                        <Text style={styles.orderId}>Order #{item.id.slice(0, 8)}</Text>
                        <Text
                          style={[
                            styles.orderStatus,
                            { color: item.status === 'Delivered' ? '#10b981' : '#d97706' },
                          ]}
                        >
                          {item.status || 'Pending'}
                        </Text>
                      </View>
                      <Text style={styles.orderMeta}>User: {item.userId || 'Guest'}</Text>
                      <Text style={styles.orderMeta}>Address: {item.shippingAddress || 'N/A'}</Text>
                      <Text style={styles.orderMeta}>Total: €{item.totalAmount?.toFixed(2) || '0.00'}</Text>
                    </View>
                  ))
                )}
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

  // Row Grid layout for split fields
  rowGrid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchContainer: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, height: 42, paddingHorizontal: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8 },

  // Key Features UI
  featureInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  addFeatureBtn: { backgroundColor: '#0f172a', height: 42, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  addFeatureBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  featureListContainer: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', padding: 10, borderRadius: 8, marginTop: 8, gap: 6 },
  featureChip: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  featureChipText: { color: '#0f172a', fontSize: 12, fontWeight: '600' },
  removeChipText: { color: '#ef4444', fontWeight: 'bold', fontSize: 13, marginLeft: 8 },

  // Thumbnail styles
  thumbnailContainer: { marginTop: 10, flexDirection: 'row' },
  thumbnailWrapper: { position: 'relative', marginRight: 8 },
  thumbnail: { width: 60, height: 60, borderRadius: 8 },
  deleteBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#ef4444', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  deleteBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },

  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 16 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, marginBottom: 6, borderWidth: 1, borderColor: '#e2e8f0' },

  // Tab Navigation
  tabContainer: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 10, padding: 4, marginVertical: 10 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  activeTabBtn: { backgroundColor: '#ffffff', elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  activeTabText: { color: '#0f172a', fontWeight: '800' },

  // Orders
  orderCard: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  orderId: { fontWeight: '800', fontSize: 13, color: '#0f172a' },
  orderStatus: { fontWeight: '800', fontSize: 12 },
  orderMeta: { fontSize: 12, color: '#64748b', marginBottom: 2 }
});