import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';

export const FilterModal = ({
  visible,
  onClose,
  sortOption,
  setSortOption,
  selectedCategory,
  categories,
  setCategory
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Filter & Sort</Text>

          <Text style={styles.sectionHeader}>Sort By Price</Text>
          <View style={styles.row}>
            <TouchableOpacity 
              style={[styles.chip, sortOption === 'low-high' && styles.activeChip]}
              onPress={() => setSortOption('low-high')}
            >
              <Text style={styles.chipText}>Price: Low to High</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.chip, sortOption === 'high-low' && styles.activeChip]}
              onPress={() => setSortOption('high-low')}
            >
              <Text style={styles.chipText}>Price: High to Low</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionHeader}>Category</Text>
          <View style={styles.row}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, selectedCategory === cat && styles.activeChip]}
                onPress={() => setCategory(cat)}
              >
                <Text style={styles.chipText}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.applyBtn} onPress={onClose}>
            <Text style={styles.applyBtnText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#171717', padding: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 16 },
  sectionHeader: { fontSize: 13, fontWeight: '700', color: '#a3a3a3', marginTop: 12, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#262626', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
  activeChip: { backgroundColor: '#d97706' },
  chipText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  applyBtn: { backgroundColor: '#d97706', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 24 },
  applyBtnText: { color: '#ffffff', fontWeight: '800' }
});