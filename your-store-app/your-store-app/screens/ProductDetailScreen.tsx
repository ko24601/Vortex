import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, FlatList, useWindowDimensions, Alert } from 'react-native';

export default function ProductDetailScreen({ product, onAddToCart, onClose }) {
  const { width: windowWidth } = useWindowDimensions();
  const imageWidth = Math.min(windowWidth - 32, 600);
  const images = product?.images?.length > 0 ? product.images : [product?.image].filter(Boolean);
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const displaySize = product?.size || (product?.sizes ? product.sizes.split(',')[0].trim() : 'EU 41');
  const isAvailable = product?.inStock !== false;

  const maxStock = typeof product?.stock === 'number' 
    ? product.stock 
    : typeof product?.inStockCount === 'number' 
      ? product.inStockCount 
      : typeof product?.quantity === 'number'
        ? product.quantity
        : (isAvailable ? 1 : 0);

  const handleIncrement = () => {
    if (quantity < maxStock) {
      setQuantity((prev) => prev + 1);
    } else {
      Alert.alert('Stock Limit Reached', `Only ${maxStock} item(s) available in stock.`);
    }
  };

  const handleDecrement = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleAddToCart = () => {
    if (!isAvailable || maxStock === 0) return;
    onAddToCart({
      ...product,
      selectedSize: displaySize,
      quantity,
    });
  };

  return (
    <View style={styles.modalSheet}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Navigation */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
            <Text style={styles.iconBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Product Images */}
        <View style={styles.imageContainer}>
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => i.toString()}
            onMomentumScrollEnd={(e) => setActiveImageIndex(Math.round(e.nativeEvent.contentOffset.x / imageWidth))}
            renderItem={({ item }) => <Image source={{ uri: item }} style={[styles.productImage, { width: imageWidth }]} resizeMode="cover" />}
          />
          {images.length > 1 && (
            <View style={styles.dotsContainer}>
              {images.map((_, i) => (
                <View key={i} style={[styles.dot, activeImageIndex === i && styles.activeDot]} />
              ))}
            </View>
          )}
        </View>

        {/* Title & Price */}
        <Text style={styles.title}>{product?.name}</Text>
        <Text style={styles.price}>€{parseFloat(product?.price || 0).toFixed(2)}</Text>

        {/* In Stock Badge */}
        {isAvailable && maxStock > 0 ? (
          <View style={styles.stockBadge}>
            <Text style={styles.stockBadgeText}>In Stock ({maxStock} available)</Text>
          </View>
        ) : (
          <View style={[styles.stockBadge, styles.outOfStockBadge]}>
            <Text style={[styles.stockBadgeText, styles.outOfStockBadgeText]}>Out of Stock</Text>
          </View>
        )}

        {/* Product Details Section */}
        <Text style={styles.sectionTitle}>Product Details</Text>
        <View style={styles.detailsBox}>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Brand</Text>
            <Text style={styles.specVal}>{product?.brand || 'Louis Vuitton'}</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Category</Text>
            <Text style={styles.specVal}>{product?.category || 'Shoes'}</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Condition</Text>
            <Text style={styles.specVal}>{product?.condition || 'New'}</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Size</Text>
            <Text style={styles.specVal}>{displaySize}</Text>
          </View>
        </View>

        {/* Key Features */}
        <Text style={styles.sectionTitle}>Key Features</Text>
        <View style={styles.featuresList}>
          {(product?.keyFeatures || ['Premium materials', 'Iconic design', 'Comfortable fit']).map((feat, idx) => (
            <View key={idx} style={styles.bulletRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.featureText}>{feat}</Text>
            </View>
          ))}
        </View>

        {/* Quantity Stepper + Add Button */}
        <View style={styles.actionRow}>
          <View style={styles.stepper}>
            <TouchableOpacity style={styles.stepperControlBtn} onPress={handleDecrement} disabled={quantity <= 1}>
              <Text style={[styles.stepperBtn, quantity <= 1 && styles.disabledBtnText]}>-</Text>
            </TouchableOpacity>
            
            <Text style={styles.stepperVal}>{quantity}</Text>

            <TouchableOpacity style={styles.stepperControlBtn} onPress={handleIncrement} disabled={quantity >= maxStock || !isAvailable}>
              <Text style={[styles.stepperBtn, (quantity >= maxStock || !isAvailable) && styles.disabledBtnText]}>+</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.addToCartBtn, (!isAvailable || maxStock === 0) && styles.disabledCartBtn]} 
            onPress={handleAddToCart}
            disabled={!isAvailable || maxStock === 0}
          >
            <Text style={styles.addToCartText}>Add to Basket</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  modalSheet: { backgroundColor: '#121212', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, maxHeight: '85%' },
  scrollContent: { paddingBottom: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1f1f1f', justifyContent: 'center', alignItems: 'center' },
  iconBtnText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  imageContainer: { width: '100%', height: 260, borderRadius: 16, overflow: 'hidden', backgroundColor: '#1f1f1f', marginBottom: 16, position: 'relative' },
  productImage: { height: 260 },
  dotsContainer: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  activeDot: { backgroundColor: '#ffffff', width: 16 },
  title: { fontSize: 20, fontWeight: '900', color: '#ffffff', marginBottom: 4 },
  price: { fontSize: 18, fontWeight: '900', color: '#d97706', marginBottom: 12 },
  stockBadge: { backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 16 },
  stockBadgeText: { color: '#10b981', fontSize: 12, fontWeight: '700' },
  outOfStockBadge: { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
  outOfStockBadgeText: { color: '#ef4444' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#ffffff', marginBottom: 8, marginTop: 12 },
  detailsBox: { backgroundColor: '#181818', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#262626', gap: 8 },
  specRow: { flexDirection: 'row', justifyContent: 'space-between' },
  specLabel: { color: '#a3a3a3', fontSize: 13 },
  specVal: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  featuresList: { backgroundColor: '#181818', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#262626', gap: 6 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bullet: { color: '#d97706', fontWeight: 'bold' },
  featureText: { color: '#d4d4d4', fontSize: 13 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 24, alignItems: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#181818', borderRadius: 12, borderWidth: 1, borderColor: '#262626', height: 48 },
  stepperControlBtn: { width: 36, height: '100%', justifyContent: 'center', alignItems: 'center' },
  stepperBtn: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  disabledBtnText: { color: '#525252' },
  stepperVal: { color: '#ffffff', fontSize: 15, fontWeight: '800', paddingHorizontal: 12 },
  addToCartBtn: { flex: 1, backgroundColor: '#d97706', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  disabledCartBtn: { backgroundColor: '#262626', opacity: 0.6 },
  addToCartText: { color: '#ffffff', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
});