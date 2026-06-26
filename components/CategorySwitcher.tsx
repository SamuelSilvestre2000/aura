import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Category } from '../types';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/colors';
import { getCategoryPillStyle } from '../constants/categoryPills';
import {
  ALL_CATEGORIES_FILTER,
  CategoryFilterValue,
} from '../utils/categoryFilter';

type Props = {
  categories: Category[];
  value: CategoryFilterValue;
  onChange: (value: CategoryFilterValue) => void;
  allLabel?: string;
  style?: object;
};

export function CategorySwitcher({
  categories,
  value,
  onChange,
  allLabel = 'Todas',
  style,
}: Props) {
  if (categories.length <= 1) return null;

  const options: { id: CategoryFilterValue; label: string; slug?: string }[] = [
    { id: ALL_CATEGORIES_FILTER, label: allLabel },
    ...categories.map((c) => ({ id: c.id, label: c.name, slug: c.slug })),
  ];

  return (
    <View style={[styles.wrap, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {options.map((opt) => {
          const active = value === opt.id;
          const pill = opt.id === ALL_CATEGORIES_FILTER
            ? { bg: active ? COLORS.textPrimary : COLORS.surface, text: active ? '#fff' : COLORS.textSecondary }
            : getCategoryPillStyle(opt.slug, opt.label);
          return (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.chip,
                { backgroundColor: active ? pill.bg : COLORS.surface },
                active && styles.chipActive,
              ]}
              onPress={() => onChange(opt.id)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: active ? pill.text : COLORS.textSecondary },
                  active && styles.chipTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingVertical: 2,
  },
  chip: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
  },
  chipActive: {
    borderColor: 'transparent',
  },
  chipText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  chipTextActive: {
    fontWeight: '600',
  },
});
