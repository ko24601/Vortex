import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Image, Dimensions, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../App';
import ProductDetailScreen from './ProductDetailScreen';
import SettingsModal from './SettingsModal';
import NotificationsModal from './NotificationsModal';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface HomeScreenProps {
  products: Product[];
  loading: boolean;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  onSelectProduct: (p: Product) => void;
  onNavigate: (screen: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  handleLogoTap: () => void;
  user: any;
  totalBasketItems: number;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}

const { width } = Dimensions.get('window');

export default function HomeScreen({
  products,
  loading,
  onSelectProduct,
  favorites,
  onToggleFavorite,
}: HomeScreenProps) {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [search, setSearch] = useState<string>('');
  const [selectedProductModal, setSelectedProductModal] = useState<Product | null>(null);

  const categories = ['All', 'Clothes', 'Shoes', 'Beauty & Hair', 'Accessories'];

  const filteredProducts = products.filter((p) => {
    const matchesCategory = activeCategory === 'All' || p.category.toLowerCase() === activeCategory.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <View style={styles.container}>
      {/* Search Input Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchWrapper}>
          <Text style={{ marginRight: 8, fontSize: 14 }}>🔍</Text>
          <TextInput
            style={styles.searchBox}
            placeholder="Search footwear, apparel..."
            placeholderTextColor="#737373"
            value={search}
            onChangeText={searchVal => setSearch(searchVal)}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{ color: '#737373', fontSize: 14, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Promotional Banner */}
        <View style={styles.banner}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <View style={styles.bannerBadge}><Text style={styles.bannerBadgeText}>NEW DROP</Text></View>
            <Text style={styles.bannerTitle}>Autumn Collection 2026</Text>
            <Text style={styles.bannerSub}>Discover premium luxury designer essentials.</Text>
            <TouchableOpacity style={styles.bannerBtn} activeOpacity={0.8} onPress={() => setActiveCategory('All')}>
              <Text style={styles.bannerBtnText}>Shop Now →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Categories Chips */}
        <Text style={styles.sectionTitle}>Categories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsContainer}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              activeOpacity={0.7}
              style={[styles.chip, activeCategory === cat && styles.activeChip]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.chipText, activeCategory === cat && styles.activeChipText]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Products Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Trending Products</Text>
          <Text style={styles.resultsCount}>{filteredProducts.length} items</Text>
        </View>

        {/* Skeleton Placeholders or Grid */}
        {loading ? (
          <View style={styles.grid}>
            {[1, 2, 3, 4].map((n) => (
              <View key={n} style={[styles.card, { height: 210, backgroundColor: '#171717', opacity: 0.5 }]} />
            ))}
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredProducts.map((p) => {
              const isFav = favorites.includes(p.id);
              return (
                <TouchableOpacity 
                  key={p.id} 
                  style={styles.card} 
                  activeOpacity={0.85} 
                  onPress={() => setSelectedProductModal(p)}
                >
                  <View style={{ position: 'relative' }}>
                    <Image source={{ uri: p.image }} style={styles.cardImage} />
                    <TouchableOpacity 
                      style={styles.favBadge} 
                      activeOpacity={0.7} 
                      onPress={() => onToggleFavorite(p.id)}
                    >
                      <Text style={{ fontSize: 12 }}>{isFav ? '❤️' : '🤍'}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.cardPad}>
                    <Text numberOfLines={1} style={styles.cardName}>{p.name}</Text>
                    <Text style={styles.cardMeta}>{p.category}</Text>
                    <View style={styles.cardFooter}>
                      <Text style={styles.cardPrice}>€{p.price.toFixed(2)}</Text>
                      <TouchableOpacity 
                        style={styles.addQuickBtn} 
                        activeOpacity={0.7}
                        onPress={() => onSelectProduct(p)}
                      >
                        <Text style={styles.addQuickText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Product Detail Modal */}
      <Modal
        visible={!!selectedProductModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedProductModal(null)}
      >
        {selectedProductModal && (
          <View style={styles.modalOverlay}>
            <ProductDetailScreen
              product={selectedProductModal}
              onClose={() => setSelectedProductModal(null)}
              onAddToCart={(itemWithSelectedSize) => {
                onSelectProduct(itemWithSelectedSize);
                setSelectedProductModal(null);
              }}
            />
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  searchSection: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, backgroundColor: '#0a0a0a', flexDirection: 'row', alignItems: 'center' },
  searchWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#171717', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#262626', height: 44 },
  searchBox: { flex: 1, height: 40, fontSize: 14, color: '#ffffff' },
  scrollBody: { padding: 16, paddingBottom: 40 },
  banner: { backgroundColor: '#171717', borderRadius: 20, padding: 20, marginBottom: 24, flexDirection: 'row', overflow: 'hidden', borderWidth: 1, borderColor: '#262626' },
  bannerBadge: { backgroundColor: '#d97706', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
  bannerBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  bannerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  bannerSub: { color: '#a3a3a3', fontSize: 12, lineHeight: 18, marginBottom: 14 },
  bannerBtn: { backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start' },
  bannerBtnText: { color: '#000000', fontSize: 12, fontWeight: 'bold' },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#ffffff', marginBottom: 12 },
  resultsCount: { fontSize: 12, color: '#737373', fontWeight: '600' },
  chipsContainer: { flexDirection: 'row', marginBottom: 16 },
  chip: { backgroundColor: '#171717', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, marginRight: 8, borderWidth: 1, borderColor: '#262626' },
  activeChip: { backgroundColor: '#ffffff', borderColor: '#ffffff' },
  chipText: { fontSize: 13, color: '#a3a3a3', fontWeight: '600' },
  activeChipText: { color: '#000000' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: (width - 44) / 2, backgroundColor: '#171717', borderRadius: 16, marginBottom: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#262626' },
  cardImage: { width: '100%', height: 150, resizeMode: 'cover', backgroundColor: '#262626' },
  favBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, width: 26, height: 26, justifyContent: 'center', alignItems: 'center' },
  cardPad: { padding: 12 },
  cardName: { fontWeight: '700', fontSize: 13, color: '#ffffff', marginBottom: 2 },
  cardMeta: { fontSize: 11, color: '#a3a3a3', marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice: { fontWeight: '800', fontSize: 14, color: '#d97706' },
  addQuickBtn: { backgroundColor: '#262626', width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  addQuickText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
});