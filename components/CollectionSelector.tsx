import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Collection } from '../types';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/colors';

type Props = {
  collections: Collection[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  variant?: 'default' | 'map';
};

export function CollectionSelector({ collections, selectedId, onSelect, variant = 'default' }: Props) {
  const isMap = variant === 'map';
  if (collections.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.scroll}
    >
      {collections.map((col) => {
        const isSelected = col.id === selectedId;
        return (
          <TouchableOpacity
            key={col.id}
            style={[
              styles.chip,
              isMap && styles.chipMap,
              isSelected && styles.chipSelected,
              isMap && isSelected && styles.chipSelectedMap,
            ]}
            onPress={() => onSelect(col.id)}
            activeOpacity={0.7}
          >
            <View style={[
              styles.dot,
              {
                backgroundColor: isSelected
                  ? (isMap ? '#1A73E8' : '#fff')
                  : COLORS.textMuted,
              },
            ]} />
            <Text style={[
              styles.chipText,
              isMap && styles.chipTextMap,
              isSelected && !isMap && styles.chipTextSelected,
              isMap && isSelected && styles.chipTextSelectedMap,
            ]}>
              {col.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  container: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    flexDirection: 'row',
  },
  chipMap: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAED',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipSelectedMap: {
    backgroundColor: '#E8F0FE',
    borderColor: '#1A73E8',
  },
  chipTextMap: {
    color: '#3C4043',
  },
  chipTextSelectedMap: {
    color: '#1A73E8',
    fontWeight: '700',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
});
