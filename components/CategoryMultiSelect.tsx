import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Category } from '../types';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/colors';

type Props = {
  categories: Category[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

export function CategoryMultiSelect({ categories, selectedIds, onChange }: Props) {
  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
      return;
    }
    onChange([...selectedIds, id]);
  };

  return (
    <View style={styles.row}>
      {categories.map((category) => {
        const active = selectedIds.includes(category.id);
        return (
          <TouchableOpacity
            key={category.id}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => toggle(category.id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  chip: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
  },
  chipActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}18`,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.primaryLight,
  },
});
