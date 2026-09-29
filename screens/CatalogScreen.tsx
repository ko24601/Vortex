import React from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Product } from '../App';

interface CatalogScreenProps {
  products: Product[];
  loading: boolean;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSelectProduct: (p: Product) => void;
  onNavigate: (screen: string) => void;
  handleLogoTap: () => void;
  user: any;
  totalBasketItems: number;
}

const { width } = Dimensions.get('window');

export default function CatalogScreen({
  products,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  onSelectProduct,
  onNavigate,
  handleLogoTap,
  user,
  totalBasketItems,
}: CatalogScreenProps) {
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'All' || p.category.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
                          p.category.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity activeOpacity={0.8} onPress={handleLogoTap}>
            <Text style={styles.headerTitle}>VORTEX<Text style={{ color: '#d97706' }}>.</Text></Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {user && (
              <TouchableOpacity onPress={() => onNavigate('admin')} style={styles.iconButton}>
                <Text style={{ fontSize: 16 }}>⚙️</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => onNavigate('basket')} style={styles.iconButton}>
              <Text style={{ fontSize: 16 }}>🛒</Text>
              {totalBasketItems > 0 && (
                <View style={styles.badge}><Text style={styles.badgeText}>{totalBasketItems}</Text></View>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.searchWrapper}>
          <Text style={{ marginRight: 8, fontSize: 16 }}>🔍</Text>
          <TextInput
            style={styles.searchBox}
            placeholder="Search catalog..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsContainer}>
          {['All', 'Clothes', 'Shoes', 'Beauty & Hair', 'Accessories'].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, selectedCategory === cat && styles.activeChip]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.chipText, selectedCategory === cat && styles.activeChipText]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.grid}>
          {filteredProducts.map((p) => (
            <TouchableOpacity key={p.id} style={styles.card} activeOpacity={0.9} onPress={() => onSelectProduct(p)}>
              <Image source={{ uri: p.image }} style={styles.cardImage} />
              <View style={styles.cardPad}>
                <Text numberOfLines={1} style={styles.cardName}>{p.name}</Text>
                <Text style={styles.cardMeta}>{p.category}</Text>
                <Text style={styles.cardPrice}>€{p.price.toFixed(2)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => onNavigate('home')} style={styles.navItem}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onNavigate('catalog')} style={styles.navItem}>
          <Text style={[styles.navIcon, styles.navActiveIcon]}>📦</Text>
          <Text style={[styles.navLabel, styles.navActiveLabel]}>Catalog</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onNavigate('basket')} style={styles.navItem}>
          <Text style={styles.navIcon}>🛒</Text>
          <Text style={styles.navLabel}>Basket {totalBasketItems > 0 ? `(${totalBasketItems})` : ''}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#ffffff', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerTitle: { color: '#0f172a', fontSize: 22, fontWeight: '900', letterSpacing: 0.5 },
  iconButton: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#d97706', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 12 },
  searchBox: { flex: 1, height: 40, fontSize: 14, color: '#0f172a' },
  scrollBody: { padding: 16, paddingBottom: 100 },
  chipsContainer: { flexDirection: 'row', marginBottom: 16 },
  chip: { backgroundColor: '#f1f5f9', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, marginRight: 8 },
  activeChip: { backgroundColor: '#171717' },
  chipText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  activeChipText: { color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: (width - 44) / 2, backgroundColor: '#ffffff', borderRadius: 16, marginBottom: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9' },
  cardImage: { width: '100%', height: 150, resizeMode: 'cover', backgroundColor: '#f8fafc' },
  cardPad: { padding: 12 },
  cardName: { fontWeight: '700', fontSize: 13, color: '#0f172a', marginBottom: 2 },
  cardMeta: { fontSize: 11, color: '#64748b', marginBottom: 6 },
  cardPrice: { fontWeight: '800', fontSize: 14, color: '#0f172a' },
  navBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#ffffff', borderTopWidth: 1, borderColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
  navItem: { alignItems: 'center', flex: 1 },
  navIcon: { fontSize: 18, color: '#94a3b8' },
  navLabel: { fontSize: 10, color: '#94a3b8', marginTop: 4, fontWeight: '500' },
  navActiveIcon: { color: '#d97706' },
  navActiveLabel: { color: '#0f172a', fontWeight: '700' }
});